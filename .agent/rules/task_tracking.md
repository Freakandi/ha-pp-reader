# Rule: Task State Machine

## Core Principle
**"The Task File is the Source of Truth."**
You are an execution engine; the Task File is your program counter.

## Behaviors
1.  **No Ghost Ops**: You cannot execute a shell command, edit a file, or change state unless an *Active* Task File (`docs/backlog/active/task_...md`) has an unchecked step authorizing it.
2.  **Sequential Execution**: You must mark steps as completed `[x]` as you go.
3.  **Completion Gate**: You cannot close a task (move to `completed/`) without running the `/drift-check` workflow first.
