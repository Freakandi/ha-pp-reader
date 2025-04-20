#!/bin/bash

set -e

PROTO_SRC_DIR="../proto/pp"
PROTO_OUT_DIR="../proto/pp"

echo "🔧 Kompiliere .proto-Dateien im Verzeichnis: $PROTO_SRC_DIR"

# Prüfe ob protoc installiert ist
if ! command -v protoc &> /dev/null; then
    echo "❌ Fehler: protoc (Protocol Buffers Compiler) ist nicht installiert."
    echo "Installiere es z. B. über: sudo apt install protobuf-compiler"
    exit 1
fi

# Kompiliere alle .proto-Dateien im Verzeichnis
protoc --proto_path="$PROTO_SRC_DIR" --python_out="$PROTO_OUT_DIR" "$PROTO_SRC_DIR"/*.proto

echo "✅ Kompilierung abgeschlossen. Python-Dateien liegen unter $PROTO_OUT_DIR."

