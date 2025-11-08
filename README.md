# Portfolio Performance Reader for Home Assistant

Portfolio Performance Reader keeps your Home Assistant instance in sync with the data from your local [Portfolio Performance](https://www.portfolio-performance.info/) `.portfolio` file. The integration watches your export, mirrors accounts and portfolios into a dedicated SQLite database, refreshes live prices, and ships a purpose-built dashboard panel so automations and the UI all rely on the same dataset.

## Overview
- Imports accounts, portfolios, transactions, and historic closes whenever the `.portfolio` file changes.
- Stores the latest quote per security and recalculates portfolio totals from SQLite so sensors, WebSocket clients, and the dashboard all see the same figures.
- Exposes structured payloads for holdings (`aggregation`/`average_cost`) and performance metrics that power sensors, WebSocket responses, and dashboard tables.
- Persists aggregated portfolio, account, and security metrics (plus run metadata) in dedicated SQLite tables so diagnostics, events, and WebSocket consumers reuse a single source of truth.
- Normalises every metric run into canonical snapshots stored in the `portfolio_snapshots` and `account_snapshots` tables, so downstream consumers fetch a consistent structure even after Home Assistant restarts.
- Runs entirely on your Home Assistant host; the only outbound traffic comes from optional pricing providers such as Yahoo Finance or the Frankfurter FX API.
- Queues enrichment jobs after each import: FX rates are cached in SQLite, and Yahoo history fetches populate the `historical_prices` table for offline dashboards.

## Features
- **Automatic portfolio sync:** Watches the configured `.portfolio` file, normalises identifiers, and mirrors portfolio/account balances as Home Assistant entities.
- **Shared performance metrics:** An asynchronous metrics pipeline (under `custom_components/pp_reader/metrics/`) aggregates gains, day-change deltas, coverage, and provenance into dedicated tables so automations, events, and the dashboard all read the exact snapshot that was persisted.
- **Security drilldowns:** Dashboard tabs provide daily close charts, performance breakdowns, and snapshot metrics for every security with stored history.
- **Built-in dashboard panel:** Adds a persistent "Portfolio Dashboard" sidebar entry with live updates, expandable tables, and navigation to per-security details.
- **Resilient storage:** Maintains six-hour rolling backups of the integration database and exposes a manual service for on-demand snapshots.
- **Asynchronous enrichment pipeline:** Refreshes Frankfurter FX rates and Yahoo price history in the background, persisting provenance metadata so charts and metrics keep working when the upstream APIs are temporarily unavailable.

## Canonical snapshots & events
Portfolio Performance Reader now delivers sensor, WebSocket, and dashboard payloads from a normalization layer housed in `custom_components/pp_reader/data/normalization_pipeline.py`.

- Every metrics run persists canonical `PortfolioSnapshot` and `AccountSnapshot` payloads into `portfolio_snapshots` and `account_snapshots`, keyed by the originating `metric_run_uuid`. The snapshots contain the same rounded figures, coverage metadata, and provenance strings presented in the UI, which makes replays and diagnostics deterministic.
- WebSocket commands (`pp_reader/get_dashboard_data`, `pp_reader/get_accounts`, `pp_reader/get_portfolio_data`, `pp_reader/get_portfolio_positions`, `pp_reader/get_security_snapshot`, and `pp_reader/get_security_history`) hydrate their responses from these snapshots, so the dashboard always receives the same schema regardless of which backend module requested the data.
- Event push helpers (`custom_components/pp_reader/data/event_push.py`) broadcast incremental updates over Home Assistant's `EVENT_PANELS_UPDATED` bus topic with a `data_type` discriminator (`accounts`, `portfolio_values`, `portfolio_positions`, `security_snapshot`, or `security_history`). The dashboard subscribes to those events and patches tables without polling.
- Diagnostics now include a `normalized_payload` entry that mirrors the serialized normalization result for the last metric run, making it easy to compare backend payloads with what the UI renders or what CLI tools fetch.

## Requirements
- Home Assistant **2025.4.1** or newer when installed via HACS (matches the integration manifest).
- Portfolio Performance Reader **0.14.0** or later.
- Access to at least one Portfolio Performance `.portfolio` file on the Home Assistant host.
- Optional outbound internet access if you enable live quotes via Yahoo Finance (`yahooquery`) or the Frankfurter EUR FX API (see [`docs/network-access.md`](docs/network-access.md)).

## Installation
### HACS (recommended)
1. In HACS → **Integrations**, add `Freakandi/ha-pp-reader` as a custom repository if needed.
2. Install **Portfolio Performance Reader**.
3. Restart Home Assistant, then go to **Settings → Devices & Services → Add Integration** and search for "Portfolio Performance Reader".

### Manual install
1. Download the latest release archive from GitHub.
2. Copy `custom_components/pp_reader/` into `config/custom_components/` on your Home Assistant instance.
3. Restart Home Assistant and add the integration through **Settings → Devices & Services**.

### Building dashboard assets from source
Release packages include pre-built dashboard bundles. When working from a git checkout:
1. Install Node.js **18.18+** and npm **10+**.
2. Run `npm install` once to install the frontend toolchain.
3. Use `npm run build` to compile the dashboard into `custom_components/pp_reader/www/` or `npm run dev` for a watch build while Home Assistant runs.

## Configuration
1. Start the config flow and supply the absolute path to your `.portfolio` file. The wizard validates the file before continuing.
2. Accept the default database path (`/config/pp_reader_data/<portfolio>.db`) or choose a custom directory.
3. Finish the setup and review the options (accessible after onboarding):
   - **Live price interval** – `price_update_interval_seconds` (default 900 seconds, minimum 300 seconds).
   - **FX refresh interval** – `fx_update_interval_seconds` (default 6 hours, minimum 15 minutes) controls how often cached FX rates are refreshed for non-EUR accounts and purchases.
   - **Price debug logging** – `enable_price_debug` narrows verbose logs to the pricing namespace.

### Services
- `pp_reader.trigger_backup_debug` — run from **Developer Tools → Services** to create an immediate database backup (mirrors the six-hour rolling snapshots).

## Usage
### Sensors and entities
- Portfolio sensors expose current value, purchase sums, unrealised gains, and day-change metrics sourced from the persisted `portfolio_metrics` rows referenced by the shared `performance` payload.
- Account sensors mirror account balances from the `.portfolio` file.
- Status sensors surface the last successful import, last backup timestamp, and database path for automations.

### Dashboard panel
- The sidebar entry **Portfolio Dashboard** lists all portfolios with live updates, totals, and highlight effects when rows change.
- Selecting a position opens a security detail tab with range selectors (`1W`…`ALL`), performance deltas, and SVG charts generated from the stored daily closes.

### Automations & data consumers
- WebSocket commands (`pp_reader/get_dashboard_data`, `pp_reader/get_portfolio_data`, `pp_reader/get_accounts`, `pp_reader/get_security_snapshot`, `pp_reader/get_security_history`) deliver the same structured payloads used by the dashboard. Custom cards or automations can subscribe to identical gain, day-change, and average-cost metrics without reimplementing calculations.
- Legacy flat fields (`avg_price_security`, `avg_price_account`, `gain_abs`, `gain_pct`, `day_price_change_*`) were removed in v0.14.0. Update custom automations to rely on the `average_cost` and `performance` blocks instead.

### FX & price enrichment
- After every import the coordinator schedules an FX refresh (Frankfurter) and queues Yahoo price-history jobs. Rates are persisted in the `fx_rates` table with provenance metadata; completed candles land in `historical_prices` and surface on the dashboard without additional API calls.
- Enrichment telemetry is exposed under **Settings → Devices & Services → Portfolio Performance Reader → Diagnostics**. The JSON download lists the latest FX fetch, queued jobs, recent failures, and the most recent metrics run (including processed counts and coverage summaries) to aid troubleshooting.
- Adjust the FX cadence from the options flow if you need more frequent updates during trading hours or slower refreshes for offline environments.

### Metrics diagnostics & CLI tooling
- Download diagnostics after an import to inspect `metrics.latest_run`, `metrics.recent_runs`, and coverage summaries for `portfolio_metrics`, `account_metrics`, and `security_metrics`. Use this data to verify that dashboard totals match the stored snapshot before debugging automations or UI regressions.
- `python scripts/enrichment_smoketest.py --portfolio <path> --database <path>` replays the parser → enrichment → metrics pipeline outside of Home Assistant. The script prints progress per stage, stores the resulting metrics tables, and dumps diagnostics so you can spot ingestion or coverage issues quickly.

### Historical data & backups
- Daily close prices for tracked securities are persisted on every import so charts and WebSocket consumers work offline once data is captured.
- The integration keeps rolling backups of the SQLite database in `/config/pp_reader_data/backups`; trigger `pp_reader.trigger_backup_debug` before risky maintenance to capture an additional snapshot.

## Troubleshooting
| Symptom | Suggested action |
| --- | --- |
| Config flow reports "file not found" or "parse failed" | Confirm the Home Assistant host can access the path, the `.portfolio` export is recent, and Portfolio Performance is closed while Home Assistant reads the file. |
| Live prices stop updating | Check the options flow for the polling interval (minimum 300 seconds) and inspect logs for Yahoo Finance warnings before lowering the interval. |
| Dashboard totals or charts look stale | Ensure Home Assistant is running (price tasks trigger on schedule) and review the logs for database errors or WebSocket warnings. Restarting Home Assistant reschedules the price coordinator. |
| Security detail tab shows empty charts | Verify that the integration has completed at least one import since upgrading and that the Portfolio Performance file contains securities with historical data. |
| Automations no longer see `gain_abs` or `avg_price_*` fields | Update automations to consume the structured `performance` and `average_cost` payloads exposed by sensors, WebSocket responses, and events. |
| FX diagnostics show no recent refresh | Download the integration diagnostics and confirm `fx.last_refresh` updates after the scheduled interval. Reduce the FX interval or check network access to `api.frankfurter.app` if the timestamp stays `null`. |
| Price history queue reports failures | Diagnostics include the last five failed jobs. Clean up invalid symbols in Portfolio Performance or temporarily disable Yahoo updates until the upstream responds again. |

## Further documentation & support
- [Developer guide](README-dev.md) — environment setup, contribution workflow, and release process.
- [Architecture](ARCHITECTURE.md) — module responsibilities and data flow.
- [Testing guide](TESTING.md) — QA workflows and fixtures.
- [Changelog](CHANGELOG.md) — version history and behaviour changes.
- [Network access](docs/network-access.md) — overview of optional outbound requests.

Need help or spotted an issue? Open a ticket on the [project repository](https://github.com/Freakandi/ha-pp-reader/issues).
