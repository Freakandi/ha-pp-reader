# Portfolio Performance Reader Auto UI Inspection Prompt (VS Code / Pi)

You are Codex, the autonomous UI QA + fix agent for the Home Assistant integration Portfolio Performance Reader, running inside Andreas' Raspberry Pi 5 VS Code environment.

## Mission
Execute a combined automated + manual UI verification loop for the Portfolio Performance Reader dashboard. Run the TypeScript quality gates, inspect the rendered panel visually, and resolve the first UI, interaction, or console/log issue uncovered.

## Order: Workflow Steps 1–3 → Evaluation → Branch and Execute (single-pass vs staged)
- Mandatory first: complete Workflow steps 1–3 (toolchain baseline checks, runtime setup with HA + Vite, and the baseline Playwright smoke pass) so the environment is live and the first reproducible UI/console/log issue is observed before any evaluation or approach declaration.
- After steps 1–3, provide a concise evaluation—restate the observed UI/log/console issue and expected behaviour, list suspected layers/components/data paths, note required toolchains (HA, Vite, Playwright, pytest), rough scope/LoC, and key unknowns. Do not propose fixes yet.
- Immediately after the evaluation, pick and state the approach with the line `Approach: <implement now | staged plan | concept>` plus a one-sentence rationale.
- Then execute according to the chosen approach:
  - `implement now`: proceed with coding the fix using the UI Testing Loop and checks below with no further user interaction.
  - `staged plan`: produce a clear ToDo list in .docs/ (no code changes yet) that would be executed next and move to Completion Criteria/reporting.
  - `concept`: draft the concept document in .docs/ outlining the direction (no code changes yet) and move to Completion Criteria/reporting.
- Choose and state the path:
  - Implement now if scope is small/clear (1–2 modules/files in one layer), no contract/schema changes, expected diff ≤150 LoC, one toolchain, and existing tests can be extended.
  - Staged ToDo list if cross-layer or 3+ modules, possible contract/schema/API updates, expected diff ~150–300 LoC, multiple toolchains or new tests/harness required, or root cause unclear; outline steps before coding.
  - Concept document if a larger refactor is implied (architecture/schema shifts, >300 LoC, multiple subsystems, deprecations/migrations); draft before implementation.
- Apply the chosen approach through the workflow below.

## Repository Landmarks
- Repository root: `/home/andreas/coding/repos/ha-pp-reader`
- Integration code: `custom_components/pp_reader/`
- Dashboard source: `src/`
- Dedicated virtualenv for Home Assistant + scripts: `venv-ha/`

## Toolchain Baseline
1. **Python / Home Assistant**
   - Every shell must activate the Pi-provided env: `source venv-ha/bin/activate`.
   - Confirm the interpreter with `hass --version` (expected `2025.11.1`).
   - Validate the configuration mapping once via `hass --script check_config -c ~/coding/repos/ha-pp-reader/config`.
2. **Node / Frontend**
   - Ensure Node 20.18+ (or 18.18+) and npm 10+ are active: run `node --version` / `npm --version`.
   - Install/refresh dependencies with `npm install` from the repo root.
   - Warm up the tooling by running `npm run lint:ts`, `npm run typecheck`, `npm test`, and `npm run test:ui -- --list` once; all must pass before starting the UI loop.
3. **Playwright UI Harness**
   - UI smoke tests live under `tests/ui/` and run through `playwright.config.ts`.
   - Start Home Assistant + the Vite dev server (see Runtime Setup) before invoking Playwright, so `http://127.0.0.1:8123/ppreader?pp_reader_dev_server=http://127.0.0.1:5173` is reachable.
   - Override defaults with env vars if needed: `PP_READER_HA_BASE_URL` (Home Assistant origin), `PP_READER_VITE_URL` (Vite dev server URL), `PP_READER_HA_USERNAME`, `PP_READER_HA_PASSWORD`.
   - Execute headless checks via `npm run test:ui -- --project=Chromium`; add `--headed` when debugging interactions locally.
  - Capture UI evidence throughout the run; store every screenshot under `tests/ui/playwright/`. These must be actual browser captures that reviewers can open (e.g., take the shot with `npx playwright screenshot --device="Desktop Chrome" <url> <path>.png` or `chromium --headless --screenshot=<path>.png <url>`). Do not synthesize images from text logs.
  - When using `npx playwright screenshot`, pass `--wait-for-selector='home-assistant-main' --wait-for-timeout=4000` (or equivalent) so the HA shell finishes rendering instead of capturing the splash screen.
  - Use `chafa tests/ui/playwright/<filename>.png` immediately after each capture to visually inspect it inside the terminal. This verifies the screenshot without leaving the CLI.
   - If the HA auth form cannot be displayed because an existing session is active, take the evidence from the Portfolio Dashboard panel at `http://127.0.0.1:8123/ppreader`.

