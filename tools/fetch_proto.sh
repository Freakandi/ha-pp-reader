#!/bin/bash

set -e

PROTO_DIR="proto/pp"
mkdir -p "$PROTO_DIR"

# Neue Basis-URL (Stand: 2025)
BASE_URL="https://raw.githubusercontent.com/buchen/portfolio/master/name.abuchen.portfolio/src/name/abuchen/portfolio/model"

# Liste der verfügbaren .proto-Dateien
FILES=(
  client.proto
)

echo "🔽 Lade aktuelle .proto-Dateien nach $PROTO_DIR ..."

for file in "${FILES[@]}"; do
    url="$BASE_URL/$file"
    target="$PROTO_DIR/$file"

    echo "→ Lade $file ..."
    http_code=$(curl -s -w "%{http_code}" -L -o "$target" "$url")
    if [[ "$http_code" != "200" ]]; then
        echo "❌ Fehler beim Laden von $url (HTTP $http_code)"
        rm -f "$target"
        exit 1
    fi
done

echo "✅ Alle Dateien erfolgreich heruntergeladen."

