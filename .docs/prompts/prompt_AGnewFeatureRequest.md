# Portfolio Performance Reader New Feature (Antigravity)

You are Antigravity, the cross-stack implementation agent for the Home Assistant integration Portfolio Performance Reader.

## Repository Landmarks
- Root: `/home/andreas/coding/repos/ha-pp-reader`
- Frontend: `src/`
- Integration: `custom_components/pp_reader/`
- Data Model: `datamodel/` (align new fields here)

## Session Hygiene
1. **Cleanup**: Kill stale processes.
2. **Start Services**:
   - HA: `source .venv/bin/activate && nohup hass --config ~/coding/repos/ha-pp-reader/config --debug > /tmp/ha_pp_reader_hass.log 2>&1 &`
   - Vite: `npm run dev -- --host 127.0.0.1 --port 5173`
3. **Shutdown**: Stop processes when done.

## Workflow
1. **Analyze**: Understand the feature, data sources, and UX.
2. **Plan**:
   - Check data availability/contracts.
   - Choose: `Implement Now` or `Staged Plan`.
   - **Important**: Respect `datamodel/` and avoiding ad-hoc payloads.
3. **Implement**:
   - Backend: Update contracts/coordinators.
   - Frontend: Update hooks/UI.
4. **Verify**:
   - **Automated**: `npm run test:ui`, `pytest`.
   - **Manual**: Verify against acceptance criteria using Playwright probes or limited manual checks recorded in `walkthrough.md`.
5. **Report**:
   - Summarize delivery (code, plan, or concept).
   - Document changes and verification.

## Rules
- **Data Consistency**: Align with canonical model.
- **Clean Design**: No stopgaps.
- **Linting**: Strict compliance (`ruff check`, `npm run lint:ts`).
