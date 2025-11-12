# Architecture – Portfolio Performance Reader (`pp_reader`)

## Table of contents
1. [Overview](#overview)
2. [Code structure](#code-structure)
3. [Packaging & generated assets](#packaging--generated-assets)
4. [External dependencies & services](#external-dependencies--services)
5. [Home Assistant integration layer](#home-assistant-integration-layer)
6. [Configuration](#configuration)
7. [Data ingestion & persistence](#data-ingestion--persistence)
8. [Event propagation](#event-propagation)
9. [Price service](#price-service)
10. [Foreign exchange helper](#foreign-exchange-helper)
11. [WebSocket API & frontend](#websocket-api--frontend)
12. [Domain model snapshot](#domain-model-snapshot)
13. [Control flow summary](#control-flow-summary)
14. [Error handling & observability](#error-handling--observability)
15. [Performance & concurrency](#performance--concurrency)
16. [Security & data handling](#security--data-handling)
17. [Testing strategy](#testing-strategy)
18. [Extensibility & architectural decisions](#extensibility--architectural-decisions)
19. [Known gaps & open questions](#known-gaps--open-questions)
20. [Glossary](#glossary)

<!-- DIAGRAMS-PLACEHOLDER -->

---

## Overview
The custom component `pp_reader` integrates a local Portfolio Performance (`.portfolio`) file into Home Assistant. The integration:

- Parses Portfolio Performance protobuf data with the vendored schema and mirrors it into a dedicated SQLite database placed next to Home Assistant’s configuration.
- Exposes accounts, portfolios, transactions, and derived gains to Home Assistant sensors and a custom dashboard panel.
- Streams price updates from Yahoo Finance through `yahooquery`, persists the latest quotes, revalues affected portfolios, and emits compact Home Assistant events for live UI updates.
- Provides automated six-hour backups plus a debug service for on-demand snapshots and integrity recovery.

Key responsibilities are split across five areas:

1. **Home Assistant lifecycle** – config flow, setup, option handling, and entity registration.
2. **Data ingestion** – file parsing, diff sync to SQLite, runtime schema migrations, and aggregation helpers.
3. **Price orchestration** – background task that updates quotes, tracks fetch health, and triggers recalculations.
4. **Foreign exchange** – on-demand loading and caching of EUR exchange rates when non-EUR accounts exist.
5. **Presentation** – WebSocket API, compact event push helpers, and dashboard assets for drill-down views.

---

## Code structure
Repository folders relevant for the runtime integration:

```text
custom_components/pp_reader/
  __init__.py                # Integration entry points, namespace alias, scheduler wiring
  manifest.json              # Home Assistant metadata and runtime requirements
  const.py                   # Shared constants (domain, config keys)
  config_flow.py             # Config flow and options flow implementation
  sensor.py                  # Sensor platform bootstrap
  services.yaml              # Service descriptions exposed to Home Assistant
  feature_flags.py           # Feature flag resolution helpers (backend entry store)
  util/
    __init__.py              # Executor helper resilient to coroutine-returning callables
    currency.py              # Shared rounding and FX normalisation helpers for EUR conversion
  name/
    __init__.py              # Namespace package for vendored Portfolio Performance schema
    abuchen/portfolio/
      client.proto           # Upstream schema (for reference / regeneration)
      client_pb2.py          # Generated protobuf module consumed at runtime
      client_pb2.pyi         # Type hints for the generated module
  currencies/
    fx.py                    # Frankfurter FX helper (EUR conversions)
  data/
    __init__.py
    aggregations.py          # Holdings aggregation + AverageCostSelection dataclasses
    backup_db.py             # Periodic backups + service registration
    coordinator.py           # DataUpdateCoordinator for sensor snapshots
    db_access.py             # Query helpers used by coordinator & WebSockets
    db_init.py               # Database bootstrap + runtime migrations
    db_schema.py             # CREATE TABLE definitions & indices
    event_push.py            # Event compaction + EVENT_PANELS_UPDATED helpers
    performance.py           # Gain/day-change computation + payload merging helpers
    reader.py                # .portfolio parser (protobuf extraction)
    sync_from_pclient.py     # File → SQLite diff synchronisation + event push
    websocket.py             # WebSocket commands & payload builders
  logic/
    accounting.py            # Account balance aggregation
    portfolio.py             # Portfolio valuation helpers
    securities.py            # Holdings aggregation utilities for prices
    validators.py            # Data validation helpers used by accounting
  prices/
    __init__.py
    price_service.py         # Price cycle orchestration and change detection
    provider_base.py         # Provider protocol and Quote dataclass
    yahooquery_provider.py   # Yahoo Finance implementation (yahooquery)
    revaluation.py           # Partial portfolio revaluation after price changes
    symbols.py               # Active symbol discovery from SQLite
  sensors/
    depot_sensors.py         # Portfolio value sensors
    gain_sensors.py          # Gain sensors derived from other sensor data
    purchase_sensors.py      # Purchase sum sensors
  translations/              # HA UI strings (de/en)
  www/pp_reader_dashboard/
    panel.js                 # Registers <pp-reader-panel>, loads hashed Vite bundles or dev server
    js/                      # Vite build output (hashed browser bundles + stable dashboard.module.js)
    css/*.css                # Styling for panel layout
```

Support tooling lives outside of the integration (for example `scripts/`, `tests/`, `TESTING.md`).

TypeScript sources for the dashboard reside in `src/` and are bundled with Vite into the hashed assets above. Supporting build scripts live under `scripts/` (see [`scripts/update_dashboard_module.mjs`](scripts/update_dashboard_module.mjs)).【F:package.json†L1-L31】【F:scripts/update_dashboard_module.mjs†L1-L70】

Utility helpers live in `custom_components/pp_reader/util/`, which exposes `async_run_executor_job` alongside the shared currency rounding helpers consumed by aggregation, database, websocket, and price modules.【F:custom_components/pp_reader/util/__init__.py†L1-L29】【F:custom_components/pp_reader/util/currency.py†L1-L180】 Aggregation-focused modules `data/aggregations.py` and `metrics/common.py` hold the `HoldingsAggregation`/`AverageCostSelection` dataclasses plus the gain and day-change calculators reused across coordinators, database access, websocket handlers, and event push compaction.【F:custom_components/pp_reader/data/aggregations.py†L1-L200】【F:custom_components/pp_reader/metrics/common.py†L1-L213】

---

## Packaging & generated assets

- `custom_components.pp_reader.__init__` registers the module under the alias `pp_reader` to satisfy legacy import paths used by the data sync helpers. Any new module must work through the canonical `custom_components.pp_reader` package; only compatibility shims should use the alias.
- The Portfolio Performance protobuf schema lives in `custom_components/pp_reader/name/abuchen/portfolio/`. `client_pb2.py` is generated from `client.proto` and ships with a matching `.pyi` stub for typing. `client_pb2.py.bak` is retained solely as an upstream backup reference and is not imported at runtime.
- The generated protobuf module is imported directly by `data.reader` and by the sync layer. Regeneration uses `protoc` with Python codegen and must preserve the namespace hierarchy to keep imports stable.
- Dashboard assets are authored in TypeScript (`src/`) and compiled with Vite (`npm run build`). The build emits hashed browser bundles in `www/pp_reader_dashboard/js/` plus a stable `dashboard.module.js` entry that `panel.js` loads, with an optional dev-server override for live reloading.【F:package.json†L1-L31】【F:custom_components/pp_reader/www/pp_reader_dashboard/panel.js†L1-L163】
- Release builds must run `npm ci && npm run build && node scripts/update_dashboard_module.mjs` (clearing `node_modules/.vite` when dependencies change) and then `scripts/prepare_main_pr.sh dev main` so the hashed bundles checked into `custom_components/pp_reader/www/pp_reader_dashboard/js/` match the version shipped to HACS.

---

## External dependencies & services

| Dependency | Source | Purpose | Notes |
|------------|--------|---------|-------|
| `homeassistant==2025.2.4` | `requirements.txt` | Development container baseline to run HA locally | Provided by HA core in production. |
| `protobuf>=4.25.0` | `manifest.json` | Parse `.portfolio` protobuf payloads | Required for `data/reader.py`. |
| `yahooquery==2.4.1` | `manifest.json` | Fetch latest quotes from Yahoo Finance | Depends on `lxml`; exposes a batch API used by the price service. |
| `lxml>=5.2.1` | `manifest.json` | Ensures Python 3.13 compatible wheels for yahooquery | Pulled explicitly after build failures with older indirect pins. |
| `pandas>=2.2.0`, `numpy>=1.26.0` | `manifest.json` | Reserved for future analytics and compatibility with upstream Portfolio Performance tooling | Currently not imported; retained to avoid breaking environments expecting them. |
| `aiohttp` | Home Assistant core dependency | HTTP client for Frankfurter FX API | Used indirectly in `currencies/fx.py`. |
| Frankfurter API (`https://api.frankfurter.app`) | Runtime service | Provides EUR exchange rates | Only queried when non-EUR accounts require conversions. |
| Yahoo Finance | Runtime service via yahooquery | Provides market prices | Only last price is stored (no intraday history). |

Developer tooling includes `ruff` and scripts under `scripts/` for linting and local Home Assistant startup.

---

## Home Assistant integration layer
### Manifest
`manifest.json` declares domain `pp_reader`, version `0.14.0`, the runtime dependencies above, and marks the integration as `local_polling` with a config flow.【F:custom_components/pp_reader/manifest.json†L1-L24】 The `loggers` array exposes the base integration plus the core price namespaces (`prices`, `prices.price_service`, `prices.yahooquery_provider`); `_apply_price_debug_logging` extends the same log level to `prices.revaluation`, `prices.symbols`, and `prices.provider_base` using the `PRICE_LOGGER_NAMES` list so diagnostics stay consistent across all helpers.【F:custom_components/pp_reader/manifest.json†L1-L24】【F:custom_components/pp_reader/__init__.py†L56-L66】【F:custom_components/pp_reader/__init__.py†L384-L407】

### Setup lifecycle

- `async_setup` (`__init__.py`)
  - Registers the dashboard static files under `/pp_reader_dashboard` via `StaticPathConfig` so cache headers remain disabled for development refreshes.
  - Registers WebSocket commands from `data.websocket`.
  - Ensures a lightweight placeholder panel exists so `/ppreader` routes never 404 before config entries register their own panel instance.【F:custom_components/pp_reader/__init__.py†L246-L320】

- `async_setup_entry`
  - Initializes the SQLite schema via `data.db_init.initialize_database_schema` for the configured database path.
  - Ensures the runtime migration for price columns runs alongside schema creation.
  - Applies the price debug logging option before creating runtime tasks.
  - Creates and stores a `PPReaderCoordinator` instance (see [Data ingestion](#data-ingestion--persistence)).
  - Forwards platforms (currently sensors only).
  - Initializes price state (`prices.price_service.initialize_price_state`), schedules the recurring interval, and triggers the initial asynchronous cycle.
  - Stores feature flag overrides (`store["feature_flags"]`) and normalised history retention preferences (`store["history_retention_years"]`) so shared helpers can inspect them during runtime reloads.【F:custom_components/pp_reader/__init__.py†L98-L160】【F:custom_components/pp_reader/__init__.py†L360-L401】
  - Registers an options update listener that reinitializes the price cycle when options change.
  - Registers the backup system (`data.backup_db.setup_backup_system`). The helper delays service registration until Home Assistant has fully started.
  - Registers the custom panel `<pp-reader-panel>` with a cache-busting query string if it is not already active.

- `async_unload_entry`
  - Unloads sensor entities.
  - Cancels the scheduled price interval task, removes `price_*` keys from `hass.data`, and clears domain state when the last entry unloads.

### `hass.data` contract
For each config entry `entry_id`, `hass.data[DOMAIN][entry_id]` stores:

```python
{
    "file_path": str,         # Source .portfolio file
    "db_path": Path,          # SQLite database file
    "coordinator": PPReaderCoordinator,
    "feature_flags": dict[str, bool],
    "history_retention_years": int | None,
    "price_lock": asyncio.Lock,
    "price_task_cancel": Callable | None,
    "price_interval_applied": int | None,
    "price_error_counter": int,
    "price_currency_drift_logged": set[str],
    "price_empty_symbols_logged": bool,
    "price_empty_symbols_skip_logged": bool,
    "price_symbols": list[str] | None,
    "price_symbol_to_uuids": dict[str, list[str]] | None,
    "price_zero_quotes_warn_ts": float | None,
    "price_provider_disabled": bool | None,
    "price_last_symbol_count": int,
    "price_last_cycle_meta": dict[str, Any],  # Reserved for diagnostics (currently unused)
}
```

`initialize_price_state` sets up the long-lived locks, error counters, and log throttling flags, while `_run_price_cycle` populates `price_symbols` and `price_symbol_to_uuids` on demand the first time active tickers are discovered.【F:custom_components/pp_reader/prices/price_service.py†L81-L107】【F:custom_components/pp_reader/prices/price_service.py†L777-L804】

Keys prefixed with `price_` are initialised lazily by `initialize_price_state` and the cycle logic. Options reload and unload cleanup routines remove every `price_*` key before rescheduling to avoid stale state.

### Config flow & options flow
- Config flow (`config_flow.PortfolioConfigFlow`)
  - Step `user`: validate the `.portfolio` path and optionally choose to use the default database directory (`pp_reader_data/<stem>.db` underneath the Home Assistant config directory via `hass.config.path`). Context state (`PPReaderConfigFlowContext`) persists the choice between steps.
  - Step `db_path`: allow a custom directory for the SQLite file when the default is not used.
  - Validation relies on `data.reader.parse_data_portfolio` (protobuf parser) to ensure the file is readable before creating the entry.
- Options flow exposes:
  - `price_update_interval_seconds` (>=300 seconds, default 900). Values below the minimum fall back to the default.
  - `enable_price_debug` toggles the effective log level for all price modules.
  - Feature flags `normalized_pipeline` and `normalized_dashboard_adapter` are persisted per entry but default to `true` for every install (new or migrated). Reloading an entry enforces the defaults so the coordinator, WebSocket handlers, and dashboard always consume the canonical normalization payloads—legacy adapters were removed as part of the GA rollout.
  - Option changes trigger `_async_reload_entry_on_update`, which resets in-memory state, reschedules the interval, reapplies debug logging, and kicks off an immediate cycle.
  - Advanced overrides may include `history_retention_years`; `_normalize_history_retention_years` accepts positive integers or `"none"`/`"unlimited"` (case-insensitive) and stores `None` for unlimited retention. The option is persisted even though pruning is not yet enforced.【F:custom_components/pp_reader/__init__.py†L114-L149】

### Sensor platform
`sensor.py` instantiates coordinator-based entities:

- `PortfolioAccountSensor` for each active account.
- `PortfolioDepotSensor` and `PortfolioPurchaseSensor` per portfolio.
- `PortfolioGainAbsSensor` and `PortfolioGainPctSensor` derived from the value/purchase sensors.

Sensors read from the coordinator snapshot (`coordinator.data`) to remain compatible with existing Home Assistant entity contracts.

### Services
`data.backup_db.setup_backup_system` registers `pp_reader.trigger_backup_debug`. The service runs the same backup cycle that the periodic job executes (every six hours) and logs success or failures. Registration is deferred until Home Assistant has started to avoid missing the service in early boot phases.

---

## Configuration

| Option | Source | Default | Validation | Impact |
|--------|--------|---------|------------|--------|
| `file_path` | Config flow | — | Must point to an existing `.portfolio` file | Defines the data source. |
| `db_path` | Config flow | `pp_reader_data/<portfolio>.db` (resolved inside the Home Assistant config directory) | Directory must exist and be writable | Defines SQLite storage location. |
| `price_update_interval_seconds` | Options flow | 900 | Minimum 300 | Reschedules the recurring price fetch. |
| `enable_price_debug` | Options flow | `false` | Boolean | Elevates price logger levels to DEBUG and is applied immediately. |
| `feature_flags.normalized_pipeline` / `feature_flags.normalized_dashboard_adapter` | Options flow | `true` | Boolean | Must remain enabled; reloads force them back on so sensors, events, and the dashboard always read from the normalization snapshot (legacy adapters removed). |
| `history_retention_years` | Advanced options override | `null` (unlimited) | Positive integer or keywords `none`/`unlimited` | Stored for planned pruning logic; currently informational.【F:custom_components/pp_reader/__init__.py†L114-L149】 |

No credentials are required; Yahoo Finance quotes are public and the FX helper only fetches EUR rates.

---

## Data ingestion & persistence
### Portfolio parsing and synchronization
- `data.reader.parse_data_portfolio` extracts `data.portfolio` from the `.portfolio` ZIP, removes the `PPPBV1` prefix, and parses it into `client_pb2.PClient` from the vendored schema package.
- `data.sync_from_pclient.sync_from_pclient` takes the protobuf payload and applies inserts/updates/deletes across SQLite tables. The function updates metadata such as `last_file_update`, refreshes derived holdings via `logic.*`, ensures FX side effects run through the `pp_reader.currencies` alias, and triggers downstream event pushes when aggregates change. Portfolio position sync delegates to `logic.securities.db_calculate_sec_purchase_value`, which now returns a `HoldingsAggregation` plus `AverageCostSelection` payload in addition to the persisted EUR/native totals. `_sync_portfolio_securities` stores the aggregated EUR purchase values alongside native totals (`security_currency_total`, `account_currency_total`, weighted six-decimal `avg_price_native`) so the helpers can reconstruct structured `aggregation` and `average_cost` objects without leaking deprecated `avg_price_*` fields.

### Purchase price computation
Cross-currency purchases rely on the normalisation helpers in `logic.securities`:

- `_normalize_transaction_amounts` converts raw Portfolio Performance integers to floats (shares ÷ 1e8, cash ÷ 100), separates gross, fee (`transaction_units.type = 2`), and tax (`type = 1`) components, and derives the net account-currency exposure used for FIFO aggregation.
- `_resolve_native_amount` inspects `transaction_units` rows with `type = 0` to obtain the security-currency trade value. When such rows are missing, `_determine_exchange_rate` exposes the applied FX rate so the logic can fall back to `net_trade_account / fx_rate` for cross-currency trades without explicit security totals.
- `db_calculate_sec_purchase_value` stitches the helper outputs together: it aggregates per-security FIFO lots, keeps running totals in security and account currencies, and materialises the `HoldingsAggregation`/`AverageCostSelection` dataclasses that power downstream payloads. The function continues to surface `avg_price_native` for diagnostics, but deprecated per-share mirrors such as `avg_price_security` or `avg_price_account` are stripped before responses are serialised.

The persisted metrics flow through `data.db_access`, `data.websocket`, and `data.event_push` so portfolio positions and security snapshots present the structured `aggregation` and `average_cost` payloads as primary values. Account- and security-currency totals continue to back those helpers, but the deprecated flat mirrors have been removed from emitted payloads.

### Performance and day-change metrics
`metrics/common.py` centralises the gain and change calculations that previously lived across database, event, and WebSocket helpers. `select_performance_metrics` derives `PerformanceMetrics` and `DayChangeMetrics` dataclasses by combining current and purchase values with optional holdings and price inputs, rounding currency deltas with `util.currency` and annotating coverage metadata so downstream surfaces can expose source transparency.【F:custom_components/pp_reader/metrics/common.py†L1-L163】 `compose_performance_payload` merges these metrics back into existing payload fragments, preserving backend overrides while ensuring the nested `day_change` block only ships when real values are available.【F:custom_components/pp_reader/metrics/common.py†L170-L213】

`data.db_access.get_security_snapshot` feeds the helper with persisted holdings, current EUR valuations, and the most recent native close to serialise unified `performance` and `average_cost` objects. The WebSocket layer strips the deprecated flat mirrors so coordinator caches and responses surface only the structured payloads without recomputing gains or rounding in multiple places.【F:custom_components/pp_reader/data/db_access.py†L612-L698】【F:custom_components/pp_reader/data/websocket.py†L200-L360】【F:custom_components/pp_reader/data/coordinator.py†L94-L166】 Portfolio aggregations reuse the helper to keep coordinator sensors and WebSocket responses aligned with the metrics stored in SQLite.【F:custom_components/pp_reader/data/db_access.py†L891-L968】

Event payloads, price revaluation updates, and gain sensors rely on the shared helper when backend data does not already supply `performance`, preventing divergence from ad-hoc calculations and guaranteeing absolute and percentage changes always originate from the same rounding rules.【F:custom_components/pp_reader/data/event_push.py†L13-L132】【F:custom_components/pp_reader/prices/price_service.py†L780-L840】【F:custom_components/pp_reader/sensors/gain_sensors.py†L1-L120】

### Coordinator (`data.coordinator.PPReaderCoordinator`)
- Polls every minute (minute-truncated file timestamp).
- When the `.portfolio` file changes, re-parses the file and re-runs the diff sync within an executor.
- After each refresh:
  - Loads accounts (`db_access.get_accounts`) and transactions.
  - Computes balances via `logic.accounting.calculate_account_balance` with validation from `logic.validators`.
  - Loads portfolio aggregates via `db_access.fetch_live_portfolios`, which sums persisted purchase and current values and counts active positions.
  - Stores a snapshot in `self.data` for sensors: `accounts`, `portfolios`, `transactions`, and `last_update` (ISO8601).

### SQLite schema & helpers
- Definitions live in `data.db_schema`. The integration maintains tables for accounts, securities (with `last_price_source` and `last_price_fetched_at`), portfolios, transactions, transaction units, historical prices, plans, watchlists, FX rates, and metadata. `ALL_SCHEMAS` and the additional `idx_portfolio_securities_portfolio` index are executed idempotently by `data.db_init.initialize_database_schema`, which also performs runtime migrations to add native purchase columns (`avg_price_native`, `security_currency_total`, `account_currency_total`, legacy `avg_price_security`, `avg_price_account`) alongside the historical EUR aggregates so older databases retain the information required by the aggregation helpers.
- `db_access.py` offers strongly typed dataclasses and loader queries (e.g., `fetch_live_portfolios`, `fetch_security_metrics`, `get_security_snapshot`, `iter_security_close_prices`, `get_last_file_update`, `get_all_portfolio_securities`). Monetary values are stored as integers (cents) or scaled integers (`last_price` × 1e8) to avoid floating-point drift, while purchase totals are persisted as floats for security/account currency sums and six-decimal native averages. Legacy per-share columns remain in the schema for migration continuity but are filtered out when building payloads, and the normalization pipeline now consumes `security_metrics` rows directly instead of relying on bespoke formatters.【F:custom_components/pp_reader/data/db_access.py†L189-L384】【F:custom_components/pp_reader/data/normalization_pipeline.py†L1-L360】

### Historical close series storage
- `_sync_securities` filters Portfolio Performance price payloads so only active (non-retired) securities write new rows into `historical_prices`. Retired securities retain existing rows for archival reads but no longer receive inserts. Future-dated or malformed entries (missing `date`/`close`, negative epoch days) are skipped with throttled WARN logs.
- The importer collapses duplicates by date using an in-memory deduplication map before calling `executemany` with `INSERT OR REPLACE`. Prior to persistence the routine deletes any rows whose date exceeds the current UTC day to avoid stale future projections. Import statistics count `historical_prices_written` and `historical_prices_skipped` for diagnostics.
- `historical_prices` stores `(security_uuid, date, close, high, low, volume)` as integers (Close scaled by 1e8). Read helpers `iter_security_close_prices` and `get_security_close_prices` validate range bounds (`start_date`, `end_date`), stream ordered `(date, close)` pairs, and encapsulate SQLite error logging so downstream consumers can materialise price series efficiently.

### Backups
`data.backup_db`:
- Runs every six hours and on manual trigger.
- Executes `PRAGMA integrity_check`; if the database fails the check, it tries to restore from the newest valid backup in `<db>/backups/`.
- Applies a tiered cleanup strategy: keep seven daily and four weekly backups.
- Registers the debug service once Home Assistant emits `homeassistant_started`, ensuring the callable is always present in automations.

---

## Event propagation
`data.event_push` owns the event compaction layer shared by ingestion and pricing:

- `_compact_event_data` strips unused fields from `portfolio_values` and `portfolio_positions` payloads so emitted events stay below Home Assistant’s 32 KB recorder limit.
- `_push_update` schedules `EVENT_PANELS_UPDATED` via `call_soon_threadsafe`, guarding against missing `hass` or `entry_id` values. It warns when payloads approach or exceed the recorder threshold so developers can tune payload size before events are dropped and ensures every payload carries `domain`, `entry_id`, `data_type`, and compacted `data` fields for downstream filtering.【F:custom_components/pp_reader/data/event_push.py†L17-L206】
- `data.sync_from_pclient` invokes the helper after database writes to keep dashboard clients up to date, while `prices.price_service` reuses it when price changes require incremental UI refreshes.
- Portfolio value and position events ship the `performance` object derived by the shared helper. When upstream payloads omit the structure, the compactor recomputes it so gain/percentage totals and nested day-change metrics always share the same rounding semantics and metadata as the database responses. Legacy flat fields are no longer emitted with the event payload.【F:custom_components/pp_reader/data/event_push.py†L13-L209】
- The TypeScript dashboard controller (`src/dashboard.ts`) subscribes to the Home Assistant `panels_updated` event, filters bus messages by the active `entry_id`, and enqueues clones of each payload in `_pendingUpdates` so re-renders can replay every update after navigation or tab changes.【F:src/dashboard.ts†L815-L933】【F:src/dashboard.ts†L972-L1040】

---

## Price service
`prices.price_service` owns the recurring quote fetch:

1. **State initialisation** – `initialize_price_state` seeds locks, error counters, and log throttling flags in `hass.data`; symbol caches are added later when `_run_price_cycle` discovers active tickers and writes `price_symbols`/`price_symbol_to_uuids` to the store.【F:custom_components/pp_reader/prices/price_service.py†L81-L107】【F:custom_components/pp_reader/prices/price_service.py†L777-L804】
2. **Scheduling** – `_schedule_price_interval` (called from `__init__.py`) uses `async_track_time_interval` to run `_run_price_cycle` at the configured cadence. Option reloads reuse the helper and trigger an immediate cycle.
3. **Symbol discovery** – `load_and_map_symbols` queries active securities with tickers, resets the "empty" log guard when symbols appear again, and records the list length for diagnostics shared with reload logging.【F:custom_components/pp_reader/prices/price_service.py†L105-L161】
4. **Fetching quotes** – Batches use the provider `CHUNK_SIZE` (10 symbols) and wrap each `YahooQueryProvider.fetch` call in `asyncio.wait_for` with a 20 s timeout. Chunk failures bump `price_error_counter`, and zero-quote cycles trigger a throttled WARN via `price_zero_quotes_warn_ts` unless the provider import failed.【F:custom_components/pp_reader/prices/yahooquery_provider.py†L1-L100】【F:custom_components/pp_reader/prices/price_service.py†L692-L794】
5. **Change detection** – `_detect_price_changes` compares scaled prices and filters out unchanged or invalid values (`price <= 0`). Currency mismatches log once per symbol by tracking `price_currency_drift_logged`.
6. **Persistence** – Updated prices and metadata (`last_price`, `last_price_source`, `last_price_fetched_at`) are written to `securities` via `async_run_executor_job`. The cycle records meta information (batches, duration, skipped flag) and warns when execution time exceeds the 25 s watchdog threshold or when the consecutive error counter reaches three with zero quotes.【F:custom_components/pp_reader/prices/price_service.py†L795-L858】【F:custom_components/pp_reader/prices/price_service.py†L680-L770】
7. **Revaluation** – `prices.revaluation.revalue_after_price_updates` recalculates affected portfolios by reusing `fetch_live_portfolios` for aggregates and `logic.securities` for holdings recomputation. It reloads impacted positions so follow-up events carry fresh data.
8. **Event push** – `_push_update` from `data.event_push` is reused to dispatch `EVENT_PANELS_UPDATED`. Revaluation payloads rebuild the `performance` structure from the shared helper before emission, keeping price-driven gain deltas aligned with the database contract. The order remains `portfolio_values` followed by `portfolio_positions` per affected UUID, and the helper ensures payloads stay compact.【F:custom_components/pp_reader/prices/price_service.py†L780-L840】【F:custom_components/pp_reader/data/event_push.py†L13-L209】

When no symbols are available the service logs the condition once and skips the fetch without treating it as an error. Persistent yahooquery import failures flip `price_provider_disabled` to avoid repeated logs. Reloading an entry reinitializes state and immediately triggers a new price cycle.

---

## Foreign exchange helper
`currencies.fx` provides optional EUR exchange rate support when multi-currency accounts exist:

- Determines required currencies from Portfolio Performance data (`get_required_currencies`).
- Uses the Frankfurter API to fetch missing rates for a given date and stores them in the `fx_rates` table with retry-backed writes guarded by a threading lock.
- Provides both async (`get_exchange_rates`, `ensure_exchange_rates_for_dates`) and sync (`*_sync`) entry points so ingestion can run inside executor threads without blocking Home Assistant.
- Exposes `load_latest_rates` for WebSocket handlers to attach FX metadata to account payloads.

The FX helper logs and returns partial results on network or database failures to avoid blocking the main coordinator.

---

## WebSocket API & frontend
`data.websocket` registers the following commands via `websocket_api`:

| Command | Request fields | Response |
|---------|----------------|----------|
| `pp_reader/get_dashboard_data` | `entry_id` | Combined accounts, portfolios, transactions, and last file update snapshot. |
| `pp_reader/get_accounts` | `entry_id` | Accounts plus FX metadata; triggers FX fetch when non-EUR accounts exist. |
| `pp_reader/get_last_file_update` | `entry_id` | ISO8601 timestamp from metadata. |
| `pp_reader/get_portfolio_data` | `entry_id` | Live portfolio aggregates using `fetch_live_portfolios`. |
| `pp_reader/get_portfolio_positions` | `entry_id`, `portfolio_uuid` | Detailed positions assembled by the normalization pipeline from persisted `security_metrics` rows. |
| `pp_reader/get_security_snapshot` | `entry_id`, `security_uuid` | Aggregated holdings, FX, and price metadata for a single security. |
| `pp_reader/get_security_history` | `entry_id`, `security_uuid`, optional `start_date`, `end_date` | Close price series (epoch-day, scaled close) sourced from persisted historical prices. |

All commands default to the coordinator snapshot when live aggregation fails to keep the dashboard responsive. `_live_portfolios_payload` centralises the fetch logic: it queries SQLite via `fetch_live_portfolios` inside an executor, logs and falls back to coordinator snapshots on error, and normalises results before serialising. The accounts endpoint invokes `ensure_exchange_rates_for_dates`/`load_latest_rates` so FX metadata is up to date when non-EUR accounts are present. Security-specific commands reuse `async_run_executor_job` to call `get_security_snapshot` and `iter_security_close_prices`, ensuring blocking SQLite work never stalls the event loop.【F:custom_components/pp_reader/data/websocket.py†L640-L778】

The frontend adapter mirrors the canonical payloads one-to-one. `src/data/api.ts` invokes the commands above, passes responses through the normalizers in `src/lib/api/portfolio/`, and writes the resulting `NormalizedAccountSnapshot` / `NormalizedPortfolioSnapshot` records into the singleton store in `src/lib/store/portfolioStore.ts`. Selectors in `src/lib/store/selectors/portfolio.ts` expose derived tables for overview cards, account badges, and per-security drilldowns so view controllers never touch the raw WebSocket payloads. Incremental updates flow over `EVENT_PANELS_UPDATED` via `custom_components/pp_reader/data/event_push.py`; `src/data/updateConfigsWS.ts` listens for those events, applies the same deserializers, merges the patches into the store, and emits `DASHBOARD_DIAGNOSTICS_EVENT` entries when coverage, provenance, or `metric_run_uuid` metadata change. Sharing the adapter between initial fetch and push updates guarantees that dashboard state matches the snapshots stored in SQLite even after reloads, and the legacy DOM adapters (`window.__ppReader*`) have been removed as part of the normalized rollout.

Portfolio and position responses merge any persisted `performance` payload with metrics derived from `select_performance_metrics`, ensuring gain/percentage totals and nested `day_change` values remain consistent with coordinator sensors and event payloads even when upstream caches omit fields. Deprecated flattenings (`gain_abs`, `gain_pct`, `day_price_change_*`, `avg_price_*`) are removed before the payload is emitted.【F:custom_components/pp_reader/data/websocket.py†L200-L360】【F:custom_components/pp_reader/data/coordinator.py†L94-L166】

Feature flags are resolved through `feature_flags.is_enabled`, which reads overrides from `hass.data[DOMAIN][entry_id]["feature_flags"]` seeded during `async_setup_entry`. While no flags are currently active, the infrastructure remains available for future experiments without impacting core commands like security history.

The custom panel lives under `www/pp_reader_dashboard`:

- `panel.js` registers `<pp-reader-panel>`, loads hashed dashboard bundles or a Vite dev server for hot reload, wires menu toggles, and mirrors Home Assistant attributes onto the embedded dashboard element while keeping panel width responsive via a `ResizeObserver`.【F:custom_components/pp_reader/www/pp_reader_dashboard/panel.js†L1-L160】【F:custom_components/pp_reader/www/pp_reader_dashboard/panel.js†L200-L331】
- `src/dashboard.ts` (built into `js/dashboard.module.js`) connects to the WebSocket API, subscribes to `panels_updated`, filters payloads by `entry_id`, and replays cloned events during re-render so overview and detail tabs stay in sync.【F:src/dashboard.ts†L815-L1040】
- Security drill-down tabs originate from `src/tabs/security_detail.ts`, which fetches snapshots and historical series via the dedicated WebSocket commands and renders charts with cached range selectors.【F:src/tabs/security_detail.ts†L1-L120】【F:src/tabs/security_detail.ts†L198-L358】
- CSS files (`base.css`, `cards.css`, `nav.css`) provide layout styling.

Events emitted by `_push_update` follow the same contract as sensor snapshots, allowing the frontend to patch the DOM incrementally.

---

## Domain model snapshot
Key entities and their origin:

| Entity | Source | Important fields | Notes |
|--------|--------|------------------|-------|
| Account | SQLite `accounts` + transactions | `uuid`, `name`, `currency_code`, `balance` (cents) | Balances are recomputed per refresh, not stored. |
| Security | SQLite `securities` | `uuid`, `name`, `ticker_symbol`, `currency_code`, `last_price` (scaled), `last_price_date` | `last_price_source`/`last_price_fetched_at` updated by price service; `historical_prices` captures daily Close series for active securities. |
| Portfolio | SQLite `portfolios` | `uuid`, `name`, `reference_account`, `is_retired` | Aggregates are derived from `portfolio_securities`. |
| PortfolioSecurity | SQLite `portfolio_securities` | `current_holdings`, `purchase_value`, `current_value` (cents), `avg_price`, `avg_price_native`, `security_currency_total`, `account_currency_total`, legacy `avg_price_security`, `avg_price_account` | EUR purchase metrics (`purchase_value`, `avg_price`) coexist with native totals so `HoldingsAggregation`/`AverageCostSelection` can populate the structured `aggregation`/`average_cost` payloads. Deprecated per-share mirrors stay persisted for migrations but are removed from emitted responses. |
| Transaction | SQLite `transactions` | `type`, `amount`, `currency_code`, `shares`, `security` | `transaction_units` store FX amounts for cross-currency transfers. |
| FXRate | SQLite `fx_rates` | `date`, `currency`, `rate` | Populated on demand via `currencies.fx`. |
| Metadata | SQLite `metadata` | `last_file_update` | Drives coordinator sync decisions.

---

## Control flow summary
1. **Initial setup** – Config flow validates file; setup entry initialises schema (including runtime migrations), coordinator, price state, backup scheduling, and panel registration.
2. **Periodic sync** – Every minute the coordinator checks the `.portfolio` file mtime (rounded to the nearest minute). On change it parses, syncs to SQLite, reloads aggregates, and updates `coordinator.data`.
3. **Price cycle** – According to the options flow interval, the price service locks execution, fetches Yahoo quotes, writes updated prices, runs revaluation, and publishes events while updating error counters and watchdog metrics.
4. **Options updates** – Changing options triggers `_async_reload_entry_on_update`, which reapplies price debug logging, reschedules the interval, resets state, and reruns the initial price cycle.
5. **Frontend interactions** – The dashboard uses WebSocket commands to fetch initial data and listens for `EVENT_PANELS_UPDATED` to patch rows. Portfolio positions are fetched lazily per user interaction.
6. **Backups** – A 6-hour interval backup ensures integrity and retention; manual trigger is available via service call.

---

## Error handling & observability
- **Coordinator** – Wraps sync logic in try/except and raises `UpdateFailed` for Home Assistant to retry. Detailed logs highlight parse or SQLite issues.
- **Price service** – Tracks consecutive errors, throttles zero-quote warnings, logs currency drift mismatches once per symbol, and warns when cycles exceed 25 s. Persistent yahooquery import issues flip `price_provider_disabled` so follow-up logs occur once.
- **Event propagation** – `_push_update` emits warnings when payloads approach or exceed the 32 KB recorder limit, helping developers trim payloads before Home Assistant drops events.
- **WebSocket** – Falls back to coordinator snapshots on aggregation errors and sends `not_found` errors when an entry id is unknown.
- **Backup system** – Logs success (`✅`) and failure (`❌`) with clear emoji markers; attempts recovery from the latest valid backup when integrity fails.
- **Logging namespaces** – `custom_components.pp_reader` and `custom_components.pp_reader.prices*` allow focused log level control via the options flow, and `_apply_price_debug_logging` ensures effective levels are reported when toggled.

No metrics or traces are emitted; observability relies on structured log lines.

---

## Performance & concurrency
- File parsing and SQLite operations run in executor threads to keep the event loop responsive.
- `asyncio.Lock` ensures only one price cycle executes at a time; overlapping schedules are skipped rather than queued.
- Quote fetches batch up to 10 symbols (provider `CHUNK_SIZE`) to balance throughput and rate limits.
- Symbol discovery caches the last symbol list/mapping to avoid redundant SQLite queries when the data set is stable.
- Portfolio aggregation relies on SQL sums and the `idx_portfolio_securities_portfolio` index to speed up repeated queries.
- FX writes use a threading lock and retry with exponential backoff to avoid SQLite `database is locked` errors.
- Event payloads are compacted before emission to minimise recorder overhead and avoid exceeding Home Assistant’s 32 KB limit.

Potential bottlenecks: very large `.portfolio` files (protobuf parsing) and slow Yahoo responses. The system tolerates these by logging and skipping cycles rather than blocking the coordinator.

---

## Security & data handling
- The integration only reads local files specified by the user and writes to SQLite in the configured directory. Ensure Home Assistant file permissions protect `.portfolio`, `.db`, and backup files because they contain financial data.
- No API keys are stored; Yahoo quotes and Frankfurter FX endpoints are public.
- WebSocket commands are read-only and scoped to the config entry id provided by Home Assistant.
- Backups retain historical account information—consider external rotation if disk usage is a concern.

---

## Testing strategy
Automated tests live under `tests/` (see [TESTING.md](TESTING.md)):

- **Price orchestration** – `test_price_service.py`, `test_reload_initial_cycle.py`, `test_reload_logs.py`, `test_interval_change_reload.py`, `test_zero_quotes_warn.py`, `test_empty_symbols_logging.py`, `test_currency_drift_once.py`, `test_error_counter_reset.py`, `test_watchdog.py`, `test_batch_size_regression.py`, `test_price_persistence_fields.py`, and `test_debug_scope.py` exercise interval rescheduling, warning throttling, persistence fields, and logging scope.【F:tests/test_price_service.py†L1-L9】【F:tests/test_zero_quotes_warn.py†L1-L9】
- **Provider integration** – `test_yahooquery_provider.py` validates chunked fetch behaviour and error handling for the Yahoo Finance client.【F:tests/test_yahooquery_provider.py†L1-L10】
- **Aggregation & performance metrics** – `test_aggregations.py`, `test_performance.py`, `test_logic_securities.py`, and `test_logic_securities_native_avg.py` ensure holdings aggregation, average cost selection, and gain/day-change computations remain numerically stable across cross-currency scenarios.【F:tests/test_aggregations.py†L1-L156】【F:tests/test_performance.py†L1-L112】【F:tests/test_logic_securities.py†L1-L140】【F:tests/test_logic_securities_native_avg.py†L1-L160】
- **Database & coordinator contract** – `test_fetch_live_portfolios.py`, `test_db_access.py`, `test_coordinator_contract.py`, and `test_revaluation_live_aggregation.py` cover on-demand aggregation helpers, schema bootstrapping, and the coordinator/event payload contract so sensors and websocket responses stay aligned.【F:tests/test_fetch_live_portfolios.py†L1-L106】【F:tests/test_db_access.py†L1-L146】【F:tests/test_coordinator_contract.py†L1-L60】【F:tests/test_revaluation_live_aggregation.py†L1-L80】
- **Event propagation & backups** – `test_event_push.py` verifies payload compaction for portfolios and positions, while `test_backup_cleanup.py` validates the tiered retention strategy and resilience to stray files.【F:tests/test_event_push.py†L1-L166】【F:tests/test_backup_cleanup.py†L1-L36】
- **WebSocket, FX & security detail** – `test_ws_accounts_fx.py`, `test_ws_last_file_update.py`, `test_ws_portfolios_live.py`, `test_ws_portfolio_positions.py`, `test_ws_security_history.py`, and `test_currencies_fx.py` verify websocket payloads, FX enrichment, and historical price/snapshot responses.【F:tests/test_ws_accounts_fx.py†L1-L120】【F:tests/test_ws_last_file_update.py†L1-L120】【F:tests/test_ws_portfolios_live.py†L1-L132】【F:tests/test_ws_portfolio_positions.py†L1-L200】【F:tests/test_ws_security_history.py†L1-L10】【F:tests/test_currencies_fx.py†L1-L156】
- **Sync & migrations** – `test_sync_from_pclient.py`, `test_migration.py`, and `test_price_persistence_fields.py` assert diff synchronisation, runtime schema migrations, and price field updates.【F:tests/test_sync_from_pclient.py†L1-L120】【F:tests/test_migration.py†L1-L120】【F:tests/test_price_persistence_fields.py†L1-L79】
- **Panel & frontend assets** – `test_panel_registration.py` ensures Home Assistant registers the placeholder and runtime panel, while `tests/frontend/test_build_artifacts.py`, `tests/frontend/test_dashboard_smoke.py`, and `tests/frontend/test_portfolio_update_gain_abs.py` use jsdom-powered smoke tests to validate the bundled dashboard output.【F:tests/test_panel_registration.py†L1-L9】【F:tests/frontend/test_build_artifacts.py†L1-L9】【F:tests/frontend/test_dashboard_smoke.py†L1-L10】【F:tests/frontend/test_portfolio_update_gain_abs.py†L1-L10】
- **Validation helpers** – `test_validators_timezone.py` guards transaction validation edge cases.【F:tests/test_validators_timezone.py†L1-L10】

Manual testing relies on the scripts in `scripts/` (`./scripts/develop`, `./scripts/lint`) and the Home Assistant dev container described in [README.md](README.md).

---

## Extensibility & architectural decisions

| Decision | Context | Consequence |
|----------|---------|-------------|
| Persist only the latest quote | Keeps database lean and avoids stale history | Historical analytics require external tooling. |
| Use partial revaluation after price changes | Reduces processing time after each quote update | Ensures timely UI updates without reprocessing all portfolios. |
| Keep coordinator snapshots for sensors | Maintains backward compatibility with Home Assistant entity contracts | WebSocket layer consumes live aggregation to avoid double bookkeeping. |
| Skip overlapping price cycles | Simplifies scheduling | Fast consecutive intervals may drop runs when the previous cycle is still executing. |
| Store monetary values as integers | Ensures deterministic rounding | Formatting to two decimals happens in sensors/frontend. |
| Explicitly depend on `lxml>=5.2.1` | Avoids wheel compatibility issues in development containers | Slightly increases package footprint but stabilises builds. |
| Compact event payloads before emission | Keeps `EVENT_PANELS_UPDATED` within recorder limits | New event types should route through `data.event_push` compaction helpers. |
| Register `pp_reader` as namespace alias | Maintains compatibility with legacy module paths | Future modules should import from `custom_components.pp_reader` to avoid ambiguity. |

Extension points:

- Implement additional price providers by extending `prices.provider_base.PriceProvider` and wiring them into `price_service`.
- Add new entities by creating sensor classes under `sensors/` that consume the coordinator snapshot.
- Extend the database schema by appending SQL statements to `ALL_SCHEMAS` (idempotent) and exposing new query helpers in `db_access`.
- Enhance the dashboard by updating assets in `www/pp_reader_dashboard` and adjusting WebSocket payloads (preserving backward compatibility where possible).
- Regenerate the protobuf bindings by running `protoc` against `name/abuchen/portfolio/client.proto`, ensuring the package path remains `custom_components.pp_reader.name.abuchen.portfolio`.
- Reuse `_push_update` when broadcasting new payload types so payload compaction and recorder safeguards apply automatically.

---

## Known gaps & open questions
- **Pandas / NumPy usage** – Manifest requires these packages although the current codebase does not import them. They appear to be held for future analytics or compatibility; confirm whether they can move to optional extras.
- **FX cache lifecycle** – The `fx_rates` table grows over time without pruning. Consider retention or deduplication strategies if disk usage becomes material.
- **Performance metrics** – No runtime metrics exist; future work could add diagnostics (e.g., via Home Assistant statistics) for price cycle duration and sync timing.
- **Large portfolio scalability** – Real-world limits for the on-demand aggregation and DOM patching have not been benchmarked since the refactor; measure before enabling micro-caching.
- **Price cycle diagnostics** – `price_last_cycle_meta` is currently initialised but never populated; confirm whether future observability should populate it or remove the placeholder.
- **History retention option** – `history_retention_years` is normalised and stored, but no pruning logic consumes it yet; either wire retention into imports or remove the dormant option.【F:custom_components/pp_reader/__init__.py†L114-L149】

---

## Glossary
| Term | Definition |
|------|------------|
| Coordinator | Home Assistant `DataUpdateCoordinator` responsible for periodic refreshes. |
| Entry ID | Unique identifier assigned by Home Assistant to a config entry. |
| Revaluation | Partial recalculation of portfolio metrics after quote updates. |
| Drift | Logged warning when Yahoo quote currency differs from stored security currency. |
| Override cache | Deprecated frontend cache removed after the on-demand aggregation refactor. |
| FX rate | Exchange rate relative to EUR stored in the `fx_rates` table. |
| Event patch | Incremental DOM update strategy used by the dashboard. |
| `EVENT_PANELS_UPDATED` | Home Assistant event emitted for dashboard updates via `data.event_push`. |

_End of architecture documentation._
