# Relief Network v2 — The Collective

A single fullstack **Next.js 14** app for crisis relief in Lebanon: find food,
shelter, medical care, and emergency hotlines fast. Arabic-first (RTL), English
secondary, dark mode, mobile-first, offline-capable (PWA). Replaces the old
`lbresponse-api` (Express/Firebase) + `lbresponse-web` (React/Vite) split.

## Quick start

```bash
npm install                 # installs deps + generates the Prisma client
npm run prisma:push         # create the SQLite database
npm run ingest              # seed it from the bundled snapshot
npm run dev                 # http://localhost:3000  (Arabic, RTL by default)
```

Production:

```bash
npm run build && npm start  # or: pm2 start npm --name relief-v2 -- start
```

## Tabs

| Route | Tab | What |
| --- | --- | --- |
| `/` | Need Help | Search + sector filters + organization cards (call / map) |
| `/help-center` | Help Center | 4 emergency hotlines + searchable directory |
| `/map` | Map | Lebanon map with per-region clusters + inline org lists |

English equivalents live under `/en`, `/en/help-center`, `/en/map`.

## How it works

- **Data:** SQLite (Prisma) seeded by `scripts/ingest.ts` from the audited
  Firebase RTDB shape — either the bundled snapshot (default) or the live RTDB
  (`--source=firebase`). The PowerBI→RTDB scrape is an external upstream job (see
  `docs/AUDIT.md` §2).
- **API:** `src/app/api/*` route handlers port the old Express backend's
  `organizations` / `filters` / `hotlines` logic verbatim.
- **i18n:** next-intl, Arabic default + RTL; strings in `messages/{ar,en}.json`.
- **Design tokens:** CSS variables in `src/app/globals.css`, surfaced as Tailwind
  utilities (`bg-primary`, `rounded-card`, …). No raw hex in components.

See **`docs/AUDIT.md`** (system contract) and **`docs/HANDOFF.md`** (deploy,
ingestion schedule, translations, Vercel cutover).

## Tests

```bash
LD_LIBRARY_PATH=$(cat ~/.local/chromedeps/LIBPATH.txt) npx playwright test
```
