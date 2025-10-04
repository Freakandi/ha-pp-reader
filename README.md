# Portfolio Performance Reader for Home Assistant

Portfolio Performance Reader brings your local Portfolio Performance (`.portfolio`) file into Home Assistant with live prices, consolidated sensors, and a purpose-built dashboard panel. The integration parses your portfolios on the server, keeps a dedicated SQLite database in sync, and surfaces aggregated values to both the UI and automations.【F:ARCHITECTURE.md†L29-L44】

## Features
- **End-to-end portfolio sync** – Parses Portfolio Performance protobuf data, mirrors accounts, portfolios, and gains into Home Assistant, and exposes them through sensors and the dashboard.【F:ARCHITECTURE.md†L29-L44】【F:ARCHITECTURE.md†L47-L100】
- **Live valuation with Yahoo Finance** – Uses `yahooquery` to fetch the latest quotes, stores the most recent price only, and revalues affected portfolios before pushing compact Home Assistant events.【F:ARCHITECTURE.md†L32-L35】【F:CHANGELOG.md†L82-L105】
- **Single source of truth aggregation** – `fetch_live_portfolios` aggregates up-to-date values directly from SQLite for WebSocket responses, events, and the dashboard footer.【F:CHANGELOG.md†L8-L15】【F:custom_components/pp_reader/data/db_access.py†L428-L486】
- **Automatic resilience** – Six-hour rolling backups protect the portfolio database, and a manual service lets you trigger an immediate snapshot when needed.【F:ARCHITECTURE.md†L32-L35】【F:custom_components/pp_reader/data/backup_db.py†L28-L93】【F:custom_components/pp_reader/services.yaml†L1-L4】
- **Custom dashboard panel** – Registers a sidebar entry (`Portfolio Dashboard`) that streams portfolio updates via WebSockets and refreshes DOM totals without client-side caches.【F:custom_components/pp_reader/__init__.py†L121-L199】【F:CHANGELOG.md†L12-L15】

## Requirements
- Home Assistant **2025.4.1** or newer for HACS-managed installs.【F:hacs.json†L1-L8】
- Integration version **0.11.0** (see `manifest.json`).【F:custom_components/pp_reader/manifest.json†L1-L25】
- A Portfolio Performance desktop export (`.portfolio`) accessible to Home Assistant.
- Optional internet access for Yahoo Finance prices (`yahooquery`) and EUR FX rates (Frankfurter API).【F:ARCHITECTURE.md†L32-L35】【F:ARCHITECTURE.md†L112-L124】

## Installation
### Via HACS (recommended)
1. In HACS → Integrations, add this repository (`Freakandi/ha-pp-reader`) as a custom repository if it is not listed automatically.【F:hacs.json†L1-L8】
2. Install **Portfolio Performance Reader** and restart Home Assistant.
3. After restart, navigate to **Settings → Devices & Services → Add Integration** and search for "Portfolio Performance Reader".

### Manual installation
1. Download the latest release archive.
2. Copy `custom_components/pp_reader/` into your Home Assistant `config/custom_components/` directory, preserving the folder structure shown below.【F:ARCHITECTURE.md†L47-L100】
3. Restart Home Assistant and add the integration through **Settings → Devices & Services**.

### Building the dashboard assets (from source checkouts)
- Releases ship with compiled dashboard files under `custom_components/pp_reader/www/`, so most users do not need to run the Node build chain.
- When working from a git checkout or tweaking the TypeScript sources under `src/`, install Node.js **18.18** (or newer) and npm **10+** to satisfy the repository engines.
- Run `npm install` once to install the toolchain, then rebuild the dashboard with `npm run build`. The command compiles the TypeScript entrypoints via Vite and refreshes `dashboard.module.js` to reference the latest hashed artifact.
- For iterative development, `npm run dev` keeps Vite in watch mode and writes updated bundles directly into the Home Assistant `www` directory served by this integration.

## Configuration
1. Start the config flow and provide the path to your `.portfolio` file. The wizard validates that the file exists and can be parsed before continuing.【F:custom_components/pp_reader/config_flow.py†L43-L99】
2. Choose whether to use the default database location (`/config/pp_reader_data/<portfolio>.db`) or supply a custom directory.【F:custom_components/pp_reader/config_flow.py†L84-L155】
3. After setup, open the integration options to adjust:
   - `price_update_interval_seconds` (default 900 s, minimum 300 s).【F:custom_components/pp_reader/config_flow.py†L159-L244】
   - `enable_price_debug` to confine verbose logging to the price namespace.【F:custom_components/pp_reader/config_flow.py†L162-L244】【F:custom_components/pp_reader/manifest.json†L19-L24】

> **Tip:** Respect Yahoo Finance rate limits—intervals of 15 minutes or more avoid throttling while still keeping valuations fresh.【F:CHANGELOG.md†L101-L104】

## Usage
- **Sensors:** The integration creates sensors for portfolio values, purchase sums, gains, and account balances. Names follow your Portfolio Performance entities and surface aggregated totals in EUR.【F:ARCHITECTURE.md†L29-L44】【F:ARCHITECTURE.md†L47-L95】
- **Dashboard panel:** Look for **Portfolio Dashboard** in the sidebar. It loads live data via WebSockets and updates automatically when price events or file syncs run.【F:custom_components/pp_reader/__init__.py†L121-L199】【F:CHANGELOG.md†L12-L15】
- **Backups:** Automatic backups run every six hours; trigger `pp_reader.trigger_backup_debug` to create an immediate snapshot (e.g., via Developer Tools → Services).【F:custom_components/pp_reader/data/backup_db.py†L28-L93】【F:custom_components/pp_reader/services.yaml†L1-L4】

## Troubleshooting
| Symptom | Suggested action |
| --- | --- |
| Config flow reports "file not found" or "parse failed" | Verify the Home Assistant host can read the `.portfolio` file path and that the export is up to date.【F:custom_components/pp_reader/config_flow.py†L62-L99】 |
| Live prices stop updating | Check the integration options for the polling interval (minimum 300 s) and review the Home Assistant logs for Yahoo Finance warnings before lowering the interval further.【F:custom_components/pp_reader/config_flow.py†L159-L244】【F:CHANGELOG.md†L101-L104】 |
| Dashboard shows stale totals | Ensure Home Assistant is running (background price task executes on schedule) and inspect logs for database errors from `fetch_live_portfolios`. The helper returns an empty list if SQLite queries fail and logs the exception for easier diagnosis.【F:custom_components/pp_reader/__init__.py†L93-L174】【F:custom_components/pp_reader/data/db_access.py†L428-L486】 |

## Further documentation
- [Architecture](ARCHITECTURE.md) – deep dive into modules and data flow.
- [Testing guide](TESTING.md) – reproducible QA workflow.
- [Developer guide](README-dev.md) – development setup, coding standards, and release process.
