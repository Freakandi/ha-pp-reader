# Portfolio Performance Reader for Home Assistant

Portfolio Performance Reader keeps your Home Assistant instance in sync with a local [Portfolio Performance](https://www.portfolio-performance.info/) `.portfolio` file. It imports your data into SQLite, refreshes live prices, and serves a purpose-built dashboard so automations, sensors, and the UI share one source of truth.

## Highlights
- **Automatic sync**: Watches the `.portfolio` file, parses accounts/portfolios/transactions, and stores them in SQLite.
- **Shared metrics**: Aggregates gains, day-change deltas, coverage, and provenance into canonical snapshots used by sensors, events, and WebSocket responses.
- **Live pricing**: Fetches Yahoo Finance quotes (30-symbol batches, 30 s timeout) and revalues portfolios; FX refresh/backfill keeps EUR conversions current.
- **History-aware dashboard**: Twice-daily price-history jobs and dev-server override keep charts and drilldowns in sync with stored candles.
- **Resilience**: Six-hour rolling backups plus a service to trigger manual snapshots.

## Requirements
- Home Assistant core matching `requirements.txt` (pinned to **2025.11.1** for development/testing).
- Integration version **0.15.0** or newer.
- Access to the `.portfolio` file on the Home Assistant host.
- Optional internet access for Yahoo Finance quotes and the Frankfurter EUR FX API (see [`docs/network-access.md`](docs/network-access.md)).

## Installation
### HACS (recommended)
1. In HACS → **Integrations**, add `Freakandi/ha-pp-reader` as a custom repository if required.
2. Install **Portfolio Performance Reader**.
3. Restart Home Assistant and add the integration via **Settings → Devices & Services → Add Integration**.

### Manual install
1. Download the latest release archive.
2. Copy `custom_components/pp_reader/` into `config/custom_components/` on your Home Assistant instance.
3. Restart Home Assistant and complete the config flow.

### Building dashboard assets from source
Release builds ship bundled assets. From a git checkout:
1. Install Node.js **18.18+** / npm **10+**, then run `npm install`.
2. Build once with `npm run build` (outputs to `custom_components/pp_reader/www/pp_reader_dashboard/js/` and rewrites `dashboard.module.js`).
3. For live edits while HA runs, use `npm run dev` and open `http://127.0.0.1:8123/ppreader?pp_reader_dev_server=http://127.0.0.1:5173`.

## Configuration
1. Start the config flow and select your `.portfolio` file. The wizard validates it with the canonical parser.
2. Accept the default database location (`pp_reader_data/<portfolio>.db` under the HA config directory) or choose a custom path.
3. Adjust options any time:
   - `price_update_interval_seconds` (default 900, min 300).
   - `fx_update_interval_seconds` (default 6 h, min 15 m) to refresh cached FX rates.
   - `enable_price_debug` to raise price-service logging to DEBUG.

### Services
- `pp_reader.trigger_backup_debug` — run from **Developer Tools → Services** to create an immediate backup (mirrors the six-hour cadence).

## Usage
### Sensors and entities
- Portfolio sensors expose purchase sums, current values, gains, and day-change metrics from persisted snapshots.
- Account sensors mirror balances from the `.portfolio` file.
- Status/diagnostic entities surface last import, backup timestamp, and database path.

### Dashboard panel
- Sidebar entry **Portfolio Dashboard** with live updates, highlighted changes, and per-security drilldowns.
- Security detail tabs show cached price history, performance deltas, and FX metadata derived from stored `historical_prices` and snapshots.

### Data & automations
- WebSocket commands (`pp_reader/get_dashboard_data`, `pp_reader/get_accounts`, `pp_reader/get_portfolio_data`, `pp_reader/get_portfolio_positions`, `pp_reader/get_security_snapshot`, `pp_reader/get_security_history`) return the same structured payloads the dashboard consumes. Custom cards should read `average_cost` and `performance` instead of legacy flat fields.
- FX refresh/backfill runs on schedule and after imports; Yahoo history jobs drain twice daily and after imports to keep charts current.

## Troubleshooting
| Symptom | Suggested action |
| --- | --- |
| Config flow fails | Verify file path/permissions and ensure the `.portfolio` file is closed while HA reads it. |
| Prices not updating | Check polling interval (min 300 s) and logs for Yahoo warnings; ensure internet access. |
| Charts empty or stale | Let at least one import finish, confirm history jobs are not failing in diagnostics, and restart HA to reschedule tasks. |
| FX data missing | Lower `fx_update_interval_seconds` or confirm access to `api.frankfurter.app`; review diagnostics. |
| Legacy fields unavailable | Update automations to consume `performance` and `average_cost` blocks; flat `gain_abs`/`avg_price_*` are removed. |

## Further documentation
- [Developer guide](README-dev.md)
- [Architecture](ARCHITECTURE.md)
- [Testing](TESTING.md)
- [Changelog](CHANGELOG.md)
- [Network access](docs/network-access.md)

Need help or found a bug? Open an issue on the [project repository](https://github.com/Freakandi/ha-pp-reader/issues).
