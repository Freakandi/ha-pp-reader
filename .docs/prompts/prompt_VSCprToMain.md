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
- Run linting/validation commands from inside .worktrees/main to avoid mutating the root checkout (prefer env overrides like RUFF_EXCLUDE=.worktrees/** over config edits).

## Workflow
1) **Sanity check**: `git status` (must be clean). `git fetch origin`, `git switch dev`, `git pull --ff-only`.
2) **Release version**: read the top `CHANGELOG.md` entry; call it `<release_version>`. If missing/ambiguous, report a blocker and stop.
3) **Branch**: create and switch to `release/pp-reader-v<release_version>` from `dev` (use a unique suffix if the name already exists).
4) **Version alignment**: ensure `manifest.json` and `hacs.json` `version` fields equal `<release_version>`; update them here if needed.
5) **Environment**: activate `venv-ha`; ensure Node deps are present (`npm install` if `node_modules/` is missing or stale).
6) **Build + promote**: run `npm run build`, then execute `./scripts/prepare_main_pr.sh dev main` to sync release-ready artifacts.
7) **Validation**: run `./scripts/lint`; run `pytest` (or `pytest --cov=custom_components/pp_reader --cov-report=term-missing`); run `npm run lint:ts`, `npm run typecheck`, and `npm test` if frontend code/assets were involved (`npm run build` counts).
8) **Commit & push**: verify only intended files changed, stage, commit (`git commit -m "Release: v<release_version>"`), and `git push -u origin -v<release_version>`.
9) **PR draft**: prepare a PR targeting `main` summarizing notable changes, confirm `./scripts/prepare_main_pr.sh dev main` ran, and list all tests/commands executed.

## Response
- State whether version alignment succeeded and note any updates made.
- List commands executed (call out skips/failures).
- Provide branch name, commit SHA (if created), and push status.
- Supply a ready-to-use PR title and body for the `dev` to `main` release.
- Mention any blockers or follow-ups needed.
