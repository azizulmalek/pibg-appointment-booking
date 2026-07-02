#!/usr/bin/env bash
set -euo pipefail

# Deploy PIBG SK Kementah to Runway (https://www.runway.horse)
# Prerequisites: Runway CLI installed and logged in
#   bash <(curl -s https://www.runway.horse/install.sh)
#   runway login

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v runway >/dev/null 2>&1; then
  echo "Runway CLI not found. Install: bash <(curl -s https://www.runway.horse/install.sh)"
  exit 1
fi

if ! git diff --quiet || [ -n "$(git status --porcelain)" ]; then
  echo "Commit your changes first — Runway deploys from git, not the working tree."
  git status --short
  exit 1
fi

# Create app on first deploy (SQLite needs persistent /data volume)
if ! runway app show >/dev/null 2>&1; then
  echo "Creating Runway app with persistence (required for SQLite)..."
  runway app create --persistence
fi

# Production secrets — replace with your own values
if [ -z "${AUTH_SECRET:-}" ]; then
  AUTH_SECRET="$(openssl rand -base64 32)"
fi
if [ -z "${BIRTH_CERT_SECRET:-}" ]; then
  BIRTH_CERT_SECRET="$(openssl rand -base64 32)"
fi

runway app config set PORT=3000
runway app config set NODE_ENV=production
runway app config set "DATABASE_URL=file:/data/prod.db"
runway app config set "AUTH_SECRET=${AUTH_SECRET}"
runway app config set "BIRTH_CERT_SECRET=${BIRTH_CERT_SECRET}"

APP_URL="$(runway app show -o json 2>/dev/null | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4 || true)"
if [ -n "$APP_URL" ]; then
  runway app config set "NEXTAUTH_URL=${APP_URL}"
else
  echo "Set NEXTAUTH_URL after deploy: runway app config set NEXTAUTH_URL=https://your-app.runway.horse"
fi

echo "Deploying..."
runway app deploy

echo "Done. Open app:"
runway open
