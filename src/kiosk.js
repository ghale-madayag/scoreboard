// Two things the page can do for the wall display, given that the TV browser
// (Puffin) keeps being closed and dropping the set back to its launcher.
// A web page cannot relaunch the browser - only a kiosk/home app can - so
// these cover what is in reach from here:
//
//  1. Hold a screen wake lock, so the TV's idle handling does not decide the
//     screen is unused and background the browser before it gets killed.
//  2. Report each launch and a heartbeat to api/beat.php. Each "boot" is one
//     launch of the browser; the gap between a session's last beat and the
//     next boot is how long the TV sat on its launcher. That turns "about
//     three times a day" into times and durations, and shows whether the
//     wake lock is even supported (the `wl` field) and whether it helped.
//
// Both are fire-and-forget. Nothing here can affect what the board renders,
// and every failure is swallowed: dev and `vite preview` have no PHP, so the
// beacon simply 404s there.

const BEAT_MS = 5 * 60 * 1000

let wakeLock = null

async function acquireWakeLock() {
  if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return
  try {
    wakeLock = await navigator.wakeLock.request('screen')
    // The system drops the lock whenever the page is hidden; forget it so the
    // next visibility change asks again.
    wakeLock.addEventListener('release', () => { wakeLock = null })
  } catch {
    wakeLock = null // unsupported, denied, or not a secure context
  }
}

function randomHex() {
  const bytes = new Uint8Array(8)
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// One id per BROWSER, kept across reloads, so the log can count TVs rather
// than pages. Pages over-count: every time Puffin is reopened it starts a new
// page while the abandoned one keeps running on Puffin's servers - three live
// pages one morning were almost certainly one TV. If storage is unavailable
// the id is per-page and `persisted` says so, so a count built on it is never
// mistaken for a real one.
const DEVICE_KEY = 'sb-device'
function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id || !/^[0-9a-f]{16}$/.test(id)) {
      id = randomHex()
      localStorage.setItem(DEVICE_KEY, id)
    }
    return { id, persisted: localStorage.getItem(DEVICE_KEY) === id }
  } catch {
    return { id: randomHex(), persisted: false }
  }
}

// The content hash Vite puts in the bundle's filename is exactly the build
// identity that matters - it is what the deploy checks compare - and the
// bundle can read it off its own URL. 'dev' under the dev server.
const BUILD = (import.meta.url.match(/index-([A-Za-z0-9_-]+)\.js/) || [])[1] || 'dev'

// ---- Auto-update ----------------------------------------------------------
// The TV never picked up deploys by itself: reopening Puffin reattaches to a
// page already running on Puffin's servers instead of loading a fresh one, so
// after a deploy the wall kept running the old build until someone found
// Puffin's reload button. Instead, the page periodically fetches index.html
// (never cached - see .htaccess), reads which bundle it now names, and
// reloads itself onto a newer one.
const UPDATE_CHECK_MS = 4 * 60 * 1000
const TRIED_KEY = 'sb-update-tried'

// Pure, so it can be checked in Node: the newer bundle hash index.html names,
// or null if there is nothing to do.
export function newBuildFrom(html, currentBuild) {
  if (currentBuild === 'dev' || typeof html !== 'string') return null
  const m = html.match(/assets\/index-([A-Za-z0-9_-]+)\.js/)
  return m && m[1] !== currentBuild ? m[1] : null
}

async function checkForUpdate() {
  try {
    const res = await fetch(location.pathname, { cache: 'no-store' })
    if (!res.ok) return
    const next = newBuildFrom(await res.text(), BUILD)
    if (!next) return

    // Never reload twice for the same build. If a reload somehow lands back
    // on the old bundle, retrying every 4 minutes would turn this into the
    // same kind of reload loop the 3 a.m. job had.
    try {
      if (sessionStorage.getItem(TRIED_KEY) === next) return
    } catch { /* no storage: the bundle check below is the remaining guard */ }

    // Only reload onto files that are really there. A git pull that has
    // updated index.html but not yet written the new bundle would otherwise
    // reload the board into a 404 and a blank screen.
    const js = await fetch(`assets/index-${next}.js`, { method: 'HEAD', cache: 'no-store' })
    if (!js.ok) return

    try { sessionStorage.setItem(TRIED_KEY, next) } catch { /* see above */ }
    location.reload()
  } catch { /* offline or server hiccup: try again next interval */ }
}

// ---- Drop signals ----------------------------------------------------------
// Under Puffin the page runs on Puffin's servers and the TV only displays a
// stream of it, so when the TV drops to its launcher the page carries on
// checking in, healthy, for hours - the log could see launches but not the
// moment the TV stopped watching. Two signals aim at that moment:
//  - frames: how many frames the page actually painted in one second at each
//    check-in. A page nothing is displaying is usually not composited at all,
//    so this falls to 0.
//  - visibility, sent the instant it changes, so a hide is timestamped to the
//    second rather than to the next 5-minute check-in.
// Both carry the slide on screen at the time, to show whether drops cluster
// on particular content. Measuring costs one second of rAF every 5 minutes.

function currentSlide() {
  const el = document.querySelector('.slider-slide.active')
  const key = el && el.dataset.slide
  if (!key) return 'none'
  return key.startsWith('photo-') ? 'photo' : key.slice(0, 24)
}

function countFrames(ms) {
  return new Promise((resolve) => {
    let frames = 0
    let done = false
    const tick = () => {
      if (done) return
      frames++
      requestAnimationFrame(tick)
    }
    try { requestAnimationFrame(tick) } catch { /* no rAF: reports 0 */ }
    // setTimeout, not rAF, ends the window: if nothing is painting, rAF never
    // fires at all and this must still resolve.
    setTimeout(() => { done = true; resolve(frames) }, ms)
  })
}

export function startKiosk() {
  acquireWakeLock()
  document.addEventListener('visibilitychange', acquireWakeLock)

  const sid = randomHex()
  const device = deviceId()
  const t0 = Date.now()
  const send = (ev, frames) => {
    const payload = {
      ev,
      sid,
      up: Math.round((Date.now() - t0) / 1000),
      wl: wakeLock ? 1 : 0,
      dev: device.id,
      dp: device.persisted ? 1 : 0,
      bld: BUILD,
      vis: document.visibilityState === 'visible' ? 1 : 0,
      sl: currentSlide(),
    }
    if (typeof frames === 'number') payload.fr = Math.min(frames, 1000)
    const body = JSON.stringify(payload)
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('api/beat.php', new Blob([body], { type: 'application/json' }))
      } else {
        fetch('api/beat.php', {
          method: 'POST',
          body,
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
        }).catch(() => {})
      }
    } catch { /* telemetry must never break the board */ }
  }

  // Give the wake-lock request a moment to settle so the boot record reports
  // whether it was granted.
  setTimeout(() => countFrames(1000).then((f) => send('boot', f)), 2000)
  setInterval(() => countFrames(1000).then((f) => send('beat', f)), BEAT_MS)
  // Debounced: report a visibility state only once it has held for 3 s. A
  // drop is the screen going away and STAYING away; a flicker is not one, and
  // a browser pane that flips states can otherwise send a dozen events in
  // seconds - seen while testing this.
  let visTimer = null
  document.addEventListener('visibilitychange', () => {
    clearTimeout(visTimer)
    const state = document.visibilityState
    visTimer = setTimeout(() => {
      if (document.visibilityState === state) send('vis')
    }, 3000)
  })
  if (BUILD !== 'dev') setInterval(checkForUpdate, UPDATE_CHECK_MS)
}
