# Legacy Cleanup Strategy for the Datamodel Refactor

## Intent

The canonical ingestion → enrichment → metrics → normalization flow described in the backend and frontend datamodel specs is now the only supported architecture; all payloads delivered to Home Assistant sensors, websocket handlers, events, and the dashboard must originate from the normalized snapshot serializers.【F:datamodel/dataflow_backend.md†L12-L90】【F:datamodel/backend-datamodel-final.md†L1-L23】【F:datamodel/dataflow_frontend.md†L18-L64】 This document enumerates the remaining legacy assets that still linger inside the repository so each one can be split into a focused TODO checklist during the next planning pass.

## Non-Negotiable Rules

- Canonical contracts only: anything that bypasses `async_parse_portfolio` → ingestion staging → enrichment → metrics → `normalization_pipeline` must be removed instead of reworked.【F:custom_components/pp_reader/services/parser_pipeline.py†L1-L80】【F:custom_components/pp_reader/data/normalization_pipeline.py†L1-L150】
- The normalized frontend adapter is GA and already consumes the canonical payloads everywhere (see `.docs/TODO_frontend_adapter_rollout.md`, `src/` stores/selectors, and the DOM reference). Any backend compatibility shim that only feeds the legacy adapter is now redundant.【F:.docs/TODO_frontend_adapter_rollout.md†L1-L90】【F:src/lib/api/portfolio/deserializers.ts†L212-L247】
- No migration tooling: runtime schema patches, compatibility migrations, and test modules that exist solely to validate legacy database layouts or protobuf diff-sync helpers must be deleted together with the code they protect.【F:custom_components/pp_reader/data/db_init.py†L31-L125】【F:tests/test_migration.py†L224-L320】

## Cleanup Catalog

### 1. Retire protobuf diff sync (`sync_from_pclient`) and `_legacy_sync_to_db`

**Status.** ✅ Completed in March 2025 — config flow validation now uses `parser_pipeline.async_parse_portfolio`, the `data/reader.py` + `data/sync_from_pclient.py` modules were deleted, CLI/tests were updated to rely solely on canonical ingestion → normalization, and `_legacy_sync_to_db` no longer exists in the coordinator.

**Scope.** The coordinator still re-parses `.portfolio` archives with the deprecated reader module and forwards them to `_legacy_sync_to_db`, which imports `data.sync_from_pclient` and replays the old `_SyncRunner` diff-sync pipeline.【F:custom_components/pp_reader/data/coordinator.py†L440-L542】【F:custom_components/pp_reader/data/reader.py†L1-L101】【F:custom_components/pp_reader/data/sync_from_pclient.py†L1-L200】 *(Historical context only; this architecture has now been removed.)*

**Canonical replacement.** The streaming parser plus ingestion writer already persist typed entities, and the normalization pipeline emits the payloads consumed by sensors, websocket commands, events, CLI tooling, and diagnostics.【F:custom_components/pp_reader/services/parser_pipeline.py†L1-L80】【F:custom_components/pp_reader/data/ingestion_writer.py†L1-L138】【F:custom_components/pp_reader/data/normalization_pipeline.py†L68-L194】

**Legacy assets to delete.**
- `_legacy_sync_to_db` branch and its `use_staging_importer` flag in `data/coordinator.py`.【F:custom_components/pp_reader/data/coordinator.py†L483-L542】
- `data/reader.py` and the protobuf alias plumbing in `custom_components/pp_reader/__init__.py` that only exists for diff-sync callers.【F:custom_components/pp_reader/data/reader.py†L1-L101】【F:custom_components/pp_reader/__init__.py†L62-L120】
- `data/sync_from_pclient.py`, accompanying `_SyncRunner` helpers, and the `pp_reader.name.abuchen.portfolio` import path shims that are unused once staging snapshots are canonical.
- Staging parity tests that compare ingestion snapshots with the legacy sync (`tests/test_sync_from_pclient.py`, `tests/integration/test_sync_from_staging.py`).【F:tests/test_sync_from_pclient.py†L1-L160】【F:tests/integration/test_sync_from_staging.py†L1-L120】

**Prerequisites.**
- Parser + ingestion coverage (`tests/services/test_parser_pipeline.py`, `tests/integration/test_ingestion_writer.py`) already prove staging writes are deterministic.【F:tests/services/test_parser_pipeline.py†L1-L40】【F:tests/integration/test_ingestion_writer.py†L1-L160】
- End-to-end smoke tests (`tests/integration/test_normalization_smoketest.py`) drive parser → staging → enrichment → normalization without invoking diff-sync.【F:tests/integration/test_normalization_smoketest.py†L1-L200】

**Validation.**
- Run the parser/enrichment/normalization pytest suites plus `tests/test_coordinator_contract.py` after deleting the legacy modules.
- Exercise `scripts/enrichment_smoketest.py` (used by QA) to confirm the CLI keeps working through the staging pipeline.

