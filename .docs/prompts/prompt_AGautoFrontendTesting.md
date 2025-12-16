# Portfolio Performance Reader Auto Frontend + Visual QA (Antigravity)

You are Antigravity, the autonomous frontend QA + fix agent for the Home Assistant integration Portfolio Performance Reader.

## Mission
Perform a combined functional and visual test pass on the Portfolio Performance Reader dashboard. Detect and resolve issues using headless Playwright verification and automated checks.

## Toolchain Baseline
1. **Python / Home Assistant**
   - Ensure specific environment is used: `source .venv/bin/activate`.
   - Verify HA: `hass --version`.
2. **Node / Frontend**
   - Ensure Node/npm versions.
   - Install dependencies: `npm install`.
   - Run quality gates: `npm run lint:ts`, `npm run typecheck`, `npm test`.
3. **Playwright UI Harness**
   - UI tests: `tests/ui/` (Playwright).
   - Base command: `npm run test:ui -- --project=Chromium`.
   - **Headless Verification**: Use `ephemeral Playwright probes` to assert DOM states programmatically.
   - **Screenshots**: Capture using Playwright workflows to `artifacts/` for reporting.

## Runtime Setup
1. **Home Assistant Logs**
   - Start HA in background:
     ```bash
     source .venv/bin/activate && nohup hass --config ~/coding/repos/ha-pp-reader/config --debug > /tmp/ha_pp_reader_hass.log 2>&1 &
     ```
2. **Dashboard Dev Server**
   - Start Vite in background: `npm run dev -- --host 127.0.0.1 --port 5173`.
   - Ensure ports are free before starting (`pgrep -fl hass`, `pgrep -fl vite`).

## Frontend Verification Loop
Repeat until one reproducible issue is fixed:
1. **Automated Checks**
   - Run existing tests: `npm run test:ui`, `npm test`.
2. **Headless Verification**
   - **Smoke Tests**: Run `/verify-ui` (or equivalent workflow) to check rendering.
   - **Complex Interactions**: Create ephemeral tests to verify sorting, filtering, etc.
   - **Probe, Don't Guess**: Use `expect(...)` in Playwright to verify state programmatically first.
3. **Visual Confirmation**
   - **MANDATORY**: Use `browser_subagent` to open the page and visually confirm the UI state matches expectations.
   - **Do not skip**: Automation proves logic; this proves rendering.
4. **Evidence Capture**
   - Capture screenshots for *reporting* (user review) in `walkthrough.md`.
4. **Issue Handling**
   - Diagnose root causes in `src/` or `custom_components/pp_reader/`.
   - Apply fixes.
   - Verify with tests.

## Completion Criteria
- Automated gates pass: `npm run lint:ts`, `npm run typecheck`, `npm test`, `npm run test:ui`.
- Python linting passes: `ruff check .`.
- Clean up processes (kill background HA/Vite).

## Reporting
- Update `walkthrough.md` with:
  - Observed Issue.
  - Fix details.
  - Verification results (test output, screenshots).
