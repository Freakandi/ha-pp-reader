---
description: Merge a Refactor PR, cleanup branches, and return to dev.
---

# Refactor PR Merge & Cleanup

This workflow finalizes a refactoring increment by merging the PR and cleaning up the environment.

## 1. Preparation
*   **Input:** User must provide the **PR Number**.
*   **Action:**
    *   Identify the branch name associated with the PR:
        `gh pr view [PR_NUMBER] --json headRefName -q .headRefName`
    *   (Note this name for Step 4).

## 2. Merge & Remote Cleanup
*   **Action:**
    *   Merge the PR and delete the remote branch:
        `gh pr merge [PR_NUMBER] --merge --delete-branch`

## 3. Return to Base
*   **Action:**
    *   Switch to the development branch:
        `git checkout dev`
    *   Pull the changes (including the merge just performed):
        `git pull origin dev`

## 4. Local Cleanup
*   **Action:**
    *   Delete the local feature branch (force delete as it's already merged remotely):
        `git branch -D [BRANCH_NAME]` (from Step 1).
