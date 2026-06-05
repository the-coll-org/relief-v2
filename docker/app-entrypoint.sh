#!/bin/sh
# App entrypoint: wait for the refresh sidecar to create the DB schema on the
# shared volume, then start the Next standalone server. The DB file appears
# after `prisma db push`; queries return empty until the seed completes, which
# is fine (pages render, hotlines fill in within seconds).
set -e
DB="${DATABASE_URL#file:}"
echo "[app] waiting for database $DB ..."
i=0
while [ ! -f "$DB" ]; do
  i=$((i + 1))
  if [ "$i" -ge 120 ]; then
    echo "[app] DB still absent after 120s — starting anyway (will report unhealthy until ready)"
    break
  fi
  sleep 1
done
echo "[app] starting Next standalone server on ${HOSTNAME}:${PORT}"
exec node server.js