**Notes.** Removing `sync_from_pclient` unlocks dropping the `pp_reader` namespace alias exported in `__init__.py`, because no runtime import relies on the old module layout once protobuf diff sync disappears.【F:ARCHITECTURE.md†L70-L120】

### 2. Remove synchronous FX/price helpers and Yahoo history fallbacks

**Scope.** The synchronous FX wrappers (`ensure_exchange_rates_for_dates_sync`, `load_cached_rate_records_sync`, `normalize_price_to_eur_sync`) are still imported throughout the legacy holdings math (`logic/securities.py`) and diff-sync path even though the async Frankfurter/Yahoo pipelines are authoritative.【F:custom_components/pp_reader/util/currency.py†L14-L179】【F:custom_components/pp_reader/logic/securities.py†L376-L460】

**Canonical replacement.** The async FX module already exposes non-blocking helpers plus cached rate loading, and the history ingestion service writes Yahoo candles into SQLite before metrics consume them.【F:custom_components/pp_reader/currencies/fx.py†L320-L418】【F:tests/prices/test_history_ingest.py†L1-L105】

**Legacy assets to delete.**
- Sync wrappers in `util/currency.py` and their proxy exports once all call sites await the async helpers.
- Sync code paths inside `currencies/fx.py` (`load_cached_rate_records_sync`, `_execute_db` wrappers that spin their own loop).
- Any `_run_executor_job` dispatches in `logic/securities.py`, `data/sync_from_pclient.py`, and `prices/price_service.py` that exist purely to reach the sync FX helpers.
- Guardian tests that only exercise the sync code paths (they can be removed or rewritten to hit the async helpers directly).

**Prerequisites.**
- Async FX tests already cover the Frankfurter fetch/retry behaviour (`tests/currencies/test_fx_async.py`).【F:tests/currencies/test_fx_async.py†L1-L128】
- Enrichment orchestration runs via the coordinator and CLI (`tests/integration/test_enrichment_pipeline.py`, `tests/integration/test_normalization_smoketest.py`) so removing sync fallbacks no longer regresses coverage.【F:tests/integration/test_normalization_smoketest.py†L1-L200】

**Validation.**
- Execute `tests/currencies`, `tests/prices`, and the integration suites with WAL enabled.
- Trigger enrichment via Home Assistant (or `scripts/enrichment_smoketest.py`) to ensure async FX/history jobs still populate diagnostics.

**Notes.** While deleting the sync helpers, make `normalize_price_to_eur` a coroutine inside `normalization_pipeline` so `PositionSnapshot` conversions no longer jump across threads.【F:custom_components/pp_reader/data/normalization_pipeline.py†L20-L115】

### 3. Drop normalization compatibility shims (`purchase_sum`, `has_current_value`, legacy serializer rewrites)

**Scope.** Websocket handlers still reshape serialized snapshots back into the legacy coordinator schema (`purchase_sum`, camelCase fallbacks, `has_current_value` copies) even though the dashboard adapter now consumes the canonical dataclasses end to end.【F:custom_components/pp_reader/data/websocket.py†L242-L345】【F:custom_components/pp_reader/data/coordinator.py†L170-L213】

**Canonical replacement.** The backend spec defines `purchase_value`, `position_count`, provenance, and data-state metadata directly on the serialized dataclasses, and the TypeScript deserializers already prioritise those fields while keeping the old keys only for backwards compatibility during the rollout.【F:datamodel/backend-datamodel-final.md†L7-L23】【F:src/lib/api/portfolio/deserializers.ts†L212-L247】

**Legacy assets to delete.**
- `_accounts_payload`, `_portfolio_summaries`, and `_positions_payload` transformations that rename fields or strip metadata before returning websocket responses.【F:custom_components/pp_reader/data/websocket.py†L242-L345】
- Coordinator fallbacks that try to read both `purchase_sum` and `purchaseValue` from cached data structures.
- TypeScript helpers (`src/data/updateConfigsWS.ts`, `src/tabs/overview.ts`) that still branch on `purchase_sum`/`purchaseSum` or legacy field names once the backend stops emitting them.

**Prerequisites.**
- Frontend rollout checklist is complete and the store/selectors normalize canonical snapshots by default.【F:.docs/TODO_frontend_adapter_rollout.md†L1-L120】
- DOM reference and dataflow diagrams trace the canonical payloads; removing the compatibility shims just makes the implementation match the docs.【F:datamodel/dataflow_frontend.md†L18-L64】

**Validation.**
- Run `npm test`, `npm run lint:ts`, and `npm run typecheck` after dropping the compatibility keys, then rebuild the dashboard bundles.
- Execute websocket pytest suites (`tests/test_ws_portfolio_positions.py`, `tests/test_ws_portfolios_live.py`, `tests/test_ws_accounts_fx.py`) to confirm serialized payloads align with the updated assertions.

**Notes.** Update `README.md`, `README-dev.md`, and `pp_reader_dom_reference.md` to state unequivocally that `purchase_value` is the only field name exposed via backend payloads; any sensors that depended on `purchase_sum` must read the canonical snapshots instead.

