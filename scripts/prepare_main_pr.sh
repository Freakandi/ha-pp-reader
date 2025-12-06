#!/usr/bin/env bash
set -euo pipefail

SOURCE_BRANCH=${1:-dev}
TARGET_BRANCH=${2:-main-release}
WORKTREE_DIR=${3:-".worktrees/${TARGET_BRANCH}"}

ALLOWED_ROOT=(
  ARCHITECTURE.md
  CHANGELOG.md
  hacs.json
  LICENSE
  README.md
  .ruff.toml
  .gitignore
  eslint.config.js
  tsconfig.json
  vite.config.mjs
  pytest.ini
  package.json
  package-lock.json
  package*.json
)
ALLOWED_DIRS=(
  custom_components
  .github
  scripts
  src
  tests
)

REPO_ROOT=$(git rev-parse --show-toplevel)

if ! git rev-parse --verify --quiet "${SOURCE_BRANCH}" >/dev/null; then
  echo "Source branch '${SOURCE_BRANCH}' not found" >&2
  exit 1
fi

mkdir -p "${REPO_ROOT}/.worktrees"

echo "Creating release worktree at ${WORKTREE_DIR} from ${SOURCE_BRANCH}" >&2
if git worktree list | awk '{print $1}' | grep -Fxq "${REPO_ROOT}/${WORKTREE_DIR}"; then
  git worktree remove "${WORKTREE_DIR}" --force
fi

git worktree add --force "${WORKTREE_DIR}" "${SOURCE_BRANCH}"

pushd "${WORKTREE_DIR}" >/dev/null

git checkout -B "${TARGET_BRANCH}" >/dev/null

while IFS= read -r path; do
  case "${path}" in
    ${ALLOWED_DIRS[0]}/*|${ALLOWED_DIRS[1]}/*|${ALLOWED_DIRS[2]}/*|${ALLOWED_DIRS[3]}/*|${ALLOWED_DIRS[4]}/*)
      ;;
    ${ALLOWED_ROOT[0]}|${ALLOWED_ROOT[1]}|${ALLOWED_ROOT[2]}|${ALLOWED_ROOT[3]}|${ALLOWED_ROOT[4]}|${ALLOWED_ROOT[5]}|${ALLOWED_ROOT[6]}|${ALLOWED_ROOT[7]}|${ALLOWED_ROOT[8]}|${ALLOWED_ROOT[9]}|${ALLOWED_ROOT[10]}|${ALLOWED_ROOT[11]}|${ALLOWED_ROOT[12]}|${ALLOWED_ROOT[13]})
      ;;
    *)
      git rm -r --cached --quiet "${path}" || true
      rm -rf "${path}"
      ;;
  esac
done < <(git ls-files)

git clean -fdx >/dev/null

echo "Worktree prepared. Review changes under ${WORKTREE_DIR} and commit when ready." >&2

popd >/dev/null
