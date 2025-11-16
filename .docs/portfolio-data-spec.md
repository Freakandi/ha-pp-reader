# Portfolio data pipeline specification

This document consolidates the ingestion → enrichment → normalization flow for
Portfolio Performance Reader. It ties together the backend data model
diagrams under `datamodel/`, the websocket normalizers, and the dashboard
fetchers so future schema changes have a single source of truth. Refer back to
[`datamodel/dataflow_backend.md`](../datamodel/dataflow_backend.md) for the
Mermaid overview and [`README-dev.md`](../README-dev.md) for contributor
workflows.

## Stage overview

| Stage | Intermediate structure | Definition |
| --- | --- | --- |
| Parsing | `PClient` protobuf tree | Produced by `parser_pipeline.async_parse_portfolio` when extracting `data.portfolio` from the uploaded archive and streaming typed entities into the ingestion writer.【F:custom_components/pp_reader/services/parser_pipeline.py†L1-L87】 |
| Persistence | SQLite staging + canonical tables (`ingestion_*`, `metric_runs`, `portfolio_metrics`, `account_metrics`, `security_metrics`, `portfolio_snapshots`, `account_snapshots`) | Populated by `ingestion_writer`, `metrics.storage`, and `snapshot_writer.persist_normalization_result` after each parser run; no diff-sync pipeline remains.【F:custom_components/pp_reader/data/ingestion_writer.py†L1-L140】【F:custom_components/pp_reader/metrics/storage.py†L1-L160】【F:custom_components/pp_reader/data/snapshot_writer.py†L1-L120】 |
| Aggregation helpers | `Account`, `Portfolio`, `PortfolioSecurity`, `HoldingsAggregation`, `AverageCostSelection`, `PerformanceMetrics`, `DayChangeMetrics` | Dataclasses and helpers in `db_access.py`, `aggregations.py`, and `performance.py` derive balances, holdings coverage, and gain metrics from the persisted snapshot.【F:custom_components/pp_reader/data/db_access.py†L14-L128】【F:custom_components/pp_reader/data/aggregations.py†L1-L120】【F:custom_components/pp_reader/data/performance.py†L1-L120】 |
| Coordinator store | `PPReaderCoordinator.data` | Legacy sensor contract containing `accounts`, `portfolios`, `transactions`, and `last_update`; populated from the aggregation helpers and reused by Home Assistant entities.【F:custom_components/pp_reader/data/coordinator.py†L134-L228】 |
| Websocket payloads | Normalisers such as `_live_portfolios_payload`, `_normalize_portfolio_positions`, `_serialise_security_snapshot` | Convert aggregation results into transport-safe dictionaries for websocket commands and `panels_updated` events.【F:custom_components/pp_reader/data/websocket.py†L492-L575】【F:custom_components/pp_reader/data/websocket.py†L280-L404】【F:custom_components/pp_reader/data/event_push.py†L1-L120】 |
| Frontend consumers | Dashboard fetchers (`fetchDashboardDataWS`, `fetchPortfoliosWS`, …) | TypeScript wrappers around the websocket API used by the Vite dashboard bundle.【F:src/data/api.ts†L1-L220】 |

## 1. Parsing and persistence

1. **Portfolio import** – `parser_pipeline.async_parse_portfolio` unwraps the
   `.portfolio` archive, strips the `PPPBV1` header when present, and
   materialises the `PClient` protobuf (`name.abuchen.portfolio.client_pb2`). It
   yields deterministic batches (`StageBatch`) that the ingestion writer uses to
   persist staging tables and emit parser progress events for the coordinator.【F:custom_components/pp_reader/services/parser_pipeline.py†L1-L140】【F:custom_components/pp_reader/data/ingestion_writer.py†L1-L140】
2. **SQLite synchronisation** – When the coordinator notices a fresher
   portfolio file (`_should_sync`), it runs the parser inside
   `async_ingestion_session`, commits the `ingestion_*` rows, and schedules
   enrichment → metrics → normalization. The metrics pipeline populates
   `portfolio_metrics`/`account_metrics`/`security_metrics` plus `metric_runs`,
   while the normalization pipeline stores canonical account/portfolio snapshot
   payloads via `snapshot_writer`. Legacy diff-sync tables are interpreted only
   through these canonical writers; there is no protobuf replay step.【F:custom_components/pp_reader/data/coordinator.py†L200-L420】【F:custom_components/pp_reader/metrics/pipeline.py†L1-L120】【F:custom_components/pp_reader/data/snapshot_writer.py†L1-L150】
3. **Backups** – `setup_backup_system` registers `pp_reader.trigger_backup_debug`
   for manual snapshots and runs scheduled backups to `backups/` every six
   hours.【F:custom_components/pp_reader/data/backup_db.py†L17-L76】

## 2. Aggregation and enrichment

### Accounts and cash balances

