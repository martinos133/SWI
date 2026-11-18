#!/usr/bin/env bash
# Nasadenie aktuálnej verzie z tohto počítača na server.
#   ./deploy/deploy.sh            – zostaví image, prenesie ho na server a reštartuje aplikáciu
#   ./deploy/deploy.sh --seed     – navyše naplní databázu ukážkovými dátami (prepíše ju!)
#
# Image sa zostavuje lokálne: server má iba 2 GB RAM a beží na ňom aj iná prevádzka.
set -euo pipefail

SERVER="${SERVER:-root@89.167.0.160}"
cd "$(dirname "$0")/.."
TAG="swi:$(git rev-parse --short HEAD)"

echo "==> Zostavujem $TAG (linux/amd64)"
docker buildx build --platform linux/amd64 --load -t "$TAG" .

echo "==> Prenášam image na $SERVER"
docker save "$TAG" | gzip -1 | ssh "$SERVER" 'gunzip | docker load'

SEED=""
[[ "${1:-}" == "--seed" ]] && SEED=1

ssh "$SERVER" TAG="$TAG" SEED="$SEED" 'bash -s' <<'REMOTE'
set -euo pipefail
echo "==> Reštart kontajnera"
docker rm -f swi >/dev/null 2>&1 || true
docker run -d --name swi --restart unless-stopped \
  --network dokploy-network \
  --memory 384m --memory-swap 768m --cpus 0.5 \
  --log-opt max-size=10m --log-opt max-file=3 \
  --env-file /opt/swi/swi.env \
  -v swi-data:/data "$TAG" >/dev/null
for _ in $(seq 1 40); do
  [[ "$(docker inspect -f '{{.State.Health.Status}}' swi)" == healthy ]] && break
  sleep 3
done
docker inspect -f 'Stav kontajnera: {{.State.Health.Status}}' swi
if [[ -n "$SEED" ]]; then
  echo "==> Ukážkové dáta"
  docker exec swi node_modules/.bin/tsx prisma/seed.ts
fi
echo "==> Mažem staré image"
docker images swi --format '{{.Repository}}:{{.Tag}}' | grep -vx "$TAG" | xargs -r docker rmi >/dev/null || true
REMOTE
