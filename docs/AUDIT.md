# AUDIT — Lebanon Crisis Response Platform (existing system)

> Phase 0 deliverable. A complete written understanding of the existing system,
> produced **before** writing any application code. The existing repos are
> behavior-canonical; this document records what they actually do.

**Reference repos (read-only):**

- Backend: `/home/chris/repos/lbresponse-api` (Express + TypeScript + Firebase Admin SDK, runs in Docker)
  - A second checkout `/home/chris/repos/lbresponse-api-develop` is the same app on the `develop` branch — no material differences for this audit (same routes, same data model, no extra ingestion code).
- Frontend: `/home/chris/repos/lbresponse-web` (Vite + React 19 + TypeScript + Tailwind v4 + react-i18next + react-router 7, deployed on Vercel)
- Live testing instance: https://testing-rn.thecoll.org/
- Data snapshot: `/home/chris/repos/lbresponse-api/backup-lbresponse-db.json` (6.1 MB full RTDB export, mirrored **2026-05-06T18:41:46Z**)

> ⚠️ **TOP-LINE FINDING (read first):** The PowerBI → database ingestion pipeline
> is **NOT present in either repo.** The existing Express backend does **not**
> scrape PowerBI; it only **reads already-prepared data from a Firebase Realtime
> Database**. The actual scraping + transform is an external job (`scripts/reload_firebase.py`,
> Python, not in any repo here). See **§2** and **§5**. Per the brief's
> precedence rule, work is **paused after this audit** pending a decision on the
> data-ingestion approach for the rebuild.

---

## 1. Backend architecture

### 1.1 Stack & runtime

| Aspect | Value |
| --- | --- |
| Framework | Express 5 (`src/app.ts`, `src/index.ts`) |
| Language | TypeScript (compiled to `dist/` via `tsc`) |
| Data store | **Firebase Realtime Database (RTDB)** via `firebase-admin` — *not* Firestore |
| Auth (admin only) | Firebase Auth (Google sign-in) + httpOnly session cookie |
| View layer (admin only) | EJS server-rendered pages under `/admin` |
| Container | Multi-stage `Dockerfile` (node:22-alpine), runs as non-root `appuser`, read-only rootfs, listens on `:3000` |
| Reverse proxy | Designed to sit behind host **Caddy** (TLS), bound to `127.0.0.1:${HOST_PORT:-3000}` |
| Hardening | helmet + CSP, `express-rate-limit`, compression, graceful shutdown, `cap_drop: ALL`, `no-new-privileges` |

> **README discrepancy:** `README.md` repeatedly says "Firestore" and shows
> `db.collection(...)` examples. The **actual code uses Realtime Database**
> (`admin.database()`, `db.ref(path).once('value')`, REST `.json?shallow=true`).
> Code is canonical; the README is stale. The rebuild must follow the RTDB shape.

### 1.2 Firebase connection

- `src/config/firebase.ts` — `getDb()` returns `admin.database()`. Credentials resolved from either individual env vars (`FIREBASE_PROJECT_ID` + `FIREBASE_PRIVATE_KEY` + `FIREBASE_CLIENT_EMAIL`) **or** a `service-account.json` file (`GOOGLE_APPLICATION_CREDENTIALS`). `databaseURL` from `FIREBASE_DB_URL`.
- `src/config/firebaseRest.ts` — `firebaseShallowGet(path)` does an authenticated `GET {FIREBASE_DB_URL}/{path}.json?shallow=true` (lists keys without downloading whole subtrees; used by the dashboard/visuals routes).
- **Live project:** the committed `.env` points at `FIREBASE_DB_URL=https://collreliefnetwork-default-rtdb.europe-west1.firebasedatabase.app` and a committed `service-account.json` for project **`collreliefnetwork`**. (The `.env.example` still references the *old* pre-migration project `lbresponse-db`; `scripts/migrate-firebase.mjs` was used to migrate old → new.)
- The committed service-account credential means live RTDB access is technically feasible, but hitting the live shared production DB was **not authorized** for this audit. All data figures below come from the sanctioned `backup-lbresponse-db.json` snapshot.

### 1.3 Endpoints

App wiring in `src/app.ts`. All `/api/*` data endpoints are **read-only**; writes happen only via the authenticated `/admin` dashboard.

