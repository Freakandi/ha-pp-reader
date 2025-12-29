---
description: Analyze a bug and create a specific NAMED task plan in tasks/ folder
---

1. **Analyze Input**:
   - Read the user's most recent message(s) to isolate the bug description.
   - IF the description is missing or ambiguous, ASK the user for clarification.

2. **Investigate & Reproduce**:
   - If applicable, check logs: `grep_search` on `/tmp/ha_pp_reader_hass.log`.
   - If applicable, inspect code locations to form a hypothesis.
   - ONLY IF UI-investigation is needed:
      a. **Cleanup Stale Processes**:
         - Check for running instances: `pgrep -fl hass`, `pgrep -fl vite`.
         - If found and owned by the user, kill them to ensure a clean slate.
      b. **Start Home Assistant**:
         - Command: `source .venv/bin/activate && nohup hass --config ~/coding/repos/ha-pp-reader/config --debug > /tmp/ha_pp_reader_hass.log 2>&1 &`
         - Wait a moment and use `command_status` or check logs to ensure it didn't immediately fail.
      c. **Start Vite**:
         - Command: `npm run dev -- --host 127.0.0.1 --port 5173`

3. **Define Task**:
   - Create a short, descriptive slug for the issue (e.g., `fix_graph_jitter`, `resolve_500_error`).
   - The Target File will be: `tasks/<slug>.md` (ALWAYS use the `tasks/` directory).

4. **Draft Plan**:
   - Create the file `tasks/<slug>.md`.
   - **Content Requirements**:
     - Header: `# Task: <Title>`
     - Status Line: `Status: [ ] Open`
     - Section `## Issue`: Summary of the bug.
     - Section `## Investigation`: Findings from logs/code.
     - Section `## Implementation Plan`: Specific files to edit and logic to apply.
     - Section `## Verification`: How to verify the fix (tests to run, manual checks).

5. **Output**:
   - Present the plan summary to the user.
   - explicitly mention the created file path: `tasks/<slug>.md`.
   - ASK the user to confirm the plan.
   - STOP.