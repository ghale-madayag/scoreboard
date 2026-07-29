import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In production /api/charts.php runs as real PHP on the cPanel host.
// In dev, Vite proxies it straight to the Azure API (server-side, so no CORS issue).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      '/api/charts.php': {
        target: 'https://depthlogisticscharts-au.azurewebsites.net',
        changeOrigin: true,
        rewrite: (url) =>
          url.includes('data=jobs') ? '/api/GetFreightJobs' : '/api/GetGrossProfit',
      },
    },
  },
})
