# Changelog
All noteworthy changes to this project are recorded in this file.

Format follows: Keep a Changelog
Versioning: SemVer (minor bump for new functionality without breaking changes).

## [Unreleased]
### Added
- Persist daily Close prices for active securities during Portfolio Performance imports and provide helpers to query their time series for future dashboards.【F:custom_components/pp_reader/data/sync_from_pclient.py†L559-L676】【F:custom_components/pp_reader/data/db_access.py†L204-L289】
- Delivered a security detail dashboard tab that opens from portfolio positions, renders snapshot metrics, and charts range-selectable history with lightweight SVG tooling and cache invalidation for live updates.【F:custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.js†L1-L205】【F:custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/security_detail.js†L1-L210】【F:custom_components/pp_reader/www/pp_reader_dashboard/js/content/charting.js†L1-L196】
- Exposed always-on WebSocket commands for security drilldowns, including snapshot aggregation and history queries consumed by new frontend API wrappers.【F:custom_components/pp_reader/data/websocket.py†L574-L755】【F:custom_components/pp_reader/data/db_access.py†L291-L384】【F:custom_components/pp_reader/www/pp_reader_dashboard/js/data/api.js†L69-L135】

### Changed
- Removed the deprecated `pp_reader_history` feature flag so historical price access is part of the core experience without configuration toggles.【F:custom_components/pp_reader/feature_flags.py†L1-L67】【F:custom_components/pp_reader/data/websocket.py†L537-L755】

## [0.11.0] - 2025-09-27
### Added
- New database helper `fetch_live_portfolios` aggregates current portfolio values and position counts on demand as the single source of truth for WebSocket responses and dashboard load paths.【F:custom_components/pp_reader/data/db_access.py†L428-L484】
- Regression tests safeguard the live aggregation as well as the WebSocket flows for portfolios and FX accounts.【F:tests/test_fetch_live_portfolios.py†L1-L72】【F:tests/test_ws_portfolios_live.py†L1-L94】【F:tests/test_ws_accounts_fx.py†L120-L191】
### Changed
- WebSocket commands (`pp_reader/get_dashboard_data`, `pp_reader/get_portfolio_data`, `pp_reader/get_accounts`, `pp_reader/get_last_file_update`) now load portfolios on demand from the database, fetch missing FX rates, and include coordinator fallbacks for graceful responses.【F:custom_components/pp_reader/data/websocket.py†L65-L341】
- Revaluation and price events rely on `fetch_live_portfolios` to populate affected portfolios with consistent totals and fall back to per-portfolio aggregation when necessary.【F:custom_components/pp_reader/prices/revaluation.py†L1-L118】
- The dashboard renders an expandable table with a DOM-based total footer and now caches only position data so updates work without manual override caches.【F:custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/overview.js†L4-L160】【F:custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/overview.js†L203-L263】
- Event handling is unified: `_push_update` emits compact `EVENT_PANELS_UPDATED` payloads through the event loop, and the dashboard subscribes to `panels_updated`, filters by `entry_id`, and queues bus updates for replay after re-renders.【F:custom_components/pp_reader/data/event_push.py†L17-L206】【F:custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.js†L204-L505】
### Removed
- Client override caches for portfolio values were removed; the UI now relies entirely on server-side aggregation and DOM recalculations.【F:README.md†L82-L93】
### Internal
- Extended tests for revaluation and sync safeguard the aggregation refactor.【F:tests/prices/test_revaluation_live_aggregation.py†L1-L62】【F:tests/test_sync_from_pclient.py†L1-L60】

## [0.10.7] - 2025-09-26
### Added
- Automatic invalidation of the portfolio override cache when file sync emits a `last_file_update` event as well as when heuristic full-sync `portfolio_values` events (`value` without `current_value`) are detected.
### Fixed
- Prevents persisting stale live price overrides after a full rebuild of the tables.
### Internal
- Utility `_clearPortfolioOverrides(reason)` consolidates logging.

## [0.10.6] - 2025-09-26
### Fixed
- JavaScript error `parseNum is not defined` in `handlePortfolioUpdate` blocked footer/total-wealth updates after events.
- Live price and event patches disappeared after re-render because original backend values were rendered again. Introduced a client-side override cache (`__ppReaderPortfolioValueOverrides`) and reapplied it during render.

### Internal
- Shared parsing utility `parseNumLoose`.
- More robust footer calculation without exceptions.

