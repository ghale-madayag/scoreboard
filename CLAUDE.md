# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A digital signage board for Depth Logistics, displayed 24/7 on a wall-mounted TV
via a TV browser (Puffin / the Skyworth built-in). It is a **static Vite + React
SPA plus a single PHP file**, deployed to VentraIP cPanel at
`scoreboard.depthintranet.com`. It replaced a heavy WordPress/Elementor page.

There is **no database, no backend, and no admin panel here**. All content is
still edited in the intranet WordPress admin at `depthintranet.com`; this app
only reads. Two external automations (`postscoreboard`, `checkwinner`) write to
that intranet and are out of scope.

## Commands

```bash
npm run dev              # http://localhost:5173, HMR, proxies /api/charts.php to Azure
npm run build            # -> dist/ (this is the deploy artifact)
npm run preview          # serves dist/ exactly as cPanel will
npm run quotes -- 4      # print the next 4 working weeks of scheduled quotes + self-checks
```

**There is no test suite and no linter.** Verification is done by building and
driving the real page in a browser. Do not invent test commands.

To view on the TV over wifi: `npx vite preview --host`, then open
`http://<this-machine-lan-ip>:4173`. Both `server` and `preview` in
`vite.config.js` set `host: true` and carry their own copy of the charts proxy —
**`preview` does not inherit `server.proxy`**, and without its copy the financial
slide's `charts.php` call 404s on the built site.

Append `?debug=1` to any URL for an on-screen viewport/scale readout. It renders
outside the scaled stage so it stays legible when scaling itself is broken.

## Architecture

**Data flow.** `src/api.js` defines one function per section in `SECTIONS`, all
fetched together by `fetchAll()` via `Promise.allSettled` — a section that fails
resolves to `undefined` and the caller keeps its previous value, so one dead
endpoint never blanks the board. `useScoreboardData.js` polls every 4 min ±30s
jitter, exposes `{ data, lastUpdated, stale, ready }`, refetches on Sydney
midnight rollover, and reloads the whole page once between 3–4 a.m. (TV-local)
for memory hygiene and to pick up redeploys. "Once" is decided by page uptime
(`logic/reload.js`), not a flag: the original flag lived in a React ref, so each
reload wiped it and the board reloaded every minute for the whole hour (~50
times a night) until the launch log caught it.

**Two upstreams.** JetEngine CCT endpoints on `depthintranet.com/wp-json/jet-cct/*`
are public GETs with CORS already allowing this origin, so the browser calls them
directly. The Azure charts API sends **no** CORS headers, so it goes through
`public/api/charts.php` — a same-origin proxy with a 60s file cache, a
whitelist of allowed upstreams, and last-good-cache fallback. In dev, Vite's
proxy stands in for it.

**Slides.** `App.jsx` builds a slide list, conditionally including each section
only when its data exists, then interleaves a photo slide after every two
content slides. `Slider.jsx` rotates through it using **two fixed DOM slots**
that alternate `active`/`leaving` — the slot elements never remount, because
reordering keyed siblings makes React move the node and that cancels the CSS
exit transition. Only two slides are ever mounted at once.

**Scaling.** The design is a fixed 1920×1080 stage, uniformly scaled to the
viewport by `useFitTransform.js`. Near-16:9 viewports cover (cropping from the
top edge only, so the bottom progress bar and dots survive); very odd ratios fall
back to contain.

**Domain logic** lives in `src/logic/` and is mostly a port of the old WordPress
child-theme `functions.php`: `bonus.js` (bonus tiers, % achieved, the pro-rata
`targetComparison` that decides the donut's green/red), `quarter.js` (all
quarter math), `jobs.js`, `weekday.js` (the date-seeded rotation), `quotesData.js`
/ `logisticsQuotes.js`.

## Conventions and hard-won constraints

**Everything date-related is Australia/Sydney**, computed via
`Intl.DateTimeFormat` in `logic/quarter.js`. Never use the host timezone for
business logic. The one exception is the 3 a.m. reload window, which
deliberately uses TV-local time.

**Assume a weak GPU and a browser that lies.** This is the source of most
non-obvious code here:

- **Only animate compositor-friendly properties** (`opacity`, `transform`).
  Animating `box-shadow`, `filter`, or `width` on a loop causes visible
  glitching on the TV. The `.win2-cta` glow is the worked example: the glow
  lives on an `::after` layer whose opacity animates.
