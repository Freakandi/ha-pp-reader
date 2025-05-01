#!/bin/bash

# Überprüfen, ob eine Commit-Nachricht übergeben wurde
if [ -z "$1" ]; then
  echo "Fehler: Bitte gib eine Commit-Nachricht als Parameter an."
  echo "Beispiel: ./commit.sh \"Meine Nachricht\""
  exit 1
fi

# Änderungen zum Commit hinzufügen
git add .

# Commit mit der übergebenen Nachricht
git commit -m "$1"

# Änderungen pushen
git push
