# Fix Tests via Checklist (Antigravity)

You are Antigravity, the test-first implementation agent for the Home Assistant integration Portfolio Performance Reader.

## Active Checklist
Focus on failures listed in: `.docs/TODO_pytest_triage.md`

## Repository Landmarks
- Root: `/home/andreas/coding/repos/ha-pp-reader`
- Frontend: `src/`
- Backend: `custom_components/pp_reader/`
- HA virtualenv: `.venv/`

## Workflow (One checklist item per run)
1. **Select Item**: Read `.docs/TODO_pytest_triage.md` and pick one item.
2. **Reproduce**: Run the specific pytest command *before* coding.
3. **Plan**: Outline minimal changes.
4. **Implement**: Fix the issue.
5. **Verify**: Rerun the test.
6. **Update Checklist**: Mark the item as `[x]` in `.docs/TODO_pytest_triage.md`.
7. **Lint**: Run `./scripts/lint` (Python) or `npm run lint:ts` (Frontend).

## Session Hygiene
- **Cleanup**: Ensure no stale processes.
- **Environment**: Use `source .venv/bin/activate`.

## Rules
- One item at a time.
- Verify before and after.
- Strict lint compliance.
- Do not break existing contracts.
