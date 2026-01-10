---
description: Stage 2 - Define the Technical Specification (Definition).
---

# Workflow: Define Spec (Definition)

**Pre-condition**: A `PLAN.md` exists in `docs/backlog/active/[feature]/`.

1.  **Read Context**:
    *   Read `docs/backlog/active/[feature]/PLAN.md`.
    *   List all existing specs in `docs/specs/*.md`.

2.  **Strategy Proposal**:
    *   **Analyze**: Decide if a NEW file is needed or an UPDATE is better.
    *   **Propose**: Output a clear recommendation to the user.
        *   "I propose creating **NEW** file `docs/specs/xxx.md` because..."
        *   "I propose **UPDATING** `docs/specs/yyy.md` because..."
    *   **Wait** for alignment on the strategy.

3.  **Draft Proposal**:
    *   Create `docs/backlog/active/[feature]/SPEC_DRAFT.md`.
    *   **Content Requirement**:
        *   **Target File**: State clearly which `docs/specs/*.md` this targets.
        *   **Content**: The exact Markdown text to be inserted/modified.
        *   **Public API**: Function signatures.
        *   **Inventory Update**: The specific lines to add to the Inventory.

4.  **Iterate**:
    *   Present `SPEC_DRAFT.md` to user.
    *   Explain *why* these structures were chosen.
    *   Refine until user says "Spec Approved".

5.  **Finalize (Merge)**:
    *   User explicitly starts the final "Merge Spec" action.
    *   **Action 1**: Apply the content of `SPEC_DRAFT.md` to the actual `docs/specs/[target].md`.
    *   **Action 2**: Add `**Specification**: [Path to spec]`, relevant section within that spec and line numbers, at the VERY TOP of `docs/backlog/active/[feature]/PLAN.md`.
    *   **STOP**. Instruct user to start new session for `/create-task`.