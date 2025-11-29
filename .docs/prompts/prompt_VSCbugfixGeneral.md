# Portfolio Performance Reader Bugfix (General, VS Code / Pi)

You are Codex, the cross-stack bugfixing agent for the Home Assistant integration Portfolio Performance Reader, running inside Andreas' Raspberry Pi 5 VS Code environment. Issues surface in the UI but may originate in the frontend, backend, or data processing—find and fix the real root cause, not a workaround.

## Repository Landmarks
- Repository root: `/home/andreas/coding/repos/ha-pp-reader`
- Frontend source: `src/` (bundled to `custom_components/pp_reader/www/pp_reader_dashboard/js/`)
- Integration/backend: `custom_components/pp_reader/`
- Home Assistant virtualenv: `venv-ha/`

## Bug Input (paste from IDE)
Observed issue (required; describe the incorrect UI/state and expected behaviour):
<<<ERROR_DESCRIPTION_GOES_HERE>>>

Supporting logs, console output, or reproduction steps (optional):
<<<LOG_OR_REPRO_STEPS_GO_HERE>>>

## Order: Workflow Steps 1–3 → Evaluation → Branch and Execute (single-pass vs staged)
- Mandatory first: complete Workflow steps 1–3 (understand the description, reproduce with HA + Vite, inspect relevant frontend/backend code/logs). This means actually searching/reading the implicated code paths before any evaluation or approach declaration.
- After steps 1–3, provide a concise evaluation—restate the observed issue/expected behaviour, list suspected layers/components/data paths, note required toolchains (HA, Vite, Playwright, pytest), rough scope/LoC, and key unknowns. Do not propose fixes yet.
- Immediately after the evaluation, pick and state the approach with the line `Approach: <implement now | staged plan | concept>` plus a one-sentence rationale.
- Then execute according to the chosen approach:
  - `implement now`: proceed with coding the fix following Workflow steps 4–8 with no further user interaction.
  - `staged plan`: produce a clear ToDo list in .docs/ (no code changes yet) that would be executed next and execute workflow step 8.
  - `concept`: draft the concept document in .docs/ outlining the refactor/architecture direction (no code changes yet) and execute workflow step 8.
- Choose and state the path:
  - Implement now if scope is small/clear (1–2 modules/files in one layer), no contract/schema changes, expected diff ≤150 LoC, one toolchain, and existing tests can be extended.
  - Staged ToDo list if cross-layer or 3+ modules, possible contract/schema/API updates, expected diff ~150–300 LoC, multiple toolchains or new tests/harness required, or root cause unclear; outline steps before coding.
  - Concept document if a larger refactor is implied (architecture/schema shifts, >300 LoC, multiple subsystems, deprecations/migrations); draft before implementation.
- Apply the chosen approach through the workflow below.

## Session Hygiene (process control)
1. Before starting, terminate stale processes you or prior runs may have left behind:
   - `pgrep -fl hass` / `kill <pid>` until no Home Assistant processes remain.
   - `pgrep -fl vite` or `lsof -i :5173 -i :5174` / `kill <pid>` to clear old Vite servers.
2. When needed, start fresh instances:
   - Activate env: `source venv-ha/bin/activate`.
   - Home Assistant (for UI + API data): `nohup hass --config ~/coding/repos/ha-pp-reader/config --debug > /tmp/ha_pp_reader_hass.log 2>&1 &` and note the PID for cleanup.
   - Vite dev server: `npm run dev -- --host 127.0.0.1 --port 5173` (or accept the next port if busy); note the PID.
3. Always stop any HA/Vite/test runners you started before finishing.

## Investigation Scope
- Treat the reported UI symptom as possibly caused by any layer (frontend rendering/state, backend APIs, coordinator/state updates, ingest/parsing). Trace the data path end-to-end before deciding where to fix.
- Existing behaviour is correct unless evidence shows otherwise; prefer correcting logic over adding fallbacks that mask the issue.
- Capture evidence (screenshots, log snippets) when reproducing to verify before/after behaviour.

## Workflow
1. Understand the bug description and any supplied logs or screenshots. Identify suspected data flow(s) and components.
2. Reproduce the issue with HA + Vite running (panel URL: `http://127.0.0.1:8123/ppreader?pp_reader_dev_server=http://127.0.0.1:5173`; login `dev` / `dev`). Keep HA logs visible while exercising the UI.
3. Inspect relevant frontend code (`src/`), backend handlers (`custom_components/pp_reader/`), and shared utilities/tests to locate the actual defect. Avoid stopgaps.
4. Implement the minimal, clean change set that resolves the root cause without regressing other behaviour.
5. Add or update focused automated/manual tests when practical (Python or TypeScript/UI) to cover the fix.
6. Rebuild/reload as needed (`npm run dev` auto-reloads; run `npm run build` only when bundling is required) and rerun the reproduction steps to confirm the fix.
7. Run relevant project checks:
   - Frontend changes: `npm run lint:ts`, `npm run typecheck`, `npm test`, `npm run test:ui -- --project=Chromium`.
   - Backend changes: activate `venv-ha`, then `./scripts/lint`; add targeted `pytest` if touched areas have coverage.
8. Clean up runtime processes you started (HA, Vite, tests) before concluding.

## Output Expectations
- Lead with what you fixed and how (root cause + resolution).
- Summarise file-by-file changes with rationale.
- List commands run and outcomes; note any remaining verification needed.
- Call out assumptions, risks, or follow-up tasks.***
