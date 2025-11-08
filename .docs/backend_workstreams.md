# Backend Workstreams for the Datamodel Refactor

This concept document enumerates the backend workstreams required to deliver the canonical ingestion → normalization → delivery pipeline described in [`datamodel/backend-datamodel-final.md`](../datamodel/backend-datamodel-final.md), [`datamodel/parsed_pp_data.md`](../datamodel/parsed_pp_data.md), and the backend flow chart in [`datamodel/mermaid_backend_flow.mmd`](../datamodel/mermaid_backend_flow.mmd).

## Parser Modernization
- **Target implementation.** Replace the legacy protobuf loader with a streaming parser centred around `custom_components/pp_reader/services/parser_pipeline.py` so Portfolio Performance payloads hydrate typed models and persist into dedicated ingestion tables prior to normalization. Parser domain logic continues to live under `custom_components/pp_reader/services/` and `custom_components/pp_reader/models/parsed.py`, exposing ingestion metadata for diagnostics and CLI workflows.
- **Behaviour updates.**
  - Convert blocking file IO into asynchronous coroutine entry points invoked by the integration setup coordinator.
  - Validate protobuf invariants (missing UUIDs, unsupported security types) inline and raise descriptive Home Assistant errors for logging.
  - Emit structured progress/telemetry events (dispatcher + HA bus) and populate staging metadata so downstream enrichment, diagnostics, and CLI tooling can inspect parser runs.
  - Reset and refill ingestion staging tables on every import to guarantee idempotent persistence before legacy normalization executes.
- **New/updated modules.**
  - Introduce `custom_components/pp_reader/services/parser_pipeline.py` to orchestrate streaming protobuf parsing, validation, and progress callbacks while batching writes.
  - Extend `custom_components/pp_reader/models/parsed.py` with dataclasses mirroring the canonical ingestion schema prior to normalization.
  - Add `custom_components/pp_reader/data/ingestion_writer.py` and `custom_components/pp_reader/data/ingestion_reader.py` as the staging persistence/loader layer consumed by legacy sync and diagnostics.
  - Update `custom_components/pp_reader/data/coordinator.py` to execute the streaming parser, manage staging lifecycle, and propagate dispatcher progress alongside diagnostics from `custom_components/pp_reader/util/diagnostics.py`.
  - Provide CLI parity via `custom_components/pp_reader/cli/import_portfolio.py` (and `__main__.py`) so local imports share the Home Assistant pipeline (`scripts/import_portfolio.py` wrapper).
- **Legacy retirement.** Decommission `custom_components/pp_reader/pclient/__init__.py` and related synchronous import helpers once the streaming parser reaches parity. Removal is gated on:
  - Passing regression suites in `tests/services/test_parser_pipeline.py`, `tests/integration/test_ingestion_writer.py`, and `tests/integration/test_sync_from_staging.py`.
  - Successful end-to-end import dry runs using sample archives in `datamodel/parsed_pp_data.md` via both coordinator and CLI flows.
  - Observing payload parity and staging metrics through the diagnostics surface and dispatcher telemetry during manual verification sessions recorded under `.docs/live_aggregation/notes.md`.

## Enrichment Services
- **Current implementation.** Enrichment now runs end-to-end: asynchronous FX retrieval in `custom_components/pp_reader/currencies/fx.py` hydrates the `fx_rates` cache with provenance metadata, while Yahoo history ingestion flows through `custom_components/pp_reader/prices/history_queue.py` and `custom_components/pp_reader/prices/history_ingest.py` before persisting into `historical_prices`.
- **Operational behaviour.**
  - `ensure_exchange_rates_for_dates` fetches Frankfurter data with retry/backoff, persists via `FxRateRecord` upserts, and deduplicates warning logs when rates remain unavailable.
  - `HistoryQueueManager` derives symbols from parsed securities, plans jobs into `price_history_queue`, and coordinates executor-backed fetches plus persistence through `fetch_history_for_jobs`.
  - `price_service.initialize_price_state` and the surrounding task orchestration in `price_service` schedule enrichment cycles, push dispatcher telemetry via `data/event_push.py`, and trigger `revaluation.revalue_after_price_updates` once prices land.
- **Primary modules.**
  - `custom_components/pp_reader/currencies/fx.py` – discovery of active currencies, async Frankfurter client, cache loaders (`load_cached_rate_records`), and sync fallbacks for legacy code paths.
  - `custom_components/pp_reader/prices/history_queue.py` – queue lifecycle (`plan_jobs`, `run_queue_once`), job status transitions, and candle scaling before writes.
  - `custom_components/pp_reader/prices/history_ingest.py` – Yahoo history job model, batching helpers, and executor bridge used by the queue manager.
  - `custom_components/pp_reader/prices/yahooquery_provider.py` & `prices/provider_base.py` – shared fetch interface, chunk sizing, and provider health flags.
  - `custom_components/pp_reader/prices/price_service.py` – Home Assistant integration surface (locking, scheduling, diagnostics) that ties enrichment output back into coordinator consumers.
- **Validation.** Regression coverage spans `tests/currencies/test_fx_async.py` (Frankfurter fetch/cache), `tests/prices/test_history_ingest.py` and `tests/prices/test_history_queue.py` (queue planning, candle persistence), plus `tests/integration/test_enrichment_pipeline.py` for coordinator wiring.
- **Remaining cleanup.** Decommission synchronous currency normalization once all consumers move to the async FX helpers, and prune stubbed fallbacks that currently guard Yahoo provider imports.