## [0.10.5] - 2025-09-25
### Fixed
- The frontend received `panels_updated` events but subscribed to the literal name `EVENT_PANELS_UPDATED`, preventing live portfolio updates. Subscription in `dashboard.js` corrected.
- Incremental portfolio updates were not patched because the initial table used `value` while events sent `current_value`. Normalisation (`current_value`/`value`, `purchase_sum`/`purchaseSum`, `count`/`position_count`) in `handlePortfolioUpdate`.
- Key mismatch for `portfolio_values` from partial revaluation (mapping `value`→`current_value`, `count`→`position_count`) led to ignored updates – transformation and fallback logic added to the price cycle.

### Added
- Extended debug logs for the price cycle (`pv_event push`, payload length, fallback indicators).
- Visual highlight (CSS class `flash-update`) when updating individual portfolio rows.

### Internal
- More robust DOM selection and defensive parsers for numeric values in `updateConfigsWS.js`.
- Fallback aggregation in case revaluation does not yield `portfolio_values` even though price changes occurred.
- No breaking changes to existing data/event contracts; only patch behaviour improved.

## [0.10.4] - 2025-09-25
### Fixed
- Crash during initial sync on a fresh database: used `HasField('high')` / `low` / `volume` on `PHistoricalPrice` (only has `date`, `close`). Now descriptor-based optional access.

## [0.10.3] - 2025-09-25
### Fixed
- Removed incorrect assumption of a non-existent `securities.note` column; startup on a fresh database otherwise failed with `OperationalError: no column named note`.
- Switched to differentiated UPDATE logic for `securities` instead of `INSERT OR REPLACE` so `last_price` / `last_price_source` / `last_price_fetched_at` are not lost.

### Internal
- Documented intentional non-persistence of security notes (no schema extension required).

## [0.10.2] - 2025-09-25
### Changed
- Unified batch size: using `CHUNK_SIZE` from the provider instead of a hard-coded value.
- Resilience: outer try/except in the price cycle prevents uncaught exceptions; error counter is incremented.

### Added
- INFO log when skipping for the first time because of an empty symbol list (separate from discovery INFO).
- Regression test `test_batches_count_regression` (batch count and metadata).

### Fixed
- Potential future drift between provider chunk size and orchestrator.

## [0.10.1] - 2025-09-25
### Fixed
- Added explicit dependency `lxml>=5.2.1` to ensure a Python 3.13 compatible wheel is installed (previous implicit pull of `lxml==4.9.4` via `yahooquery==2.3.7` caused build failure in the dev container).

## [0.10.0] - 2025-09-25
### Added
- Live price integration (Yahoo Finance via `yahooquery`) – updates `last_price`, `last_price_source`, `last_price_fetched_at` in the `securities` table.
- Partial revaluation only when at least one price changes with event push order:
  1. `portfolio_values`
  2. For each affected portfolio `portfolio_positions`
- Options flow:
  - `price_update_interval_seconds` (default 900s, minimum 300s)
  - `enable_price_debug` (limits DEBUG logs to namespace `custom_components.pp_reader.prices.*`)
- Logging and fault tolerance:
  - INFO cycle metadata (symbols_total, batches, quotes_returned, changed, errors, duration_ms, skipped_running)
  - WARN: chunk failures, repeated failures (≥3), zero quotes (deduplicated), currency drift (once per symbol), watchdog >25s
  - ERROR: import failure `yahooquery` → feature disabled
- Currency drift check (single WARN per symbol, no check when currency missing).
- Tests for provider, orchestrator (change/no-change, drift, overlap, error counter reset, migration).

### Changed
- Manifest: added dependency `yahooquery==2.3.7`.
- Minor version bump to 0.10.0.

### Notable Behavior
- Persistence limited to the latest price (`last_price`) + source + fetch timestamp; no history, no additional quote fields.
- Interval recommendation: ≥15 minutes (delayed data, respect rate limits).
- Events only when price actually changes (reduces unnecessary frontend updates).

### Internal
- New modules: `prices.provider_base`, `prices.yahooquery_provider`, `prices.price_service`, `prices.revaluation`.
- Runtime state isolated under `hass.data[DOMAIN][entry_id]` (lock, error counter, drift cache, interval handle).

## [0.9.x] - Earlier
- Preparatory functions for portfolio synchronisation, sensors, and dashboard.
- No live price feature.