- `get_accounts` returns raw account rows which the coordinator normalises into
  `{uuid, name, balance, is_retired}` entries. Balances use
  `calculate_account_balance` from `logic.accounting` for consistent cent → EUR
  conversions.【F:custom_components/pp_reader/data/coordinator.py†L184-L223】

### Portfolio aggregates

- `fetch_live_portfolios` performs the authoritative aggregation for
  `get_dashboard_data` and `get_portfolio_data`. Each row includes
  `uuid`, `name`, `current_value`, `purchase_sum`, `position_count`,
  `missing_value_positions`, and `performance` produced by
  `select_performance_metrics`. `_normalize_portfolio_row` harmonises cent-based
  columns to EUR floats.【F:custom_components/pp_reader/data/db_access.py†L940-L1019】

### Portfolio positions

- `get_portfolio_positions` loads holdings for one depot, then feeds each row
  through `compute_holdings_aggregation` and `_resolve_average_cost_totals` to
  derive totals, FX-aware purchase values, and a consistent
  `AverageCostSelection`. The websocket layer applies `_normalize_portfolio_positions`
  before sending the payload to the frontend.【F:custom_components/pp_reader/data/db_access.py†L700-L892】【F:custom_components/pp_reader/data/aggregations.py†L1-L120】【F:custom_components/pp_reader/data/websocket.py†L280-L366】

### Security snapshots

- `get_security_snapshot` combines holdings (`compute_holdings_aggregation`),
  price history (`fetch_previous_close`), FX normalisation
  (`normalize_price_to_eur_sync`), and performance helpers to produce a
  snapshot containing `average_cost`, `aggregation`, `performance`,
  `market_value_eur`, and last price metadata. `_serialise_security_snapshot`
  trims internal fields and rounds prices for websocket delivery.【F:custom_components/pp_reader/data/db_access.py†L480-L632】【F:custom_components/pp_reader/data/performance.py†L59-L120】【F:custom_components/pp_reader/data/websocket.py†L200-L279】

### Security history

- `iter_security_close_prices` yields ordered `(date, close, close_raw)` tuples
  from `historical_prices`, applying range filters for the detail chart. The
  websocket handler preserves both normalised and raw closes so the dashboard
  can fall back when FX data is missing.【F:custom_components/pp_reader/data/db_access.py†L280-L360】【F:custom_components/pp_reader/data/websocket.py†L798-L876】

### Event push bridge

- `event_push._compact_portfolio_values_payload` and
  `_compact_portfolio_positions_payload` repack on-demand aggregates into
  lightweight `panels_updated` events while keeping `average_cost`,
  `aggregation`, and `performance` payloads intact.【F:custom_components/pp_reader/data/event_push.py†L1-L168】

## 3. Normalisation and delivery

1. **Coordinator cache** – Sensors still read from
   `PPReaderCoordinator.data`, meaning changes to the coordinator contract
   require synchronised updates to `sensor.py` and the websocket fallbacks.【F:custom_components/pp_reader/data/coordinator.py†L134-L228】【F:custom_components/pp_reader/sensor.py†L1-L64】
2. **Websocket commands** – `_live_portfolios_payload` prefers live aggregates
   and falls back to the coordinator snapshot, `_normalize_portfolio_positions`
   shapes holdings, and `_serialise_security_snapshot` packages security
   details. All handlers are wrapped with `_wrap_with_loop_fallback` so tests
   can call them without an active event loop.【F:custom_components/pp_reader/data/websocket.py†L492-L575】【F:custom_components/pp_reader/data/websocket.py†L280-L366】【F:custom_components/pp_reader/data/websocket.py†L200-L279】【F:custom_components/pp_reader/data/websocket.py†L405-L483】
3. **Frontend fetchers** – The dashboard calls the websocket endpoints via
   `fetchDashboardDataWS`, `fetchPortfoliosWS`, `fetchPortfolioPositionsWS`,
   `fetchSecuritySnapshotWS`, `fetchSecurityHistoryWS`, and related helpers in
   `src/data/api.ts`. These wrappers resolve the panel `entry_id`, enforce
   required parameters, and expose typed response contracts consumed by the
   tabs and stores.【F:src/data/api.ts†L80-L220】

## 4. API surface inventory

### Home Assistant entities

- `PortfolioAccountSensor` – one sensor per active account, exposing EUR
  balances and `letzte_aktualisierung` metadata.【F:custom_components/pp_reader/sensors/depot_sensors.py†L14-L56】
- `PortfolioDepotSensor` – one sensor per portfolio showing the aggregated
  market value plus position counts.【F:custom_components/pp_reader/sensors/depot_sensors.py†L59-L110】
- `PortfolioPurchaseSensor` – mirrors the per-portfolio purchase sum to surface
  invested capital.【F:custom_components/pp_reader/sensors/purchase_sensors.py†L1-L56】
- `PortfolioGainAbsSensor` / `PortfolioGainPctSensor` – compute unrealised gains
  on top of the depot and purchase sensors using `select_performance_metrics`.【F:custom_components/pp_reader/sensors/gain_sensors.py†L1-L102】

