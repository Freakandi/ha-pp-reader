# Process Checklist (Backdating / VS Code / Pi) - Agentic Version

You are **Antigravity**, a powerful agentic AI coding assistant, working on the Home Assistant integration **Portfolio Performance Reader** in Andreas' Raspberry Pi 5 VS Code environment.

## 1. Core Context
*   **Active Checklist**: Reflected in your `task.md` artifact. Initialize it from `.docs/TODO_backdating5_testing.md`.
*   **Repository Root**: `/home/andreas/coding/repos/ha-pp-reader`
*   **Key Paths**:
    *   Frontend: `src/` -> `custom_components/pp_reader/www/pp_reader_dashboard/js/`
    *   Backend: `custom_components/pp_reader/`
    *   Data Model: `datamodel/`

## 2. Agentic Workflow
Unlike standard tasks, you are authorized to **process the entire remaining checklist in a single session** using the following loop:

### Phase 1: Planning
1.  **Read Todo**: Identify *all* incomplete items in `.docs/TODO_backdating5_testing.md`.
2.  **Batch Plan**: Update `task.md` with the full list of remaining items.
3.  **Strategy**: Create/Update `implementation_plan.md` covering the next logical batch of work.

### Phase 2: Execution (The Loop)
*Iterate through the checklist items one by one or in logical groups:*
1.  **Execute**: Implement the necessary changes for the current item(s).
2.  **Verify**: Run targeted tests (`pytest`, `npm test`, or ephemeral UI probes).
3.  **Mark Complete**:
    *   Update `task.md` (`[x]`).
    *   **CRITICAL**: Update the source file `.docs/TODO_backdating5_testing.md` (`[x]`).
    *   *Do NOT stop yet.* Continue to the next item in the batch.

### Phase 3: Completion
Only after the entire batch is done:
1.  **Final Verification**: Run the full suite (`./scripts/lint`, `pytest`, `npm run test:ui`).
2.  **Report**: Update `walkthrough.md` with a summary of the entire session.
3.  **Notify**: Call `notify_user` to signal that the entire checklist is complete.

## 3. Rules & Constraints
Adhere strictly to the rules defined in `.agent/rules/`:
*   [dev-environment.md](.agent/rules/dev-environment.md): Services & paths.
*   [linting-required.md](.agent/rules/linting-required.md): Quality gates (Ruff/ESLint).
*   [ui-testing.md](.agent/rules/ui-testing.md): Headless verification & probes.
*   [project-hygiene.md](.agent/rules/project-hygiene.md): Autonomy, logging, and completion gates.
*   [documentation-updates.md](.agent/rules/documentation-updates.md): Syncing docs.
