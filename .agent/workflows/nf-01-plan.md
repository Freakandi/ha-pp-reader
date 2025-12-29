---
description: Analyze a feature request and create a detailed specification plan in tasks/
---

1. **Analyze Input**:
   - Read the user's request for the new feature or change.
   - Synthesize the requirements into a clear understanding.

2. **Deep Dive Investigation**:
   - Scan the codebase to identify ALL touched modules/files.
   - Check `ARCHITECTURE.md` and `datamodel/` for constraints and consistency.
   - Use tools like `grep_search` or `find_by_name` to locate relevant files.
   - Identify potential side effects (e.g. breaking backdating, schema conflicts).

3. **Draft Plan**:
   - Create a short, descriptive slug for the feature (e.g., `add_crypto_tracking`, `refactor_metrics`).
   - Create the file `tasks/<slug>.md`.
   - **Content Requirements**:
     - Header: `# Task: <Title>`
     - Status Line: `Status: [ ] Plan Created`
     - Section `## Goal`: High level objective.
     - Section `## Context`: Relevant files, schemas, and architectural notes.
     - Section `## Draft Implementation Steps`: A detailed technical list of changes required.
     - **NOTE**: Do not add estimation or split into chunks yet. Keep it as a raw list of technical steps.

4. **Output**:
   - Present the summary of the plan.
   - Explicitly mention the created file path: `tasks/<slug>.md`.
   - Ask the user to proceed to the next workflow: `/feature-02-estimate`.