- **Don't leave `will-change` on permanently-animating elements.** They're
  auto-promoted anyway, and it pins the layer's texture in GPU memory forever.
- **The leaving slide stays mounted** for the entire life of the next slide
  (9–18s). `.slider-slide.leaving * { animation-play-state: paused }` stops its
  infinite animations burning frames against an invisible layer. Anything added
  that animates forever inherits this for free — don't defeat it.
- **GSAP `from()` tweens need `clearProps: 'all'`** (see `useGsapReveal.js`).
  Without it every split-text span keeps an inline transform and stays its own
  composited layer for the slide's whole life.
- **TV browsers misreport their viewport**: several report a desktop-sized one on
  first paint, settle a moment later, and never fire `resize`. `useFitTransform`
  therefore listens on resize/orientationchange/load/visualViewport *and* runs a
  short settling poll that switches itself off. Two traps, both commented in that
  file: no `ResizeObserver` on the document (its transform feeds back into what
  the document reports, causing flicker), and **the poll must call `apply()`, not
  the rAF-wrapped `fit()`** — rAF doesn't run while a page is backgrounded or not
  yet compositing, which is exactly when a TV is booting.

**Fonts are self-hosted, latin-subset, variable woff2** in `src/assets/fonts/`.
Do not reintroduce a Google Fonts `<link>` — a render-blocking stylesheet plus
DNS+TLS to two extra hosts is the single worst thing for boot time on a flaky TV
link. Note that `font-family: 'Archivo Expanded', 'Archivo'` appears in ~26 rules
but **"Archivo Expanded" is not a real family and has no @font-face** — those
rules have always resolved to plain Archivo, and that fallback is the approved
look. Declaring a face for it would widen every heading.

**The quote slide's portrait cannot be moved sideways with `object-position`.**
Every author portrait is taller than 16:9, so `object-fit: cover` crops
*vertically only* and the horizontal half of `object-position: center 25%` has
no effect whatever. Shifting the face requires widening the element past the
stage and pinning it to one edge — which also zooms in and eats the top of the
head. That was tried and rejected; the approved framing is plain `width: 100%`
at `center 25%`. If a face genuinely needs repositioning, re-crop the source
image instead of fighting it in CSS.

**Content integrity rules.** The daily quote list in `logic/quotesData.js` has a
rules block at the top; read it before touching that file. In short: every quote
needs a checkable primary source (an earlier version was written from memory and
over half the attributions were wrong), quote-aggregator sites are not evidence,
every author needs a portrait so the face always matches the name, and array
order is rotation order. `npm run quotes` self-checks for consecutive-day repeats.

