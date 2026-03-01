---
description: Apply corrections to a Refactor PR based on assessment feedback and CI status.
---

# Refactor PR Correction

This workflow addresses feedback from the `post_execution_*.md` assessment and fixes any CI failures on the active PR.

## 1. Context Loading
*   **Input:**
    *   **Post-Execution Report:** User provides the filename (e.g., `tasks/post_execution_phase_0.md`).
    *   **PR Number:** (Optional, if CI check is requested).
*   **Action:**
    *   Read the Assessment Report.
    *   Read the "Recommendations" and "Quality Check" failures.

## 2. CI Status Check (Optional)
*   **Action:**
    *   If a PR Number is available, check the status of the latest workflow run:
        `gh pr checks [PR_NUMBER]`
    *   If failures exist, view the logs:
        `gh run view [RUN_ID] --log-failed` (Use `gh run list --branch [BRANCH]` if needed to find ID).

## 3. Correction Execution
*   **Mode:** **Direct Local Edit**. (Since these are refinements, you - Antigravity - perform them locally).
*   **Action:**
    *   Apply fixes for every issue listed in the Assessment Report.
    *   Apply fixes for any Lint/Type/Test errors found in CI.
    *   **Constraint:** Maintain the architectural integrity defined in `tasks/refactor_calculations.md`.

## 4. Verification
*   **Action:**
    *   Run local linters: `ruff check .` / `npm run lint:ts`.
    *   Run relevant tests: `pytest ...`.
    *   *Goal:* Ensure the branch is now Green.

## 5. Push Corrections
*   **Action:**
    *   Commit the fixes: `git commit -am "refactor: apply assessment corrections"`
    *   Push to the existing PR branch: `git push`
    *   *Note:* This updates the remote PR automatically.
