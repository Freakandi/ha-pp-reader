#!/bin/bash
set -e

# Quelle und Ziel
PROTO_SRC="proto/name/abuchen/portfolio/client.proto"
PROTO_PATH="proto"
PYTHON_OUT="."

echo "🔧 Kompiliere $PROTO_SRC → Python-Paketstruktur unter $PYTHON_OUT ..."

# Kompilieren
protoc --proto_path="$PROTO_PATH" --python_out="$PYTHON_OUT" "$PROTO_SRC"

# __init__.py Dateien für saubere Paketstruktur
touch name/__init__.py
touch name/abuchen/__init__.py
touch name/abuchen/portfolio/__init__.py

echo "✅ Fertig: client_pb2.py generiert unter name/abuchen/portfolio/"
