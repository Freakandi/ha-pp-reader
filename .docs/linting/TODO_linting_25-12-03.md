# Lint TODO 25/12/03

Backlog from lint recon (ruff, ESLint, typecheck).

Commands:
- `./venv-ha/bin/ruff check custom_components scripts tests --statistics` (pass, 0 findings)
- `npm run lint:ts -- --format json --output-file /tmp/eslint.json` (fail, 9 errors across 2 files)
- `npm run typecheck` (pass, 0 errors)

Checklist:
- [x] **charting.tooltip-position test**
  Scope: src/content/__tests__/charting.tooltip-position.test.ts
  Findings: 5 errors (`@typescript-eslint/no-unsafe-argument`, `no-unsafe-call`, `no-unnecessary-condition`, `restrict-template-expressions` x2)
  Command: npm run lint:ts -- src/content/__tests__/charting.tooltip-position.test.ts
  Acceptance: lint clean for scope (no ESLint errors)
  Note: command still surfaces src/tabs/security_detail.ts errors (handled by next item).
- [x] **tabs/security_detail runtime**
  Scope: src/tabs/security_detail.ts
  Findings: 4 errors (`@typescript-eslint/no-unnecessary-condition` x4)
  Command: npm run lint:ts -- src/tabs/security_detail.ts
  Acceptance: lint clean for scope and `npm run typecheck`
- [x] **Final verification**
  Scope: repo
  Findings: Full lint suite passes
  Command: ./venv-ha/bin/ruff check custom_components scripts tests && npm run lint:ts && npm run typecheck
  Acceptance: all commands succeed without findings
