---
description: Evaluate and compare results from parallel Jules sessions to recommend the best candidate.
---

# Evaluate Parallel Jules Sessions

This workflow retrieves, compares, and evaluates the results of multiple parallel Jules sessions to recommend the best implementation for integration.

## 1. Input Collection
*   **Goal:** Identify the Session IDs to evaluate.
*   **Action:**
    *   If Session IDs are not provided in the prompt, ask the user for them.
    *   Validate that you have up to 3 Session IDs.

## 2. Session Retrieval & Analysis (Loop)
*   **Context:** For each Session ID provided:
    1.  **Get PR Information:**
        *   Run `jules show [Session_ID]`.
        *   Parse the output to find the **Pull Request Number**. (If not found, ask User).
    2.  **Fetch Code:**
        *   Run `git fetch origin pull/[PR_Number]/head:review-[Session_ID]`.
        *   Run `git checkout review-[Session_ID]`.
    3.  **Implementation Evaluation:**
        *   **Identify Changes:** Run `git diff --name-only main...HEAD`.
        *   **Inspect Code:** Use `view_file` to read the key implemented files.
        *   **Compare against Plan:**
            *   Read `tasks/refactor_calculations.md` (Master Plan).
            *   Read `tasks/refactor_context.md` (Design Decisions).
            *   Check if the implementation aligns with these documents.
        *   **Check Task File:** Verify if the specific task file (e.g., `tasks/refactor_phase_X.md`) was updated (steps marked as `[x]`).
    4.  **Quality Check:**
        *   Run `ruff check .` (Python) or `npm run lint:ts` (TS). Note the number of errors.
        *   (Optional) Run relevant new tests if they exist: `pytest [path_to_new_test]`.
    5.  **Capture Findings:** Record observations for this session (Completeness, Correctness, Quality).
    6.  **Cleanup:**
        *   Run `git checkout -` (Return to previous branch, usually main).
        *   Run `git branch -D review-[Session_ID]` (Delete temp branch to avoid clutter).

## 3. Comparative Evaluation & Recommendation
*   **Analysis:** Compare the sessions based on:
    *   **Completeness:** Steps completed vs. planned.
    *   **Architecture:** Alignment with `refactor_calculations.md`.
    *   **Quality:** Lint errors, test results (if run), code style.
*   **Output:**
    *   Provide a **detailed comparison** of the sessions.
    *   **Recommendation:** "I recommend Session [ID] (PR #[ID]) because [Reasons]."

## 4. Await Decision
*   **Action:** Pause execution.
*   **Prompt:** "Evaluation complete. Please indicate which Session/PR you wish to proceed with using `/refactor-retrieve-result`."
