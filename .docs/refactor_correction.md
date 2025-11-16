# Refactor Correction – Canonical SQLite Flow

## Goal
Document the authoritative strategy for retiring the protobuf diff-sync pipeline and moving every consumer onto the canonical ingestion → metrics → normalization layers **while keeping SQLite as the persistent store**. This file is the single source of truth for the scope, milestones, and open decisions. Every future task related to the cleanup must align with the plan below.

## Authoritative Decisions
- **Canonical storage:** Snapshot + metric tables (`portfolio_snapshots`, `account_snapshots`, `portfolio_metrics`, `account_metrics`, `security_metrics`, `metric_runs`) are the only runtime source of truth. Legacy diff-sync tables exist solely until all consumers migrate and will then be removed.
- **Transition strategy:** No interim ingestion-applier or hybrid flow. Refactor every consumer directly to the canonical layer, then delete the diff-sync code paths as soon as tests confirm the migration.

## Target Architecture
1. **Parser & Staging (existing):**
   - `parser_pipeline.async_parse_portfolio` parses every `.portfolio` change and writes typed entities into the `ingestion_*` tables via `ingestion_writer`.
   - `ingestion_metadata` continues to capture run identifiers and parser telemetry (`run_id`, file path, PP version, parsed_at, properties, parsed client metadata).
2. **Canonical Persistence (new focal point, decision locked):**
   - ✅ **Canonical storage target:** promote the snapshot + metric tables as the single runtime source of truth. After every parser run, metrics and normalization must persist their output into `portfolio_metrics`, `account_metrics`, `security_metrics`, `metric_runs`, `portfolio_snapshots`, and `account_snapshots`. All downstream consumers read from these tables (or from cached `NormalizationResult` objects), so the legacy diff-sync tables (`accounts`, `portfolios`, `transactions`, `portfolio_securities`, metadata written by `_legacy_sync_to_db`) become transitional only and will be deleted once no code references them.
   - Practical implications:
     - Implement/verify writers that populate the snapshot tables on every import (not just in-memory caches).
     - Refactor coordinator sensors, websocket handlers, price service, diagnostics, and CLI tooling to fetch data from the snapshot/metric tables.
     - After the migration, remove `_legacy_sync_to_db`, `sync_from_pclient.py`, the protobuf namespace alias, and any schema migration that only existed for the legacy tables.
3. **Metrics Engine (existing):**
   - Continues to compute `portfolio_metrics`, `account_metrics`, and `security_metrics` based on the canonical tables chosen above.
   - Every metric run persists into `metric_runs` and remains the upstream source for normalization.
4. **Normalization Pipeline (existing but to be enforced):**
   - `NormalizationResult` snapshots must be persisted into `portfolio_snapshots` and `account_snapshots` (currently defined in `db_schema.py` but unused at runtime).
   - The coordinator caches and websocket/event handlers should load data from these snapshots rather than rebuilding aggregates from scratch.
   - ✅ **Snapshot persistence format:** keep the structured column schema already defined in `db_schema.py` (explicit fields for `current_value`, `purchase_sum`, `position_count`, performance metadata, etc.). Writers must map each normalization field into its column. **Implementation detail:** this refactor can assume databases are recreated from scratch when deployed, so migrating existing installs isn’t required; simply align `db_schema.py` with the new canonical tables. For any *future* changes after this refactor lands, proper schema migrations would need to be added rather than embedding JSON payloads so snapshots stay queryable, indexable, and easy to debug via SQL.
