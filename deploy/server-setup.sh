#!/usr/bin/env bash
# Jednorazová príprava servera s Dokploy (Docker + Traefik). Spúšťa sa ako root:
#   ssh root@IP 'bash -s' < deploy/server-setup.sh
# Ostatných aplikácií na serveri sa nedotkne: pridá iba vlastné súbory a dátový zväzok.
set -euo pipefail

DOMAIN="${DOMAIN:-swi.becode.sk}"

echo "==> Tajné kľúče (/opt/swi/swi.env)"
mkdir -p /opt/swi && chmod 700 /opt/swi
if [[ ! -f /opt/swi/swi.env ]]; then
  # Docker --env-file neodstraňuje úvodzovky, hodnoty preto bez nich.
  cat > /opt/swi/swi.env <<ENV
APP_SECRET=$(openssl rand -base64 36)
CRON_SECRET=$(openssl rand -hex 24)
APP_URL=https://$DOMAIN
DEMO_MODE=
SMTP_HOST=
NEXT_TELEMETRY_DISABLED=1
ENV
  chmod 600 /opt/swi/swi.env
fi

echo "==> Dátový zväzok pre SQLite"
docker volume create swi-data >/dev/null

echo "==> Smerovanie v Traefiku ($DOMAIN, HTTPS cez Let's Encrypt)"
cat > /etc/dokploy/traefik/dynamic/swi.yml <<YML
# SWI ($DOMAIN) – samostatný kontajner "swi", spravovaný mimo Dokploy (/opt/swi).
http:
  routers:
    swi-router:
      rule: Host(\`$DOMAIN\`)
      service: swi-service
      middlewares:
        - redirect-to-https
      entryPoints:
        - web
    swi-router-websecure:
      rule: Host(\`$DOMAIN\`)
      service: swi-service
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
        domains:
          - main: $DOMAIN
  services:
    swi-service:
      loadBalancer:
        servers:
          - url: http://swi:3000
        passHostHeader: true
YML

echo "==> Denné úlohy: mazanie dokladov a záloha databázy (03:15)"
cat > /opt/swi/daily.sh <<'SH'
#!/bin/sh
# Denná údržba SWI: mazanie dokladov po dobe uchovávania a záloha databázy (14 dní).
set -e
docker exec swi node -e "fetch(\"http://127.0.0.1:3000/api/cron/retencia\",{headers:{authorization:\"Bearer \"+process.env.CRON_SECRET}}).then(async r=>{console.log(r.status,await r.text());process.exit(r.ok?0:1)})"
mkdir -p -m 700 /var/backups/swi
docker cp swi:/data/app.db /var/backups/swi/app-$(date +%F).db
gzip -f /var/backups/swi/app-$(date +%F).db
find /var/backups/swi -name "app-*.db.gz" -mtime +14 -delete
SH
chmod 700 /opt/swi/daily.sh
echo "15 3 * * * root /opt/swi/daily.sh >> /var/log/swi-daily.log 2>&1" > /etc/cron.d/swi

echo "Hotovo. Aplikáciu spusti z počítača: ./deploy/deploy.sh --seed"
