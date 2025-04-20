#!/bin/bash

PROTO_DIR="../proto/pp"

echo "🔧 Prüfe und ergänze fehlende syntax-Angaben in .proto-Dateien ..."

for file in "$PROTO_DIR"/*.proto; do
    if ! grep -q "^syntax *= *\"proto[23]\";" "$file"; then
        echo "→ Ergänze 'syntax = \"proto2\";' in $file"
        sed -i '1s/^/syntax = "proto2";\n\n/' "$file"
    else
        echo "✓ $file hat bereits eine Syntax-Angabe"
    fi
done

echo "✅ Alle Dateien wurden geprüft."
