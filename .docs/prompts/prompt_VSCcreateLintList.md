# Portfolio Performance Reader Lint TODO Generator (VS Code / Pi)

You are Codex, the linting recon agent for the Home Assistant integration Portfolio Performance Reader. Run the full lint suites, then emit a fresh per-module TODO list that the cleanup prompt (`prompt_VSCprocessLintingCleanup.md`) can consume without edits.

## Repository Landmarks
- Root: `/home/andreas/coding/repos/ha-pp-reader`
- Python tooling: `.venv/` (`source .venv/bin/activate`), lint via `./.venv/bin/ruff`
- Frontend tooling: Node 18.18+ (or 20.x) with npm 10+, lint via `npm run lint:ts`, typecheck via `npm run typecheck`

## Task
- Run all linting commands to gather the current backlog:
  - Python: `./.venv/bin/ruff check custom_components scripts tests --statistics`
  - Frontend: `npm run lint:ts -- --format json --output-file /tmp/eslint.json` (preserve the JSON for counting hotspots)
  - Optional: `npm run typecheck` if TypeScript findings hint at typing gaps
- From the results, derive a per-module checklist (one file/module per item) and save it to `.docs/TODO_linting_<yy-mm-dd>.md` using today’s date (two-digit year/month/day; use hyphens in the filename, display `yy/mm/dd` in the document header).

## Workflow
1) Session hygiene: stay lint-only (no Home Assistant or Vite); ensure the virtualenv is active before running Python linting.
2) Execute the commands above in order; note exit codes and top rule clusters or hotspots.
3) Parse lint outputs to identify affected files. Split hotspots into single-module items—never bundle multiple modules in one checkbox.
4) Write the checklist file and double-check that each item includes a scoped command suitable for `prompt_VSCprocessLintingCleanup.md`.

## Checklist File Requirements (`.docs/TODO_linting_<yy-mm-dd>.md`)
- Header: title with the friendly date (`yy/mm/dd`), short context, and the commands executed with pass/fail status plus total finding counts if available.
- Structure a `Checklist` section with unchecked items sorted by severity/hotspot size.
- Item template (one module/file per item):
  - `- [ ] **<module label>**`
  - `  Scope: <single path>`
  - `  Findings: <brief rule summary/counts>`
  - `  Command: <scoped lint command>` (e.g., `./.venv/bin/ruff check <path>` or `npm run lint:ts -- <path>`)
  - `  Acceptance: <expected clean outcome>` (include `npm run typecheck` if the module is runtime TS, not just tests)
- Optional final item: `- [ ] **Final verification**` with full commands (`./.venv/bin/ruff check custom_components scripts tests`, `npm run lint:ts`, `npm run typecheck`).
- Keep wording concise so the cleanup prompt can mark items `[x]` in-place.

## Output Expectations
- Respond with the TODO file path, date used, key lint counts/hotspots, and the commands executed + outcomes.
- Do not change other files. The resulting TODO file must be immediately usable with `prompt_VSCprocessLintingCleanup.md`.
