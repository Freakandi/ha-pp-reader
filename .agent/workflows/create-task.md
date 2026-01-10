---
description: Stage 3 - Create step-by-step Implementation Task (Strategy).
---

# Workflow: Create Task (Implementation Strategy)

**Pre-condition**: A `PLAN.md` and `SPEC_DRAFT.md` (mandatory reference) exist in `docs/backlog/active/[feature]/`.

1.  **Read Context**:
    *   Read `docs/backlog/active/[feature]/PLAN.md`.
    *   **Find Spec**: Search for the `**Specification**:` reference at the top of `PLAN.md`.
    *   **Read Spec**: Read the spec file pointed to by that reference.

2.  **Draft Task**:
    *   Create `docs/backlog/active/[feature]/TASK.md`.
    *   **Content Requirement**:
        *   **Checklist**: Granular steps (Files to create, Tests to write).
        *   **TDD Cycle**: Explicit "Red" (Test) -> "Green" (Imp) steps.
        *   **Linting**: A dedicated step for `ruff check`.

3.  **Iterate**:
    *   Present `TASK.md` to user.
    *   Refine steps.

4.  **Finalize**:
    *   User approves Logic.
    *   **STOP**. Instruct user to start new session for `/execute-task`.