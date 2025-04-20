#!/bin/bash
set -e

# 💡 Bestimme das Verzeichnis, in dem dieses Skript liegt
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}/.."

# 📄 Quelle und Zielverzeichnisse definieren
PROTO_SRC="${PROJECT_ROOT}/proto/name/abuchen/portfolio/client.proto"
PROTO_PATH="${PROJECT_ROOT}/proto"
PYTHON_OUT="${PROJECT_ROOT}/custom_components/pp_reader"

echo "🔧 Kompiliere $PROTO_SRC → Python-Paketstruktur unter $PYTHON_OUT ..."

# 🔨 Kompiliere client.proto zu client_pb2.py (mit korrektem Package-Pfad)
protoc --proto_path="$PROTO_PATH" --python_out="$PYTHON_OUT" "$PROTO_SRC"

# 📁 __init__.py erzeugen, damit Python die Ordnerstruktur als Modul erkennt
touch "${PYTHON_OUT}/name/__init__.py"
touch "${PYTHON_OUT}/name/abuchen/__init__.py"
touch "${PYTHON_OUT}/name/abuchen/portfolio/__init__.py"

echo "✅ Fertig: client_pb2.py generiert unter name/abuchen/portfolio/"
