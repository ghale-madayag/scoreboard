# Depth Scoreboard — Build & Deploy

The scoreboard is a static React (Vite) app plus one PHP file. It reads all
content from the existing intranet WordPress REST APIs (`depthintranet.com`)
and the Azure gross-profit API (via `api/charts.php`, because Azure sends no
CORS headers). There is no database and no admin panel here — content is still
edited in the intranet WP admin, and the `postscoreboard` / `checkwinner`
automations are unchanged.

## Local development

```
npm install
npm run dev          # http://localhost:5173 (Vite proxies /api/charts.php to Azure)
```

To test the production build exactly as cPanel will serve it:

```
npm run build
php -S localhost:8099 -t dist
```

## Deploy to VentraIP cPanel (scoreboard.depthintranet.com)

1. `npm run build` → everything needed is in `dist/`
   (`index.html`, `assets/`, `api/charts.php`, `api/cacert.pem`, `.htaccess`).
2. In cPanel File Manager, **zip the current docroot** of
   `scoreboard.depthintranet.com` as a rollback copy before touching it.
3. Delete the old WordPress files from the docroot and upload the contents of
   `dist/` in their place (or upload `dist.zip` and extract).
4. Verify:
   - `https://scoreboard.depthintranet.com/` renders the board
   - `https://scoreboard.depthintranet.com/api/charts.php` returns JSON
     (requires PHP 8.x with curl — check cPanel MultiPHP if not)
5. Reload the page once on the TV (Puffin TV Browser).

### Redeploying later

`npm run build`, upload `dist/` contents again. The TV picks up the new build
at its nightly ~3 a.m. automatic reload, or reload manually.

### After a week of burn-in

- Delete the old scoreboard WordPress database in cPanel (the intranet WP at
  `depthintranet.com` is a separate install — leave it alone).
- Optional cleanup: `postscoreboard/watch.php` and `checkwinner/checkwinner.php`
  still POST to the old `custom/v1/clear-cache` endpoint on this subdomain.
  Both tolerate the failure, but the calls can be removed.

## TV behavior notes

- Polls all data sources every ~4 minutes; countdown ticks locally.
- Daily items (term/flag/riddle/quote) flip at midnight Sydney time without a reload.
- The page fully reloads itself once between 3:00–3:15 a.m. (TV-local time)
  to keep Puffin's memory fresh and pick up redeploys.
- If the network drops, the board keeps showing the last data and displays a
  red "last updated" badge after ~12 minutes of failures.
