# Lint TODO 25/12/06

Context: Mock run after Dependabot ruff bump; unused-noqa warnings surfaced in Python, frontend lint clean.

Commands:
- `source venv-ha/bin/activate && ruff check custom_components scripts tests --statistics` (fail: 4×RUF100 unused-noqa)
- `source venv-ha/bin/activate && ruff check custom_components scripts tests` (fail: detail capture for RUF100)
- `npm run lint:ts -- --format json --output-file /tmp/eslint.json` (pass: 0 findings)
- `npm run typecheck` (not run; add if TS types need review)

## Checklist
- [x] **tests/conftest.py**
  Scope: tests/conftest.py
  Findings: 3×RUF100 unused `noqa` for PLC0415 imports/patching helpers
  Command: ./venv-ha/bin/ruff check tests/conftest.py
  Acceptance: Command passes with no RUF100 after removing unused `noqa` tags; tests still load helper modules correctly
- [x] **custom_components/pp_reader/util/currency.py**
  Scope: custom_components/pp_reader/util/currency.py
  Findings: 1×RUF100 unused `noqa` for PLC0415 on dynamic FX import
  Command: ./venv-ha/bin/ruff check custom_components/pp_reader/util/currency.py
  Acceptance: Command passes with no RUF100 while keeping lazy FX helper import intact
- [x] **Final verification**
  Scope: repository
  Findings: Confirm suites clean after fixes
  Command: ./venv-ha/bin/ruff check custom_components scripts tests && npm run lint:ts
  Acceptance: Both commands succeed; run `npm run typecheck` as needed for TS coverage
