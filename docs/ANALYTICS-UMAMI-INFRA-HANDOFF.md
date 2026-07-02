# Analytics — Umami + Grafana (infra hand-off)

**Owner split:** the CRN app team (this repo) has done the app-side integration
— an env-gated tracker script and `data-umami-event` instrumentation on every
key action. **Infra** owns everything below: deploying Umami + its database,
the Caddy route, creating the two "websites", and wiring the Grafana dashboard.
Nothing here touches the relief-v2 app containers except two build args.

Goal: privacy-first product analytics — **how many people use CRN and what they
do** (which pages, which providers they call, which filters they use) — viewable
both in Umami's own dashboard and alongside the existing infra panels in Grafana.

Design constraints (crisis app): **cookieless, no PII, self-hosted, honors
Do-Not-Track.** No third-party analytics, no consent banner.

---

## 1. What the app already does (no infra action)

- The locale layout injects the Umami tracker **only when both `UMAMI_SRC` and
  `UMAMI_WEBSITE_ID` are set** (baked at build time, per environment). Unset →
  no tracker. It's added with `data-do-not-track="true"`.
- Every high-value action is instrumented (see the event table in §6). Plain
  clicks use `data-umami-event` attributes (zero JS); a few non-click events
  (`map_pin_tap`, `filter_apply`, `help_search`) go through a tiny `track()`
  helper that no-ops when the tracker isn't loaded.
- Build wiring already present: `Dockerfile` (`ARG/ENV UMAMI_SRC`,
  `UMAMI_WEBSITE_ID`), `docker-compose.yml` (passes them through), `.env.example`.

**All infra has to give back to the app team:** the two `UMAMI_WEBSITE_ID`
values (prod + testing) from step §3. The app team sets them per checkout and
rebuilds.

---

## 2. Deploy Umami + its own Postgres

Umami v2, Postgres 16, on its own DB (do **not** reuse the app or windmill DBs).
Suggested stack (adapt to your infra conventions / secret store):

```yaml
services:
  umami:
    image: ghcr.io/umami-software/umami:postgresql-latest
    environment:
      DATABASE_URL: postgresql://umami:${UMAMI_DB_PASSWORD}@umami-db:5432/umami
      DATABASE_TYPE: postgresql
      APP_SECRET: ${UMAMI_APP_SECRET}      # from the secret manager, NOT inline
      TRACKER_SCRIPT_NAME: s               # tracker served at /s.js (ad-block evasion)
      DISABLE_TELEMETRY: "1"
    depends_on:
      umami-db:
        condition: service_healthy
    ports:
      - "127.0.0.1:9200:3000"              # fronted by Caddy; pick a free port
    restart: unless-stopped
    security_opt: [ "no-new-privileges:true" ]
  umami-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: umami
      POSTGRES_USER: umami
      POSTGRES_PASSWORD: ${UMAMI_DB_PASSWORD}
    volumes:
      - umami-db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U umami"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
volumes:
  umami-db-data:
```

- `UMAMI_APP_SECRET` and `UMAMI_DB_PASSWORD`: generate and store in the secret
  manager. Never commit. (Ask Chris before writing to the secret store.)
- `TRACKER_SCRIPT_NAME: s` makes the script path `/s.js` — this is what the app's
  `UMAMI_SRC` points at, and dodges ad-blocker lists that match `umami`/`script.js`.

---

## 3. Caddy route — dashboard behind Authelia, tracker public

The **dashboard UI must be private** (Authelia SSO), but the **tracker script and
event-ingest endpoint must stay public** or browsers can't load `/s.js` or POST
events. Split them:

```caddyfile
analytics.rn.thecoll.org {
    # Public: tracker script + event collection only.
    @public path /s.js /api/send
    handle @public {
        reverse_proxy 127.0.0.1:9200
    }
    # Everything else (dashboard + admin API) behind Authelia.
    handle {
        forward_auth 127.0.0.1:9091 {
            uri /api/verify?rd=https://auth.thecoll.org
            copy_headers Remote-User Remote-Groups Remote-Email
        }
        reverse_proxy 127.0.0.1:9200
    }
}
```

