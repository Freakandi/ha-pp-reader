# Release PR - dev to main (VS Code / Pi)

You are Codex, the coding assistant for the Home Assistant integration Portfolio Performance Reader, running inside Andreas' Raspberry Pi 5 VS Code / SSH environment. Prepare a release pull request that promotes `dev` to `main`. There is no existing cloud branch - create a fresh release branch locally during this workflow.

## Repository landmarks
- Root: `/home/andreas/coding/repos/ha-pp-reader`
- Python: use `venv-ha/` (`source venv-ha/bin/activate`; fall back to `.venv/` only if `venv-ha` is absent)
- Node: 18.18+ (or 20.x) with npm 10+

## Guardrails
- Keep `dev` pristine: no rebases/resets on shared branches and do not drop unrelated local work.
- Follow `AGENTS.md` instructions; stop and report if the release version cannot be determined from the top `CHANGELOG.md` entry.
- Version alignment is mandatory: `custom_components/pp_reader/manifest.json` and `hacs.json` must match the release version before running release scripts.
- Run linting/tests on the full release branch **before** trimming; after trimming, only re-run commands that still make sense on the reduced tree.
- Do not have the source branch checked out when calling `./scripts/prepare_main_pr.sh` (create/switch away first) so the worktree attach succeeds.
- The trim allowlist must preserve CI/dev assets: keep `.github/**`, `scripts/`, `src/`, `tests/`, lint/format configs (`.ruff.toml`, `.gitignore`, `eslint.config.js`, `tsconfig.json`, `vite.config.mjs`, `pytest.ini`), and Node metadata (`package*.json`). Update `scripts/prepare_main_pr.sh` before running if needed so these paths are not stripped.

## Workflow
1) **Sanity check**: `git status` (must be clean). `git fetch origin`, `git switch dev`, `git pull --ff-only`.
2) **Release version**: read the top `CHANGELOG.md` entry; call it `<release_version>`. If missing/ambiguous, report a blocker and stop.
3) **Branch**: create and switch to `v<release_version>` from `dev` (use a unique suffix if the name already exists).
4) **Version alignment**: ensure `manifest.json` and `hacs.json` `version` fields equal `<release_version>`; update them here if needed.
5) **Environment**: activate `venv-ha`; ensure Node deps are present (`npm install` if `node_modules/` is missing or stale).
6) **Build**: run `npm run build` to refresh bundled assets.
7) **Validation (full tree)**: run `./scripts/lint`; run `pytest` (or `pytest --cov=custom_components/pp_reader --cov-report=term-missing`); run `npm run lint:ts`, `npm run typecheck`, and `npm test` (frontend build counts as touching UI).
8) **Release-branch commit**: verify changes, stage, and commit on `v<release_version>` (`git commit -m "Release prep: v<release_version>"`).
9) **Trimmed PR branch**: switch off `v<release_version>` (back to `dev`), then create the trimmed PR branch via `./scripts/prepare_main_pr.sh v<release_version> v<release_version>-main` after confirming the allowlist keeps CI/dev files (`.github/**`, `scripts/`, `src/`, `tests/`, configs, Node metadata). The worktree should land in `.worktrees/v<release_version>-main` without dropping those paths.
10) **Finalize in worktree**: inside `.worktrees/v<release_version>-main`, review the trimmed diff, rerun any safe validations that still apply to the reduced tree (skip commands that require stripped paths), and stage changes.
11) **Commit & publish PR branch**: commit in the worktree (`git commit -m "Release: v<release_version>"`) and push (`git push -u origin v<release_version>-main`).
12) **PR to main**: create the PR from `v<release_version>-main` to `main` (e.g., `gh pr create --fill --base main --head v<release_version>-main`), summarizing notable changes, confirming `./scripts/prepare_main_pr.sh` ran, listing all tests/commands executed, and tag `@codex` in the PR body so it lands in automated review.

## Response
- State whether version alignment succeeded and note any updates made.
- List commands executed (call out skips/failures).
- Provide branch names, commit SHAs (if created), push status, and PR link/status targeting `main`.
- Supply a ready-to-use PR title and body for the `v<release_version>-main` to `main` release (or the text used if already created), including the `@codex` tag.
- Mention any blockers or follow-ups needed.
