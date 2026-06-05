#!/usr/bin/env bash
# Refresh job — owns the DB on the shared /data volume. Run-to-completion by
# default (REFRESH_MODE=oneshot): ensure schema, seed once if empty, run one
# live scrape/upsert, then exit. An external scheduler (systemd timer / cron)
# invokes this every 6h via `docker compose run --rm refresh`.
#
# REFRESH_MODE=scheduler keeps the legacy always-on behaviour (internal 6h loop)
# for environments without a host scheduler.
set -euo pipefail
DB="${DATABASE_URL#file:}"
MODE="${REFRESH_MODE:-oneshot}"

echo "[refresh] ensuring schema on ${DB} ..."
npx prisma db push --skip-generate

# Seed once on a fresh volume: loads hotlines + initial providers from the
# out-of-band snapshot (data/backup-lbresponse-db.json, baked into this image).
# Idempotent — only seeds when there are no hotlines, so re-runs never clobber
# live-scraped provider updates or manual pinned/verified flags.
COUNT=$(node -e 'const{PrismaClient}=require("@prisma/client");const p=new PrismaClient();p.hotline.count().then(n=>{console.log(n);return p.$disconnect()}).catch(()=>console.log(-1))' 2>/dev/null || echo -1)
if [ "${COUNT:--1}" -le 0 ] 2>/dev/null; then
  if [ -f data/backup-lbresponse-db.json ]; then
    echo "[refresh] empty DB (hotlines=${COUNT}) → seeding from snapshot ..."
    npm run ingest
  else
    echo "[refresh] WARNING: data/backup-lbresponse-db.json missing — cannot seed hotlines!" >&2
  fi
else
  echo "[refresh] DB already seeded (hotlines=${COUNT}) — skipping seed."
fi

if [ "$MODE" = "scheduler" ]; then
  echo "[refresh] REFRESH_MODE=scheduler → starting internal 6-hourly loop ..."
  exec node scripts/scheduler.mjs
fi

echo "[refresh] running one live PowerBI scrape + upsert ..."
bash scripts/refresh-live.sh
echo "[refresh] done."
