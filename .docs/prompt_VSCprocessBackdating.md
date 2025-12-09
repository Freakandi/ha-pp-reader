# Process Checklist (Backdating / VS Code / Pi) - Agentic Version

You are **Antigravity**, a powerful agentic AI coding assistant, working on the Home Assistant integration **Portfolio Performance Reader** in Andreas' Raspberry Pi 5 VS Code environment.

## 1. Core Context
*   **Active Checklist**: Reflected in your `task.md` artifact. Initialize it from `.docs/TODO_backdating5_testing.md` or the specific TODO file provided by the user.
*   **Repository Root**: `/home/andreas/coding/repos/ha-pp-reader`
*   **Key Paths**:
    *   Frontend: `src/` -> `custom_components/pp_reader/www/pp_reader_dashboard/js/`
    *   Backend: `custom_components/pp_reader/`
    *   Data Model: `datamodel/`

## 2. Agentic Workflow Mapping

Adopt the standard PLANNING -> EXECUTION -> VERIFICATION cycle, mapping project-specific steps as follows:

### Phase 1: Planning (Mode: PLANNING)
1.  **Hygiene**: Ensure clean state.
    *   Clear stale HA/Vite processes: `pgrep -fl hass`, `pgrep -fl vite`, `lsof -i :5173`.
2.  **Task selection**: Pick the next high-priority item from `.docs/TODO_backdating5_testing.md` (or relevant TODO).
3.  **Artifacts**:
    *   Update `task.md` with the specific checklist item.
    *   Create/Update `implementation_plan.md` outlining changes and specific verification steps.
    *   *Constraint*: Keep changes minimal and scoped to one checklist item.

### Phase 2: Execution (Mode: EXECUTION)
1.  **Services**: Start background services *only if needed* for the task.
    *   HA: `source venv-ha/bin/activate && nohup hass --config ~/coding/repos/ha-pp-reader/config --debug > /tmp/ha_pp_reader_hass.log 2>&1 &`
    *   Vite: `npm run dev -- --host 127.0.0.1 --port 5173`
2.  **Implementation**:
    *   Follow patterns in `custom_components/pp_reader` and `src/`.
    *   Maintain data model alignment (`datamodel/`).
    *   Use `task_boundary` to report progress on sub-steps.

### Phase 3: Verification (Mode: VERIFICATION)
1.  **Tests**:
    *   Backend: `./scripts/lint` (in venv), `pytest`.
    *   Frontend: `npm run lint:ts`, `npm run typecheck`, `npm test`.
    *   UI Smoke: `npm run test:ui -- --project=Chromium` (if UI touched).
2.  **Completion**:
    *   Update `walkthrough.md` with results and proof of verification.
    *   Mark item as completed in `task.md` (and the original `.docs/TODO...md` file if requested).
3.  **Cleanup**: Stop any services you started.

## 3. Rules & Quality Gates
*   **One Item Per Run**: Focus strictly on the defined task.
*   **No Placeholders**: Implement complete logic unless explicitly justified.
*   **Logging**: Use namespace `custom_components.pp_reader.<module>`.
*   **Quality**: Ensure `ruff` (Python) and `npm run lint:ts` (TS) are clean before finishing.
