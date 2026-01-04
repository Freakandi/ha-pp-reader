---
description: Delegate a specific Refactoring Task to the Cloud Agent (Jules).
---

# Refactor Execution (Cloud Delegation)

This workflow triggers the execution of a specific `tasks/refactor_phase_[N]_[slug].md` file by delegating the coding work to the remote Jules agent.

## 1. Input Validation & Context Loading
*   **Input:** Identify the target Task File (e.g., `tasks/refactor_phase_0_foundation.md`).
*   **Action:**
    *   Read the **Target Task File**.
    *   Read **`tasks/refactor_calculations.md`** (Master Plan).
    *   Read **`tasks/refactor_context.md`** (Design Decisions).

## 2. Breaking Change Acknowledgement
*   **Analysis:** Review the "Proposed Changes" in the Task File.
*   **Action:** Explicitly acknowledge any legitimate "Breaking Changes" (e.g., "Deleting `_lookup_fx_rate`", "Dropping table columns", "Removing obsolete modules").
*   **Statement:** Output a log line: "Approving breaking changes for [Items] as per Refactor Plan Phase [N]."

## 3. Cloud Delegation (Jules)
*   **Goal:** Start the asynchronous coding session.
*   **Constraint:** You (Antigravity) must **NOT** write the code yourself.
*   **Prompt Construction:**
    *   Construct a detailed prompt string comprising:
        1.  **Task:** "Execute the task defined in [Task_File_Path]."
        2.  **Scope:** "Identity the FIRST unchecked step (`- [ ]`) in 'Detailed Steps'. Execute ONLY that step (and any strictly interdependent sub-steps). Do NOT proceed to subsequent steps unless they are trivial."
        3.  **Context:** "Refer to `tasks/refactor_calculations.md` and `tasks/refactor_context.md` for architectural guidelines."
        4.  **Action:** "Mark the completed step with `[x]` in the Task File."
        5.  **Mandatory Compliance:** "You MUST run `ruff check .`, `ruff format .`, and `ruff check .` (for Python) or `npm run lint:ts` and `npm run typecheck` (for TS). Fix ALL errors. Do not use workarounds provided by linter (e.g. noqa) unless absolutely necessary."
        6.  **Goal:** "Create a Pull Request with the changes."
*   **Execution:**
    *   Run the command using `run_command`.
    *   *Template:* `jules new --repo Freakandi/ha-pp-reader "Execute [Task_File_Path]. Single Step Only. STRICT: Run ruff/lint."`
    *   **Wait** for the command to output the **Session ID**.

## 4. Handover
*   **Output:** "Refactoring Phase delegated to Jules. Session ID: [ID]. Use `/refactor-retrieve-result` when notification is received."