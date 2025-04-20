#!/bin/bash
set -e

# 💡 Bestimme das Verzeichnis, in dem dieses Skript liegt
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}/.."

# 📄 Quelle und Zielverzeichnisse definieren
PROTO_SRC="${PROJECT_ROOT}/proto/pp/client.proto"
PROTO_PATH="${PROJECT_ROOT}/proto/pp"
PYTHON_OUT="${PROJECT_ROOT}"

echo "🔧 Kompiliere $PROTO_SRC → Python-Paketstruktur unter $PYTHON_OUT ..."

# 🔨 Kompiliere client.proto zu client_pb2.py (mit korrektem Package-Pfad)
protoc --proto_path="$PROTO_PATH" --python_out="$PYTHON_OUT" "$PROTO_SRC"

# 📁 __init__.py erzeugen, damit Python die Ordnerstruktur als Modul erkennt
touch "${PROJECT_ROOT}/name/__init__.py"
touch "${PROJECT_ROOT}/name/abuchen/__init__.py"
touch "${PROJECT_ROOT}/name/abuchen/portfolio/__init__.py"

echo "✅ Fertig: client_pb2.py generiert unter name/abuchen/portfolio/"

