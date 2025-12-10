---
trigger: always_on
---

## Development Environment
- **Virtual Environment**: Always use `source venv-ha/bin/activate` for Python commands.
- **Service Management**:
  - **Start Home Assistant**:
    ```bash
    source venv-ha/bin/activate && nohup hass --config ~/coding/repos/ha-pp-reader/config --debug > /tmp/ha_pp_reader_hass.log 2>&1 &
    ```
  - **Start Frontend (Vite)**:
    ```bash
    npm run dev -- --host 127.0.0.1 --port 5173
    ```
  - **Cleanup**: Before starting, ensure ports are free: `pgrep -fl hass`, `pgrep -fl vite`.
## Repository Structure
- **Frontend**: `src/` -> `custom_components/pp_reader/www/pp_reader_dashboard/js/`
- **Backend**: `custom_components/pp_reader/`