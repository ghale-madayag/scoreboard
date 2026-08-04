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

## Deploy to VentraIP cPanel

Deployment is git-based: cPanel **Git™ Version Control** clones this repo
*into the subdomain's Document Root*, and the repo-root `.htaccess` rewrites
every request into `dist/`. So the docroot is a checkout, and publishing is a
`git pull` from cPanel's UI.

`dist/` is therefore **committed** — VentraIP shared hosting has no Node and
cannot build. A stale `dist/` in a commit ships a stale site.

There is deliberately no `.cpanel.yml`: with the rewrite doing the work, a
copy step is redundant, and its absence removes cPanel's "Deploy HEAD Commit"
button so it cannot be aimed at the wrong docroot.

Two sites, one repo, one entry in Git Version Control each:

| | Document Root = repository path |
|---|---|
| dev  | `dev-scoreboard.depthintranet.com` |
| prod | `scoreboard.depthintranet.com` |

### First-time setup for a site

1. GitHub → repo → Settings → **Deploy keys** → add the cPanel account's SSH
   public key (SSH Access → Manage SSH Keys), read-only, **no passphrase**.
2. **Empty the target docroot.** cPanel refuses to clone into a non-empty
   directory, and a leftover WordPress `index.php` would keep being served in
   preference to `index.html` regardless. Zip the old docroot to your home
   directory first as a rollback.
3. Git Version Control → **Create** → clone URL
   `git@github.com:ghale-madayag/scoreboard.git`, Repository Path = that
   docroot.
4. MultiPHP Manager → **PHP 8.x** for the subdomain (`charts.php` needs curl).

### Every deploy after that

```
npm run build          # dist/ must be current
git commit -am "..."   # including dist/
git push
```

Then in cPanel: Git Version Control → **Manage → Pull or Deploy → Update from
Remote**, on whichever site you are publishing. Dev and prod are independent
checkouts, so dev stays a real staging gate.

### Verify

- `/` renders the board, and its HTML references `./assets/index-*.js`
  (if you see `/src/main.jsx`, the rewrite is not being applied — check that
  `AllowOverride All` is in effect)
- `/api/charts.php` and `/api/charts.php?data=jobs` return JSON
- `/package.json`, `/src/api.js`, `/.git/config` return 404 — the sources are
  physically present in the docroot and it is `.htaccess` that hides them
- `/api/cacert.pem` returns 403
- `index.html` carries `Cache-Control: no-cache`, `assets/*` carry `immutable`

Then reload the page once on the TV, or let the nightly ~3 a.m. reload pick it
up.

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
