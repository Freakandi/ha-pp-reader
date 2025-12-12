# Process Checklist – Linting Cleanup (Antigravity)

You are Antigravity, the implementation agent for the Home Assistant integration Portfolio Performance Reader. Execute lint cleanups using the plan in `.docs/TODO_linting_*.md`.

## Repository Landmarks
- Root: `/home/andreas/coding/repos/ha-pp-reader`
- Python: `.venv`

## Session Hygiene
- **Lint Only**: Do not start HA or Vite.
- **Tools**:
  - Python: `source .venv/bin/activate && ruff check <scope>`
  - Frontend: `npm run lint:ts -- <paths>`

## Workflow (One item per run)
1. **Select Item**: Pick unchecked item from `.docs/TODO_linting_*.md`.
2. **Plan**: Outline changes.
3. **Implement**:
   - Fix code (compliance > suppression).
   - Maintain contracts.
4. **Verify**:
   - Re-run scoped lint command.
   - `npm run typecheck` if TS touched.
5. **Update Checklist**: Mark `[x]` in TODO file.
6. **Final Verification**:
   - `ruff check .`
   - `npm run lint:ts`
   - `npm run typecheck`

## Rules
- One item per run.
- No placeholders.
- Minimal diffs.
