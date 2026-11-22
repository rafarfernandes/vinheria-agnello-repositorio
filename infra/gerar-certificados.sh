#!/usr/bin/env bash
# Cria uma CA interna da Vinheria e um certificado TLS para o catalogo-service.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p certs && cd certs
openssl req -x509 -newkey rsa:2048 -nodes -days 365 -keyout ca.key -out ca.crt \
  -subj "/C=BR/O=Vinheria Agnello/CN=Vinheria Agnello CA Interna" 2>/dev/null
openssl req -newkey rsa:2048 -nodes -keyout catalogo.key -out catalogo.csr \
  -subj "/C=BR/O=Vinheria Agnello/CN=catalogo.vinheria.local" 2>/dev/null
printf "subjectAltName=DNS:catalogo.vinheria.local,DNS:catalogo\nextendedKeyUsage=serverAuth\n" > san.ext
openssl x509 -req -in catalogo.csr -CA ca.crt -CAkey ca.key -CAcreateserial -days 365 \
  -extfile san.ext -out catalogo.crt 2>/dev/null
rm -f catalogo.csr san.ext
echo ">> Certificados gerados em certs/:"; ls -1
openssl x509 -in catalogo.crt -noout -subject -issuer -ext subjectAltName
