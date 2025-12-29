---
description: Execute a NAMED task file (Local or Cloud)
---

1. **Load Plan**:
   - Identify the target task file (ask user if ambiguous, default to most recent in `tasks/`).
   - Read `tasks/<slug>.md`.
   - Identify the `Execution Mode` (Local/Cloud). If missing, ask the user.

2. **Cloud Execution Branch**:
   - IF `Execution Mode` is `Cloud`:
     - **Construct Command**: `cat tasks/<slug>.md | jules new`
     - **Propose Command**: Use `run_command` to propose this.
     - **Action**: Explain that this will spawn a Jules session to handle the entire task file content.
     - **Stop**: Do not proceed with local edits.

3. **Local Execution Branch**:
   - IF `Execution Mode` is `Local`:
     - Identify the next *incomplete* chunk of work (or all steps if not chunked).
     - **Execute**: Perform the code edits specified in that file's "Implementation Plan".
     - **Verify**:
       - Run `ruff check .` (Python) and fix errors.
       - Run `npm run lint:ts` (Frontend) and fix errors.
       - Run specific tests related to the fix as defined in the Verification section.
     - **Update Plan**: Mark completed steps as `[x]` in `tasks/<slug>.md`.

4. **Completion**:
   - If more chunks remain: Inform the user "Chunk X complete. Run this workflow again to proceed to the next chunk."
   - If done:
     - Update the `tasks/<slug>.md` content: Change `Status: [ ] Open` to `Status: [x] Complete`.
     - Report success to the user.