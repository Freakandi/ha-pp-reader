# Linting Sweep - Nov 30 2025

Fresh linting pass after the latest refactors to bring both Python and TypeScript back to zero lint errors. This plan is written for future me to execute autonomously: every item names the scope, the command to run, and the acceptance criteria.

## Commands to stick to
- Python lint: `./.venv/bin/ruff check custom_components scripts tests --statistics`
- Targeted Python scopes: `./.venv/bin/ruff check <path>`; defer `./scripts/lint` until the final verification to avoid surprise auto-fixes.
- Frontend lint: `npm run lint:ts` (optionally with `-- --format json --output-file /tmp/eslint.json` for counts)
- Frontend type check: `npm run typecheck`
- Optional spot checks after fixes: `pytest <targeted module>` and `npm test` when UI behaviour changes

## Baseline - 2025-11-30

### Python (ruff)
- Command: `./.venv/bin/ruff check custom_components scripts tests --statistics`
- Totals: 54 findings (15 auto-fixable)
- Top rules: syntax errors (6), `PLR0912` too-many-branches (6), `PLR0915` too-many-statements (6), `RUF100` unused `noqa` (5), `E501` line-too-long (4), `I001` unsorted imports (4), `PLR2004` magic-value-comparison (4), smaller clusters `ARG001`, `BLE001`, `F401`, `F841`, `PLR0913`, `D202`, `D213`, `PLR0911`, `RUF022`, `SIM105`, `SIM114`, `TC003`, `TC004`, `TRY300`.
- Hotspots:
  - `tests/normalization/test_snapshot_writer.py`: 6 syntax errors (broken try/finally block).
  - `custom_components/pp_reader/data/db_access.py`: 13 findings (PLR2004x4, E501x3, PLR0912x2, PLR0911, PLR0915, D213, TRY300).
  - `custom_components/pp_reader/data/normalization_pipeline.py`: 13 findings (PLR0912x3, PLR0915x3, ARG001x2, BLE001x2, F841x2, PLR0913).
  - `custom_components/pp_reader/data/canonical_sync.py`: 3 (SIM105, PLR0912, PLR0915).
  - `custom_components/pp_reader/prices/price_service.py`: 3 (I001, E501, TC004).
  - Minor stragglers: `tests/conftest.py` (RUF100x3), `util/currency.py` (TC003, RUF100), import-order items in `prices/history_queue.py`, `tests/test_normalization_day_change.py`, plus single F401/I001 hits across a handful of tests and data modules.

### Frontend (ESLint + tsc)
- Commands: `npm run lint:ts -- --format json --output-file /tmp/eslint.json` for counting, `npm run typecheck` (currently clean).
- Totals: 62 ESLint errors, 0 warnings.
- Top rules: `@typescript-eslint/no-unnecessary-condition` (28), `no-unsafe-member-access` (12), `no-explicit-any` (7), `no-unnecessary-type-assertion` (6), `require-await` (3), `restrict-template-expressions` (3), `no-unsafe-argument` (2), `no-deprecated` (1).
- Hotspots:
  - `src/tabs/security_detail.ts`: 15 (unnecessary conditions, restrict-template, deprecated `execCommand`, redundant assertions).
  - `src/tabs/__tests__/security_detail.history.test.ts`: 12 (optional-chain misuse, `require-await`, unsafe member access/args).
  - `src/data/__tests__/positionsCache.test.ts`: 10 (optional-chain misuse).
  - `src/data/positionsCache.ts`: 6 (explicit `any` + unsafe member access).
  - `src/lib/store/portfolioStore.ts`: 6 (explicit `any` + unsafe member access).
  - `src/tabs/overview.ts`: 5 (unnecessary condition, restrict-template, unsafe args).
  - `src/content/__tests__/charting.single-point.test.ts`: 4 (unsafe member access on JSDOM globals).
  - `src/lib/api/portfolio/deserializers.ts`: 3 (optional-chain misuse).
  - `src/lib/store/selectors/portfolio.ts`: 1 (optional-chain misuse).
  - TypeScript compiler: `npm run typecheck` passes.

## Execution plan

