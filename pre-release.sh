#!/usr/bin/env bash
set -euo pipefail

# Usage: ./release.sh <version> "<Release Notes>"
# Beispiel: ./release.sh 0.2.8 "Dashboard-Optimierungen und Bugfixes"

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <version> \"<Release Notes>\""
  exit 1
fi

VERSION="$1"
shift
NOTES="$*"

# 1) Stelle sicher, dass der Tag bereits existiert:
if ! git rev-parse "v$VERSION" >/dev/null 2>&1; then
  echo "Error: Tag v$VERSION does not exist. Please git tag v$VERSION first."
  exit 1
fi

# 2) Create the GitHub Release on that tag
gh release create "v$VERSION" \
  --title "v$VERSION" \
  --notes "$NOTES" \
  --prerelease

echo "✅ Pre-Release v$VERSION created."
