---
description: Execute a NAMED task file
---

1. **Identify Task File**:
   - Look for a filename provided in the user's message (e.g., "execute tasks/fix_rendering_glitch.md").
   - IF NO FILE IS SPECIFIED:
     - Use `list_dir` on `tasks/` to show available tasks.
     - ASK the user which one to proceed with.
     - DO NOT GUESS or proceed without a specific file.

2. **Read Task**:
   - Read the content of the selected task file using `view_file`.

3. **Implement**:
   - Perform the code edits specified in that file's "Implementation Plan".
   - Stick strictly to the plan. If the plan is wrong, STOP and provide a proposal to the user for an update to the task file first.

4. **Verify**:
   - **Linting**: params `ruff check .` (Python) and `npm run lint:ts` (Frontend). Fix errors immediately.
   - **Testing**: Run specific tests related to the fix as defined in the Verification section.

5. **Close**:
   - Update the `tasks/<slug>.md` content: Change `Status: [ ] Open` to `Status: [x] Complete`.
   - Report success to the user.