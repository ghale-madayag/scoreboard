// Warm the browser HTTP cache for every remote image the slides will show.
//
// The slider only ever mounts two slides, so each intranet photo starts
// downloading the moment its slide becomes active — on the TV's link that is
// a visible pop-in mid-slide. Instead, after every successful fetch we walk
// the data for image URLs and pull them while the first (image-free)
// financial slide is still on screen.
//
// Deliberately not a service worker: TV browser support is unreliable, and a
// SW can pin an old build against the index.html no-cache contract. The
// browser HTTP cache plus the intranet's own cache headers do the job.

const IMG_RE = /^https?:\/\/[^\s"']+\.(?:jpe?g|png|webp|gif|avif)(?:\?[^\s"']*)?$/i

const done = new Set() // loaded ok this session — never re-requested
const queued = new Set() // in the queue or in flight — no duplicates
const queue = []
let inFlight = 0

// Three at a time: images now come same-origin and pre-shrunk via
// api/img.php, so a slot is occupied for far less time than when this
// pulled multi-MB originals straight from the intranet.
const CONCURRENCY = 3
// A hung request must not wedge the queue. Failures and timeouts are not
// added to `done`, so the next poll (4 min) retries them.
const TIMEOUT_MS = 30_000

function next() {
  while (inFlight < CONCURRENCY && queue.length) {
    const url = queue.shift()
    inFlight++
    const img = new Image()
    let timer
    const finish = (ok) => {
      if (!queued.has(url)) return // already settled (timeout raced load)
      queued.delete(url)
      clearTimeout(timer)
      img.onload = img.onerror = null
      if (ok) done.add(url)
      inFlight--
      next()
    }
    timer = setTimeout(() => finish(false), TIMEOUT_MS)
    img.onload = () => finish(true)
    img.onerror = () => finish(false)
    img.src = url
  }
}

// Recursively collect image-looking string values from the fetched data.
// Walking the whole payload (rather than naming each slide's field) means a
// new section's images are preloaded without touching this file.
export function collectImageUrls(value, out = []) {
  if (typeof value === 'string') {
    if (IMG_RE.test(value)) out.push(value)
  } else if (Array.isArray(value)) {
    for (const v of value) collectImageUrls(v, out)
  } else if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) collectImageUrls(value[k], out)
  }
  return out
}

// Queue URLs for preload. Already-loaded and already-queued URLs are
// no-ops, so calling this with the same data every poll costs nothing.
export function preloadImages(urls) {
  for (const url of urls) {
    if (!url || done.has(url) || queued.has(url)) continue
    queued.add(url)
    queue.push(url)
  }
  next()
}
