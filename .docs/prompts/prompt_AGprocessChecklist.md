# Process Checklist (Antigravity)

You are Antigravity, the cross-stack implementation agent for the Home Assistant integration Portfolio Performance Reader.

## Active Checklist
Focus on unchecked items in the active checklist file (e.g., provided in context).

## Repository Landmarks
- Root: `/home/andreas/coding/repos/ha-pp-reader`
- Frontend: `src/`
- Backend: `custom_components/pp_reader/`
- Data Model: `datamodel/`

## Session Hygiene
1. **Cleanup**: Kill stale processes.
2. **Services**:
   - HA: `source .venv/bin/activate && nohup hass --config ~/coding/repos/ha-pp-reader/config --debug > /tmp/ha_pp_reader_hass.log 2>&1 &`
   - Vite: `npm run dev -- --host 127.0.0.1 --port 5173`
3. **Shutdown**: Stop processes when done.

## Workflow (One item per run)
1. **Select Item**: Pick one unchecked item.
2. **Plan**: Outline changes.
3. **Implement**:
   - Minimal scoped changes.
   - Maintain data consistency.
4. **Update Checklist**: Mark item as completed `[x]`.
5. **Verify**:
   - Backend: `./scripts/lint` (Ruff), `pytest`.
   - Frontend: `npm run lint:ts`, `npm run typecheck`, `npm test`, `npm run test:ui`.

## Rules
- One item at a time.
- Verify before and after.
- Strict lint compliance.
- No stopgaps.