## Metrics Engine
- **Target implementation.** The metric engine now persists every computation inside `metric_runs`, `portfolio_metrics`, `account_metrics`, and `security_metrics` so downstream consumers only read structured rows that describe gain, coverage, and provenance metadata.
- **Behaviour updates.**
  - `custom_components/pp_reader/metrics/pipeline.py` orchestrates end-to-end runs via `async_refresh_all`, emitting progress callbacks while delegating to scope-specific calculators.
  - `custom_components/pp_reader/metrics/{portfolio,accounts,securities}.py` aggregate normalized tables, apply FX data, and reuse rounding helpers from `metrics/common.py` to keep payload math deterministic.
  - `custom_components/pp_reader/metrics/storage.py` batches inserts through `MetricBatch`, writing all three metric tables plus `metric_runs` within a single transaction before the coordinator or CLI emits dispatcher events.
  - Loader APIs in `custom_components/pp_reader/data/db_access.py` expose typed `*MetricRecord` dataclasses that websocket handlers and diagnostics rely on instead of recomputing values ad hoc.
  - `custom_components/pp_reader/data/event_push.py` and `custom_components/pp_reader/data/websocket.py` retrieve persisted metrics (including coverage/provenance fields) to populate Home Assistant payloads without touching legacy helpers.
- **New/updated modules.**
  - `custom_components/pp_reader/metrics/pipeline.py`, `metrics/storage.py`, and the metric calculators (`metrics/portfolio.py`, `metrics/accounts.py`, `metrics/securities.py`) that encapsulate orchestration, persistence, and computation responsibilities.
  - Schema definitions for `metric_runs`, `portfolio_metrics`, `account_metrics`, and `security_metrics` inside `custom_components/pp_reader/data/db_schema.py`, plus CRUD helpers/dataclasses in `custom_components/pp_reader/data/db_access.py`.
  - Shared rounding/coverage helpers in `custom_components/pp_reader/metrics/common.py`, which supersede the previous `data/performance.py` implementation.
  - Coordinator hooks (`custom_components/pp_reader/data/coordinator.py`) trigger the metric pipeline once enrichment finishes, while diagnostics (`custom_components/pp_reader/util/diagnostics.py`) surface the latest `metric_runs` metadata.
- **Legacy retirement.** Remove the shim in `custom_components/pp_reader/data/performance.py` and any direct Coordinator/WebSocket calls to the deprecated performance helpers after:
  - All websocket/event payload suites read from the persisted metric tables without fallback branches.
  - Manual acceptance against `datamodel/backend-datamodel-final.md` confirms parity with the stored metrics.
  - Documentation in `.docs/live_aggregation/metrics.md` highlights the pipeline (`metrics/pipeline.py` → `metrics/storage.py`) as the only supported computation path.

## Normalization Layer
- **Current implementation.** `custom_components/pp_reader/data/normalization_pipeline.py` now assembles canonical `NormalizationResult` payloads after every metrics run, serializes them through `serialize_*` helpers, and persists the JSON into the new `portfolio_snapshots` and `account_snapshots` tables defined in `data/db_schema.py`. These snapshots mirror the payload contract in [`datamodel/backend-datamodel-final.md`](../datamodel/backend-datamodel-final.md#dashboard-snapshot-pp_readerget_dashboard_data-command-push-updates-accounts-portfolio_values-portfolio_positions-last_file_update) and are keyed by `metric_run_uuid`, making websocket/event replays deterministic after restarts.
- **Behaviour updates.**
  - WebSocket handlers (`data/websocket.py`) and dispatcher/event publishers (`data/event_push.py`) read from the serialized snapshots, emitting consistent `data_type` values (`accounts`, `portfolio_values`, `portfolio_positions`, `security_snapshot`, `security_history`) over Home Assistant's `EVENT_PANELS_UPDATED` stream.
  - CLI helpers (`scripts/enrichment_smoketest.py`, `custom_components/pp_reader/cli`) and diagnostics (`util/diagnostics.py`) reuse the same `async_normalize_snapshot` entry point; diagnostics expose the cached payload under `normalized_payload` so QA can diff backend vs. frontend.
  - Coordinator orchestration (`data/coordinator.PPReaderCoordinator`) waits for metrics completion, hydrates the normalization cache (feature flag `normalized_pipeline`), and pushes incremental events so sensors and dashboard panels never fall back to legacy `_normalize_*` helpers.
- **New/updated modules.**
  - Snapshot schema (`portfolio_snapshots`, `account_snapshots`) and migrations inside `custom_components/pp_reader/data/db_schema.py` plus loader helpers in `data/db_access.py`.
  - `custom_components/pp_reader/data/normalization_pipeline.py` exporting dataclasses, serialization helpers, and async entry points for Home Assistant as well as CLI callers.
  - Coordinator glue in `custom_components/pp_reader/data/coordinator.py` that caches the serialized result per entry_id and publishes updates through `_push_update`.
- **Legacy retirement.** Remaining `_sync_*` vestiges inside `custom_components/pp_reader/data/sync_from_pclient.py` are now bypassed by snapshots, but keep the fallbacks until:
  - Migration scripts confirm older databases are backfilled with snapshot rows (tracked in `.docs/native_price/migration.md`).
  - Regression suites (`tests/integration/test_db_sync.py`, `tests/normalization/test_pipeline.py`, and websocket/event tests) keep parity across imports.
  - QA sign-off is logged in `.docs/cleanup/normalization_signoff.md`, after which the legacy helpers can be dropped entirely.

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