**Photo captions are email subject lines, so treat them as untrusted text.**
The `postscoreboard` watcher turns the subject of a forwarded email into the
caption; it strips its own `scoreboard` trigger word but nothing else, so
whatever the sender wrote around it arrives too ("please - Ryan at Longreach
yesterday" reached the TV). `stripSubjectNoise()` in `api.js` removes a leading
run of filler words, but **only when a separator follows** — that is what marks
them as an instruction to the watcher rather than part of the sentence. Do not
make it greedier: "Thank you Tim for your DAFF washing efforts!" and "Please
welcome our new driver" are real captions that must survive untouched. The root
fix belongs in the watcher, which is out of scope for this repo; this is a
display-side guard.

**The Ideas Winner slide must never show the winner's name or photo** — the
teaser deliberately drives people to the intranet to find out.

**Caching is a contract, and `public/.htaccess` is the whole of it.** Every file
Vite emits into `assets/` is content-hashed, so it is served `immutable` for a
year — js, css, woff2 **and images** (the portraits and logo are hashed too;
leaving them off that list silently made them the only assets revalidated on
every load). `index.html` is the one stable filename and it names all the hashed
ones, so it must stay `no-cache, must-revalidate` — a cached copy pins the TV to
an old build forever and no redeploy is ever seen. Three traps, all verified
against real Apache rather than read off the config:

- **Every `Header` directive must sit inside `<IfModule mod_headers.c>`.** An
  unguarded one is a fatal config error, not a no-op, on a host where the module
  isn't loaded — and cPanel MultiPHP changes can shift that.
- **DEFLATE must list `text/javascript`, not just `application/javascript`.**
  Apache 2.4 serves `.js` as the former, so the `application/*` spelling alone
  leaves the largest file on the board uncompressed (256 KB instead of 86 KB).
- **Never gzip woff2.** Already compressed; re-compressing burns CPU for nothing.

To check any of this after a change, serve `dist/` through Apache with
`AllowOverride All` and inspect real response headers — `vite preview` and
`php -S` both ignore `.htaccess` entirely, so neither can tell you anything here.

## Deployment

See `docs/DEPLOY.md`. Short version: deployment is git-based. cPanel Git
Version Control clones this repo **into the subdomain docroot**, and the
repo-root `.htaccess` rewrites every request into `dist/` (requests already
under `dist/` are served as-is, which is what stops the rewrite looping).
So `dist/` is **committed** — the host has no Node and cannot build — and
publishing is `npm run build` → commit → push → *Update from Remote* in
cPanel. There is deliberately no `.cpanel.yml`: the copy step is redundant
under the rewrite, and removing it also removes cPanel's "Deploy HEAD Commit"
button, which could otherwise be aimed at the wrong docroot.

Two independent checkouts, `dev-scoreboard.depthintranet.com` and
`scoreboard.depthintranet.com`, so dev is a real staging gate. Verify
`/api/charts.php` returns JSON — it needs PHP 8.x with curl, a cPanel MultiPHP
setting — and that `/package.json` 404s, since the sources really are sitting
in the docroot and only `.htaccess` hides them.

`public/api/` holds the only server code: `charts.php` (Azure proxy), `img.php`
(resizing image proxy) and `beat.php` (uptime log: `src/kiosk.js` posts a boot
and a 5-minute heartbeat, `GET /api/beat.php?summary` lists each browser launch
and how long it ran — the TV's Puffin keeps getting closed, and this is how to
see when). All three cache beside themselves as `*.cache`, which `.htaccess`
denies over HTTP. `charts.php` has the most security surface:
a two-entry upstream whitelist, redirects capped at 2 and forced HTTPS-only
(a whitelisted host can still redirect anywhere — that was an SSRF hole), a 60s
cache in the system temp dir, and last-good-cache fallback on upstream failure.

`android-tv/` is a separate Android Studio project: a thin kiosk WebView shell
around the hosted URL (leanback launcher entry, boot receiver, keep-screen-on,
retry panel). It is deliberately a shell and not a bundled app, so content and
design changes ship via cPanel without re-sideloading. It has never been
compiled — this machine has no JDK or Android SDK.

## Known issues worth knowing before you touch nearby code

- **`Slider` tracks position by numeric index, not slide key.** The `ready` gate
  in `App.jsx` only covers the first render; if the slide list changes later (the
  midnight refetch can add or drop a section) every subsequent slide shifts under
  a live index. `Slider.jsx` already carries a clamp for the shrink case. The
  real fix is to track the current slide by `key`.
- **The `promises` CCT is stale.** It reads 25/0/25 and was last modified
  2026-01-06; the Zapier job that wrote it sits in Draft. `_promise_countdown` is
  an older dead copy from 2024. The live source of truth is a Google Sheet.
- **`--donut-hit` / `--donut-miss` in `app.css` are unused** and have drifted from
  the hardcoded colours in `FinancialSlide.jsx` (`#57c98a` vs `#4ADE97`).
  Adopting the CSS vars would visibly change the approved green.
- **`SECTIONS.quote` (`_slider`) is fetched every poll and thrown away.** The
  slide renders `resolveQuote()` from the local list instead, so that request is
  dead weight — 1 of 14 per cycle. Left in place only because pointing the slide
  back at the intranet feed is a one-line change.
- **`android-tv/` has no WebView navigation guard.** `ScoreboardWebViewClient`
  doesn't override `shouldOverrideUrlLoading`, so any redirect takes the kiosk
  anywhere with JS enabled and BACK swallowed. Mixed content is already blocked
  (`MIXED_CONTENT_NEVER_ALLOW`); pinning navigation to the scoreboard origin is
  the remaining piece. Untested either way — the app has never been compiled.
- **Deploying replaces a live WordPress install.** `scoreboard.depthintranet.com`
  currently still serves the old Elementor page: 208 KB of HTML and a REST API
  with 417 routes across 22 namespaces (iThemes Security, Elementor, AI1WM, WP
  Rocket). Retiring it is most of the security win. It holds no content — every
  CCT lives on `depthintranet.com` — so there is nothing to migrate.