5. **Consumers (refactor scope):**
   - **Coordinator sensors:** `PPReaderCoordinator.data` should derive accounts/portfolios/transactions from normalized/metric snapshots so sensor reads no longer touch legacy tables.
   - **Websocket commands:** `ws_get_dashboard_data`, `ws_get_portfolio_data`, `ws_get_accounts`, `ws_get_portfolio_positions`, `ws_get_security_snapshot`, and `ws_get_security_history` must read from the canonical tables or `NormalizationResult` cache.
   - **Event pushes + price service:** revaluation events should reference canonical tables, not the protobuf diff-sync results.
   - **Diagnostics/CLI:** diagnostics dumps (`util/diagnostics.py`) and CLI tools (`scripts/enrichment_smoketest.py`, `custom_components/pp_reader/cli`) must rely on canonical snapshots.
   - ✅ **Coordinator contract:** drop the legacy dependency on `coordinator.data` for data delivery. The coordinator becomes a pipeline orchestrator (parser → staging → metrics → normalization) and exposes minimal telemetry (ingestion run IDs, progress). Sensors, websocket handlers, event pushers, and other consumers must fetch their data directly from dedicated helpers that read the canonical snapshot/metric tables or cached `NormalizationResult` instances. Backwards compatibility with the legacy coordinator cache is not required; rewrite sensors/entities to use the new helpers so no runtime state depends on `self.data`.

## Work Plan
### 1. Canonical Writer Implementation
- [x] **Persist snapshots from normalization**: `_normalize_snapshot_sync` now serializes each `NormalizationResult` through `snapshot_writer.persist_normalization_result`, which writes canonical rows into `portfolio_snapshots` / `account_snapshots`. Covered by `tests/normalization/test_snapshot_writer.py`.
- [x] **Metric-table completeness**: `metrics.storage.async_store_metric_batch` now persists every run atomically, and the new `load_latest_metric_batch` / `load_metric_batch` helpers expose completed runs for consumers and tests (`tests/metrics/test_metric_storage.py`) while normalization loads batches through the shared helper.
- [x] **Snapshot/metric loader utilities**: `custom_components/pp_reader/data/normalized_store.py` exposes async helpers (`async_load_latest_snapshot_bundle`, `async_load_metric_summary`) so coordinators, sensors, and websockets can fetch canonical payloads. Backed by `tests/normalization/test_normalized_store.py`.

### 2. Consumer Refactor (Coordinator, Sensors, Websockets, Prices, Diagnostics, CLI)
- [x] **Coordinator role change**: update `PPReaderCoordinator` so `_async_update_data` only orchestrates parser → metrics → normalization, stores run IDs / timestamps, and no longer assembles `self.data` payloads. Document the new attribute contract and add tests in `tests/test_coordinator_contract.py`. ✅ Coordinator now emits `CoordinatorTelemetry` (ingestion + metrics run IDs, parser progress, normalization metadata) and the contract is covered by `tests/test_coordinator_contract.py`.
- [x] **Canonical helper adoption – sensors**: change each sensor platform (`sensor.py`, gain/purchase helpers) to call the new normalized-store helpers instead of reading `coordinator.data`. Ensure sensors subscribe to coordinator updates only for refresh triggers. ✅ Added `SnapshotSensorStore` + snapshot-backed sensor entities so account/portfolio sensors hydrate directly from persisted snapshots (`tests/sensors/test_snapshot_sensors.py`).
- [x] **Canonical helper adoption – websockets**: refactor `custom_components/pp_reader/data/websocket.py` handlers (`get_dashboard_data`, `get_portfolio_data`, `get_accounts`, `get_portfolio_positions`, `get_security_snapshot`, `get_security_history`) to build responses from the normalized-store helpers / snapshots. ✅ `ws_get_dashboard_data`, `ws_get_accounts`, and `ws_get_portfolio_data` now load `SnapshotBundle` payloads via `normalized_store` (tests updated under `tests/test_ws_*`), emitting canonical `normalized_payload` metadata so the frontend consumes the persisted snapshots directly.
- [x] **Canonical helper adoption – price service & events**: update `custom_components/pp_reader/prices/price_service.py` and `data/event_push.py` so revaluation / push payloads reuse normalized snapshots instead of the diff-sync aggregates. ✅ Revaluation + price events now load canonical snapshot bundles (`normalized_store`) for metadata and stop importing the legacy diff-sync helpers, so emitted payloads carry normalized diagnostics and positions directly from the canonical tables.
- [x] **Canonical helper adoption – diagnostics & CLI**: modify `custom_components/pp_reader/util/diagnostics.py`, `scripts/enrichment_smoketest.py`, and `custom_components/pp_reader/cli` to display/output the canonical snapshot data (including the new SQLite tables). ✅ Diagnostics load persisted snapshot bundles via `normalized_store`, and the CLI smoketest now surfaces canonical snapshot payloads + diagnostics after orchestrating parser → sync → metrics → normalization without relying on coordinator caches.

