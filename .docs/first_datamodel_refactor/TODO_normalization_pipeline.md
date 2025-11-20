1. [x] Phase 0 – Schema & Snapshot Foundations
   - ✅ Snapshot tables/macros ship in `db_schema.py` and are the persistence target for every normalization run.
   a) [x] Extend `custom_components/pp_reader/data/db_schema.py` with canonical snapshot tables (e.g., `portfolio_snapshots`, `account_snapshots`) or materialized views that mirror the payload contract in `datamodel/backend-datamodel-final.md`. Update `ALL_SCHEMAS` plus WAL-safe migrations so upgrades stay idempotent.
      - Dateipfad(e): custom_components/pp_reader/data/db_schema.py, custom_components/pp_reader/data/db_init.py, custom_components/pp_reader/data/migrations/*.py
      - Ziel: Persist normalized payload rows instead of assembling dictionaries from scratch, enabling deterministic websocket/event responses.
   b) [x] Add migration/cleanup helpers to drop no-longer-used columns or temporary caches (e.g., deprecated `avg_price_*` mirrors) once the canonical tables exist.
      - Dateipfad(e): custom_components/pp_reader/data/migrations/*.py, scripts/migration_*.py (falls nötig)
      - Ziel: Reduce redundancy so normalization logic reads from a single storage path without legacy fallbacks.

2. [x] Phase 1 – Normalization Pipeline Module
   - ✅ `data/normalization_pipeline.py` exports the canonical entry points and serializer helpers; CLI + coordinator reuse the shared module.
   a) [x] Introduce `custom_components/pp_reader/data/normalization_pipeline.py` that loads staged portfolios/accounts/securities plus persisted metrics, producing canonical `PortfolioSnapshot`/`AccountSnapshot` dataclasses.
      - Zielmodule: new dataclasses, serializer helpers, async entry point `async_normalize_snapshot(hass, db_path, *, include_positions=False)`.
      - Abhängigkeiten: `db_access`, `metrics.storage`, `logic.securities`.
   b) [x] Wire normalization into CLI utilities (e.g., `scripts/enrichment_smoketest.py`) so snapshot generation can be tested without Home Assistant.

3. [x] Phase 2 – WebSocket & Event Integration
   - ✅ WebSocket handlers, diagnostics, and dispatcher events all pull from the canonical snapshot helpers; bespoke `_normalize_*` branches were removed.
   a) [x] Refactor `custom_components/pp_reader/data/websocket.py` to call the normalization pipeline instead of assembling payloads inline; remove legacy `_normalize_*` helpers.
      - Deckung: `ws_get_dashboard_data`, `ws_get_portfolio_data`, `ws_get_accounts`, `ws_get_security_snapshot`, `ws_get_security_history`.
   b) [x] Update `custom_components/pp_reader/data/event_push.py` to emit the canonical snapshot structure (including provenance + coverage metadata) and drop bespoke patch logic.
   c) [x] Ensure `custom_components/pp_reader/data/db_access.py` exposes only the loaders required by the normalization pipeline, removing redundant formatters.

4. [x] Phase 3 – Coordinator Orchestration & Feature Flags
   - ✅ Coordinator telemetry now reports parser/ingestion/metrics status only and normalization runs unconditionally with no feature flag.
   a) [x] Extend `custom_components/pp_reader/data/coordinator.py` to trigger normalization after metrics complete, cache the resulting snapshot, and push progress events (now unconditional, no feature flag).
   b) [x] Remove coordinator fields that duplicated normalization outputs once the feature flag is default-on; align sensors with the new cache structure.

5. [x] Phase 4 – Tests & Diagnostics
   - ✅ Pytest suites cover normalization output, WebSocket/event regressions, diagnostics, and CLI smoke paths (see references below).
   a) [x] Add backend tests covering normalization output (`tests/normalization/test_pipeline.py`) plus websocket/event regressions consuming the new snapshots.
      - Szenarien: multi-portfolio coverage, FX edge cases, missing metrics, error surfaces.
   b) [x] Extend diagnostics (`custom_components/pp_reader/util/diagnostics.py`) with a `normalized_payload` entry exposing the last computed snapshot metadata.
   c) [x] Update CLI smoke tests and fixtures (`tests/integration/test_normalization_smoketest.py`) to validate end-to-end import → enrichment → metrics → normalization.

6. [x] Phase 5 – Documentation & Cleanup
   - ✅ README/README-dev/ARCHITECTURE plus backend docs all describe the canonical snapshot pipeline; legacy guides were archived.
   a) [x] Document the normalization layer in `README.md`, `README-dev.md`, `.docs/backend_workstreams.md`, and `.docs/qa_docs_comms.md`, highlighting the new snapshot tables and event contracts.
   b) [x] Update `CHANGELOG.md` and `.docs/legacy_cleanup_strategy.md` to capture removed helpers (`_normalize_portfolio_row`, legacy websocket patches, coordinator caches).
   c) [x] Archive any superseded docs under `.docs/cleanup/` and note remaining cleanup tasks (e.g., frontend adapter handoff) for the next milestone.
