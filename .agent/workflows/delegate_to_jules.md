---
description: Delegate a coding task to Jules (Cloud Agent)
---

# Delegate to Jules

1.  **Preparation**
    *   [ ] Thoroughly investigate the codebase and user request.
    *   [ ] Create a detailed specification file (e.g., `task.md` or `spec.md`). This file MUST contain:
        *   Context/Goal.
        *   File paths to modify.
        *   Specific requirements/constraints.
        *   Verification steps (tests to run).

2.  **Delegation**
    *   [ ] Execute the Jules CLI command using the spec file.
    *   Command: `jules run --task task.md` (or appropriate command).
    *   **Wait** for the command to return a PR link or completion status.

3.  **Review**
    *   [ ] Fetch the PR/Branch created by Jules.
    *   [ ] Review the code changes.
    *   [ ] Run verification tests locally if possible/needed.
    *   [ ] If valid: Report success to the User and ask them to merge.
    *   [ ] If invalid: Provide feedback to Jules (if the CLI supports iteration) or ask the User to reject the PR and request a retry with updated specs.
