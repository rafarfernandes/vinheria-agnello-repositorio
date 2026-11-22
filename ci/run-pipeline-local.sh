#!/usr/bin/env bash
# Executa localmente os mesmos estágios do Jenkinsfile (útil para validar antes de subir para o Jenkins).
set -euo pipefail
cd "$(dirname "$0")/.."
APP_NAME=vinheria-agnello; PUBLISH_DIR=${PUBLISH_DIR:-/var/www/vinheria}; RELEASE=${RELEASE:-local-$(date +%H%M%S)}
stage() { echo; echo "[Pipeline] { ($1)"; }
end() { echo "[Pipeline] } ok"; }
stage Checkout;   git log -1 --oneline; end
stage Build;      echo "Deploy da Vinheria"; node --version
                  for s in catalogo-service pedidos-service; do echo ">> build $s"; node --check services/$s/server.js; done; end
stage Testes;     (cd services/catalogo-service && npm test --silent); (cd services/pedidos-service && npm test --silent); end
stage DevSecOps;  scripts/check-secrets.sh
                  (cd services/catalogo-service && npm audit --audit-level=high 2>&1 | tail -1) || true; end
stage Empacotar;  tar -czf $APP_NAME-$RELEASE.tar.gz services infra scripts; ls -lh $APP_NAME-$RELEASE.tar.gz | awk '{print $5, $9}'; end
stage Deploy;     scripts/deploy.sh $APP_NAME-$RELEASE.tar.gz $PUBLISH_DIR $RELEASE; end
stage "Smoke test"; scripts/smoke-test.sh $PUBLISH_DIR/current; end
echo; echo "Finished: SUCCESS  (release $RELEASE publicada em $PUBLISH_DIR/current)"