| Method | Path | Handler | Response shape |
| --- | --- | --- | --- |
| GET | `/health` | inline | `{ status:"ok", timestamp }` |
| GET | `/api/status` | inline | `{ name, version, uptime, environment }` |
| GET | `/api/organizations` | `organizationsController.listOrganizations` | `{ data: OrganizationDto[], total, page, page_size }` |
| GET | `/api/organizations/map` | `organizationsController.mapListOrganizations` | `{ data: MapRegionGroup[], total }` |
| GET | `/api/organizations/:id` | `organizationsController.getOrganization` | `{ data: OrganizationDto }` |
| GET | `/api/filters` | `filtersController.listFilters` | `{ data: FilterGroup[] }` |
| GET | `/api/hotlines` | `hotlinesController.listHotlines` | `{ data: EmergencyContact[], total, page, page_size }` |
| GET | `/api/hotlines/:id` | `hotlinesController.getHotline` | `{ data: EmergencyContact }` |
| GET | `/api/dashboard` | `routes/dashboard.ts` | `{ visuals, rows, pages[] }` (raw PowerBI stats) |
| GET | `/api/visuals` | `routes/visuals.ts` | `{ data: VisualMetadata[], total }` |
| GET | `/api/visuals/:key` | `routes/visuals.ts` | `{ metadata, data: rows[], total }` |
| POST | `/api/client-errors` | `routes/clientErrors.ts` | client error log sink (rate-limited) |
| GET/POST | `/admin/*` | `routes/admin.ts` | EJS dashboard (Google-auth gated) |

> **Used by the frontend:** only `/api/organizations`, `/api/organizations/map`,
> `/api/filters`, `/api/hotlines`. `/api/dashboard` + `/api/visuals` expose the
> raw scraped PowerBI tree and are **not** consumed by the web app (internal/debug).
> The rebuild must reproduce the four consumed endpoints; the visuals/dashboard
> endpoints are optional.

#### `/api/organizations` query params (from `listOrganizations`)
`search` (free text), `organization_type` (csv), `sector` (csv, slugified), `location` (csv district, slugified), `category` (csv CRN category id), `sort` (`relevance`|`az`, default `az`), `page` (default 1), `page_size` (default 10, max 100), `include` (csv; `services` to include the services array — otherwise services are stripped).

#### `/api/organizations/map` query params
Same filter params (`organization_type`, `sector`, `location`, `category`); returns region groups keyed by the org's **first district**, each `{ region, region_id, count, listings[] }`.

#### `/api/filters`
Returns three groups computed live from the data: `sector`, `district`, and `category` (the CRN service categories). Each option carries `result_count` and bilingual labels.

#### `/api/hotlines` query params
`category` (csv), `city` (exact match), `search` (free text), `page`, `page_size`.

### 1.4 Data model (RTDB tree)

Top-level keys (confirmed from `backup-lbresponse-db.json`):

```
/categories
    /district/{slug}   → { key, en_label, ar_label?, sort_order }        (26 districts)
    /sector/{slug}     → { key, en_label, ar_label?, sort_order }        (10 sectors)
/entities
    /providers/{id}    → Provider                                        (687 records)
    (/locations        → READ by code but ABSENT in data — see note)
/entities_metadata     → { counts:{providers, category_sector, category_district}, last_mirrored, source }
/hotlines/{slug}       → EmergencyContact                                (103 records)
/powerbi_data/{key}    → { metadata:{visual_name,page,entities,last_scraped,row_count}, rows[] }  (47 visuals, raw scrape)
```

**`Provider`** (`src/models/Organization.ts`, confirmed against backup):
```ts
provider_id, provider_name, provider_name_ar?, slug?,
primary_contact?{name,email,phone,whatsapp}, secondary_contact?{…},
sectors?: string[], districts?: string[], services?: ProviderService[],
service_count?, is_name_valid?, pinned?, verified?, updated_at?
// records also carry flat district / district_slug / org_slug fields
```
**`ProviderService`**: `{ name, sector, district, target_age_gender, target_population, accessible }`.
**`EmergencyContact`** (hotline): `{ id, category, city, name_en, name_ar, hotline?, phone?, email?, source_url?, inserted_at, updated_at? }`.

