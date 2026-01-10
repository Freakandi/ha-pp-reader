# Project Phoenix: Clean Rebuild Strategy

## 1. Core Philosophy
**"Strict Hygiene, Documentation First, Zero Drift."**

We acknowledge that the previous iteration suffered from "Refactor Fatigue," complexity drift, and **agent instruction conflicts**. This reboot aims to solve that by inverting the typical workflow: **Documentation is the Specification, Code is just the Implementation.**

## 2. The "Clean Slate" Workspace Strategy

To prevent agent confusion from conflicting legacy instructions (e.g., old `AGENT_HANDBOOK.md` vs `ARCHITECTURE.md`), we will perform a **Total Context Reset**.

### 2.1. New Repo vs. In-Place Rebirth
**Recommendation: In-Place Rebirth.**
Since "I" (the AI agent) am bound to this current workspace (`/home/andreas/coding/repos/ha-pp-reader`), creating a completely new folder/repository outside of this path would break my access. We can achieve the *effect* of a new repo by cleaning this one.

### 2.2. The "Preservation List" (What stays)
We will **KEEP** the following files in the root (to save setup time):
*   `.git/` (Preserve history, even if we don't look at it)
*   `.venv/` (Preserves the functional python environment - **Huge time saver**)
*   `.gitignore`
*   `requirements.txt`, `requirements-dev.txt`
*   `REBOOT_STRATEGY.md` (This plan)

### 2.3. The "Archive" (Everything else moves)
We will move everything else into `_legacy_v1`.
*   **Action**: Move `custom_components`, `src`, `tests`, `docs`, `tasks`, `.agent`, `AGENT_HANDBOOK.md`, `ARCHITECTURE.md`, `README*.md`, `config` (*caution: check if config needs saving*) -> `_legacy_v1/`.

*   **Rule**: The `_legacy_v1` folder is **Forbidden Territory** for *active instructions*. I must ignore any rules or architectural definitions found therein.

### 2.4. Generally Clean Environment
The resulting root will look like a fresh start, but with working dependencies:

```text
/
├── _legacy_v1/              <-- The "Old World"
├── .agent/                  <-- RESET: Fresh workflows only
│   └── workflows/
├── docs/                    <-- The "New Constitution" (Source of Truth)
│   ├── architecture/
│   ├── specs/
│   └── backlog/
├── REBOOT_STRATEGY.md
├── requirements.txt
├── requirements-dev.txt
└── .venv/
```

## 3. The "Antigravity Only" Development Cycle
To ensure the "Clean Environment" and "Updated Documentation" requirements, every unit of work will follow this strict cycle:
1.  **Plan**: Create a Task file in `docs/backlog/`.
2.  **Spec**: Write/Update the `docs/specs/{component}.md`.
3.  **Test**: Write the failing test case (TDD).
4.  **Implement**: Write the code to pass the test.
5.  **Verify**: Run the full suite.
6.  **Reflect**: Update the Task file and Docs.

## 4. Phase 1 Execution Plan (Immediate)

If confirmed, I will run the following sequence:

1.  **Stop Processes**:
    *   Find and kill `hass`.
    *   Find and kill `vite`.
2.  **Create Archive**:
    *   `mkdir -p _legacy_v1`
3.  **The Great Migration**:
    *   Move `src` -> `_legacy_v1/src`
    *   Move `custom_components` -> `_legacy_v1/custom_components`
    *   Move `tests` -> `_legacy_v1/tests`
    *   Move `docs` -> `_legacy_v1/docs` (careful with open files)
    *   Move `.agent` -> `_legacy_v1/.agent`
    *   Move `tasks` -> `_legacy_v1/tasks`
    *   Move config files (`package.json`, `tsconfig.json`, `vite.config.ts`, `ruff.toml`) -> `_legacy_v1/`
    *   Move Markdown files (`README.md`, `ARCHITECTURE.md`, `AGENT*`) -> `_legacy_v1/`
    *   Move `config` (HA Config) -> `_legacy_v1/config`
4.  **Sanitize**:
    *   `mkdir -p .agent/workflows` (Empty)
    *   `mkdir -p docs/architecture docs/specs docs/backlog`
5.  **Verify**:
    *   Check that `.venv` is still active and working.

---
**Decision Required**:
Do you approve the **In-Place Rebirth** with the preserved files list above?
