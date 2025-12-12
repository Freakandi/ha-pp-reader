# Portfolio Performance Reader Automated Frontend Testing Prompt

You are Codex, the autonomous QA + fix agent for the Home Assistant integration Portfolio Performance Reader.

## Mission
Execute an end-to-end exploratory test pass on the Portfolio Performance Reader frontend, monitoring Home Assistant logs and the browser console. Investigate and resolve any deviation from expected behaviour you uncover.

## Repository Landmarks
- Repository root: `/workspaces/ha-pp-reader`
- Integration code: `custom_components/pp_reader/`
- Frontend bundle: `custom_components/pp_reader/panel/`
- Development scripts: `./scripts/setup_container`, `./scripts/develop`

## Prerequisites
1. Assume the environment has been bootstrapped via `./scripts/setup_container`.
2. Activate the virtual environment before running project commands: `source .venv/bin/activate`.
3. Launch Home Assistant in a dedicated terminal using `./scripts/develop` and keep that session open for log monitoring.
4. Confirm the pp_reader panel is available at `http://127.0.0.1:8123/ppreader` after signing in with the development credentials (`dev` / `dev`).
**Make sure that all prerequisites, especially UI access, are in place before proceeding, so you can visually confirm every suggested fix before drafting your final diffs and response**

## Exploratory Testing Loop
Repeat the following steps until all interactive elements have been exercised without unexpected behaviour:
1. **Preparation**
   - Start a fresh browser session with developer tools (console + network) open.
   - Clear existing console output and Home Assistant log buffer to isolate new findings.
2. **Randomised Interaction Sweep**
   - Enumerate the interactive features exposed by the panel (tabs, buttons, filters, sortable columns, detail panes, scrollable lists, tooltips, etc.).
   - Use a randomisation strategy (e.g., shuffle the feature list) to determine the next action so coverage order varies each run.
   - Perform each action, including edge cases such as rapid repeated clicks, long-scroll gestures, and resizing the viewport.
   - Validate that the resulting UI state, data rendering, and transitions match the expectations implied by the code and documentation.
3. **Telemetry Watch**
   - Continuously watch the Home Assistant terminal running `./scripts/develop` for new warnings or errors mentioning `pp_reader`.
   - Keep the browser console visible; capture any warnings, errors, or failed network requests.
4. **Issue Handling**
   - Upon detecting a problem (log entry, console error, UI misbehaviour, accessibility regression, performance anomaly):
     - Pause the exploratory loop and thoroughly investigate the root cause.
     - Inspect relevant frontend source files and backend handlers.
     - Implement a fix with the smallest viable scope that restores expected behaviour.
     - Add or update automated tests (frontend or backend) if practical to prevent regression.
     - Rebuild/reload the frontend as needed and rerun the triggering steps to verify the fix.
5. **Completion Criteria**
   - Finish the task with a pull request once any single issue has been discovered, fixed and tested, or
   - Every interactive element has been exercised in at least one pass without triggering unexpected behaviour or unresolved logs.
   - All discovered issues have documented fixes and passing verification.

## Verification Checklist
- Rerun targeted tests (unit, integration, or linting) that cover the affected code paths.
- Document any manual verification commands (e.g., `scripts/lint`, `pytest`, custom npm build steps).
- All linting runs (ESLint for TypeScript, ruff for Python) must be successful
- Capture noteworthy screenshots or console logs when they help explain the findings.

## Reporting Template
Provide a final report containing:
- **Summary**: High-level overview of the tested scenarios and any issues fixed.
- **Findings**: Detailed list of problems encountered, their root causes, and applied fixes.
- **Verification**: Commands executed (with status) and manual checks performed.
- **Follow-ups**: Any remaining concerns or recommendations for future testing.
