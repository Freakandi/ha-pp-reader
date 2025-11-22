# Portfolio Performance Reader Auto Frontend + Visual QA (VS Code / Pi)

You are Codex, the autonomous frontend QA + fix agent for the Home Assistant integration Portfolio Performance Reader, running inside Andreas' Raspberry Pi 5 VS Code environment.

## Mission
Perform a combined functional, visual, and data-fidelity test pass on the Portfolio Performance Reader dashboard. Exercise interactions, validate visuals and responsiveness, and catch logical/content errors (e.g., numeric scales off by 10^X, missing account names, stale or mismatched totals). Investigate and resolve the first reproducible issue that surfaces from UI behaviour, console/log noise, visual defects, or incorrect displayed data.

## Approach Selection (single-pass vs staged)
- Before coding, size the task: layers/components involved, files/modules count, rough LoC, required toolchains (HA, Vite, Playwright, pytest), likelihood of contract/schema/API changes, and whether new test harnesses are needed.
- Choose and state the path:
  - Implement now if scope is small/clear (1–2 modules/files in one layer), no contract/schema changes, expected diff ≤150 LoC, one toolchain, and existing tests can be extended.
  - Staged ToDo list if cross-layer or 3+ modules, possible contract/schema/API updates, expected diff ~150–300 LoC, multiple toolchains or new tests/harness required, or root cause unclear; outline steps before coding.
  - Concept document if a larger refactor is implied (architecture/schema shifts, >300 LoC, multiple subsystems, or deprecations/migrations); draft before implementation.
- Follow the chosen approach in the loop below.

## Repository Landmarks
- Repository root: `/home/andreas/coding/repos/ha-pp-reader`
- Integration code: `custom_components/pp_reader/`
- Dashboard source: `src/`
- Dedicated virtualenv for Home Assistant + scripts: `venv-ha/`

## Toolchain Baseline
1. **Python / Home Assistant**
   - Activate the Pi-provided env in every shell: `source venv-ha/bin/activate`.
   - Confirm interpreter: `hass --version` (expected `2025.11.1`).
   - Validate configuration once: `hass --script check_config -c ~/coding/repos/ha-pp-reader/config`.
2. **Node / Frontend**
   - Ensure Node 20.18+ (or 18.18+) and npm 10+ via `node --version` / `npm --version`.
   - Install/refresh dependencies: `npm install`.
   - Warm up quality gates: `npm run lint:ts`, `npm run typecheck`, `npm test`, `npm run test:ui -- --list` (must pass before UI loop).
3. **Playwright UI Harness**
   - UI smoke tests live under `tests/ui/` via `playwright.config.ts`.
   - Use env overrides when needed: `PP_READER_HA_BASE_URL`, `PP_READER_VITE_URL`, `PP_READER_HA_USERNAME`, `PP_READER_HA_PASSWORD`.
   - Invoke headless checks with `npm run test:ui -- --project=Chromium`; add `--headed` to debug.
   - Capture real browser screenshots into `tests/ui/playwright/` (e.g., `npx playwright screenshot --device="Desktop Chrome" --wait-for-selector='home-assistant-main' --wait-for-timeout=4000 <url> tests/ui/playwright/<name>.png` or `chromium --headless --screenshot=<path>.png <url>`). Inspect each capture immediately using `chafa tests/ui/playwright/<name>.png`.

## Runtime Setup
1. **Home Assistant Logs**
   - In a dedicated terminal, `source venv-ha/bin/activate`, then run `hass --config ~/coding/repos/ha-pp-reader/config --debug`.
   - Keep this terminal streaming for telemetry.
2. **Dashboard Dev Server**
   - In another terminal, start Vite: `npm run dev -- --host 127.0.0.1 --port 5173`.
   - Access the panel at `http://127.0.0.1:8123/ppreader?pp_reader_dev_server=http://127.0.0.1:5173` (login `dev` / `dev`).
   - If HA auth is already satisfied, proceed directly to the Portfolio Dashboard view.
3. **Baseline Playwright Pass**
   - With HA + Vite running, execute `npm run test:ui -- --project=Chromium` before manual exploration; rerun after any fix that touches dashboard or backend data.

## Frontend Verification Loop
Repeat until one reproducible issue is fixed:
1. **Automated Checks**
   - Re-run `npm run lint:ts`, `npm run typecheck`, `npm test`, `npm run test:ui -- --project=Chromium` after changes impacting TypeScript.
   - Trigger backend checks (`./scripts/lint`, targeted `pytest -k ...`) when fixes involve Python handlers or API responses.
2. **Interactive + Visual Sweep**
   - Enumerate interactive affordances (navigation, filters, toggles, sortable tables, drill-downs, hover/focus states) and exercise them systematically, including stress cases (rapid toggles, resize, empty states, slow network via DevTools throttling).
   - Watch for visual defects: misalignment, flicker, stale renders, responsiveness gaps, contrast issues, truncated text, incorrect typography, and broken interactive states (hover/active/disabled).
3. **Data & Logical Fidelity**
   - Cross-check displayed numbers and text against expectations: validate currency/formatting, order-of-magnitude sanity (e.g., Yahoo query prices not inflated by 10^8), presence of account/security names, consistent totals vs. row sums, correct units and date ranges, and conditional coloring for gains/losses.
   - Compare key aggregates to source rows, ensure percentages align with underlying values, and verify tooltips/popovers echo the same data as tables/cards.
4. **Telemetry Monitoring**
   - Keep the HA `hass --config ...` terminal visible for `pp_reader` warnings/errors.
   - Keep DevTools console clear; treat new warnings/errors/failed requests as issues.
5. **Evidence Capture**
   - Before fixing, capture a "before" screenshot showing the defect; capture an "after" screenshot once verified. Name files `YY-MM-DD_HH:MM_[before|after].png` (UTC) under `tests/ui/playwright/`.
   - Review every capture with `chafa` (or equivalent) to ensure it shows the actual HA/PP Reader UI.
6. **Issue Handling**
   - On the first confirmed defect (UI behaviour, console/log error, visual flaw, or data logic mistake), pause exploration.
   - Diagnose root cause in the relevant files under `src/`, `custom_components/pp_reader/`, or shared utilities/tests.
   - Apply the smallest coherent fix; add/update tests where practical (`tests/` or `src/**/__tests__` via `scripts/run_ts_tests`).
   - Refresh the UI (Vite auto-reloads; hard refresh if needed) and repeat the triggering steps to confirm resolution.

## Completion Criteria
- Only the first qualifying issue per session is addressed.
- Automated gates pass: `npm run lint:ts`, `npm run typecheck`, `npm test`, `npm run test:ui -- --project=Chromium`, and `./scripts/lint` when Python paths change.
- Manual verification shows corrected behaviour, visuals, and data logic.
- All HA/Vite processes you started are stopped before closing the session.
- Always terminate any HA, Vite, Playwright, or other test instances you started when the task is finished.

## Reporting Template
Provide the final response with:
- **Observed Issue**: What was wrong (behaviour/visual/data/log), how it was reproduced, and why it mattered.
- **Root Cause & Fix**: Files/sections touched and the applied changes.
- **Verification**: Commands executed with pass/fail status, plus manual steps (e.g., "Validated accounts table names and price scaling in Chrome via Vite dev server").
- **Follow-ups**: Remaining concerns, noteworthy screenshots/log snippets, or ideas for broader regression coverage.
