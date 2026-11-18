#!/usr/bin/env bash
# Jednorazová príprava servera (Ubuntu/Debian). Spúšťa sa z vývojového počítača:
#   ssh root@SERVER 'bash -s' < deploy/server-setup.sh
set -euo pipefail

DOMAIN="${DOMAIN:-swi.becode.sk}"
# Záložná adresa bez úpravy DNS (sslip.io preloží IP v názve na server).
EXTRA_HOST="${EXTRA_HOST:-5-22-158-143.sslip.io}"
APP_DIR=/opt/ubytovanie
DATA_DIR=/var/lib/ubytovanie
BACKUP_DIR=/var/backups/ubytovanie
export DEBIAN_FRONTEND=noninteractive

echo "==> Balíky"
apt-get update -q
apt-get install -yq curl ca-certificates gnupg rsync sqlite3 ufw debian-keyring debian-archive-keyring apt-transport-https

echo "==> Node.js 24"
if ! command -v node >/dev/null || [[ "$(node -v)" != v24* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -yq nodejs
fi

echo "==> Caddy (HTTPS cez Let's Encrypt)"
if ! command -v caddy >/dev/null; then
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -q
  apt-get install -yq caddy
fi

echo "==> Swap 2 GB (build Next.js na 1 GB RAM)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q /swapfile /etc/fstab || echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi

echo "==> Používateľ a priečinky"
id ubytovanie >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin ubytovanie
mkdir -p "$APP_DIR" "$DATA_DIR" "$BACKUP_DIR"
chown -R ubytovanie:ubytovanie "$APP_DIR" "$DATA_DIR"
chmod 750 "$DATA_DIR"

if [[ ! -f "$APP_DIR/.env" ]]; then
  echo "==> Tajné kľúče (.env)"
  cat > "$APP_DIR/.env" <<ENV
DATABASE_URL="file:$DATA_DIR/app.db"
DATABASE_AUTH_TOKEN=""
APP_SECRET="$(openssl rand -base64 36)"
CRON_SECRET="$(openssl rand -hex 24)"
APP_URL="https://$DOMAIN"
DEMO_MODE=""
SMTP_HOST=""
NEXT_TELEMETRY_DISABLED=1
ENV
  chown ubytovanie:ubytovanie "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
fi

echo "==> Služba systemd"
cat > /etc/systemd/system/ubytovanie.service <<UNIT
[Unit]
Description=Ubytovanie (Next.js)
After=network.target

[Service]
Type=simple
User=ubytovanie
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
ExecStart=$APP_DIR/node_modules/.bin/next start -p 3000 -H 127.0.0.1
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=full
ReadWritePaths=$APP_DIR $DATA_DIR

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable ubytovanie >/dev/null

echo "==> Caddy pre $DOMAIN"
cat > /etc/caddy/Caddyfile <<CADDY
$DOMAIN, $EXTRA_HOST {
	encode zstd gzip
	header {
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
	}
	reverse_proxy 127.0.0.1:3000
}
CADDY
systemctl reload caddy || systemctl restart caddy

echo "==> Firewall"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

echo "==> Denné úlohy: mazanie dokladov a záloha databázy"
cat > /etc/cron.d/ubytovanie <<'CRON'
# Mazanie dokladov po uplynutí doby uchovávania (E.04)
0 3 * * * ubytovanie . /opt/ubytovanie/.env; curl -fsS -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/retencia >/dev/null
# Záloha databázy, uchováva sa 14 dní
30 3 * * * root sqlite3 /var/lib/ubytovanie/app.db ".backup /var/backups/ubytovanie/app-$(date +\%F).db" && find /var/backups/ubytovanie -name 'app-*.db' -mtime +14 -delete
CRON

echo "Server je pripravený."
