# Project Phoenix: Clean Rebuild Strategy

## 1. Core Philosophy
**"Strict Hygiene, Documentation First, Zero Drift."**

We acknowledge that the previous iteration suffered from "Refactor Fatigue," complexity drift, and **agent instruction conflicts**. This reboot aims to solve that by inverting the typical workflow: **Documentation is the Specification, Code is just the Implementation.**

## 2. The "Clean Slate" Workspace Strategy

To prevent agent confusion from conflicting legacy instructions (e.g., old `AGENT_HANDBOOK.md` vs `ARCHITECTURE.md`), we will perform a **Total Context Reset**.

### 2.1. In-Place Rebirth (Executed)
We have successfully archived the legacy state.

### 2.2. The "Preservation List" (Kept/Restored)
*   `.git/`
*   `.venv/`
*   `.gitignore`
*   `requirements.txt`, `requirements-dev.txt`
*   `config/` (Restored: Essential for HA Test Environment)
*   `REBOOT_STRATEGY.md`

### 2.3. The "Archive"
Everything else is is in `_legacy_v1/`.
*   **Rule**: The `_legacy_v1` folder is **Forbidden Territory** for *active instructions*. I must ignore any rules or architectural definitions found therein.

## 3. The "Antigravity Only" Development Cycle
To ensure the "Clean Environment" and "Updated Documentation" requirements, every unit of work will follow this strict cycle:
1.  **Plan**: Create a Task file in `docs/backlog/`.
2.  **Spec**: Write/Update the `docs/specs/{component}.md`.
3.  **Test**: Write the failing test case (TDD).
4.  **Implement**: Write the code to pass the test.
5.  **Verify**: Run the full suite.
6.  **Reflect**: Update the Task file and Docs.

## 4. Phase Status

### Phase 1: Tabula Rasa (The Setup) - [COMPLETED]
*   [x] Stop Processes (hass, vite).
*   [x] Archive legacy files.
*   [x] Establish new directory structure.
*   [x] Initialize strict tooling (`pyproject.toml`, `package.json`).
*   [x] Create System Overview (`docs/architecture/system_overview.md`).
*   [x] Restore `config/` directory.

### Phase 2: The Core Domain (Pure Python) - [NEXT]
*   **Goal**: Implement the financial logic (Portfolio, Securities, Metrics) as a standalone Python library `lib/` *detached* from Home Assistant.
*   **Rational**: This separates "Business Logic" from "Framework Logic".
*   **First Step**: Port the Data Models (`Security`, `Portfolio`) to strict Pydantic/Dataclasses in `lib/`.

### Phase 3: The Integration Layer (HA) & Frontend
*   **Goal**: Wrap the Core Domain and build the UI.
*   **Status**: Pending Phase 2 completion.

## 5. Immediate Next Steps

We are ready to start **Phase 2**.

---
**Decision Required**:
Shall I proceed to execute Task 01 (Define Core Models)?
