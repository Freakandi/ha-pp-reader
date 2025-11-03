# Backend Workstreams for the Datamodel Refactor

This concept document enumerates the backend workstreams required to deliver the canonical ingestion → normalization → delivery pipeline described in [`datamodel/backend-datamodel-final.md`](../datamodel/backend-datamodel-final.md), [`datamodel/parsed_pp_data.md`](../datamodel/parsed_pp_data.md), and the backend flow chart in [`datamodel/mermaid_backend_flow.mmd`](../datamodel/mermaid_backend_flow.mmd).

## Parser Modernization
- **Target implementation.** Replace the legacy protobuf loader with a streaming parser centred around `custom_components/pp_reader/services/portfolio_file.py` and its helpers so Portfolio Performance payloads hydrate typed models before persistence. Parser domain logic continues to live under `custom_components/pp_reader/services/` and `custom_components/pp_reader/models/parsed/`.
- **Behaviour updates.**
  - Convert blocking file IO into asynchronous coroutine entry points invoked by the integration setup coordinator.
  - Validate protobuf invariants (missing UUIDs, unsupported security types) inline and raise descriptive Home Assistant errors for logging.
  - Emit structured parse events so downstream enrichment steps can detect partial imports.
- **New/updated modules.**
  - Introduce `custom_components/pp_reader/services/parser_pipeline.py` to orchestrate chunked protobuf parsing and staged writes into the coordinator queue.
  - Extend `custom_components/pp_reader/models/parsed.py` with dataclasses mirroring the canonical ingestion schema prior to normalization.
  - Update `custom_components/pp_reader/coordinators/__init__.py` to schedule the parser coroutine and surface progress telemetry to Home Assistant.
- **Legacy retirement.** Decommission `custom_components/pp_reader/pclient/__init__.py` and related synchronous import helpers once the streaming parser reaches parity. Removal is gated on:
  - Passing regression tests in `tests/integration/test_portfolio_file.py`.
  - Successful end-to-end import dry runs using sample archives in `datamodel/parsed_pp_data.md`.
  - Observing parity on snapshot payloads during manual verification sessions recorded under `.docs/live_aggregation/notes.md`.

## Enrichment Services
- **Target implementation.** Expand enrichment flows so all persisted rows are hydrated with market, FX, and metadata before metric computation. Service orchestration belongs under `custom_components/pp_reader/prices/price_service.py` and `custom_components/pp_reader/currencies/fx.py`.
- **Behaviour updates.**
  - Run Yahoo price fetches asynchronously with retry policies bounded by Home Assistant’s update coordinator to avoid blocking other refresh cycles.
  - Cache Frankfurter FX results in SQLite (`fx_rates` table) and expose cache invalidation hooks to the coordinator for forced refreshes during testing.
  - Validate upstream data freshness before persisting; mark stale inputs with `data_source=cache` for downstream payload tagging.
