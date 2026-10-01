import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In production /api/charts.php runs as real PHP on the cPanel host. Dev and
// preview have no PHP, so this middleware stands in for it — and deliberately
// mirrors charts.php rather than being a plain proxy, because the difference
// mattered: when Azure's GetGrossProfit started returning HTTP 500, the TV kept
// running on charts.php's last-good cache while dev lost the financial slide
// entirely (a failed section resolves to undefined, so App.jsx stops adding the
// slide). Dev should fail the way the wall fails, or it misleads during exactly
// the upstream outages worth debugging.
//
// Same contract as charts.php: dataset whitelist, 60s fresh window, serve the
// last good copy when the upstream fails, 502 only when there is nothing
// cached at all. X-Charts-Cache reports which path a response took.
const CHART_UPSTREAMS = {
  grossprofit: 'https://depthlogisticscharts-au.azurewebsites.net/api/GetGrossProfit',
  jobs: 'https://depthlogisticscharts-au.azurewebsites.net/api/GetFreightJobs',
}
const CHART_CACHE_TTL_MS = 60_000
const CHART_CACHE_DIR = path.resolve('.cache/charts')

async function chartsHandler(req, res) {
  const wantsJobs = new URL(req.url, 'http://x').searchParams.get('data') === 'jobs'
  const dataset = wantsJobs ? 'jobs' : 'grossprofit'
  const file = path.join(CHART_CACHE_DIR, `${dataset}.json`)

  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')

  const send = (state, payload, code = 200) => {
    res.statusCode = code
    res.setHeader('X-Charts-Cache', state)
    res.end(payload)
  }

  try {
    if (Date.now() - fs.statSync(file).mtimeMs < CHART_CACHE_TTL_MS) {
      return send('hit', fs.readFileSync(file))
    }
  } catch { /* no cache yet */ }

  let fresh = null
  try {
    const r = await fetch(CHART_UPSTREAMS[dataset], { signal: AbortSignal.timeout(15_000) })
    if (r.ok) {
      const text = await r.text()
      JSON.parse(text) // a 200 carrying an error page must not be cached
      fresh = text
    }
  } catch { /* upstream down, slow, or not JSON */ }

  if (fresh !== null) {
    try {
      fs.mkdirSync(CHART_CACHE_DIR, { recursive: true })
      fs.writeFileSync(file, fresh)
    } catch { /* cache is an optimisation, never fail the request for it */ }
    return send('stored', fresh)
  }

  try {
    return send('stale', fs.readFileSync(file))
  } catch {
    return send('miss', JSON.stringify({ error: `Upstream ${dataset} API unavailable` }), 502)
  }
}

const chartsPhpFallback = {
  name: 'charts-php-cache',
  configureServer(s) { s.middlewares.use('/api/charts.php', chartsHandler) },
  configurePreviewServer(s) { s.middlewares.use('/api/charts.php', chartsHandler) },
}

// In production /api/img.php resizes and caches intranet photos as real PHP.
// Dev and preview have no PHP, so this middleware 302s the browser straight
// back to the original intranet URL — slower, but pixel-identical behaviour.
const imgPhpFallback = {
  name: 'img-php-redirect',
  configureServer(s) { s.middlewares.use('/api/img.php', redirectToSource) },
  configurePreviewServer(s) { s.middlewares.use('/api/img.php', redirectToSource) },
}
function redirectToSource(req, res) {
  const src = new URL(req.url, 'http://x').searchParams.get('src')
  if (src && /^https:\/\/depthintranet\.com\/wp-content\/uploads\//.test(src)) {
    res.statusCode = 302
    res.setHeader('Location', src)
  } else {
    res.statusCode = 400
  }
  res.end()
}

// host: true binds 0.0.0.0 instead of localhost, so the TV (or any device on
// the same wifi) can open the board at http://<this-machine-ip>:5173.
// Both charts.php and img.php are served by plugin middleware that registers
// itself on dev AND preview — preview does not inherit server.proxy, and the
// financial slide's charts.php call used to 404 on the built site without a
// second copy of it.
export default defineConfig({
  base: './',
  plugins: [react(), chartsPhpFallback, imgPhpFallback],
  server: { host: true },
  preview: { host: true, port: 4173 },
})
