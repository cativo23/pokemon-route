#!/usr/bin/env bash
# Renderiza tools/og.html a assets/og.png, la tarjeta que ven WhatsApp,
# LinkedIn y Twitter al abrir el enlace. 1200x630 es la proporcion que las
# tres recortan sin cortar nada.
#
#   ./tools/make-og.sh
#
# Necesita Chrome y un servidor local: file:// no carga las fuentes remotas.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Puerto libre elegido al vuelo: un numero fijo tarde o temprano choca con
# otro servidor, y entonces Chrome fotografia el 404 del vecino.
PORT="$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1]);s.close()')"

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT" >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true' EXIT

# Esperar a que responda de verdad. Un `sleep` fijo renderiza la pagina de 404
# del servidor y la guarda como si fuera la tarjeta, sin avisar de nada.
for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/tools/og.html" || true)
  [ "$code" = "200" ] && break
  sleep 0.25
done
[ "$code" = "200" ] || { echo "el servidor no sirvio tools/og.html (HTTP $code)" >&2; exit 1; }

google-chrome-stable --headless --disable-gpu --hide-scrollbars --no-sandbox \
  --virtual-time-budget=6000 --window-size=1200,630 \
  --screenshot="$ROOT/assets/og.png" "http://127.0.0.1:$PORT/tools/og.html"

echo "==> assets/og.png  $(identify -format '%wx%h  %b' "$ROOT/assets/og.png")"
