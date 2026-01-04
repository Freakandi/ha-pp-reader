---
description: Create a detailed, executable task file for a SINGLE phase of the Architecture Refactor.
---

# Refactor Estimation & Task Generation

This workflow transforms a high-level "Phase" from `tasks/refactor_calculations.md` into a concrete, file-level execution plan (a Task File) located in `tasks/`.

## 1. Scope Definition (Hard Gate)
*   **Input:** Check the User's Request.
*   **Constraint:** You must identify **EXACTLY ONE** Phase (e.g., "Phase 1", "Phase 2", "Data Layer", "UI Layer").
*   **Action:**
    *   *If valid:* Proceed.
    *   *If "Estimate All" or Ambiguous:* **STOP**. Ask the user to specify which phase to tackle first. "I can only estimate one phase at a time to ensure quality. Which one shall we start with?"

## 2. Context Loading
*   Read `tasks/refactor_calculations.md` (The Master Plan).
*   Read `tasks/refactor_context.md` (Design Decisions).
*   **Action:** Extract the section of the Master Plan corresponding to the selected Phase. This is your "Feature Specification".

## 3. Technical Deep Dive (Gap Analysis)
*   Compare the "Feature Specification" against the *current* codebase.
*   **Goal:** Identify every file that needs creation, modification, or deletion for *this specific phase*.
*   **Tools:** Use `grep_search` and `view_file` generously.
*   **Checklist:**
    *   Where does the data come from? (Review current imports).
    *   What breaks if I change this? (Dependencies).
    *   Are there existing tests? (Run `ls tests/...`).

## 4. Task File Creation
*   Create a new file: `tasks/refactor_phase_[N]_[slug].md`.
*   **Format:** Standard Task format (Goal, Context, Implementation Steps).
*   **Content Requirements:**
    1.  **User Story/Goal:** "Implement Phase X of the Refactor: [Title]".
    2.  **Proposed Changes:** List specific files and functions to modify.
    3.  **Detailed Steps:** Break down the work into 3-5 atomic "Chunks" (e.g., "Step 1: DB Schema", "Step 2: Migration", "Step 3: Writer Logic").
    4.  **Test Plan:** Explicitly list tests to create or run.
    5.  **Complexity Rating:** Estimate the effort (Story Points or T-Shirt size).

## 5. Review & Approval
*   Present the created `tasks/refactor_phase_[N]_[slug].md` to the user.
*   Ask for approval to proceed to execution (User will likely switch to `/nf-03-execute` after this).