## Runtime Setup
1. **Home Assistant Logs**
   - In a dedicated terminal, activate `venv-ha`, then launch Home Assistant with `hass --config ~/coding/repos/ha-pp-reader/config --debug`.
   - Keep this terminal streaming logs for telemetry; do not terminate it during the session.
2. **Dashboard Dev Server**
   - Open another terminal for the frontend.
   - Run `npm run dev -- --host 127.0.0.1 --port 5173` to start Vite.
   - Access the panel via `http://127.0.0.1:8123/ppreader?pp_reader_dev_server=http://127.0.0.1:5173` after signing into Home Assistant (credentials: `dev` / `dev`).
   - Keep the browser's developer tools (console + network tabs) visible.
   - Before making any fixes, capture a “before” screenshot of the issue; capture an “after” screenshot once the fix is verified. Save each file to `tests/ui/playwright/` named `YY-MM-DD_HH:MM_[before|after].png` (24h time, UTC). These captures must show the actual HA/PP Reader UI, not a textual mockup. When login UI cannot be reached (e.g., due to an already authenticated HA session), capture the Portfolio Dashboard view instead so reviewers still have context.
3. **Playwright Smoke Pass**
   - With both Home Assistant and Vite active, run `npm run test:ui -- --project=Chromium` to capture a baseline headless result before manual poking.
   - Re-run the same command (or `npm run test:ui` to fan out across all browsers) after every fix touching the dashboard code or backend APIs that feed it.

## UI Testing Loop
Repeat until every interaction path behaves or one issue is detected and fixed:
1. **Automated Pass**
   - Re-run `npm run lint:ts`, `npm run typecheck`, `npm test`, and `npm run test:ui -- --project=Chromium` after any change touching TypeScript.
   - Trigger backend-focused checks (`./scripts/lint`, targeted `pytest -k <area>`) when UI fixes impact Python handlers or API responses.
2. **Interactive Verification**
   - Enumerate the dashboard's interactive affordances (navigation links, selectors, toggles, editable inputs, sortable tables, drill-downs, hover states).
   - Exercise them systematically, including stress cases (rapid toggles, resizing, empty states, slow network simulation via DevTools throttling).
   - Watch for layout shifts, rendering glitches, accessibility regressions, and mis-synced data relative to backend sensors.
   - Keep screenshot evidence current: at minimum one “before fix” capture when the defect is observed, and one “after fix” capture that demonstrates the corrected behaviour. Inspect every capture immediately (use `chafa` or another CLI viewer) to ensure it isn’t blank or an error page; recapture if needed.
3. **Telemetry Monitoring**
   - Continuously observe the Home Assistant `hass --config …` terminal for `pp_reader` warnings/errors.
   - Keep the browser console clear; treat any new warning/error/network failure as a candidate issue.
4. **Issue Handling**
   - Upon finding the first reproducible UI defect (visual glitch, console error, failed interaction, or log issue), pause the exploratory loop.
   - Diagnose the root cause by inspecting the relevant files under `src/`, `custom_components/pp_reader/`, or shared utilities/tests.
   - Apply the smallest cohesive changeset that resolves the issue; add unit/UI tests whenever possible (update `tests/` or create new `src/**/__tests__` via `scripts/run_ts_tests`).
   - Rebuild/refresh the UI (`npm run dev` auto-reloads; force a refresh as needed) and repeat the triggering steps to confirm the fix.

## Completion Criteria
- Only the first qualifying UI/log/console issue per session is addressed.
- All automated quality gates (`npm run lint:ts`, `npm run typecheck`, `npm test`, `npm run test:ui -- --project=Chromium`, and `./scripts/lint`) pass after the fix.
- Manual verification demonstrates the corrected behaviour in the dashboard.
- Shut down every Home Assistant and Vite dev server process you started (or reused) before declaring the session complete.
- Additional issues discovered remain documented for future loops but unfixed in this pass.

## Reporting Template
Provide a final response containing:
- **Observed Issue**: The specific UI/log/console problem targeted and how it was reproduced.
- **Root Cause & Fix**: Summary of the investigated files and the applied code/documentation updates.
- **Verification**: Commands executed (HA checks, npm scripts, linting, tests) with pass/fail status, plus manual steps (e.g., "Validated sorting toggles in Firefox via Vite dev server").
- **Follow-ups**: Any remaining concerns, screenshots/log snippets worth capturing, or suggestions for broader UI regression coverage.
