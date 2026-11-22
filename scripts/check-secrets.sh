#!/usr/bin/env bash
# Verificação simples de DevSecOps: procura chaves privadas e senhas fixas no código versionado.
set -euo pipefail
echo ">> Procurando segredos no repositório..."
if git grep -nE -- '-----BEGIN (RSA |EC )?PRIVATE KEY-----|AKIA[0-9A-Z]{16}' -- ':!scripts/check-secrets.sh'; then
  echo "!! Segredo encontrado no código. Abortando."; exit 1
fi
if git ls-files | grep -E '\.(key|pem|p12)$'; then
  echo "!! Arquivo de chave versionado. Abortando."; exit 1
fi
echo ">> Nenhum segredo encontrado (certificados e chaves ficam fora do Git, em certs/ no .gitignore)"
