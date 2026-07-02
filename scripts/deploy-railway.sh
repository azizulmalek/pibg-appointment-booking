#!/usr/bin/env bash
set -euo pipefail

# Deploy PIBG SK Kementah to Railway (https://railway.com)
# Prerequisites:
#   npm i -g @railway/cli   # or: brew install railway
#   railway login
#
# Usage:
#   ./scripts/deploy-railway.sh
#   ./scripts/deploy-railway.sh --seed   # also seed demo data after deploy

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_NAME="${RAILWAY_PROJECT_NAME:-pibg-sk-kementah}"
SEED=false
if [[ "${1:-}" == "--seed" ]]; then
  SEED=true
fi

if ! command -v railway >/dev/null 2>&1; then
  echo "Railway CLI not found. Install: npm i -g @railway/cli  or  brew install railway"
  exit 1
fi

if ! railway whoami >/dev/null 2>&1; then
  echo "Not logged in. Run: railway login"
  exit 1
fi

if ! railway status >/dev/null 2>&1; then
  echo "Creating Railway project: ${PROJECT_NAME}"
  railway init --name "${PROJECT_NAME}"
fi

SERVICE_NAME="${RAILWAY_SERVICE_NAME:-${PROJECT_NAME}}"

# `railway init` links a project but not a service — volume/variable commands need one.
if ! railway service list --json 2>/dev/null | grep -q '"isLinked": true'; then
  if ! railway service list --json 2>/dev/null | grep -q "\"name\":\"${SERVICE_NAME}\""; then
    echo "Creating Railway service: ${SERVICE_NAME}"
    railway add --service "${SERVICE_NAME}" --json
  fi
  echo "Linking Railway service: ${SERVICE_NAME}"
  railway service link "${SERVICE_NAME}"
fi

# SQLite must live on a Railway volume, not the ephemeral container filesystem.
if ! railway volume list --json 2>/dev/null | grep -q '"/data"'; then
  echo "Adding persistent volume at /data (required for SQLite)..."
  railway volume add --mount-path /data
fi

if [ -z "${AUTH_SECRET:-}" ]; then
  AUTH_SECRET="$(openssl rand -base64 32)"
fi
if [ -z "${BIRTH_CERT_SECRET:-}" ]; then
  BIRTH_CERT_SECRET="$(openssl rand -base64 32)"
fi

echo "Setting environment variables..."
railway variable set \
  DATABASE_URL="file:/data/prod.db" \
  AUTH_SECRET="${AUTH_SECRET}" \
  BIRTH_CERT_SECRET="${BIRTH_CERT_SECRET}" \
  NODE_ENV=production \
  --skip-deploys

if ! railway domain list --json 2>/dev/null | grep -q 'railway'; then
  echo "Generating public domain..."
  railway domain --port 3000
fi

APP_URL="$(
  railway domain list --json 2>/dev/null \
    | node -e "
      let data = '';
      process.stdin.on('data', (c) => (data += c));
      process.stdin.on('end', () => {
        try {
          const domains = JSON.parse(data || '[]');
          const domain = domains.find((d) => d?.domain)?.domain;
          if (domain) process.stdout.write('https://' + domain);
        } catch {}
      });
    "
)"

if [ -n "${APP_URL}" ]; then
  echo "Setting AUTH_URL=${APP_URL}"
  railway variable set \
    AUTH_URL="${APP_URL}" \
    NEXTAUTH_URL="${APP_URL}" \
    --skip-deploys
else
  echo "Could not detect domain. After deploy, set:"
  echo "  railway variable set AUTH_URL=https://your-app.up.railway.app NEXTAUTH_URL=https://your-app.up.railway.app"
fi

echo "Deploying..."
railway up --detach

if [ "${SEED}" = true ]; then
  echo "Seeding demo data..."
  railway run npm run db:seed
fi

echo ""
echo "Done."
echo "  Dashboard: railway open"
echo "  Logs:      railway logs"
if [ -n "${APP_URL}" ]; then
  echo "  App URL:   ${APP_URL}"
fi
echo ""
echo "First deploy? Seed once with: railway run npm run db:seed"
