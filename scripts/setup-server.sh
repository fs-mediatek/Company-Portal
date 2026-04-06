#!/usr/bin/env bash
# =============================================================================
# Company Portal — Initial Server Setup
# Target: Debian 12.12 (Bookworm), Proxmox LXC CT 108, IP 10.0.40.71
# Run as: root@10.0.40.71
# Usage:  bash setup-server.sh
# =============================================================================
set -euo pipefail

APP_DIR="/var/www/company-portal"
NODE_VERSION="22"

echo "=== [1/8] System update ==="
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git build-essential ufw

echo "=== [2/8] Install Node.js ${NODE_VERSION} (NodeSource) ==="
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt-get install -y nodejs
node --version
npm --version

echo "=== [3/8] Install PM2 (process manager) ==="
npm install -g pm2

echo "=== [4/8] Install MariaDB ==="
apt-get install -y mariadb-server
systemctl enable mariadb
systemctl start mariadb

# Secure MariaDB and create databases
mysql -u root <<'SQL'
-- Create portal databases
CREATE DATABASE IF NOT EXISTS portal_core CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS facility_mgmt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS helpdesk CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create app user (update password before running)
CREATE USER IF NOT EXISTS 'portal_app'@'localhost' IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON portal_core.* TO 'portal_app'@'localhost';
GRANT ALL PRIVILEGES ON facility_mgmt.* TO 'portal_app'@'localhost';
GRANT ALL PRIVILEGES ON helpdesk.* TO 'portal_app'@'localhost';
FLUSH PRIVILEGES;
SQL

echo "=== [5/8] Create app directory ==="
mkdir -p "$APP_DIR"

echo "=== [6/8] Create .env.local with required environment variables ==="
# The app uses Next.js standalone output — env vars are read at runtime from .env.local
# Edit these values before running the script!
cat > "$APP_DIR/.env.local" <<'ENVFILE'
# ── Facility Management DB ───────────────────────────────────────────────────
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=facility_mgmt
DB_USER=portal_app
DB_PASSWORD=CHANGE_ME

# ── Core Portal DB ───────────────────────────────────────────────────────────
CORE_DB_HOST=127.0.0.1
CORE_DB_NAME=portal_core
CORE_DB_USER=portal_app
CORE_DB_PASSWORD=CHANGE_ME

# ── Helpdesk DB ──────────────────────────────────────────────────────────────
HELPDESK_DB_HOST=127.0.0.1
HELPDESK_DB_NAME=helpdesk
HELPDESK_DB_USER=portal_app
HELPDESK_DB_PASSWORD=CHANGE_ME

# ── App ──────────────────────────────────────────────────────────────────────
APP_SECRET_KEY=CHANGE_ME_STRONG_SECRET_KEY
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
ENVFILE
echo "  → Edit $APP_DIR/.env.local and set real passwords before starting the app!"

echo "=== [7/8] Create PM2 ecosystem config ==="
# App uses Next.js standalone output — entry point is server.js (not next start)
# CI/CD will deploy .next/standalone/ contents to APP_DIR
cat > "$APP_DIR/ecosystem.config.cjs" <<'ECOSYSTEM'
module.exports = {
  apps: [
    {
      name: 'company-portal',
      script: 'server.js',
      cwd: '/var/www/company-portal',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_file: '/var/www/company-portal/.env.local',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
    },
  ],
};
ECOSYSTEM

echo "=== [8/8] PM2 startup hook ==="
pm2 startup systemd -u root --hp /root --no-daemon 2>/dev/null || true

echo ""
echo "=== Setup complete ==="
echo "Server is ready. First deployment will happen via GitHub Actions on next push to main."
echo ""
echo "REQUIRED before first deployment:"
echo "  1. Edit $APP_DIR/.env.local — set real DB passwords and APP_SECRET_KEY"
echo "  2. Ensure MariaDB has all 3 databases: portal_core, facility_mgmt, helpdesk"
echo "  3. Ensure MariaDB user 'portal_app' has access to all 3 databases"
echo ""
echo "GitHub Actions secrets needed in repo (Settings → Secrets → Actions):"
echo "  DEPLOY_HOST = 10.0.40.71"
echo "  DEPLOY_SSH_KEY = (generate below)"
echo ""
echo "Generate deploy key (run as root):"
echo "  ssh-keygen -t ed25519 -C github-actions-deploy -f /root/.ssh/deploy_key -N \"\""
echo "  cat /root/.ssh/deploy_key.pub >> /root/.ssh/authorized_keys"
echo "  cat /root/.ssh/deploy_key   ← paste as DEPLOY_SSH_KEY secret"
