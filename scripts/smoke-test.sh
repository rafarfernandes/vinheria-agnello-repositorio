#!/usr/bin/env bash
# Sobe os dois serviços a partir da pasta publicada e confere /health e uma chamada autenticada.
set -euo pipefail
APP="$1"
export JWT_SECRET="smoke-$(date +%s)"
PORT=18080 node "$APP/services/catalogo-service/server.js" > /tmp/smoke-catalogo.log 2>&1 & C=$!
PORT=18081 CATALOGO_URL=http://127.0.0.1:18080 node "$APP/services/pedidos-service/server.js" > /tmp/smoke-pedidos.log 2>&1 & P=$!
trap 'kill $C $P 2>/dev/null || true' EXIT
sleep 1
curl -fsS http://127.0.0.1:18080/health; echo
curl -fsS http://127.0.0.1:18081/health; echo
TOKEN=$(curl -fsS -X POST http://127.0.0.1:18081/auth/login -H 'Content-Type: application/json' \
  -d '{"usuario":"cliente","senha":"vinho123"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).access_token')
curl -fsS -X POST http://127.0.0.1:18081/pedidos -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"vinhoId":3,"quantidade":1}'; echo
echo ">> Smoke test OK"
