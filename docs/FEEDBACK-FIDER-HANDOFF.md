# Infra Handoff — Feedback board (Fider)

Goal: a **self-hosted, public** board where users submit feedback / feature
requests, vote, and comment — linked from the Relief Network app. We use
**[Fider](https://fider.io)** (open-source, AGPL-3.0): one Docker container +
Postgres, minimal config. The board is public to view/vote; posting requires a
quick sign-in (email magic-link or OAuth).

> Why Fider and not an npm package: there's no production-grade *public feature
> board* that embeds as an npm-in-Next package. The self-hosted options (Fider,
> Logchimp, Astuto) are standalone apps. Fider is the most mature/minimal, so we
> run it standalone and link the app to it.

## What you must provide (the only real config)

1. A subdomain, e.g. **`requests.thecoll.org`** (DNS A record → `45.88.188.119`).
2. A way for users to sign in to *post* (viewing/voting needs nothing). Pick one:
   - **SMTP** (magic-link emails) — any transactional sender (e.g. a `noreply@thecoll.org` mailbox, SendGrid, SES, Mailgun), **or**
   - **OAuth** (Google/GitHub/Facebook) configured later in Fider's admin UI.
3. A long random `JWT_SECRET` (e.g. `openssl rand -base64 48`).

Everything else is defaulted.

## Deploy (Docker Compose)

Put this in e.g. `/opt/fider/docker-compose.yml`:

```yaml
services:
  fider-db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: fider
      POSTGRES_PASSWORD: ${FIDER_DB_PASSWORD}
      POSTGRES_DB: fider
    volumes:
      - fider-db:/var/lib/postgresql/data
    restart: unless-stopped

  fider:
    image: getfider/fider:stable
    depends_on: [fider-db]
    environment:
      BASE_URL: https://requests.thecoll.org
      DATABASE_URL: postgres://fider:${FIDER_DB_PASSWORD}@fider-db:5432/fider?sslmode=disable
      JWT_SECRET: ${FIDER_JWT_SECRET}
      # --- email (magic-link sign-in + notifications); skip only if using OAuth ---
      EMAIL_NOREPLY: noreply@thecoll.org
      EMAIL_SMTP_HOST: ${SMTP_HOST}
      EMAIL_SMTP_PORT: "587"
      EMAIL_SMTP_USERNAME: ${SMTP_USER}
      EMAIL_SMTP_PASSWORD: ${SMTP_PASS}
      EMAIL_SMTP_ENABLE_STARTTLS: "true"
    ports:
      - "127.0.0.1:9100:3000"   # behind the reverse proxy
    restart: unless-stopped

volumes:
  fider-db:
```

Provide the secrets via an `.env` next to it (chmod 600, never commit):
```
FIDER_DB_PASSWORD=...
FIDER_JWT_SECRET=...        # openssl rand -base64 48
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
```

Bring up: `docker compose up -d`. Fider auto-creates/migrates its schema on first
boot. **The first account that signs up becomes the admin** — do that immediately,
then set the site name/logo and (optionally) enable Google OAuth under
**Settings → Authentication** so users can skip email.

## Reverse proxy + TLS

Add a vhost for the subdomain → `127.0.0.1:9100`, TLS via Let's Encrypt. Caddy:
```
requests.thecoll.org {
    reverse_proxy 127.0.0.1:9100
}
```
(nginx + certbot is equally fine.) Then add the DNS A record
`requests.thecoll.org → 45.88.188.119`.

## Connect it to the Relief Network app

The app already has the wiring — it just needs the URL at **build time**:

- The app reads a `FEEDBACK_URL` build arg (Dockerfile `ARG FEEDBACK_URL`,
  surfaced via `docker-compose.yml` build args). When set, a **"Feedback & ideas"**
  link appears in the app header (opens the board in a new tab); when empty, the
  link is hidden.
- To enable it, rebuild the app container(s) with the value:
  ```bash
  # testing (develop checkout)
  SITE_URL=https://testing-rn.thecoll.org FEEDBACK_URL=https://requests.thecoll.org \
    APP_PORT=3110 docker compose up -d --build app
  # prod (main checkout)
  FEEDBACK_URL=https://requests.thecoll.org APP_PORT=3210 docker compose up -d --build app
  ```
  (Or set `FEEDBACK_URL` in the deploy CI env — it flows into the build args.)

Because the app pages are statically generated, `FEEDBACK_URL` is baked at build,
so a rebuild is required to change it — which a normal deploy already does.

## Maintenance notes

- **Backups:** the only state is the `fider-db` Postgres volume — include it in
  your backup routine (`pg_dump`).
- **Updates:** `docker compose pull && docker compose up -d` (image tag `stable`).
- **Spam control:** Fider supts rate limits + email verification by default; enable
  OAuth to further reduce throwaway posts.
- **Moderation:** admins can edit/merge/delete posts and set statuses
  (Planned / Started / Completed / Declined) from the board UI — this is the
  "user requests on features" dashboard, public by default.

See also `infra-handoff.md` for the app's overall deploy topology.
