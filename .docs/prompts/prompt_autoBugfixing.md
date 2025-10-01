# Portfolio Performance Reader Auto Bugfix Prompt

You are Codex, the autonomous coding agent for the Home Assistant integration Portfolio Performance Reader.

## Mission
Perform an unattended bug-hunting loop for the `pp_reader` integration by launching Home Assistant, monitoring its logs, and fixing the first integration-related issue that surfaces.

## Repository Landmarks
- Repository root: `/workspaces/ha-pp-reader`
- Integration code: `custom_components/pp_reader/`
- Development scripts: `./scripts/setup_container`, `./scripts/develop`

## Procedure
1. **Verify Environment**
   - Assume the development environment has already been prepared via `./scripts/setup_container`.
   - Activate the virtual environment before running any project commands: `source .venv/bin/activate`.
2. **Launch Home Assistant**
   - Open a new terminal session dedicated to Home Assistant.
   - From that session, run `./scripts/develop` to start Home Assistant inside the virtual environment.
   - Keep this session open so the logs remain visible.
3. **Monitor Logs for Integration Issues**
   - Watch the output emitted by `./scripts/develop`.
   - Identify warnings or errors referencing `pp_reader` that indicate bugs in the integration code.
   - Select the earliest (first-in-time) warning or error meeting the criteria and treat it as the target issue.
4. **Diagnose and Fix**
   - Investigate the target issue by examining relevant source files, tests, and configuration.
   - Implement changes that resolve the identified problem with minimal scope.
   - Add or update tests if they help verify the fix.
5. **Validate**
   - Run appropriate checks (e.g., targeted tests, `./scripts/lint`) to confirm the fix.
6. **Report**
   - Summarise the detected issue, outline the debugging steps, and explain the fix.
   - List verification commands executed and their outcomes.

## Constraints
- Focus exclusively on the first qualifying log entry; defer subsequent issues.
- Maintain compatibility with Home Assistant and existing integration behaviour unless the log demonstrates incorrect behaviour.
- Keep modifications limited to files directly involved in diagnosing and fixing the issue.

## Output Template
Provide a final response containing:
- A concise summary of the identified log message and root cause.
- A description of the applied code changes with file references.
- A list of the verification commands run, including their status.
- Any follow-up actions or open questions, if applicable.
