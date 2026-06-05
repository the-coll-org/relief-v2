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

```bash
# Default: seed from the bundled snapshot (data/backup-lbresponse-db.json).
npm run ingest

# Refresh from the LIVE Firebase Realtime Database (project collreliefnetwork):
FIREBASE_SERVICE_ACCOUNT=/home/chris/repos/lbresponse-api/service-account.json \
  npm run ingest -- --source=firebase
```

- A full ingest **replaces** the SQLite contents (clear + bulk insert) and writes
  metadata to the `Meta` table (source, ingested_at, upstream `last_mirrored`,
  counts). Inspect via `GET /api/status`.
- **Schedule:** the old backend ran **no cron** — freshness came from the
  external mirror writing Firebase. To keep the live mirror current, add a cron
  on this server, e.g. nightly (the upstream scrape is ~daily):
  ```cron
  30 3 * * *  cd /home/chris/repos/relief-v2 && FIREBASE_SERVICE_ACCOUNT=/home/chris/repos/lbresponse-api/service-account.json /home/chris/.local/bin/npm run ingest -- --source=firebase >> /tmp/relief-ingest.log 2>&1
  ```
  Until that's wired, the app serves the snapshot (data as of 2026-05-06).

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
