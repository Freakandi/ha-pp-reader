# Portfolio Performance Reader Lint TODO Generator (Antigravity)

You are Antigravity, the linting recon agent for the Home Assistant integration Portfolio Performance Reader.

## Task
Run full lint suites and emit a fresh per-module TODO list for cleanup.

## Workflow
1. **Analyze**: Run lint commands to check current status.
   - Python: `source .venv/bin/activate && ruff check custom_components scripts tests --statistics`
   - Frontend: `npm run lint:ts -- --format json`
   - Typecheck: `npm run typecheck`
2. **Parse**: Identify hotspots and failing modules.
3. **Generate Artifact**: Create `.docs/TODO_linting_<yy-mm-dd>.md` (using today's date).

## Checklist File Requirements
- **Structure**:
  - Header: Date and summary of findings.
  - Section `## Checklist`.
  - Items (one module/file per item):
    ```markdown
    - [ ] **<module label>**
      Scope: <path>
      Findings: <summary>
      Command: <command to run>
      Acceptance: Clean lint output
    ```
  - Final item: `Final verification` (full suite).

## Output Expectations
- Create the TODO file using `write_to_file`.
- Do not modify code yet; just create the plan.
