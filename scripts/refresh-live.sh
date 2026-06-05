#!/usr/bin/env bash
# Live data refresh: scrape PowerBI → build entities JSON → upsert into SQLite.
# Run manually or via the 6-hourly cron. Touches neither Firebase nor hotlines.
set -euo pipefail

# cron runs with a minimal PATH; make node/npm reachable.
export PATH="/home/chris/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

SCRAPER_DIR="${SCRAPER_DIR:-/home/chris/repos/lbresponse-scrapper}"
APP_DIR="${APP_DIR:-/home/chris/repos/relief-v2}"
PY="$SCRAPER_DIR/.venv/bin/python"
NPM="${NPM:-/home/chris/.local/bin/npm}"

echo "[$(date -u +%FT%TZ)] refresh-live: scraping PowerBI…"
cd "$SCRAPER_DIR"
"$PY" main.py --no-firebase --no-database --csv once

echo "[$(date -u +%FT%TZ)] building entities JSON…"
cd "$APP_DIR"
SCRAPER_DIR="$SCRAPER_DIR" "$PY" scripts/build_entities_json.py

echo "[$(date -u +%FT%TZ)] upserting into SQLite…"
"$NPM" run ingest -- --source=live

echo "[$(date -u +%FT%TZ)] refresh-live: done."
