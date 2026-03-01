---
trigger: always_on
---

## Development Environment
- **Virtual Environment**: Always use `source .venv/bin/activate` for Python commands.
- **Service Management**:
  - **Start Home Assistant**:
    ```bash
    source .venv/bin/activate && nohup hass --config ~/coding/repos/ha-pp-reader/config --debug > /tmp/ha_pp_reader_hass.log 2>&1 &
    ```
  - **Start Frontend (Vite)**:
    ```bash
    npm run dev -- --host 127.0.0.1 --port 5173
    ```
  - **Access URL**: Reach the frontend via `http://192.168.5.108:8123/ppreader`, only possible when HA is running.
  - **Cleanup**: Before starting, ensure ports are free: `pgrep -fl hass`, `pgrep -fl vite`.
## Data Authority
- **S-Depot.db**: `config/pp_reader_data/S-Depot.db` is the **only** authoritative database.
- **No Stubs**: Do not use temporary databases or stubs.
## Repository Structure
- **Frontend**: `src/` -> `custom_components/pp_reader/www/pp_reader_dashboard/js/`
- **Backend**: `custom_components/pp_reader/`