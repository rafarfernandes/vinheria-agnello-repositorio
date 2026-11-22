#!/usr/bin/env bash
# Publica um pacote em PUBLISH_DIR/releases/<release> e troca o link "current" de forma atômica.
# Simula o que seria a cópia para o site do IIS (C:\inetpub\wwwroot\vinheria) em um Windows Server.
set -euo pipefail
PKG="$1"; PUBLISH_DIR="$2"; RELEASE="$3"
DEST="$PUBLISH_DIR/releases/$RELEASE"

echo ">> Deploy da release $RELEASE em $DEST"
mkdir -p "$DEST"
tar -xzf "$PKG" -C "$DEST"
echo "release=$RELEASE" > "$DEST/VERSION"
echo "data=$(date -Iseconds)" >> "$DEST/VERSION"
ln -sfn "$DEST" "$PUBLISH_DIR/current.tmp" && mv -Tf "$PUBLISH_DIR/current.tmp" "$PUBLISH_DIR/current"

# mantém só as 5 últimas releases (permite rollback rápido)
ls -1dt "$PUBLISH_DIR"/releases/* | tail -n +6 | xargs -r rm -rf
echo ">> current -> $(readlink "$PUBLISH_DIR/current")"
ls -1 "$PUBLISH_DIR/releases"
