#!/usr/bin/env bash
set -euo pipefail

# Usage‑Check
if [ $# -lt 1 ]; then
  echo "Usage: $0 [patch|minor|major]"
  exit 1
fi

PART=$1

# 1) Geänderte Dateien vormerken
git add -u
git add .

# 2) Vor‑Bump‑Commit (falls es überhaupt was zu committen gibt)
if ! git diff --cached --quiet; then
  git commit -m "chore: update code before version bump"
else
  echo "⚠️  Keine Änderungen zum Committen."
fi

# 3) Version bump durchführen (commit + Tag)
bump2version "$PART"

# 4) Branch und Tags pushen
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git push origin "$BRANCH"
git push origin "$BRANCH" --follow-tags

echo "✅ Version bumped ($PART) and pushed (branch: $BRANCH)."

