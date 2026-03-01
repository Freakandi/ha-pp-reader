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
*   **Goal:** Start **3** asynchronous coding sessions in parallel to explore different implementation paths or ensure redundancy.
*   **Constraint:** You (Antigravity) must **NOT** write the code yourself.
*   **Prompt Construction:**
    *   Construct a detailed prompt string comprising:
        1.  **Task:** "Execute the task defined in [Task_File_Path]."
        2.  **Scope:** "Identify the FIRST unchecked step (`- [ ]`) in 'Detailed Steps'. You MUST execute this step. You MAY also execute the immediate next step **ONLY IF** it is a 'Test' step directly corresponding to your implementation. **PROHIBITION:** Do NOT proceed to 'Integration', 'Cleanup', or unrelated steps."
        3.  **Partial Implementation Warning:** "This is a **PARTIAL** implementation step. Legacy tests or consumers of this code **MAY FAIL** during this intermediate state. **DO NOT** get stuck trying to fix legacy code that is unrelated to your immediate task. If a legacy test fails and blocks you, marked it with `@pytest.mark.skip` or comment it out temporarily. **PRIORITIZE** the new code and *its* associated new tests."
        4.  **Context:** "Refer to `tasks/refactor_calculations.md` and `tasks/refactor_context.md` for architectural guidelines."
        5.  **Mandatory Compliance:** "You MUST run `ruff check .`, `ruff format .`, and `ruff check .` (for Python) or `npm run lint:ts` and `npm run typecheck` (for TS). Fix ALL errors. Do not use workarounds provided by linter (e.g. noqa) unless absolutely necessary."
        6.  **CRITICAL FINAL ACTION:** "Before submitting your PR, you **MUST** update `[Task_File_Path]` and change the step(s) you completed from `- [ ]` to `- [x]`. If you fail to do this, your work is incomplete."
        7.  **Goal:** "Create a Pull Request with the changes."
*   **Execution:**
    *   Run the command using `run_command` with the `--parallel 3` flag.
    *   *Template:* `jules new --repo Freakandi/ha-pp-reader --parallel 3 "Execute [Task_File_Path]. PARTIAL IMPLEMENTATION. Ignore/Skip failing legacy tests if unrelated. STRICT: Run linting."`
    *   **Wait** for the command to output the **Session IDs**.

## 4. Handover
*   **Output:** "Refactoring Phase delegated to Jules (3 Parallel Sessions). Session IDs: [ID_1], [ID_2], [ID_3]. Use `/refactor-retrieve-result` with the best candidate when ready."