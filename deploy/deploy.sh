#!/usr/bin/env bash
# Nasadenie aktuálnej verzie z tohto počítača na server.
#   ./deploy/deploy.sh            – nasadí a reštartuje aplikáciu
#   ./deploy/deploy.sh --seed     – navyše naplní databázu ukážkovými dátami (prepíše ju!)
set -euo pipefail

SERVER="${SERVER:-root@5.22.158.143}"
APP_DIR=/opt/ubytovanie
cd "$(dirname "$0")/.."

echo "==> Kopírujem zdrojové súbory na $SERVER"
rsync -az --delete \
  --exclude '/.*' --exclude node_modules --exclude 'prisma/*.db' \
  --exclude src/generated --exclude test-results --exclude playwright-report \
  --exclude docs/screenshots \
  ./ "$SERVER:$APP_DIR/"

SEED=""
[[ "${1:-}" == "--seed" ]] && SEED=1

ssh "$SERVER" SEED="$SEED" APP_DIR="$APP_DIR" 'bash -s' <<'REMOTE'
set -euo pipefail
chown -R ubytovanie:ubytovanie "$APP_DIR"
cd "$APP_DIR"
run() { runuser -u ubytovanie -- "$@"; }
echo "==> Závislosti"
run npm ci --no-audit --no-fund
echo "==> Migrácie databázy"
run npx prisma migrate deploy
if [[ -n "$SEED" ]]; then
  echo "==> Ukážkové dáta"
  run npx prisma db seed
fi
echo "==> Build"
run npx next build
echo "==> Reštart"
systemctl restart ubytovanie
sleep 3
curl -fsS -o /dev/null -w "Aplikácia odpovedá: HTTP %{http_code}\n" http://127.0.0.1:3000/login
REMOTE
