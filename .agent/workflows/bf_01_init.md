---
description: Initialize the dev environment for bug fixing (Kill stale, Start HA/Vite)
---
1. **Cleanup Stale Processes**:
   - Check for running instances: `pgrep -fl hass`, `pgrep -fl vite`.
   - If found and owned by the user, kill them to ensure a clean slate.

2. **Start Home Assistant**:
   - Command: `source .venv/bin/activate && nohup hass --config ~/coding/repos/ha-pp-reader/config --debug > /tmp/ha_pp_reader_hass.log 2>&1 &`
   - Wait a moment and use `command_status` or check logs to ensure it didn't immediately fail.

3. **Start Vite**:
   - Command: `npm run dev -- --host 127.0.0.1 --port 5173`

4. **Report**:
   - Confirm to the user that HA and Vite are running.
   - STOP.