### Services

- `pp_reader.trigger_backup_debug` – manual entry point for the six-hour backup
  cycle registered by `setup_backup_system`. It copies the SQLite file into
  `<db_dir>/backups/` after running an integrity check.【F:custom_components/pp_reader/data/backup_db.py†L17-L116】【F:custom_components/pp_reader/services.yaml†L1-L4】

### Websocket endpoints

All websocket commands live in `custom_components.pp_reader.data.websocket` and
are registered from `__init__.py` during setup.【F:custom_components/pp_reader/__init__.py†L356-L377】

| Command | Purpose | Key payload fields |
| --- | --- | --- |
| `pp_reader/get_dashboard_data` | Bootstraps the dashboard with accounts, live portfolios, transactions, and the last import timestamp.【F:custom_components/pp_reader/data/websocket.py†L532-L615】 | `accounts[]`, `portfolios[]`, `last_file_update`, `transactions[]` |
| `pp_reader/get_accounts` | Returns FX-aware account balances for the sidebar.【F:custom_components/pp_reader/data/websocket.py†L621-L639】 | `accounts[]` |
| `pp_reader/get_last_file_update` | Provides the formatted import timestamp with optional `entry_id` resolution.【F:custom_components/pp_reader/data/websocket.py†L641-L720】 | `last_file_update` |
| `pp_reader/get_portfolio_data` | Delivers current portfolio aggregates (same shape as dashboard payload).【F:custom_components/pp_reader/data/websocket.py†L722-L775】 | `portfolios[]` |
| `pp_reader/get_portfolio_positions` | Lazy-loads holdings for one portfolio including aggregation metadata.【F:custom_components/pp_reader/data/websocket.py†L960-L1052】 | `portfolio_uuid`, `positions[]`, optional `error` |
| `pp_reader/get_security_snapshot` | Combines holdings, last price, FX, and performance metrics for a single security.【F:custom_components/pp_reader/data/websocket.py†L899-L959】 | `snapshot.{average_cost, aggregation, performance, market_value_eur, last_price}` |
| `pp_reader/get_security_history` | Streams historic closes with optional range filters for the security detail chart.【F:custom_components/pp_reader/data/websocket.py†L798-L876】 | `prices[]`, optional `start_date`, `end_date` |

### Dashboard fetchers

- `fetchDashboardDataWS`, `fetchAccountsWS`, `fetchLastFileUpdateWS`,
  `fetchPortfoliosWS`, `fetchPortfolioPositionsWS`, `fetchSecuritySnapshotWS`,
  and `fetchSecurityHistoryWS` mirror the websocket commands for the UI. Each
  helper enforces `entry_id` resolution through `getEntryId` and returns the
  typed interfaces defined at the top of `src/data/api.ts`.【F:src/data/api.ts†L40-L220】

## 5. Migration watchpoints

1. **Config flow contract** – `PortfolioConfigFlow` (version `1`) expects a
   `.portfolio` path, optionally derives the database location, and stores both
   `file_path` and `db_path`. The options flow validates
   `price_update_interval_seconds ≥ 300` and exposes `enable_price_debug`; both
   feed into polling and logging toggles during setup.【F:custom_components/pp_reader/config_flow.py†L1-L210】
2. **Coordinator data contract** – `PPReaderCoordinator.data` powers all
   sensors and websocket fallbacks. Additive keys must be mirrored across
   `sensor.py`, `_live_portfolios_payload`, and `event_push` to avoid drift.【F:custom_components/pp_reader/data/coordinator.py†L134-L228】【F:custom_components/pp_reader/data/websocket.py†L492-L575】【F:custom_components/pp_reader/data/event_push.py†L1-L168】
3. **Aggregation helpers** – Changes to `HoldingsAggregation`,
   `AverageCostSelection`, or `select_performance_metrics` ripple into
   `get_portfolio_positions`, `get_security_snapshot`, and the frontend’s typed
   payloads. Update this spec and regenerate affected tests when altering these
   helpers.【F:custom_components/pp_reader/data/aggregations.py†L1-L120】【F:custom_components/pp_reader/data/db_access.py†L480-L892】【F:src/data/api.ts†L40-L220】
4. **Websocket payload shape** – Keep `_normalize_portfolio_positions`,
   `_serialise_security_snapshot`, and TypeScript interfaces in sync whenever
   new fields are added. The dashboard relies on these names for rendering and
   caching keys.【F:custom_components/pp_reader/data/websocket.py†L200-L366】【F:src/data/api.ts†L40-L220】
5. **Event payload size** – `event_push` truncates updates above 32 KiB; when
   introducing new fields, confirm the compactors still respect the limit to
   avoid dropped `panels_updated` signals.【F:custom_components/pp_reader/data/event_push.py†L1-L120】

Maintain this document whenever the ingestion pipeline, websocket payloads, or
frontend contracts evolve so downstream consumers keep a single, authoritative
reference.
