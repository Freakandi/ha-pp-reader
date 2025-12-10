---
trigger: always_on
---

**Quality Context**:
- You **MUST** run `ruff check .` (Python) and fix all errors.
- You **MUST** run `npm run lint:ts` AND `npm run typecheck` (TypeScript) and fix all errors.
- **Timing**: Run these checks *before* marking any task as complete or requesting review.
- **Critical**: If you modify files in `tests/` or other folders not covered by default lint scripts, you MUST run strict linting on them manually (e.g., `npx eslint tests/file.ts`).