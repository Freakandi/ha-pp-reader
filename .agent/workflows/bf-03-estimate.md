---
description: Review a bugfix plan, estimate effort, and structure it for execution (Local vs Cloud)
---

1. **Read Task**:
   - Identify the target task file (ask user if ambiguous, default to most recent in `tasks/`).
   - Read the content of `tasks/<slug>.md`.

2. **Estimate & Strategize**:
   - **Analyze**: Estimate Lines of Code (LoC), number of files touched, and complexity.
   - **Strategize**:
     - *Local*: Simple enough for one session (e.g. < 5 files, straightforward logic).
     - *Cloud*: Complex, requires delegation to Jules (e.g. massive refactors, deep dependency chains, or high volume of changes).
     - *Multi-Chunk*: Too large for one pass; needs to be broken into sequential chunks.

3. **Update Task File**:
   - Edit `tasks/<slug>.md` to include:
     - Metadata: `Est. Complexity: [Low/Med/High]`
     - Metadata: `Suggested Mode: [Local/Cloud]`
     - **Refined Steps**:
       - If complex, group steps under headers like `## Chunk 1: <Topic>`, `## Chunk 2: <Topic>`.
       - Ensure every step has a checkbox `[ ]`.

4. **Output**:
   - Present the estimation and suggested strategy to the user.
   - Ask the user to confirm the strategy (Local vs Cloud).
   - Update `tasks/<slug>.md` with `Execution Mode: <User Choice>` (if user confirms immediately, otherwise ask them to edit it or confirm in next step).
   - Ask the user to proceed to `/bf-04-execute`.
