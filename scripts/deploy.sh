#!/usr/bin/env bash
# =============================================================================
# Company Portal — Deploy Script (server-side)
# Called by GitHub Actions after standalone build artifacts are transferred via SCP.
# The app uses Next.js standalone output — entry point is server.js, no next start.
# Run as: root@10.0.40.71
# Usage:  bash /var/www/company-portal/scripts/deploy.sh
# =============================================================================
set -euo pipefail

APP_DIR="/var/www/company-portal"
APP_NAME="company-portal"

if [ ! -f "$APP_DIR/.env.local" ]; then
  echo "[deploy] ERROR: $APP_DIR/.env.local not found!"
  echo "[deploy] Copy .env.local.example to .env.local and fill in DB credentials."
  exit 1
fi

echo "[deploy] Reloading PM2 process..."
cd "$APP_DIR"
pm2 reload "$APP_NAME" --update-env || pm2 start ecosystem.config.cjs

pm2 save
pm2 status "$APP_NAME"
echo "[deploy] Done. App running at http://10.0.40.71:3000"
