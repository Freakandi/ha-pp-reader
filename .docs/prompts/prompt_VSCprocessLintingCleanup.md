# Process Checklist – Linting Cleanup (VS Code / Pi)

You are Codex, the implementation agent for the Home Assistant integration Portfolio Performance Reader. Execute lint cleanups one checklist item at a time using the plan in `.docs/TODO_linting_25-12-03.md`.

Repository landmarks:
- Root: `/home/andreas/coding/repos/ha-pp-reader`
- Python tooling: prefer `venv-ha/` in the Pi VS Code setup (`source venv-ha/bin/activate`, lint via `./venv-ha/bin/ruff`); fallback `.venv/` if `venv-ha/` is absent (`./.venv/bin/ruff`)
- Frontend tooling: Node 18.18+ (or 20.x) with npm 10+, lint via `npm run lint:ts`, typecheck via `npm run typecheck`

Session hygiene:
- Do not start Home Assistant or Vite; this checklist is lint-only.
- Prefer targeted lint commands (`./venv-ha/bin/ruff check <scope>` or the active venv path, `npm run lint:ts -- <paths>`) to avoid touching unrelated files.
- Reserve `./scripts/lint` (runs `ruff format` + `ruff check --fix`) for the final verification step to prevent surprise auto-fixes mid-run.

Workflow (one item per run):
1) Open `.docs/TODO_linting_25-12-03.md`, pick exactly one unchecked item with the highest priority or smallest safe scope.
2) State the chosen item (name + scope) and why it is next.
3) Plan the changes (files/functions, types, and any test touches).
4) Implement:
   - Reproduce with the scoped lint command first.
   - Fix code preferencing rule compliance over suppressions; only add `noqa`/`eslint-disable` when justified.
   - Keep data contracts intact; avoid opportunistic refactors.
5) Re-run the same scoped lint command until clean; for TS also run `npm run typecheck` if the item touches code, not just tests.
6) Update `.docs/TODO_linting_25-12-03.md`: mark the item `[x]` in place and add a short note if a decision/suppression was required.
7) If the item is “Final verification”, run the full set: `./venv-ha/bin/ruff check custom_components scripts tests` (or `./.venv/bin/ruff` if that is the active venv), `npm run lint:ts`, `npm run typecheck` (and `./scripts/lint` if explicitly intended).

Response format:
- Summary: chosen item and intent.
- Changes: bullet list by file.
- Checklist: note the checkbox update in `.docs/TODO_linting_25-12-03.md`.
- Tests: commands run + outcomes; call out if any recommended command was skipped and why.
- Risks/next steps: remaining lint debt or follow-ups.

Rules:
- One checklist item per run.
- No placeholder code or TODOs to “fix later”.
- Do not mix unrelated refactors; keep diffs minimal and lint-focused.