### How to work this plan
- Always run the scoped lint command first to reproduce, then fix, then rerun the same scope before moving on.
- Keep changes scoped per checkbox; commit or stash between items if needed.
- Update the checkboxes here as progress markers; include a one-line note under the item if the fix involved a noteworthy decision.
- Prefer code fixes over rule suppression; only add `noqa` or `eslint-disable` when justified in the diff.

### Checklist
- [x] **Fix Python syntax regression**  
  Scope: `tests/normalization/test_snapshot_writer.py` (broken try/finally).  
  Acceptance: `./.venv/bin/ruff check tests/normalization/test_snapshot_writer.py` clean; consider `pytest tests/normalization/test_snapshot_writer.py` once lint passes.

- [x] **db_access.py PLR/E501 cleanup**  
  Scope: `custom_components/pp_reader/data/db_access.py`.  
  Focus: reduce branches/returns, replace magic numbers with named constants, wrap long lines, fix TRY300 flow.  
  Acceptance: `./.venv/bin/ruff check custom_components/pp_reader/data/db_access.py` clean.

- [x] **normalization pipeline + canonical sync**  
  Scope: `custom_components/pp_reader/data/normalization_pipeline.py`, `custom_components/pp_reader/data/canonical_sync.py`.  
  Focus: split helper functions to cut branch/statement counts, remove unused args/vars, replace blind excepts, tidy argument counts.  
  Acceptance: `./.venv/bin/ruff check custom_components/pp_reader/data/normalization_pipeline.py custom_components/pp_reader/data/canonical_sync.py` clean.

- [x] **Python stragglers sweep**  
  Scope: `custom_components/pp_reader/prices/price_service.py`, `prices/history_queue.py`, `util/currency.py`, `tests/conftest.py`, `tests/test_history_queue.py`, `tests/test_history_ingest.py`, `tests/test_normalization_day_change.py`, `data/migrations/__init__.py`, `__init__.py`.  
  Focus: fix import order, TC00x typing-block placement, unused imports/noqa, long lines.  
  Acceptance: `./.venv/bin/ruff check custom_components scripts tests` clean for these files.

- [x] **Positions cache (code + tests)**  
  Scope: `src/data/positionsCache.ts`, `src/data/__tests__/positionsCache.test.ts`.  
  Focus: remove unnecessary optional chains, type the dynamic field access to drop `any`/unsafe access.  
  Acceptance: `npm run lint:ts -- src/data/positionsCache.ts src/data/__tests__/positionsCache.test.ts` clean; `npm run typecheck` still green.

- [x] **Security detail history tests**  
  Scope: `src/tabs/__tests__/security_detail.history.test.ts`.  
  Focus: drop unnecessary optional chains, add awaits or make helpers synchronous, type mock payloads to avoid unsafe member access.  
  Acceptance: `npm run lint:ts -- src/tabs/__tests__/security_detail.history.test.ts` clean.

- [x] **Security detail tab cleanup**  
  Scope: `src/tabs/security_detail.ts`.  
  Focus: remove redundant assertions, tighten types to avoid unsafe args/member access, replace `execCommand` usage or guard it, clean unnecessary conditions.  
  Acceptance: `npm run lint:ts -- src/tabs/security_detail.ts` clean; spot-check UI logic if behaviour changes.

- [x] **Overview + store + charting stragglers**  
  Scope: `src/tabs/overview.ts`, `src/lib/store/portfolioStore.ts`, `src/lib/store/selectors/portfolio.ts`, `src/content/__tests__/charting.single-point.test.ts`, `src/lib/api/portfolio/deserializers.ts`.  
  Focus: restrict-template fixes, optional-chain cleanups, type unsafe access, drop `any` usage, stabilise JSDOM typing in tests.  
  Acceptance: `npm run lint:ts -- <listed files>` clean.

- [x] **Final verification**  
  Commands: `./.venv/bin/ruff check custom_components scripts tests`, `npm run lint:ts`, `npm run typecheck`, plus targeted tests if code paths changed.  
  Acceptance: all lint commands pass; note any config updates or intentional suppressions in this file.