### 4. Remove feature flags and config options that toggle the normalized pipelines

**Scope.** Historical feature flags (`use_staging_importer`, `enrichment_pipeline`, `metrics_pipeline`, `normalized_pipeline`, `normalized_dashboard_adapter`) previously lived in `feature_flags.py` and config-entry options. The normalized-specific toggles have now been removed so canonical ingestion/normalization always runs.

**Legacy assets to delete.**
- Flag defaults and option parsing in `feature_flags.py`, `__init__.py` (`NORMALIZED_FLAG_KEYS`), coordinator flag lookups, and diagnostics gating logic.【F:custom_components/pp_reader/__init__.py†L60-L136】【F:custom_components/pp_reader/util/diagnostics.py†L53-L99】
- Options-flow UI elements and translations that surface the toggles.
- Docs/communications that still instruct operators to flip normalization flags manually.

**Prerequisites.**
- Config-entry migrations already set the flags to `true` for every entry (see release enablement doc), so removing the options is a no-op for existing users.【F:.docs/TODO_release_enablement.md†L1-L80】
- Diagnostics now expose `normalized_payload` unconditionally; any failure surfaces as an explicit error state instead of a disabled flag gate.

**Validation.**
- Reload an existing config entry and verify options migrate cleanly with no leftover `feature_flags` dict.
- Run `tests/util/test_diagnostics_enrichment.py` and `tests/test_coordinator_contract.py` to ensure telemetry still surfaces the normalized payload.

**Notes.** Removing `use_staging_importer` must happen alongside the diff-sync cleanup (item 1) so there is never a path back to the protobuf runner.

### 5. Delete legacy database migrations and cleanup helpers

✅ **Completed.** Runtime ALTER TABLE helpers in `db_init.py`, the `data/migrations/cleanup.py` module, and the regression tests (`tests/test_migration.py`, `tests/test_price_persistence_fields.py`) have been removed. Database initialization now relies solely on the canonical schema + snapshot writers; existing installations must recreate their SQLite database from the current schema if they still depend on the legacy columns.【F:custom_components/pp_reader/data/db_init.py†L1-L180】【F:custom_components/pp_reader/data/db_schema.py†L1-L200】

### 6. Remove legacy-only tests, fixtures, and utilities

**Scope.** Several pytest modules exist solely to exercise diff-sync, legacy schema migrations, or compatibility shims—keeping them blocks deletion of the corresponding runtime code.

**Legacy assets to delete.**
- `tests/test_sync_from_pclient.py`, `tests/integration/test_sync_from_staging.py`, and fixtures under `tests/fixtures/legacy_*`.
- Migration guards (`tests/test_migration.py`, `tests/test_price_persistence_fields.py`) once the ALTER TABLE helpers disappear. ✅ Removed alongside the runtime migrations.
- Any dashboard or frontend tests that still stub the legacy payload shapes instead of the normalized snapshots.

**Prerequisites.**
- Canonical test suites already cover parser/ingestion (`tests/services/test_parser_pipeline.py`), enrichment (`tests/integration/test_enrichment_pipeline.py`), metrics (`tests/metrics`), normalization (`tests/normalization/test_pipeline.py`), websocket handlers (`tests/test_ws_*`), and frontend adapters (TypeScript tests).
- Database fixtures in `tests/common.py` now seed staging + normalized tables so no suite relies on legacy structures.

**Validation.**
- Run `pytest` with the legacy suites removed to ensure coverage stays green.
- Execute `npm test` plus the backend websocket suites to confirm no test still references deleted payload shapes.

**Notes.** Removing the test modules also shrinks CI runtime and makes it obvious that there is no supported downgrade path.

### 7. Update documentation, release notes, and scaffolding that reference the legacy path

**Scope.** `ARCHITECTURE.md`, `README-dev.md`, `.docs/backend_workstreams.md`, and several communications docs still describe `sync_from_pclient`, the `pp_reader` namespace alias, and the normalized feature flags as optional toggles.【F:ARCHITECTURE.md†L70-L150】【F:README-dev.md†L38-L55】

**Legacy assets to delete or rewrite.**
- Remove the `sync_from_pclient.py` entry from module overviews, feature flag discussions, and release announcements once the code is gone.
- Eliminate mentions of `window.__ppReader*` or other frontend fallbacks in docs and QA checklists.
- Update `CHANGELOG.md` and `.docs/qa_docs_comms.md` to highlight that no migration tooling exists and that dashboards/tests only operate on normalized payloads.

**Prerequisites.**
- Items 1–6 above ensure the documentation updates reflect reality instead of aspirational cleanup.

**Validation.**
- Cross-link docs to the datamodel specs after edits and run `markdownlint` (if configured) to keep formatting consistent.
- Ask reviewers to sanity-check that no doc instructs contributors to toggle normalization flags or run legacy migrations.

**Notes.** Once the documentation matches the new architecture, add a short “Legacy cleanup completed” section to `.docs/legacy_cleanup_strategy.md` (this file) that references the TODO breakdown created from each section above.
