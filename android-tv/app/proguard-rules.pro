# The app is a thin WebView shell — nothing to strip, but keep JS interfaces
# safe if any are added later.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
