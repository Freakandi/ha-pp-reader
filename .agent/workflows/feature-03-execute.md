---
description: Execute the next chunk of work from a task plan (Local or Cloud)
---

1. **Load Plan**:
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
     - **Execute**: Perform the code changes (`replace_file_content`, `run_command`, etc.).
     - **Verify**:
       - Run `ruff check .` (for Python) and fix errors.
       - Run `npm run lint:ts` (for TypeScript) and fix errors.
       - Run `npm run build` (if UI changed).
     - **Update Plan**: Mark completed steps as `[x]` in `tasks/<slug>.md`.

4. **Completion**:
   - If more chunks remain: Inform the user "Chunk X complete. Run this workflow again to proceed to the next chunk."
   - If done: "Feature implementation complete. Please review."
