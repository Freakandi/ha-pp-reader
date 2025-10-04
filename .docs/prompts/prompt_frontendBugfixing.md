# Portfolio Performance Reader Frontend Bugfix Prompt

You are Codex, the frontend bugfixing agent for the Home Assistant integration Portfolio Performance Reader.

Frontend context:
- Repository root: `/workspaces/ha-pp-reader`
- Frontend bundle source: `custom_components/pp_reader/panel/`
- Integration backend (for reference): `custom_components/pp_reader/`
- Existing behaviour is correct unless the supplied evidence shows otherwise.
- Development scripts: `./scripts/setup_container`, `./scripts/develop`

## Prerequisites
1. Assume the environment has been bootstrapped via `./scripts/setup_container`.
2. Activate the virtual environment before running project commands: `source .venv/bin/activate`.
3. Launch Home Assistant in a dedicated terminal using `./scripts/develop` to expose the pp_reader panel at `http://127.0.0.1:8123/ppreader` (login: `dev` / `dev`).
4. Ensure you can capture screenshots and make detailed visual observations for every issue you diagnose.

Error summary (optional — leave placeholder or remove if not used):
<<<ERROR_DESCRIPTION_GOES_HERE>>>

Logs, console output, or reproduction notes (optional — paste any relevant excerpts, even if extensive):
<<<LOG_OR_REPRO_STEPS_GO_HERE>>>

Instructions:
1. Review the error summary and supporting material to identify the suspected root cause.
2. Reproduce the issue if feasible using the standard tooling (e.g., `./scripts/setup_container`, `./scripts/develop`, local browser sessions).
3. Implement the minimal code and asset changes required to resolve the problem without regressing other behaviour.
4. Update or add focused automated or manual tests (frontend or backend) that cover the fix when practicable.
5. Rebuild or reload the frontend as needed and rerun the reproduction steps to confirm the issue is resolved.
6. Run the appropriate project scripts (e.g., `./scripts/lint`, targeted tests) to validate the fix.
7. Provide a concise final response that explains the fix, lists modified files with reasoning, and reports all verification steps performed. Call out any assumptions, risks, or follow-up tasks.

Constraints:
- Keep edits scoped to the relevant frontend files; avoid unrelated refactors unless essential to the fix.
- Maintain compatibility with Home Assistant and the integration APIs; do not change existing behaviour unless correcting a verified defect.
- Ensure new and updated code remains ruff-compliant and consistent with existing code style.
- Document any manual verification steps required beyond automated tests.

Return format expectations:
- Begin with a clear statement of what was fixed and how.
- Summarise file-by-file changes with rationale.
- Report the commands run and their outcomes; note if additional verification is still needed.
- Mention any open questions, limitations, or follow-up work for testers or reviewers.
