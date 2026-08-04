import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In production /api/charts.php runs as real PHP on the cPanel host.
// In dev, Vite proxies it straight to the Azure API (server-side, so no CORS issue).
const chartsProxy = {
  '/api/charts.php': {
    target: 'https://depthlogisticscharts-au.azurewebsites.net',
    changeOrigin: true,
    rewrite: (url) =>
      url.includes('data=jobs') ? '/api/GetFreightJobs' : '/api/GetGrossProfit',
  },
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
// `preview` needs its own copy of the proxy — it does not inherit server.proxy,
// and without it the financial slide's charts.php call 404s on the built site.
export default defineConfig({
  base: './',
  plugins: [react(), imgPhpFallback],
  server: { host: true, proxy: chartsProxy },
  preview: { host: true, port: 4173, proxy: chartsProxy },
})
