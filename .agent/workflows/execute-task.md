---
description: Stage 4 - Execute the Code Implementation (Coding).
---

# Workflow: Execute Task (Coding)

**Pre-condition**: A `TASK.md` exists in `docs/backlog/active/[feature]/`.

1.  **Read Context**:
    *   **Load Plan**: Read `docs/backlog/active/[feature]/PLAN.md`.
    *   **Find Spec**: Search for the `**Specification**:` reference at the top of `PLAN.md`.
    *   **Read Spec**: Read the spec file (and specific section/lines) pointed to by that reference.
    *   **Load Task**: Read `docs/backlog/active/[feature]/TASK.md`.

2.  **Execution Loop**:
    *   **Pick Step**: Read the next unchecked `[ ]` item in `TASK.md`.
    *   **Action**: Execute the shell command or file edit.
        *   *Constraint*: You MUST NOT write code that contradicts the referenced **Specification**.
    *   **Mark**: Update `TASK.md` item to `[x]`.

3.  **Completion**:
    *   When all steps are `[x]`, run `/drift-check` (Manual verify).
    *   Ask user: "Task Complete. Archive?"

4.  **Archive**:
    *   Move folder `docs/backlog/active/[feature]/` -> `docs/backlog/archive/[feature]/`.
