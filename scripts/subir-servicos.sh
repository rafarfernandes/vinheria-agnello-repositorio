#!/usr/bin/env bash
# Sobe os microsserviços dentro da rede simulada. MODO=http (inseguro) ou MODO=https.
set -euo pipefail
pkill -f "^node services/" 2>/dev/null || true; sleep 0.5
cd "$(dirname "$0")/.."
MODO="${1:-https}"
source /tmp/vinheria.env   # JWT_SECRET fica fora do Git
C="$PWD/certs"
if [ "$MODO" = http ]; then URL=http://catalogo.vinheria.local:8080; DIS=false; else URL=https://catalogo.vinheria.local:8443; DIS=true; fi
setsid infra/simular-rede.sh run catalogo env JWT_SECRET="$JWT_SECRET" DISABLE_HTTP="$DIS" TLS_CERT="$C/catalogo.crt" TLS_KEY="$C/catalogo.key" \
  node services/catalogo-service/server.js > /tmp/catalogo.log 2>&1 < /dev/null &
setsid infra/simular-rede.sh run pedidos env JWT_SECRET="$JWT_SECRET" CATALOGO_URL="$URL" CA_FILE="$C/ca.crt" \
  node services/pedidos-service/server.js > /tmp/pedidos.log 2>&1 < /dev/null &
sleep 1.5; cat /tmp/catalogo.log /tmp/pedidos.log
