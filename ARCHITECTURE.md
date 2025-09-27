# Architecture – Portfolio Performance Reader (`pp_reader`)

## Table of contents
1. [Overview](#overview)
2. [Code structure](#code-structure)
3. [External dependencies & services](#external-dependencies--services)
4. [Home Assistant integration layer](#home-assistant-integration-layer)
5. [Configuration](#configuration)
6. [Data ingestion & persistence](#data-ingestion--persistence)
7. [Price service](#price-service)
8. [Foreign exchange helper](#foreign-exchange-helper)
9. [WebSocket API & frontend](#websocket-api--frontend)
10. [Domain model snapshot](#domain-model-snapshot)
11. [Control flow summary](#control-flow-summary)
12. [Error handling & observability](#error-handling--observability)
13. [Performance & concurrency](#performance--concurrency)
14. [Security & data handling](#security--data-handling)
15. [Testing strategy](#testing-strategy)
16. [Extensibility & architectural decisions](#extensibility--architectural-decisions)
17. [Known gaps & open questions](#known-gaps--open-questions)
18. [Glossary](#glossary)

<!-- DIAGRAMS-PLACEHOLDER -->

---

## Overview
The custom component `pp_reader` integrates a local Portfolio Performance (`.portfolio`) file into Home Assistant. The integration:

- Parses Portfolio Performance protobuf data and mirrors it into a dedicated SQLite database that lives next to Home Assistant’s configuration.
- Exposes account and portfolio information to Home Assistant sensors and a custom dashboard panel.
- Schedules optional Yahoo Finance price updates via `yahooquery`, persists the last fetched quote, and triggers partial portfolio revaluation.
- Provides an automated backup cycle and a debug service to create on-demand SQLite snapshots.

Key responsibilities are split across five areas:

1. **Home Assistant lifecycle** – config flow, setup, and entity registration.
2. **Data ingestion** – file parsing, diff sync to SQLite, and aggregation helpers.
3. **Price orchestration** – background task that updates quotes and triggers recalculations.
4. **Foreign exchange** – on-demand loading and caching of EUR exchange rates when non-EUR accounts exist.
5. **Presentation** – WebSocket API and dashboard assets for drill-down views.

---

## Code structure
Repository folders relevant for the runtime integration:

```text
custom_components/pp_reader/
  __init__.py                # Integration entry points and scheduler wiring
  manifest.json              # Home Assistant metadata and runtime requirements
  const.py                   # Shared constants (domain, config keys)
  config_flow.py             # Config flow and options flow implementation
  sensor.py                  # Sensor platform bootstrap
  services.yaml              # Service descriptions exposed to Home Assistant
  currencies/
    fx.py                    # Frankfurter FX helper (EUR conversions)
  data/
    __init__.py
    reader.py                # .portfolio parser (protobuf extraction)
    sync_from_pclient.py     # File → SQLite diff synchronisation
    db_schema.py             # CREATE TABLE definitions & indices
    db_init.py               # Database bootstrap (executes ALL_SCHEMAS)
    db_access.py             # Query helpers used by coordinator & WebSockets
    coordinator.py           # DataUpdateCoordinator for sensor snapshots
    websocket.py             # WebSocket commands & payload builders
    backup_db.py             # Periodic backups + service registration
  logic/
    accounting.py            # Account balance aggregation
    portfolio.py             # Portfolio valuation helpers
    securities.py            # Holdings aggregation utilities for prices
    validators.py            # Data validation helpers used by accounting
  prices/
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
    panel.js                 # Registers <pp-reader-panel> custom panel
    js/dashboard.js          # Dashboard behaviour & WebSocket usage
    css/*.css                # Styling for panel layout
```

Support tooling lives outside of the integration (for example `scripts/`, `tests/`, `TESTING.md`).

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
`manifest.json` declares domain `pp_reader`, version `0.11.0`, the runtime dependencies above, and marks the integration as `local_polling` with a config flow.

### Setup lifecycle

- `async_setup` (`__init__.py`)
  - Registers the dashboard static files under `/pp_reader_dashboard`.
  - Registers WebSocket commands from `data.websocket`.

- `async_setup_entry`
  - Initializes the SQLite schema via `data.db_init.initialize_database_schema` for the configured database path.
  - Creates and stores a `PPReaderCoordinator` instance (see [Data ingestion](#data-ingestion--persistence)).
  - Forwards platforms (currently sensors only).
  - Configures the price service state and starts the initial cycle if prices are enabled.
  - Registers the backup system (`data.backup_db.setup_backup_system`).
  - Registers the custom panel `<pp-reader-panel>` if it is not already active.

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
    "price_lock": asyncio.Lock,
    "price_task_cancel": Callable | None,
    "price_interval_applied": int | None,
    "price_error_counter": int,
    "price_currency_drift_logged": set[str],
    "price_empty_symbols_logged": bool,
    "price_empty_symbols_skip_logged": bool,
    "price_last_symbol_count": int,
    "price_last_cycle_meta": dict[str, Any],
}
```

### Config flow & options flow
- Config flow (`config_flow.PortfolioConfigFlow`)
  - Step `user`: validate the `.portfolio` path and optionally choose to use the default database directory (`/config/pp_reader_data/<stem>.db`).
  - Step `db_path`: allow a custom directory for the SQLite file when the default is not used.
  - Validation relies on `data.reader.parse_data_portfolio` to ensure the file is readable.
- Options flow exposes:
  - `price_update_interval_seconds` (>=300 seconds, default 900).
  - `enable_price_debug` to raise logger levels for the price namespace.
  - Option changes trigger `_async_reload_entry_on_update`, rescheduling the interval and rerunning the initial cycle.

### Sensor platform
`sensor.py` instantiates coordinator-based entities:

- `PortfolioAccountSensor` for each active account.
- `PortfolioDepotSensor` and `PortfolioPurchaseSensor` per portfolio.
- `PortfolioGainAbsSensor` and `PortfolioGainPctSensor` derived from the value/purchase sensors.

Sensors read from the coordinator snapshot (`coordinator.data`) to remain compatible with existing Home Assistant entity contracts.

### Services
`data.backup_db.setup_backup_system` registers `pp_reader.trigger_backup_debug`. The service runs the same backup cycle that the periodic job executes (every six hours) and logs success or failures.

---

## Configuration

| Option | Source | Default | Validation | Impact |
|--------|--------|---------|------------|--------|
| `file_path` | Config flow | — | Must point to an existing `.portfolio` file | Defines the data source. |
| `db_path` | Config flow | `/config/pp_reader_data/<portfolio>.db` | Directory must exist and be writable | Defines SQLite storage location. |
| `price_update_interval_seconds` | Options flow | 900 | Minimum 300 | Reschedules the recurring price fetch. |
| `enable_price_debug` | Options flow | `false` | Boolean | Elevates price logger levels to DEBUG when set. |

No credentials are required; Yahoo Finance quotes are public and the FX helper only fetches EUR rates.

---

## Data ingestion & persistence
### Portfolio parsing and synchronization
- `data.reader.parse_data_portfolio` extracts `data.portfolio` from the `.portfolio` ZIP, removes the `PPPBV1` prefix, and parses it into `client_pb2.PClient`.
- `data.sync_from_pclient.sync_from_pclient` takes the protobuf payload and applies inserts/updates/deletes across SQLite tables. The function also updates metadata such as `last_file_update`.

### Coordinator (`data.coordinator.PPReaderCoordinator`)
- Polls every minute (minute-truncated file timestamp).
- When the `.portfolio` file changes, re-parses the file and re-runs the diff sync within an executor.
- After each refresh:
  - Loads accounts (`db_access.get_accounts`) and transactions.
  - Computes balances via `logic.accounting.calculate_account_balance` with validation from `logic.validators`.
  - Loads portfolio aggregates via `db_access.fetch_live_portfolios`, which sums persisted purchase and current values and counts active positions.
  - Stores a snapshot in `self.data` for sensors: `accounts`, `portfolios`, `transactions`, and `last_update` (ISO8601).

### SQLite schema & helpers
- Definitions live in `data.db_schema`. The integration maintains tables for accounts, securities, portfolios, transactions, transaction units, FX rates, and metadata. `ALL_SCHEMAS` and the additional `idx_portfolio_securities_portfolio` index are executed idempotently by `data.db_init.initialize_database_schema`.
- `db_access.py` offers strongly typed dataclasses and helper queries (e.g., `get_portfolio_positions`, `get_last_file_update`, `get_all_portfolio_securities`). Monetary values are stored as integers (cents) or scaled integers (`last_price` × 1e8) to avoid floating-point drift.

### Backups
`data.backup_db`:
- Runs every six hours and on manual trigger.
- Executes `PRAGMA integrity_check`; if the database fails the check, it tries to restore from the newest valid backup in `<db>/backups/`.
- Applies a tiered cleanup strategy: keep seven daily and four weekly backups.

---

## Price service
`prices.price_service` owns the recurring quote fetch:

1. **State initialisation** – `initialize_price_state` seeds locks and counters in `hass.data`.
2. **Scheduling** – `_schedule_price_interval` (called from `__init__.py`) uses `async_track_time_interval` to run `_run_price_cycle` at the configured cadence.
3. **Symbol discovery** – `prices.symbols.load_active_security_symbols` queries active securities with tickers; `price_service.build_symbol_mapping` groups UUIDs by ticker for change fan-out.
4. **Fetching quotes** – `_fetch_quotes` (within `yahooquery_provider`) loads batches (`CHUNK_SIZE` 50) with a 20 second timeout. Failures increment `price_error_counter` and eventually disable debug skip logging.
5. **Change detection** – `_detect_price_changes` compares scaled prices and filters out unchanged or invalid values (`price <= 0`). Currency drift per symbol logs once per runtime.
6. **Persistence** – Updated prices and metadata are written to `securities` in SQLite. The service maintains a watchdog (25s) and tracks consecutive errors (threshold 3) for observability.
7. **Revaluation** – `prices.revaluation.revalue_after_price_updates` recalculates affected portfolios, leveraging helpers in `logic.portfolio` and `logic.securities` to recompute holdings and values.
8. **Event push** – `_push_update` from `sync_from_pclient` is reused to dispatch `EVENT_PANELS_UPDATED` in Home Assistant. The order remains `portfolio_values` followed by `portfolio_positions` per affected UUID.

When no symbols are available the service logs the condition once and skips the fetch without treating it as an error. Reloading an entry reinitializes state and immediately triggers a new price cycle.

---

## Foreign exchange helper
`currencies.fx` provides optional EUR exchange rate support when multi-currency accounts exist:

- Determines required currencies from Portfolio Performance data (`get_required_currencies`).
- Uses the Frankfurter API to fetch missing rates for a given date and stores them in the `fx_rates` table.
- Employs asyncio executors and retry logic to avoid SQLite write lock issues.
- Exposes `get_exchange_rates`, `ensure_exchange_rates_for_dates`, and `load_latest_rates`, which are used from WebSocket handlers to populate FX information when returning account data.

The FX helper is resilient to network failures (logs warnings and returns partial results) to avoid blocking the main coordinator.

---

## WebSocket API & frontend
`data.websocket` registers the following commands via `websocket_api`:

| Command | Request fields | Response |
|---------|----------------|----------|
| `pp_reader/get_dashboard_data` | `entry_id` | Combined accounts, portfolios, transactions, and last file update snapshot. |
| `pp_reader/get_accounts` | `entry_id` | Accounts plus FX metadata; triggers FX fetch when non-EUR accounts exist. |
| `pp_reader/get_last_file_update` | `entry_id` | ISO8601 timestamp from metadata. |
| `pp_reader/get_portfolio_data` | `entry_id` | Live portfolio aggregates using `fetch_live_portfolios`. |
| `pp_reader/get_portfolio_positions` | `entry_id`, `portfolio_uuid` | Detailed positions including gains and holdings. |

All commands default to the coordinator snapshot when live aggregation fails to keep the dashboard responsive.

The custom panel lives under `www/pp_reader_dashboard`:

- `panel.js` registers `<pp-reader-panel>` and boots the dashboard when the sidebar item is opened.
- `js/dashboard.js` opens a WebSocket connection, subscribes to `EVENT_PANELS_UPDATED`, and performs DOM updates without full re-rendering. Portfolio positions are lazily requested and cached in `window.__ppReaderPortfolioPositionsCache`.
- CSS files (`base.css`, `cards.css`, `nav.css`) provide layout styling.

Events emitted by `_push_update` follow the same contract as sensor snapshots, allowing the frontend to patch the DOM incrementally.

---

## Domain model snapshot
Key entities and their origin:

| Entity | Source | Important fields | Notes |
|--------|--------|------------------|-------|
| Account | SQLite `accounts` + transactions | `uuid`, `name`, `currency_code`, `balance` (cents) | Balances are recomputed per refresh, not stored. |
| Security | SQLite `securities` | `uuid`, `name`, `ticker_symbol`, `currency_code`, `last_price` (scaled) | `last_price_source` and `last_price_fetched_at` updated by price service. |
| Portfolio | SQLite `portfolios` | `uuid`, `name`, `reference_account`, `is_retired` | Aggregates are derived from `portfolio_securities`. |
| PortfolioSecurity | SQLite `portfolio_securities` | `current_holdings`, `purchase_value`, `current_value` (cents) | Generated `avg_price` column simplifies average cost lookup. |
| Transaction | SQLite `transactions` | `type`, `amount`, `currency_code`, `shares`, `security` | `transaction_units` store FX amounts for cross-currency transfers. |
| FXRate | SQLite `fx_rates` | `date`, `currency`, `rate` | Populated on demand via `currencies.fx`. |
| Metadata | SQLite `metadata` | `last_file_update` | Drives coordinator sync decisions.

---

## Control flow summary
1. **Initial setup** – Config flow validates file; setup entry initialises schema, coordinator, price state, backup scheduling, and panel registration.
2. **Periodic sync** – Every minute the coordinator checks the `.portfolio` file mtime (rounded to the nearest minute). On change it parses, syncs to SQLite, reloads aggregates, and updates `coordinator.data`.
3. **Price cycle** – According to the options flow interval, the price service locks execution, fetches Yahoo quotes, writes updated prices, runs revaluation, and publishes events.
4. **Frontend interactions** – The dashboard uses WebSocket commands to fetch initial data and listens for `EVENT_PANELS_UPDATED` to patch rows. Portfolio positions are fetched lazily per user interaction.
5. **Backups** – A 6-hour interval backup ensures integrity and retention; manual trigger is available via service call.

---

## Error handling & observability
- **Coordinator** – Wraps sync logic in try/except and raises `UpdateFailed` for Home Assistant to retry. Detailed logs highlight parse or SQLite issues.
- **Price service** – Tracks consecutive errors, logs warnings for skipped runs, zero quotes, currency drift, and long cycles (>25s). On repeated failures it continues scheduling but keeps counters for visibility.
- **WebSocket** – Falls back to coordinator snapshots on aggregation errors and sends `not_found` errors when an entry id is unknown.
- **Backup system** – Logs success (`✅`) and failure (`❌`) with clear emoji markers; attempts recovery from the latest valid backup when integrity fails.
- **Logging namespaces** – `custom_components.pp_reader` and `custom_components.pp_reader.prices*` allow focused log level control via the options flow.

No metrics or traces are emitted; observability relies on structured log lines.

---

## Performance & concurrency
- File parsing and SQLite operations run in executor threads to keep the event loop responsive.
- `asyncio.Lock` ensures only one price cycle executes at a time; overlapping schedules are skipped rather than queued.
- Quote fetches batch up to 50 symbols to balance throughput and rate limits.
- Portfolio aggregation relies on SQL sums and the `idx_portfolio_securities_portfolio` index to speed up repeated queries.
- FX writes use a threading lock and retry with exponential backoff to avoid SQLite `database is locked` errors.

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

- `tests/prices/` covers yahooquery integration, price cycle behaviours, and error counters.
- `test_fetch_live_portfolios.py` and `test_ws_portfolios_live.py` validate the on-demand aggregation contract and WebSocket payloads.
- `test_ws_accounts_fx.py` ensures FX rate hooks respond correctly when non-EUR accounts are present.
- `test_currencies_fx.py` covers Frankfurter fetches, retries, and SQLite persistence.
- `test_sync_from_pclient.py` verifies the diff sync for Portfolio Performance payloads.
- `test_validators_timezone.py` guards transaction validation edge cases.

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

Extension points:

- Implement additional price providers by extending `prices.provider_base.PriceProvider` and wiring them into `price_service`.
- Add new entities by creating sensor classes under `sensors/` that consume the coordinator snapshot.
- Extend the database schema by appending SQL statements to `ALL_SCHEMAS` (idempotent) and exposing new query helpers in `db_access`.
- Enhance the dashboard by updating assets in `www/pp_reader_dashboard` and adjusting WebSocket payloads (preserving backward compatibility where possible).

---

## Known gaps & open questions
- **Pandas / NumPy usage** – Manifest requires these packages although the current codebase does not import them. They appear to be held for future analytics or compatibility; confirm whether they can move to optional extras.
- **FX cache lifecycle** – The `fx_rates` table grows over time without pruning. Consider retention or deduplication strategies if disk usage becomes material.
- **Performance metrics** – No runtime metrics exist; future work could add diagnostics (e.g., via Home Assistant statistics) for price cycle duration and sync timing.
- **Large portfolio scalability** – Real-world limits for the on-demand aggregation and DOM patching have not been benchmarked since the refactor; measure before enabling micro-caching.

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

_End of architecture documentation._
