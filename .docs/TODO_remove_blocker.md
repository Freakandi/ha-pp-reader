# Remove pytest blockers – detailed checklist

The 2025-02-14 backend regression run (`pytest -q` / coverage) failed with 48/49 errors that stem from schema drift, timezone incompatibilities, protobuf mapping gaps, and dashboard bundle regressions documented in `.docs/TODO_release_enablement.md`. This checklist captures the exact remediation steps required before the pytest suites can complete without errors.

## 1. Restore portfolio schema coverage for average price metrics
- [x] Extend the `portfolio_securities` schema to surface every average-cost column required by the normalization pipeline (`avg_price_native`, `avg_price_security`, `avg_price_account`) inside `custom_components/pp_reader/data/db_schema.py` and `ALL_SCHEMAS`.
- [x] Add runtime migrations in `custom_components/pp_reader/data/db_init.py` so existing installations add the missing columns without breaking idempotent startup (guard through `LEGACY_PORTFOLIO_COLUMNS`).
- [x] Update ingestion + sync writers (`data/ingestion_writer.py`, `data/sync_from_pclient.py`) and purchase aggregation helpers (`logic/securities.py`, `prices/price_service.py`) to persist/populate the columns, keeping emitted payloads free of deprecated fields.
- [x] Refresh fixtures that assert database shape (`tests/test_db_access.py`, `tests/test_sync_from_pclient.py`, `tests/test_migration.py`) and the canonical schema docs (`datamodel/SQLite_data.md`) so pytest stops flagging missing average-cost fields.

## 2. Provide backward-compatible UTC handling
- [x] Introduce a shared `UTC` sentinel (e.g., `custom_components/pp_reader/util/datetime.py`) that falls back to `datetime.timezone.utc` when `datetime.UTC` is unavailable under Python < 3.11.
- [x] Replace direct `datetime.UTC` usage in `currencies/fx.py`, `data/db_access.py`, and `data/ingestion_writer.py` with the helper import, updating unit tests that pin timestamp formatting.
- [x] Verify lint/tests under Python 3.10/3.11 to guarantee the fallback resolves the regression.

## 3. Align parser + normalization models with protobuf contract
- [x] Audit `custom_components/pp_reader/models/parsed.py` against `datamodel/backend-datamodel-final.md` to add missing fields (e.g., security/account aggregates, purchase FX metadata) and ensure `Parsed*` dataclasses hydrate every attribute that downstream normalization expects.
- [ ] Update `services/parser_pipeline.py` and ingestion writers to persist the newly mapped fields, keeping progress events untouched.
- [ ] Regenerate parser fixtures (`tests/models/test_parsed_models.py`, `tests/integration/test_sync_from_staging.py`) so assertions use the expanded dataclasses instead of legacy fallbacks.
- [ ] Ensure normalization + websocket tests (`tests/test_event_push.py`, `tests/test_ws_portfolios_live.py`, `tests/test_ws_portfolio_positions.py`) load the enriched schema without proto field mismatches.

## 4. Fix dashboard smoke regressions triggered by missing normalized fields
- [ ] Rebuild the normalized dashboard adapter so `src/` components emit the fields expected by websocket payloads (align with `tests/dashboard/` snapshots and `tests/frontend/` DOM references).
- [ ] Run the Node test pipeline (`npm run lint:ts`, `npm run typecheck`, `npm test`) to ensure the adapter changes restore the failing smoke suite mentioned in the regression report.
- [ ] If new normalized keys require HA wiring, update websocket serialization helpers in `custom_components/pp_reader/data/websocket.py` while keeping coordinator payload contracts stable.

## 5. Final validation
- [ ] Re-run `pytest -q` and `pytest --cov=custom_components/pp_reader --cov-report=term-missing` inside the project virtualenv once items 1–4 complete; document the passing results in `.docs/TODO_release_enablement.md` item 1.a.