### 3. Legacy Removal
- [x] Remove `_legacy_sync_to_db`, `sync_from_pclient.py`, and `data/reader.py` protobuf shims. ✅ Coordinator telemetry no longer exposes the legacy sync branch, the obsolete protobuf parser module was removed, and the diff-sync pipeline plus its CLI/test harness were deleted so canonical ingestion + normalization remain the only runtime path.
- [x] Drop the `pp_reader` namespace alias and any feature flags guarded solely for legacy paths. ✅ The alias shim was removed from `__init__.py`, the normalized feature flags disappeared from the config flow + coordinator, and normalization now runs unconditionally without user-toggleable guards.
- [x] Remove schema definitions/migrations that only served the legacy tables once no code references them. ✅ Deleted the runtime ALTER TABLE helpers (`db_init.py`), the legacy cleanup module, and their regression tests so database initialization now relies solely on the canonical schema + snapshot writers.

### 4. Documentation & Tests
- [x] Update `.docs/TODO_cleanup_diff_sync.md`, `.docs/TODO_normalization_pipeline.md`, `.docs/backend_workstreams.md`, README, README-dev, ARCHITECTURE, and other docs to describe the canonical flow.
    - ✅ Docs now describe the parser → metrics → normalization pipeline as the sole runtime path and mark the remaining cleanup checklists accordingly.
- [x] Add/update pytest coverage covering: parser → staging, canonical writer persistence, metrics, normalization, sensors, websocket handlers, event push, CLI.
    - ✅ Suites now cover every layer: parser/staging (`tests/services/test_parser_pipeline.py`, `tests/integration/test_ingestion_writer.py`), canonical writers (`tests/normalization/test_snapshot_writer.py`), metrics (`tests/integration/test_metrics_pipeline.py`), normalization (`tests/normalization/test_pipeline.py`, `tests/normalization/test_normalized_store.py`), sensors (`tests/sensors/test_snapshot_sensors.py`), websocket handlers (`tests/test_ws_accounts_snapshot.py`, `tests/test_ws_portfolios_live.py`, `tests/test_ws_portfolio_positions.py`), event push (`tests/test_event_push.py` now asserts `_push_update` fires canonical payloads), and CLI tooling (`tests/integration/test_normalization_smoketest.py`, `tests/scripts/test_enrichment_smoketest.py`).
- [x] Update QA instructions/tests (e.g., `tests/integration/test_normalization_smoketest.py`, `scripts/enrichment_smoketest.py`, frontend smoke tests) to align with the canonical pipeline.
    - ✅ CLI smoketest now fails fast when canonical snapshots are missing or pending, the normalization smoketest covers the exit-code mapping, and TESTING.md documents the canonical-only QA workflow.
- [x] Document how to inspect canonical tables (e.g., add `scripts/diagnostics_dump.py` enhancements) and ensure they reflect what sensors/websockets emit.
    - ✅ Added `scripts/diagnostics_dump.py` plus tests so QA/Support can dump `account_snapshots` / `portfolio_snapshots` and metric previews, with README-dev/TESTING.md covering the workflow.

## Validation Strategy
- Each milestone must pass `pytest` suites covering parser, ingestion writer, canonical writer, metrics, normalization, coordinator contract, websocket/event handlers, enrichment, and CLI smoketest.
- End-to-end QA: `scripts/enrichment_smoketest.py`, `tests/integration/test_normalization_smoketest.py`, `tests/test_coordinator_contract.py`, dashboard smoke tests (`npm test`).
- Manual verification: import a `.portfolio`, inspect SQLite tables (`ingestion_*`, canonical tables, `portfolio_snapshots`, `account_snapshots`), confirm websocket payloads and sensors mirror the persisted data.