- **New/updated modules.**
  - Add `custom_components/pp_reader/prices/history_ingest.py` to map Yahoo candles into `historical_prices` using the schema outlined in [`datamodel/backend-datamodel-final.md`](../datamodel/backend-datamodel-final.md#security-history-pp_readerget_security_history-command-security_history-push).
  - Extend `custom_components/pp_reader/util/currency.py` with async helpers (`normalize_price_to_eur_async`) consumed by both the parser and history ingest.
  - Update `custom_components/pp_reader/data/sync_from_pclient.py` to trigger enrichment cycles immediately after each import batch.
- **Legacy retirement.** Remove `custom_components/pp_reader/prices/history.py` and the synchronous `_ensure_exchange_rates_for_dates_sync` helpers when the async ingest path satisfies:
  - FX/unit coverage validation scripts under `tests/unit/test_currency_utils.py`.
  - QA checklist confirming Yahoo and Frankfurter responses stored per [`datamodel/mermaid_backend_flow.mmd`](../datamodel/mermaid_backend_flow.mmd).
  - Dashboard smoke tests showing FX warning badges clear on first load.

## Metrics Engine
- **Target implementation.** Consolidate portfolio, account, and security metrics inside `custom_components/pp_reader/data/performance.py` and supporting aggregators so all calculations read from normalized tables.
- **Behaviour updates.**
  - Ensure metric computations operate on persisted cent values, converting to floats only during serialization.
  - Adopt cooperative scheduling for heavy aggregations via `hass.async_add_executor_job` where synchronous SQLite queries remain necessary.
  - Emit coverage metadata (e.g., `coverage_ratio`, `data_source`) consistently for tooltips, aligning with the canonical payload contract.
- **New/updated modules.**
  - Introduce `custom_components/pp_reader/metrics/portfolio_metrics.py` to encapsulate reusable metric assemblers referenced by both websocket handlers and push emitters.
  - Extend `custom_components/pp_reader/data/aggregations.py` to expose typed return objects matching the metric dataclasses defined above.
  - Update `custom_components/pp_reader/data/event_push.py` to annotate payloads with metric provenance fields before emission.
- **Legacy retirement.** Retire ad-hoc calculations in `custom_components/pp_reader/helpers/performance_legacy.py` once:
  - All tests in `tests/integration/test_websocket_payloads.py` pass using the new metric assemblers.
  - Manual totals in `datamodel/backend-datamodel-final.md` remain unchanged during acceptance verification.
  - Documentation under `.docs/live_aggregation/metrics.md` reflects the new call graph.

## Normalization Layer
- **Target implementation.** Centralize normalization logic to translate parsed protobuf objects into the relational schema defined in `custom_components/pp_reader/data/db_schema.py` and outlined in [`datamodel/backend-datamodel-final.md`](../datamodel/backend-datamodel-final.md#dashboard-snapshot-pp_readerget_dashboard_data-command-push-updates-accounts-portfolio_values-portfolio_positions-last_file_update).
- **Behaviour updates.**
  - Enforce deterministic ordering when inserting portfolios and securities to keep websocket payload diffing stable.
  - Validate referential integrity before committing transactions, rolling back batches when foreign keys fail.
  - Surface normalization telemetry (row counts, skipped entries) through Home Assistant diagnostics for troubleshooting.
- **New/updated modules.**
  - Create `custom_components/pp_reader/data/normalization_pipeline.py` coordinating parser output, enrichment hooks, and persistence writes.
  - Extend `custom_components/pp_reader/data/db_access.py` with bulk upsert helpers that operate on normalized dataclasses.
  - Update `custom_components/pp_reader/coordinators/portfolio_coordinator.py` to orchestrate normalization checkpoints and schedule downstream refreshes.
- **Legacy retirement.** Remove `_sync_*` functions scattered through `custom_components/pp_reader/data/sync_from_pclient.py` after:
  - Migration scripts backfill existing SQLite databases to the new schema (tracked under `.docs/native_price/migration.md`).
  - Integration tests in `tests/integration/test_db_sync.py` validate end-to-end normalization.
  - QA sign-off recorded in `.docs/cleanup/normalization_signoff.md`.

## Storage & Persistence
- **Target implementation.** Harden SQLite persistence to guarantee idempotent imports, resumable enrichment, and observable state transitions.
- **Behaviour updates.**
  - Introduce migration guards in `custom_components/pp_reader/data/db_schema.py` to prevent partial upgrades; emit Home Assistant repair issues when schema drift is detected.
  - Implement write-ahead logging (WAL) toggles managed by the coordinator to optimize concurrent reader access during dashboard polling.
  - Track `synced_at` timestamps for every payload emitted to Home Assistant to aid debugging.
- **New/updated modules.**
  - Add `custom_components/pp_reader/data/migrations/` package housing versioned migration scripts and verification helpers.
  - Extend `custom_components/pp_reader/data/db_access.py` with idempotent insert/update utilities that leverage SQLite UPSERT clauses.
  - Update `custom_components/pp_reader/data/event_push.py` and `custom_components/pp_reader/data/websocket.py` to persist and emit `synced_at` metadata as defined in [`datamodel/backend-datamodel-final.md`](../datamodel/backend-datamodel-final.md#live-update-envelope-panels_updated-bus).
- **Legacy retirement.** Deprecate flat-file caches under `custom_components/pp_reader/cache/` when:
  - Migration suite confirms historical imports survive a cold start without cache warmups.
  - Tests in `tests/integration/test_storage_resilience.py` demonstrate idempotent replays.
  - Operations handbook in `.docs/live_aggregation/storage.md` updates to reference the new database-first persistence path.

## Cross-Cutting Coordination
- Align workstream sequencing with the roadmap outlined in [`refactor_roadmap.md`](./refactor_roadmap.md), ensuring parser modernization lands before enrichment and normalization changes to avoid double migrations.
- Document outstanding decisions and verification evidence in `.docs/daily_close_storage/` so future updates remain traceable.
- Keep frontend contract partners informed via sync notes attached to the milestones described in `refactor_roadmap.md` section “Milestones”.
