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

## 2. Preparation
*   **Safety Check:**
    *   Run `git status --porcelain`.
    *   **CRITICAL:** If the workspace is not clean (files modified/untracked), **ABORT** the workflow. Ask the user to stash or commit changes first.

## 3. Session Retrieval & Analysis (Loop)
*   **Context:** For each Session ID provided:
    1.  **Retrieve & Apply:**
        *   Log: "Retrieving Session [Session_ID]..."
        *   Run `jules remote pull --session [Session_ID] --apply`.
    2.  **Implementation Evaluation:**
        *   **Inspect Code:** Use `view_file` to read the key implemented files.
        *   **Compare against Plan:**
            *   Read `tasks/refactor_calculations.md` (Master Plan) to verify architectural alignment.
            *   Check `tasks/refactor_context.md`.
            *   **Check Task File:** Verify if steps in `tasks/refactor_phase_X.md` were marked `[x]`.
    3.  **Quality Check:**
        *   Run `ruff check .` (Python) or `npm run lint:ts` (TS). Note the number of errors.
        *   (Optional) Run new unit tests: `pytest [path_to_new_test]`.
    4.  **Capture Findings:**
        *   Record observations for this session (Completeness, Correctness, Quality, Lint Errors, Test status).
    5.  **Cleanup (Reset):**
        *   **CRITICAL:** You MUST restore the workspace to the clean state before the next session.
        *   Run `git reset --hard HEAD`
        *   Run `git clean -fd`

## 4. Comparative Evaluation & Recommendation
*   **Analysis:** Compare the sessions based on:
    *   **Completeness:** Steps completed vs. planned.
    *   **Quality:** Lint errors (lower is better), test results.
    *   **Adherence:** Which session followed the `refactor_calculations.md` architecture best?
*   **Output:**
    *   Provide a **detailed comparison table** or list.
    *   **Recommendation:** "I recommend Session [ID] because [Reasons]."

## 5. Await Decision
*   **Action:** Pause execution.
*   **Prompt:** "Evaluation complete. Please indicate which Session ID you wish to use. I will then use `/refactor-retrieve-result` (configured to keep the files) to finalize it."
