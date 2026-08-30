#!/usr/bin/env bash
# Despliega la ruta a pokemon.cativo.dev en polaris2.
# Mismo patrón que paldea-guide: nginx:alpine sobre un volumen read-only y Traefik
# enrutando por label. No requiere sudo.
set -euo pipefail

HOST="polaris2"
REMOTE="/home/cativo23/deploy/pokemon-guide"
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> origen local : $SRC"
echo "==> destino      : $HOST:$REMOTE"

ssh "$HOST" "mkdir -p '$REMOTE/html'"

rsync -az --delete \
  --exclude '.git' --exclude 'deploy' --exclude 'README.md' \
  "$SRC/" "$HOST:$REMOTE/html/"

scp -q "$SRC/deploy/compose.prod.yml" "$HOST:$REMOTE/compose.prod.yml"
scp -q "$SRC/deploy/nginx.conf" "$HOST:$REMOTE/nginx.conf"

ssh "$HOST" "cd '$REMOTE' && docker compose -f compose.prod.yml up -d"

# nginx no relee su config solo: si solo cambió nginx.conf, `up -d` no recrea el
# contenedor y el cambio no se aplica. Recargar siempre.
ssh "$HOST" "docker exec pokemon-guide-app-1 nginx -t && docker exec pokemon-guide-app-1 nginx -s reload" >/dev/null 2>&1 \
  && echo "==> nginx recargado"

echo
ssh "$HOST" "docker ps --filter name=pokemon-guide --format '  {{.Names}}  {{.Status}}'"
echo
echo "==> listo: https://pokemon.cativo.dev"
