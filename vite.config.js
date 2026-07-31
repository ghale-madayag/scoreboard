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

// host: true binds 0.0.0.0 instead of localhost, so the TV (or any device on
// the same wifi) can open the board at http://<this-machine-ip>:5173.
// `preview` needs its own copy of the proxy — it does not inherit server.proxy,
// and without it the financial slide's charts.php call 404s on the built site.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true, proxy: chartsProxy },
  preview: { host: true, port: 4173, proxy: chartsProxy },
})
