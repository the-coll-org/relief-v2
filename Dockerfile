# syntax=docker/dockerfile:1
# ---- Relief Network app (Next.js 14 standalone) -----------------------------
# Minimal runtime image: serves the app and queries the SQLite DB on the shared
# /data volume. DB schema + seeding are owned by the refresh sidecar
# (Dockerfile.refresh); this container just waits for the DB file and serves.

# ---- build ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Prisma's engine needs OpenSSL.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
# Schema must exist before `npm ci` — the postinstall hook runs `prisma generate`.
COPY prisma ./prisma
RUN npm ci
COPY . .
# A throwaway DB so any build-time Prisma access (static generation) succeeds;
# the real DB lives on the runtime volume.
ENV DATABASE_URL=file:/tmp/build.db
RUN npx prisma generate \
 && npx prisma db push --skip-generate \
 && npm run build

# ---- runtime ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app
# Prisma's query engine needs OpenSSL at runtime too.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL=file:/data/relief.db \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
# Prisma client + query engine (kept external to the Next bundle).
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY docker/app-entrypoint.sh /usr/local/bin/app-entrypoint.sh
RUN chmod +x /usr/local/bin/app-entrypoint.sh
VOLUME /data
EXPOSE 3000
CMD ["/usr/local/bin/app-entrypoint.sh"]