> **`entities/locations` is read by `entityStore.ts` but does not exist in the
> data.** Consequence: `locations` Map is always empty, so
> `lookupGovernorate()` always returns `null` → **`OrganizationDto.governorate`
> is always null in practice.** Zone/region display is driven entirely by
> `Provider.districts`. The rebuild can drop the empty `locations` lookup.

### 1.5 The entity store, caching, and the API's real "business logic"

`src/utils/entityStore.ts` loads `entities/providers`, `entities/locations`, `categories`, `hotlines` from RTDB into an **in-memory snapshot with a 60-second TTL** (single-flight via a `pending` promise). It filters providers to those with a valid name (`is_name_valid !== false` and name contains a letter, isn't a bare phone number).

The heavy lifting is in `organizationsController.ts` and is **must-port behavior**:
- `toDto(provider)` → `OrganizationDto`: builds description from first 3 distinct service names (strips `CODE123:` prefixes), collects + validates Lebanese phone numbers (`isValidLebanesePhone`: 7–8 digits after optional `961`, rejects repeated digits), picks whatsapp/email, normalizes sectors+service-sectors into CRN categories, derives `map_url` from first district.
- `expandToDtos()` — splits a provider whose name is a comma-list (e.g. `"A, B, C"` before any `/`) into multiple orgs.
- `buildMergedDtos()` — two-pass dedup: (1) by `title|district`, preferring records that have a phone and non-split records; (2) merges remaining records that share `title|phone` (or `title|email`) by unioning their districts. **The org count the UI shows is the count of these merged DTOs, not raw providers.**
- `filterDtos()` — applies type/sector/location/category filters.
- `scoreMatch()` — relevance scoring for `search` (title 3, description 2, location/type 1).

`filtersController.ts` tallies sector/district counts and reuses `buildMergedDtos()` so category counts match `/api/organizations` exactly.

### 1.6 Cron / scheduled jobs

**None in the backend.** There are no `node-cron`, scheduler, or timer references anywhere in `lbresponse-api`. The only "freshness" mechanism is the 60 s in-memory cache TTL. Data freshness comes entirely from the **external** mirror job that writes RTDB (§2). `scripts/migrate-firebase.mjs` is a one-off project-to-project RTDB copy tool, **not** an ingestion job.

---

## 2. PowerBI ingestion (most important section)

### 2.1 What is actually in the repos

The backend's only interaction with PowerBI data is **read-only**, via two debug
endpoints that read an already-populated `/powerbi_data` RTDB subtree:

- `src/routes/visuals.ts` — lists `/powerbi_data/{key}/metadata` and serves `/powerbi_data/{key}/rows`.
- `src/routes/dashboard.ts` — aggregates `row_count` + `page` across all visuals.

The `/powerbi_data` rows are the raw scrape output. Example
(`backup-lbresponse-db.json`):
```json
"A3 Matrix Partners_Main_horizontal_26_district_conversion_26_pivotTable": {
  "metadata": { "page": "A3 Matrix Partners", "row_count": 1583,
    "last_scraped": "2026-05-05T08:06:35.604926+00:00",
    "entities": ["Main_horizontal_26","district_conversion_26"] },
  "rows": [ { "Partner":"AICA", "Sector":"Child Protection",
             "Count of Services_Service":2, "_scraped_at":"2026-05-05T08:06:35…" }, … ]
}
```
47 such visuals exist, each tagged with `last_scraped`.

### 2.2 What is NOT in the repos (the gap)

**The mechanism that gets data from the PowerBI dashboard into the database is
absent from every repo on this server.** Two distinct external stages are
involved, and neither's code exists here:

1. **PowerBI scraper** → writes the raw `/powerbi_data` tree (the thing carrying `_scraped_at` / `last_scraped`). No scraper code (no Puppeteer/Playwright/Python, no calls to `app.powerbi.com`'s `querydata`/`QueryData` backing endpoints) exists in either repo.
2. **The transform/mirror** → reads `/powerbi_data`, normalizes it into `/entities/providers`, `/categories`, `/hotlines`, and stamps `/entities_metadata`. **`entities_metadata.source` names this script explicitly:**
   ```json
   "entities_metadata": {
     "counts": { "providers": 686, "category_sector": 10, "category_district": 26 },
     "last_mirrored": "2026-05-06T18:41:46.301530+00:00",
     "source": "scripts/reload_firebase.py"
   }
   ```
   A filesystem-wide search found **no `reload_firebase.py`** and no Python
   ingestion code anywhere on this server.

### 2.3 What this means

- The Express backend's **own** data source is **Firebase RTDB**, full stop. "Porting how the current backend pulls/parses this data" = reading `/entities/providers`, `/categories`, `/hotlines` from RTDB. That part is fully determinable and reproducible.
- The **PowerBI→RTDB scraping/transform was never the backend's job** — it is an external Python pipeline (`reload_firebase.py` + a scraper) that is not in scope of these repos and is not present here.
- Therefore the refresh cadence, the exact PowerBI endpoints/tokens, and the parsing logic of the scrape **cannot be determined from the available code.** Observed timestamps suggest roughly daily scraping (`last_scraped` 2026-05-05) feeding a mirror run a day later (`last_mirrored` 2026-05-06), but that is inference, not code.

Per the brief ("if the PowerBI ingestion mechanism cannot be determined from the
code, STOP after writing the audit and surface it. do not guess an ingestion
strategy") — **this is the stop point.** See §5 for the decision needed.

---

## 3. Frontend architecture

### 3.1 Stack, routing, shell

- Vite 8 + React 19 + TS + Tailwind v4 + react-router-dom 7 + react-i18next + `svg-pan-zoom`. PWA via `vite-plugin-pwa` (1-hour API cache).
- Entry: `src/main.tsx` → `BrowserRouter` → `ErrorBoundary` → `ThemeProvider` → `ToastProvider` → `App` → `ToastContainer`.
- Routes (`src/App.tsx`), all wrapped by `AppLayout` (header + `<Outlet>` + bottom nav):

  | Path | Screen |
  | --- | --- |
  | `/` | redirect → `/need-help` |
  | `/need-help` | `NeedHelpScreen` (primary "Need Help" tab) |
  | `/help-center` | `HelpCenterScreen` (hotlines + directory) |
  | `/map` | `MapScreen` (Lebanon resource map) |

  > Brief specifies routes `/`, `/help-center`, `/map` with Need Help at `/`.
  > The old app uses `/need-help` and redirects `/`→`/need-help`. The brief
  > wins: Need Help should be the default route `/`.

- **Shell:** `ScreenHeader` (logo mark + title + subtitle + AR/EN toggle + theme toggle, `HelpCenterHeaderActions`), `MobileNavbar` (floating bottom bar, 3 tabs: Need Help / Help Center / Map; active tab gets a top accent bar). No drawer/hamburger.
- **Dark mode:** `ThemeContext` sets `data-theme="light|dark"` on `<html>`, initial value from `localStorage('theme')` → `prefers-color-scheme` → light; persisted to localStorage. Moon/Sun toggle in header.
- **API base URL:** `VITE_API_URL` (default `http://localhost:3000`); dev proxy in `vite.config.ts` forwards `/api` + `/health`. No central API client — `fetch()` is inline per screen, no retry/interceptors.

### 3.2 i18n / RTL

- `src/i18n/index.ts`: i18next + `i18next-browser-languagedetector`, `supportedLngs: ['en','ar']`, **`fallbackLng: 'ar'` (Arabic default)**, detection order `localStorage → navigator`. `applyDirection(lng)` sets `<html dir="rtl|ltr" lang>`; `ar` ⇒ rtl. Toggle in `App.tsx` flips ar↔en and lazy-loads fonts (old app uses **Tajawal** for AR / **Roboto** for EN — the rebuild replaces these with the brief's Cairo / League Spartan / Montserrat).
- Locale files: `src/i18n/locales/ar.json`, `en.json`.

### 3.3 Freshness logic ("29d ago" style)

Implemented (duplicated) in three places — `useNeedHelpScreenState.tsx`, `useMapScreenState.ts`, and `helpCenter.utils.ts`. Core pattern:
```ts
const diff = Date.now() - new Date(isoDate).getTime();
const minutes = Math.floor(diff/60000), hours = Math.floor(minutes/60), days = Math.floor(hours/24);
// → "Just now" / "5m ago" / "2h ago" / "3d ago"  (AR: "الآن" / "منذ 5 دق" / "منذ … ساعة" / "منذ … يوم")
```
Rendered as a clock-icon badge top-right of each card from `org.updated_at`. The brief adds: **dim/stale styling when > 14 days** (`--color-stale`) — a rebuild addition consistent with the existing badge.

### 3.4 Map implementation

- **No heavy map library.** A static Lebanon SVG (`src/assets/map/map.svg`, ~648 KB) rendered inside an `<svg viewBox="0 0 250 326">`, wrapped by **`svg-pan-zoom`** (pan/zoom, custom +/- controls, `minZoom 0.6`, `maxZoom 20`).
- **7 city markers / regions** hardcoded with SVG (x,y) coords, each mapping to a set of district `region_id`s:

  | Marker | regions |
  | --- | --- |
  | Akkar | akkar |
  | Tripoli (North) | tripoli, bcharre, el-koura, el-batroun, el-minieh-dennie |
  | Beirut (Mount Lebanon) | beirut, aley, baabda, chouf, el-meten, jbeil |
  | Bekaa | zahle, west-bekaa, rachaya |
  | Baalbek | baalbek, el-hermel |
  | South | saida, sour, jezzine |
  | Nabatieh | el-nabatieh, bent-jbeil, hasbaya |

- Cluster badge = sum of `/api/organizations/map` `count`s for that marker's regions, drawn as a numbered circle. Filter pills (clothes/shelter/medical/food/nearby) re-query with `category`.
- Tapping a marker activates that governorate, scatters deterministic org "pins" (hashed positions, count scales with zoom), and opens an **inline bottom peek-sheet** (collapsed/peek/expanded) listing that region's orgs via `/api/organizations?location=…` — **no modal, no separate route.**

### 3.5 Card component

`OrganizationCard.tsx` (Need Help / Map) and `ServiceCard.tsx` (Help Center) share the structure the brief specifies: rounded sector-icon box, title + category pill, 2–3 line description, locations row with **"+N more"** overflow (opens a bottom sheet), freshness badge top-right, full-width primary action button (`tel:`+961… or `https://wa.me/…`) and a tonal secondary button ("Map"). Action preference: WhatsApp if present, else phone, else disabled "Unavailable".

---

## 4. Data inventory (verbatim from code + backup)

### 4.1 Sectors (`/categories/sector`, 10)
`CWG`, `Education`, `Food Security & Agriculture`, `GBV`, `Livelihoods`, `Nutrition`, `Protection`, `Shelter`, `Social Stability`, `WaSH`.

### 4.2 CRN service categories (`serviceCategoryMap.ts`) — the UI `category` filter
PowerBI sector → CRN category:
| CRN id | label | source sectors |
| --- | --- | --- |
| `safety_protection` | Safety & Protection | Child Protection, GBV, Protection, Social Stability |
| `cash_livelihood` | Cash and Livelihood | CWG, Livelihoods |
| `food_nutrition` | Food and Nutrition | Food Security & Agriculture, Nutrition |
| `shelter_nfi` | Shelter / NFI | Shelter |
| `wash_hygiene` | WASH and Hygiene | WaSH |
| `education` | Education | Education |

Frontend "Need Help" pills map to CRN ids: food → `food_nutrition`,`wash_hygiene`; medical → `health_medical`*; shelter → `shelter_nfi`; clothes → `shelter_nfi`. (*`health_medical` has no backend mapping — there is no Health sector in the taxonomy; this pill currently matches nothing. Flagged as an existing quirk to preserve or fix.)

### 4.3 Districts (`/categories/district`, 26)
akkar, aley, baabda, baalbek, bcharre, beirut, bent-jbeil, chouf, el-batroun, el-hermel, el-koura, el-meten, el-minieh-dennie, el-nabatieh, hasbaya, jbeil, jezzine, kesrwane, marjaayoun, rachaya, saida, sour, tripoli, west-bekaa, zahle, zgharta.

### 4.4 Emergency hotlines (life-critical, hardcoded in `helpCenter.data.ts`)
| Service | Number |
| --- | --- |
| Ambulance (Red Cross) | **140** |
| Civil Defense | **125** |
| Medical Aid | **129** |
| Marine Rescue | **1714** |

### 4.5 Hotline directory (`/hotlines`, 103 records)
Categories present: Hospital (68), Heavy Equipment (5), NGO (5), Territorial Border (4), Government (3), Security (3), Services (3), Airport (2), Financial Assistance (2), Travel Agency (2), GBV (1), Fire (1), Medical (1), Medical/Fire (1), Child Protection (1), Mental Health (1).
Frontend service-type filter groups these into Medical / Safety & Protection / Cash & Livelihood / Emergency (`helpCenter.data.ts`).

### 4.6 Provider data scale (from backup)
687 providers (all pass the name-validity filter), 515 carry a `services[]` array, 668 have at least one phone number. `service_count` ranges per provider. Many records are admin-test rows (e.g. `provider_name:"hgf"`) — the merge/validity logic tolerates them.

---

## 5. Risks & unknowns (open questions for the user)

1. **PowerBI ingestion is external and absent (blocking decision).** The scraper + `reload_firebase.py` mirror that populate the database are not in any repo here. The new app cannot "port" a scraper that doesn't exist. The genuinely determinable, working data source the *backend* uses is **Firebase RTDB (project `collreliefnetwork`)**, for which a service-account credential is committed, plus a frozen full snapshot (`backup-lbresponse-db.json`, 2026-05-06). **Decision needed before coding the data layer** — three non-invented options, all using the real existing mechanism rather than guessing a scraper:
   - **(A) Mirror Firebase RTDB → local SQLite on a cron.** Closest to the brief's SQLite/Prisma mandate; data stays fresh as the external pipeline keeps writing RTDB; requires using the committed `service-account.json` and explicit authorization to read the live shared DB.
   - **(B) Read Firebase RTDB live at request time** (no local DB) — closest to the old backend, which had no local store. Diverges from the brief's "SQLite via Prisma" instruction.
   - **(C) Seed SQLite once from `backup-lbresponse-db.json`** — fully offline, no live-DB access, but data is frozen at 2026-05-06 with no refresh path until the external pipeline is reconnected.
2. **SQLite vs Postgres:** the data model is a small set of flat document lists (687 providers, 103 hotlines, 36 category rows). It is **not** complex enough to require Postgres — **SQLite/Prisma is safe.** (Brief asked to surface only if Postgres were materially safer; it is not.)
3. **`entities/locations` absent:** code reads it but data has none → `governorate` is always null. Rebuild can omit governorate or derive it from a static district→governorate map (the frontend already has the marker→district grouping in §3.4).
4. **`health_medical` pill maps to nothing** in the current taxonomy (§4.2). Preserve the quirk or correct the mapping? (Behavioral question.)
5. **Route default:** old app serves Need Help at `/need-help` (`/`→redirect); brief wants Need Help at `/`. Following the brief.
6. **Fonts:** old app uses Tajawal/Roboto; brief mandates Cairo (AR) + League Spartan/Montserrat (Latin). Following the brief.
7. **Refresh cadence** of the external scrape/mirror is inferred (~daily) but not code-confirmed; if option (A) is chosen, the mirror cron cadence is a guess until the upstream owner confirms.
8. **Admin dashboard / `/admin`, `/api/client-errors`, `/api/visuals`, `/api/dashboard`** are out of the rebuild's stated scope (citizen-facing app only, no CMS/admin per non-goals). Confirm these are intentionally dropped.

---

## Appendix — file map (key sources)

**Backend** (`lbresponse-api/src`): `app.ts`, `index.ts`, `config/firebase.ts`, `config/firebaseRest.ts`, `utils/entityStore.ts`, `controllers/{organizations,hotlines,filters}Controller.ts`, `lib/serviceCategoryMap.ts`, `models/Organization.ts`, `routes/{organizations,hotlines,filters,visuals,dashboard,admin,clientErrors}.ts`.

**Frontend** (`lbresponse-web/src`): `App.tsx`, `main.tsx`, `i18n/index.ts`, `i18n/locales/{ar,en}.json`, `context/ThemeContext.tsx`, `components/AppLayout.tsx`, `components/ui/{ScreenHeader,MobileNavbar,OrganizationCard,ServiceCard,LocationsRow}.tsx`, `components/need-help/*`, `components/help-center/*`, `components/map/{MapScreen,useMapScreenState}.tsx`, `assets/map/map.svg`.

**Data:** `lbresponse-api/backup-lbresponse-db.json` (full RTDB snapshot, 2026-05-06).
