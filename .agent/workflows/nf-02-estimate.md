---
description: Review a task plan, estimate effort, and structure it for execution (Local vs Cloud)
---

1. **Read Plan**:
   - Identify the target task file (ask user if ambiguous, default to most recent in `tasks/`).
   - Read the content of `tasks/<slug>.md`.

2. **Estimate & Strategize**:
   - **Analyze**: Estimate Lines of Code (LoC), number of files touched, and complexity.
   - **Strategize**:
     - *Local*: Simple enough for one session (e.g. < 5 files, straightforward logic).
     - *Cloud*: Complex, requires delegation to Jules (e.g. massive refactors, new modules, tedious boilerplate).
     - *Multi-Chunk*: Too large for one pass; needs to be broken into sequential chunks (e.g. Chunk 1: Backend, Chunk 2: Frontend).

3. **Update Task File**:
   - Edit `tasks/<slug>.md` to include:
     - Metadata: `Est. Complexity: [Low/Med/High]`
     - Metadata: `Suggested Mode: [Local/Cloud]`
     - **Refined Steps**:
       - If complex, group steps under headers like `## Chunk 1: <Topic>`, `## Chunk 2: <Topic>`.
       - Ensure every step has a checkbox `[ ]`.

4. **Output**:
   - Present the estimation and suggested strategy to the user.
   - Ask the user to confirm the strategy (Local vs Cloud) and if they accept the chunks.
   - Update `tasks/<slug>.md` with `Execution Mode: <User Choice>` (if user confirms immediately, otherwise ask them to edit it or confirm in next step).
   - Ask the user to proceed to `/feature-03-execute`.