Adapt the `forward_auth` block to match the existing Authelia wiring used for the
other protected subdomains.

Then log in to Umami (default seed admin `admin` / `umami` — **change the password
immediately**).

---

## 4. Create the two websites → return the IDs

In the Umami dashboard, add two websites:

| Name              | Domain                    | Used by                       |
| ----------------- | ------------------------- | ----------------------------- |
| CRN — prod        | `rn.thecoll.org`          | prod checkout (`relief-v2`)   |
| CRN — testing     | `testing-rn.thecoll.org`  | develop checkout (`relief-v2-develop`) |

Each website has a **Website ID** (UUID). Send both to the app team. They set,
per checkout and rebuild:

```
# prod checkout (relief-v2)
UMAMI_SRC=https://analytics.rn.thecoll.org/s.js
UMAMI_WEBSITE_ID=<prod website id>

# develop checkout (relief-v2-develop)
UMAMI_SRC=https://analytics.rn.thecoll.org/s.js
UMAMI_WEBSITE_ID=<testing website id>
```

(These flow through `docker-compose.yml` build args → the Dockerfile → the
statically-generated HTML. A rebuild is required; runtime env alone won't take.)

---

## 5. Grafana dashboard (one pane with the infra metrics)

1. Add Umami's Postgres as a **read-only** Grafana datasource (create a
   `grafana_ro` Postgres role with `SELECT` on the `umami` DB; don't reuse the
   app role).
2. Import the community dashboard **"Umami Business Intelligence" (Grafana ID
   `24431`)** and point it at that datasource — gives visitors, top pages, and
   event trends out of the box.
3. For a couple of CRN-specific panels, the useful tables are `website_event`
   (`event_type` 1 = pageview, 2 = custom event; `event_name`, `url_path`) and
   `session` (visitor/device/country). Examples:

```sql
-- Pageviews per day (last 30d)
SELECT date_trunc('day', created_at) AS "time", count(*) AS pageviews
FROM website_event
WHERE event_type = 1 AND created_at > now() - interval '30 days'
GROUP BY 1 ORDER BY 1;

-- The money metric: provider reach-outs (calls) by day
SELECT date_trunc('day', created_at) AS "time", count(*) AS calls
FROM website_event
WHERE event_type = 2 AND event_name = 'call_tap'
  AND created_at > now() - interval '30 days'
GROUP BY 1 ORDER BY 1;
```

---

## 6. Event reference (what Grafana/Umami will see)

Custom events emitted by the app (all cookieless, no PII):

| Event             | Fires when…                                  | Data keys                          |
| ----------------- | -------------------------------------------- | ---------------------------------- |
| *(pageview)*      | any route view (automatic)                   | `url_path`                         |
| `call_tap`        | a provider phone button is tapped            | `source`, `provider` (org id)      |
| `hotline_tap`     | an emergency hotline is tapped               | `hotline` (id)                     |
| `filter_pill`     | a quick-filter pill is toggled               | `pill`, `source`                   |
| `filter_apply`    | the "More filters" sheet is applied          | `districts` (n), `services` (n), `source` |
| `load_more`       | the Load More button is pressed              | `source`                           |
| `map_pin_tap`     | a map region marker is selected              | `region`                           |
| `language_switch` | the en/ar toggle is used                     | `to` (target locale)               |
| `help_search`     | the user first types in Help Center search   | *(none — no query text, by design)*|
| `feedback_open`   | the header Feedback (megaphone) link is used | *(none)*                           |

`source` ∈ `need_help | help_center | map`.

**Not emitted** (no UI element): a generic share event — sharing is OS-level,
there's no in-app share button.

---

## 7. Privacy / security checklist

- [ ] `APP_SECRET` + DB password in the secret manager, never committed/logged.
- [ ] Umami DB is separate from the app/windmill DBs; own volume; on the backup rota.
- [ ] Dashboard behind Authelia; only `/s.js` + `/api/send` public.
- [ ] Cookieless + Do-Not-Track honored (app sets `data-do-not-track="true"`).
- [ ] Default admin password changed on first login.
- [ ] Data retention set to a sane window (e.g. 12 months) in Umami settings.
