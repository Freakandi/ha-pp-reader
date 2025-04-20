#!/bin/bash
set -e

TARGET_DIR="proto/name/abuchen/portfolio"
URL_BASE="https://raw.githubusercontent.com/buchen/portfolio/master/name.abuchen.portfolio/src/name/abuchen/portfolio/model"
FILE="client.proto"

mkdir -p "$TARGET_DIR"

echo "🔽 Lade Portfolio Performance $FILE nach $TARGET_DIR ..."
curl -fsSL "${URL_BASE}/${FILE}" -o "${TARGET_DIR}/${FILE}"

echo "✅ Fertig: $FILE gespeichert."
