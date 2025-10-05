# Portfolio Performance Reader for Home Assistant

Portfolio Performance Reader syncs your local [Portfolio Performance](https://www.portfolio-performance.info/) export with Home Assistant. It ingests `.portfolio` files, keeps a dedicated SQLite database in `/config/pp_reader_data`, refreshes live prices, and exposes consolidated sensors alongside a custom dashboard panel.

## Overview
- Imports accounts, portfolios, and transactions from Portfolio Performance on every file change.
- Stores the latest live quote per security and aggregates totals directly from SQLite so sensors, services, and the dashboard all use the same data pipeline.
- Ships a sidebar dashboard that streams live updates via WebSockets, including detail views for individual securities with daily close history charts.
- Runs entirely on your Home Assistant host; external requests are limited to the optional pricing providers you enable.

## Features
- **Automatic portfolio sync:** Watches your `.portfolio` file, normalises identifiers, and mirrors portfolio/account balances in Home Assistant entities.
- **Live valuations with Yahoo Finance:** Fetches current quotes through `yahooquery`, recalculates affected portfolios, and emits compact update events only when prices change.
- **Security drilldowns:** Security tabs show snapshot metrics (current value, gains, holdings) and chart historic closes captured during each import.
- **Built-in dashboard panel:** Adds a persistent "Portfolio Dashboard" sidebar entry with streaming updates, expandable portfolio tables, and detail navigation.
- **Resilient storage:** Maintains six-hour rolling backups of the integration database and offers a manual service to trigger extra snapshots.

## Requirements
- Home Assistant **2025.4.1** or newer when installed via HACS (matches the integration manifest).
- Portfolio Performance Reader **0.12.0** or later.
- Access to at least one Portfolio Performance `.portfolio` file from your Home Assistant host.
- Optional outbound internet access for Yahoo Finance quotes (`yahooquery`) and the Frankfurter EUR FX API.

## Installation
### HACS (recommended)
1. In HACS → **Integrations**, add `Freakandi/ha-pp-reader` as a custom repository if it is not already listed.
2. Install **Portfolio Performance Reader**.
3. Restart Home Assistant, then go to **Settings → Devices & Services → Add Integration** and search for "Portfolio Performance Reader".

### Manual install
1. Download the latest release archive from GitHub.
2. Copy `custom_components/pp_reader/` into `config/custom_components/` inside your Home Assistant instance.
3. Restart Home Assistant and add the integration through **Settings → Devices & Services**.

### Building dashboard assets from source
Releases include pre-built dashboard bundles. When working from a git checkout:
1. Install Node.js **18.18+** and npm **10+**.
2. Run `npm install` to install the frontend toolchain.
3. Use `npm run build` to compile the TypeScript dashboard into `custom_components/pp_reader/www/` or `npm run dev` for a watch build while Home Assistant runs.

## Configuration
1. Start the config flow and supply the absolute path to your `.portfolio` file. The wizard validates the file before continuing.
2. Accept the default database path (`/config/pp_reader_data/<portfolio>.db`) or choose a custom directory.
3. Review the integration options (accessible after setup):
   - **Live price interval:** `price_update_interval_seconds` (default 900 seconds, minimum 300 seconds).
   - **Price debug logging:** `enable_price_debug` limits verbose logs to the pricing namespace.

### Services
- `pp_reader.trigger_backup_debug` – run from **Developer Tools → Services** to create an immediate database backup.

## Usage
### Sensors and entities
- Portfolio value sensors expose current value, purchase sum, and gains in EUR for each portfolio.
- Account balance sensors mirror the accounts from Portfolio Performance.
- Last file update and backup sensors surface sync status information for automations.

### Dashboard panel
- The sidebar entry **Portfolio Dashboard** lists all portfolios with live updates, includes total footers, and highlights updated rows.
- Clicking a portfolio position opens a security detail tab with snapshot metrics, range selectors (`1W`…`ALL`), and SVG charts powered by the stored daily closes.

### Historical data
- Daily close prices for tracked securities are persisted during every import. The dashboard and WebSocket APIs reuse this data to render charts without contacting external providers.

## Troubleshooting
| Symptom | Suggested action |
| --- | --- |
| Config flow reports "file not found" or "parse failed" | Confirm the Home Assistant host can access the path, the `.portfolio` export is recent, and Portfolio Performance is closed while Home Assistant reads the file. |
| Live prices stop updating | Check the options flow for the polling interval (minimum 300 seconds) and inspect logs for Yahoo Finance warnings before lowering the interval. |
| Dashboard totals or charts look stale | Ensure Home Assistant is running (price tasks trigger on schedule) and review the logs for database errors or WebSocket warnings. Restarting Home Assistant reschedules the price coordinator. |
| Security detail tab shows empty charts | Verify that the integration has completed at least one import since updating to v0.12.0 and that the Portfolio Performance file includes securities with historical data. |

## Further documentation
- [Architecture](ARCHITECTURE.md) – module responsibilities and data flow diagrams.
- [Testing guide](TESTING.md) – reproducible QA instructions.
- [Developer guide](README-dev.md) – environment setup, coding standards, and release process for contributors.
- [Changelog](CHANGELOG.md) – version-specific behaviour changes.

For help or to report issues, open a ticket on the [project repository](https://github.com/Freakandi/ha-pp-reader/issues).
