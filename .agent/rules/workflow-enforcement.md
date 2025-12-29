---
trigger: always_on
---

# Workflow Enforcement Protocol

## Slash Command Priority
1. **Trigger**: If the user's request contains a slash command (e.g., `/bf-01-plan`, `/nf-03-execute`), this is the **HIGHEST PRIORITY** instruction.
2. **Mandatory First Action**: Your **ONLY** allowed first action is to use `view_file` to read the corresponding workflow definition (e.g., `.agent/workflows/bf-01-plan.md`).
3. **Usage Prohibition**: You are **FORBIDDEN** from writing code, editing files, or solving the user's underlying problem until:
   - You have read the workflow file.
   - You have explicitly acknowledged the steps in that file.
   - You are executing the *first step* of that workflow.
4. **Correction**: If you find yourself solving the "Goal" (e.g., fixing the bug) before establishing the "Plan," **STOP**. You have violated the workflow.