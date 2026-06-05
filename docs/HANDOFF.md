# HANDOFF — Relief Network v2

A single fullstack **Next.js 14** app (App Router, TypeScript) that replaces the
old `lbresponse-api` + `lbresponse-web` split, with The Collective's brand
applied. Behavior matches the old product; see `docs/AUDIT.md` for the contract.

---

## Test URL

**http://45.88.188.119:3000/**

- Default screen is **Need Help** (`/`), Arabic-first (RTL). English at `/en`.
- Other tabs: Help Center (`/help-center`), Map (`/map`).
- Served by `pm2` (process `relief-v2`) on port 3000, bound to `0.0.0.0`.
- No reverse proxy is installed on this server (no nginx/Caddy), so the app is
  exposed directly on the public IP. **If you later add nginx**, proxy a
  subdomain to `127.0.0.1:3000` and rebind the app to `HOSTNAME=127.0.0.1`; the
  human must add a DNS A record for that subdomain → `45.88.188.119`.

---

## Architecture (one app)

```
src/app/[locale]/…        Need Help (/), Help Center, Map  — Arabic default, RTL
src/app/api/…             Ported backend endpoints (organizations, filters, hotlines, status)
src/lib/…                 Ported normalization (entityStore, organizations, serviceCategoryMap)
prisma/schema.prisma      SQLite store (Provider, Hotline, Category, Meta)
scripts/ingest.ts         Data ingestion (backup snapshot | live Firebase RTDB)
messages/{ar,en}.json     i18n (next-intl)
public/{map.svg,sw.js,…}  Lebanon map asset, service worker, manifest
```

Data is **not** scraped from PowerBI by this app (it never was — see AUDIT §2).
The upstream PowerBI→Firebase scrape is an external job. This app reads the
already-normalized data, seeded into SQLite.

---

## Ingestion — how data gets in, and its schedule

**Live pipeline (active).** Real PowerBI data, refreshed every 6 hours. It scrapes
PowerBI directly (no browser, no Firebase), denormalizes, and **upserts** into
SQLite:

```bash
# One manual refresh (scrape → build JSON → upsert):
/home/chris/repos/relief-v2/scripts/refresh-live.sh
```

That script runs three steps (see `scripts/`):
1. `lbresponse-scrapper/.venv/bin/python main.py --no-firebase --no-database --csv once`
   — scrapes the Service Mapping table to `lbresponse-scrapper/output/*.csv`.
2. `build_entities_json.py` — reuses the scraper's own `reload_firebase`
   denormalization to write `data/live-entities.json`.
3. `npm run ingest -- --source=live` — **upserts** by deterministic `provider_id`:
   updates scraped fields, **preserves manual `pinned`/`verified`**, inserts new
   orgs, **never deletes**, and **never touches the 103 hotlines** (those aren't
   scraped — they're a separate dataset, currently seeded from the backup).

**Schedule:** `scripts/scheduler.mjs` runs under pm2 as **`relief-v2-refresh`** and
fires `refresh-live.sh` at **00:00 / 06:00 / 12:00 / 18:00 UTC** (matching the
upstream scraper's 6-hour cadence). `pm2 logs relief-v2-refresh` to watch it; the
crontab spool isn't writable for this user, hence pm2 rather than cron.

**Seeding / other sources** (`scripts/ingest.ts`):
```bash
npm run ingest                         # full replace from data/backup-lbresponse-db.json
npm run ingest -- --source=firebase    # full replace by mirroring the live RTDB
npm run ingest -- --source=live        # UPSERT from data/live-entities.json (used by cron)
```
Inspect state any time via `GET /api/status` (counts, source, last ingest time).

> Scraper venv: created at `lbresponse-scrapper/.venv` (pip bootstrapped via
> get-pip.py since the box has no system pip/venv package). Recreate with
> `python3 -m venv --without-pip .venv && .venv/bin/python <(curl -s https://bootstrap.pypa.io/get-pip.py) && .venv/bin/pip install -r requirements.txt Pillow`.

---

## Redeploy

```bash
cd /home/chris/repos/relief-v2
git pull                      # if pulling new code
npm install                   # runs prisma generate (postinstall)
npm run prisma:push           # only if prisma/schema.prisma changed
npm run ingest                # (re)seed data if needed
npm run build
pm2 restart relief-v2
```

pm2 process is saved (`pm2 save`). To survive a server reboot, run once (needs
sudo): `pm2 startup` and follow its printed command, then `pm2 save`.

Useful: `pm2 status`, `pm2 logs relief-v2`, `pm2 restart relief-v2`.

---

## Add / edit a translation

1. Edit **`messages/ar.json`** and **`messages/en.json`** — keep the same keys in
   both. Arabic is the default/fallback locale.
2. Reference strings with `useTranslations('namespace')` (client) or
   `getTranslations` (server). Nested keys like `header.needHelp.title`.
3. Rebuild (`npm run build && pm2 restart relief-v2`).
4. RTL is automatic: `<html dir="rtl">` for `ar`, `ltr` for `en` (set in
   `src/app/[locale]/layout.tsx`). Use logical CSS (`start/end`, `ms-/me-`) so
   layouts mirror correctly.

To add a **new locale**: add it to `routing.locales` in `src/i18n/routing.ts`,
add `messages/<locale>.json`, and (if RTL) extend the `dir` logic in the layout.

---

## Vercel cutover (prepared, NOT executed this sprint)

`vercel.json` is in the repo (`framework: nextjs`, `buildCommand: prisma generate
&& next build`). Before deploying:

1. **Database:** Vercel's serverless filesystem is ephemeral/read-only, so the
   file-based **SQLite store won't persist** there. For the cutover, either:
   - point the data layer at a hosted DB (e.g. Postgres/Turso) — change the
     Prisma `datasource` and run the ingest against it; or
   - have the API read the live **Firebase RTDB** directly (the ingest already
     has the firebase path; the store layer would call it instead of Prisma).
2. `vercel link` → `vercel env add` the `FIREBASE_*` vars (and DB URL).
3. `vercel --prod`.
4. Repoint the old frontend's domain/DNS once verified.

Do not deploy to Vercel until the DB strategy above is chosen.

---

## QA & tests

- `npm run build && npm run start` then Playwright: `npx playwright test`
  (23 specs: shell, data, need-help, help-center, map). All green.
- Visual QA screenshots per phase live in `qa/phase-N/` (mobile 390×844 +
  desktop 1440×900, AR-RTL + EN-LTR, light + dark).
- **Headless Chromium note:** this server lacks the system libs Chromium needs,
  so they were fetched without root into `~/.local/chromedeps`. Run Playwright /
  the QA script with:
  `LD_LIBRARY_PATH=$(cat ~/.local/chromedeps/LIBPATH.txt) npx playwright test`.

---

## Performance / PWA

- First-load JS ≈ 123–125 KB per route (well under the 300 KB budget);
  `svg-pan-zoom` is dynamically imported so it loads only on the Map tab.
- PWA: `public/manifest.webmanifest` + `public/sw.js` cache the app shell and the
  last-fetched API data (stale-while-revalidate), so a repeat visit works
  offline (read-only). An offline banner shows when the network drops.
