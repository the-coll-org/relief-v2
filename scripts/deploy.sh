#!/usr/bin/env bash
#
# Script-based deploy for relief-v2 (no GitHub Actions).
#
# ONE canonical clone ($REPO). Each environment is built from its branch in a
# detached git worktree under $REPO/.deploy and run as its own Compose project,
# so testing (develop) and prod (main) coexist from a single repo — there is no
# second checkout to maintain.
#
#   deploy.sh testing      build origin/develop -> testing-rn.thecoll.org (:3110)
#   deploy.sh prod         build origin/main    -> rn.thecoll.org        (:3210)
#   deploy.sh promote      fast-forward main to develop on origin, then deploy prod
#   deploy.sh seed <env>   run the refresh sidecar once (seed/refresh the DB)
#
# Merges to main happen ONLY through `promote`, only as a fast-forward, and only
# when a human runs it — never automatically. The script never force-pushes.
#
# The script is self-contained (no reliance on its own path), so it can be run
# straight from git without a working copy:
#   git -C /home/chris/repos/relief-v2 show origin/develop:scripts/deploy.sh | bash -s -- testing
set -euo pipefail

REPO="/home/chris/repos/relief-v2"
UMAMI_SRC="https://analytics.christopheek.com/s.js"
FEEDBACK_URL="https://requests.thecoll.org"

log() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# Populate BRANCH/PROJECT/APP_PORT/SITE_URL/UMAMI_WEBSITE_ID/WORKTREE for an env.
env_config() {
  case "$1" in
    testing)
      BRANCH="develop"; PROJECT="relief-v2-develop"; APP_PORT="3110"
      SITE_URL="https://testing-rn.thecoll.org"
      UMAMI_WEBSITE_ID="c245c97e-e463-4aac-bfb9-b03246d540b1" ;;
    prod)
      BRANCH="main"; PROJECT="relief-v2"; APP_PORT="3210"
      SITE_URL="https://rn.thecoll.org"
      UMAMI_WEBSITE_ID="32c764b1-3042-4605-a381-3ee4a6cfa02a" ;;
    *) die "unknown env '$1' (use: testing | prod)" ;;
  esac
  WORKTREE="$REPO/.deploy/$1"
}

# Point $WORKTREE at the tip of origin/$BRANCH (detached, so the canonical
# checkout is never disturbed and no branch is "checked out twice").
sync_worktree() {
  git -C "$REPO" fetch --quiet origin "$BRANCH"
  if git -C "$REPO" worktree list --porcelain | grep -qx "worktree $WORKTREE"; then
    git -C "$WORKTREE" checkout --quiet --detach "origin/$BRANCH"
    git -C "$WORKTREE" reset --quiet --hard "origin/$BRANCH"
  else
    mkdir -p "$REPO/.deploy"
    git -C "$REPO" worktree add --quiet --detach "$WORKTREE" "origin/$BRANCH"
  fi
}

# docker compose in the worktree, with this env's project name + build args.
dc() {
  ( cd "$WORKTREE" \
    && APP_PORT="$APP_PORT" SITE_URL="$SITE_URL" FEEDBACK_URL="$FEEDBACK_URL" \
       UMAMI_SRC="$UMAMI_SRC" UMAMI_WEBSITE_ID="$UMAMI_WEBSITE_ID" \
       docker compose -p "$PROJECT" "$@" )
}

deploy() {
  env_config "$1"
  log "Deploy $1 — build origin/$BRANCH → project '$PROJECT' (:$APP_PORT)"
  sync_worktree
  dc up -d --build app
  log "Waiting for health on :$APP_PORT …"
  for _ in $(seq 1 90); do
    curl -sf "http://127.0.0.1:$APP_PORT/api/status" >/dev/null 2>&1 && {
      log "$1 healthy → $SITE_URL"; dc ps; return 0; }
    sleep 2
  done
  dc ps; die "$1 did not become healthy on :$APP_PORT"
}

seed() {
  env_config "$1"
  log "Seed $1 — refresh sidecar (project '$PROJECT')"
  sync_worktree
  dc run --rm refresh
}

promote() {
  git -C "$REPO" fetch --quiet origin main develop
  git -C "$REPO" merge-base --is-ancestor origin/main origin/develop \
    || die "origin/main is not an ancestor of origin/develop — not a fast-forward. Reconcile manually; refusing to force."
  local ahead
  ahead="$(git -C "$REPO" rev-list --count origin/main..origin/develop)"
  [ "$ahead" -eq 0 ] && { log "main already up to date with develop — nothing to promote."; deploy prod; return; }
  log "Fast-forwarding main → develop on origin ($ahead commit(s))…"
  git -C "$REPO" push origin "origin/develop:refs/heads/main"
  log "main updated. Deploying prod…"
  deploy prod
}

case "${1:-}" in
  testing|prod) deploy "$1" ;;
  promote)      promote ;;
  seed)         seed "${2:?usage: deploy.sh seed <testing|prod>}" ;;
  *) die "usage: deploy.sh {testing | prod | promote | seed <env>}" ;;
esac
