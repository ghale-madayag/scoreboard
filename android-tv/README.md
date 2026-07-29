# Depth Scoreboard — Android TV app

A full-screen TV app that displays the Depth Logistics scoreboard. The app is a
thin native shell around the existing scoreboard web app, so **content and design
changes deploy to cPanel as normal — the TV picks them up without reinstalling
the app.**

## Why a shell and not a bundled app

Every figure on the board comes from the network (the intranet `jet-cct` APIs and
the Azure charts feed), so the app can never work offline regardless of how it is
packaged. Loading the hosted site therefore costs nothing and gains a lot:

| | WebView shell (this) | Assets bundled into the APK |
|---|---|---|
| Design/content change | Upload to cPanel, live within minutes | Rebuild APK, re-sideload on the TV |
| `charts.php` Azure proxy | Works unchanged | Would need re-implementing natively |
| Intranet CORS allowlist | Already allows the site's origin | Would need a new origin added |
| Works with no network | No (nor would bundling — data is remote) | No |

## What the app adds over just opening a browser

- **Leanback launcher entry** — appears on the Android TV home row with a banner
- **Starts itself on boot** — after a power cut the board comes back with no one touching it
- **Screen never sleeps** — `FLAG_KEEP_SCREEN_ON`, no dimming or screensaver
- **No browser chrome** — immersive full screen, no status/nav bars, no cursor
- **Network resilience** — on a failed load it shows a branded "Waiting for network…"
  panel and retries every 15s, instead of a Chrome error page
- **Remote-safe** — BACK is swallowed so the board can't be closed by accident
  (long-press BACK exits deliberately, for maintenance)

## Build

This machine has no JDK/Android SDK, so build on a machine that does:

1. Install [Android Studio](https://developer.android.com/studio) (bundles the JDK and SDK).
2. `File → Open…` → select this `android-tv` folder. Let it sync (it will fetch
   Gradle and the SDK automatically, and generate the Gradle wrapper).
3. `Build → Build Bundle(s)/APK(s) → Build APK(s)`.

APK lands at `app/build/outputs/apk/debug/app-debug.apk`.

Command line (once the SDK and JDK 17 are installed). The Gradle wrapper binary
isn't committed, so generate it once with a system Gradle, then use it:

```bash
gradle wrapper --gradle-version 8.7
```

```bash
./gradlew assembleDebug
```

## Install on the TV

Enable **Developer options → USB debugging** (or *Unknown sources*) on the TV, then:

```bash
adb connect <TV_IP>:5555
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Or copy the APK to a USB stick and install with a file manager.

## Configuration

The URL is a single line in `app/build.gradle.kts`:

```kotlin
buildConfigField("String", "SCOREBOARD_URL", "\"https://scoreboard.depthintranet.com/\"")
```

Point it at a LAN dev server to test against a work-in-progress build. Debug builds
permit plain HTTP anywhere (`src/debug/res/xml/network_security_config.xml`); release
builds require HTTPS.

## Notes

- `minSdk 21` covers effectively every Android TV box and TV in service.
- The web app already reloads itself at ~3am and polls data every 4 minutes; the
  shell does not duplicate that logic.
- For production distribution, sign a release build with your own keystore
  (`Build → Generate Signed Bundle/APK`). A debug APK is fine for internal sideloading.
