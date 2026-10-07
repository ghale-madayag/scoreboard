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

function sessionId() {
  const bytes = new Uint8Array(8)
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function startKiosk() {
  acquireWakeLock()
  document.addEventListener('visibilitychange', acquireWakeLock)

  const sid = sessionId()
  const t0 = Date.now()
  const send = (ev) => {
    const body = JSON.stringify({
      ev,
      sid,
      up: Math.round((Date.now() - t0) / 1000),
      wl: wakeLock ? 1 : 0,
    })
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
  setTimeout(() => send('boot'), 3000)
  setInterval(() => send('beat'), BEAT_MS)
}
