# AI Coding Agent Instructions for ha-pp-reader

Short, concrete guidance so an AI can be productive immediately.

## 1. Purpose & Big Picture
This repo is a Home Assistant custom integration named `pp_reader` (Portfolio Performance Reader). It ingests a compressed `.portfolio` file (Portfolio Performance desktop app export), parses it via protobuf (`name/abuchen/portfolio/client_pb2`), mirrors its contents into an internal SQLite DB, calculates derived financial metrics, and exposes them as Home Assistant sensors plus a custom dashboard panel served as static frontend assets (`custom_components/pp_reader/www/pp_reader_dashboard`).

High‑level flow:
1. Config entry supplies `file_path` (to `.portfolio`) and `db_path` (SQLite). (`config_flow.py` not yet reviewed here, but constants in `const.py`).
2. `async_setup_entry` (`__init__.py`) ensures DB schema → creates coordinator (refresh every minute) → forwards sensor platform → registers websocket commands and custom panel.
3. `PPReaderCoordinator` (`data/coordinator.py`) detects file mtime changes; if changed: parses file (`data/reader.py`), syncs DB (`data/sync_from_pclient.py`), computes account balances, portfolio values & purchase sums, and caches structured dicts under `self.data` for sensors.
4. Sensors (`sensors/*.py`) read coordinator.data and provide HA entities (accounts, portfolio values, purchase sums, gains absolute & percentage).
5. Incremental frontend updates are pushed via HA event bus + websocket commands (`data/websocket.py`, `sync_from_pclient._push_update`).

## 2. Data & Persistence
- SQLite schema lives in `data/db_schema.py`; created via `initialize_database_schema` in `data/db_init.py` using `ALL_SCHEMAS` (only a subset of originally envisioned PP schema is active—many sections commented out). Keep new tables added to `ALL_SCHEMAS`.
- Monetary amounts: stored mostly as integer cents (EUR) or raw PP units (`10^-8` scaling for prices/shares). Conversions to user-facing floats happen late (round to 2 decimals for sensors / events).
- Foreign exchange: tables `fx_rates` managed by functions in `currencies/fx.py` (not fully opened here). When adding metrics needing FX, first ensure rates loaded (`ensure_exchange_rates_for_dates` or sync variant) before computing.

## 3. Parsing & Sync Logic
- `.portfolio` file is a zip containing `data.portfolio`; optional `PPPBV1` header stripped before protobuf parse (`reader.parse_data_portfolio`).
- Main sync: `data/sync_from_pclient.sync_from_pclient` performs diff + upsert for transactions, accounts, securities, portfolios, transaction_units, portfolio_securities. It also derives holdings, purchase values, current values and fires HA events for changed datasets (`accounts`, `last_file_update`, `portfolio_values`).
- Change detection uses row comparisons; deletion handled by `delete_missing_entries` (hard delete of rows missing from current file). Be careful with side effects if you add soft‑delete semantics.

## 4. Coordinator Contract (`PPReaderCoordinator`)
Provides `self.data` dict shaped as:
```
{
  "accounts": { uuid: { name, balance (EUR float), is_retired } },
  "portfolios": { uuid: { name, value (EUR float), count, purchase_sum } },
  "transactions": <list[Transaction] from db_access>,
  "last_update": ISO8601 minute-truncated file mtime
}
```
Update interval: 1 minute. Only reparses when file mtime minute changes vs DB metadata `last_file_update`.
If you extend data, keep structure stable; add new top-level keys rather than mutating existing ones to avoid breaking sensors/frontends.

## 5. Sensors Pattern
- Created once at config entry setup; they depend on keys existing in `coordinator.data`.
- New sensor types: follow pattern in `sensors/*_sensors.py`—inherit `CoordinatorEntity, SensorEntity`, set `_attr_should_poll = False` (unless it derives from other sensors like gain sensors where current design uses polling) and read values from coordinator or dependent sensors. Unique IDs composed via `slugify` on UUID + semantic suffix.
- Gains derive from pairing depot + purchase sensors (zip with `strict=True`). Maintain consistent rounding (2 decimals) and error logging style.

## 6. Currency & FX Conventions
- Raw protobuf price & share values scaled by `10**8`. Normalize with helpers (`normalize_price`, `normalize_shares`).
- Account balances for non‑EUR accounts converted to EUR at latest FX rate during event push; original currency balance also retained internally. When adding multi‑currency computations, replicate this dual representation.

## 7. Error Handling & Logging
- Use `_LOGGER.exception` for unexpected errors (stack trace) and `_LOGGER.info` / `_LOGGER.debug` for progress. Emojis are currently used in logs; keep style consistent (do not remove existing ones broadly in automated changes; additions optional but restrained).
- Raise `ConfigEntryNotReady` for transient init failures; let HA retry.

## 8. Developer Workflow
Setup:
```
./scripts/setup_container   # installs system deps, creates .venv, installs requirements
source .venv/bin/activate    # activate (Codex: may need after container start)
./scripts/develop            # run HA using global hass
./scripts/codex_develop      # run HA using venv hass (ensures correct binary)
./scripts/lint               # ruff format + fix
```
Edge Debugging: `.vscode/launch.json` provides compound configs to launch/attach Edge + DevTools for the custom panel at `/ppreader` (frontend js at `/pp_reader_dashboard/panel.js`).

## 9. Branch & Release Conventions
- Active development on `dev`; `main` holds released versions.
- To release: PR from `dev` → `main`, ensuring `custom_components/pp_reader/` content reflects desired release (preserve file histories when copying/moving). Update version in `manifest.json` if present (not shown above—check before release).

## 10. Adding Features Safely
When adding a derived metric:
1. Add necessary DB columns or new table → append creation SQL to appropriate schema list and `ALL_SCHEMAS`.
2. Extend sync logic to populate it (keep transactions inside explicit `BEGIN TRANSACTION` and commit strategy; rollback on exceptions).
3. Expose via coordinator (avoid breaking existing keys) or dedicated websocket command.
4. Add sensor(s) referencing new coordinator keys.
5. Ensure FX preloading if cross‑currency.

## 11. Websocket & Frontend Integration
- Websocket commands registered in `__init__.py` (see `data/websocket.py`)—add new ones via `websocket_api.async_register_command` before first use.
- Live updates rely on HA event `EVENT_PANELS_UPDATED`; payload format: `{ domain: "pp_reader", entry_id, data_type, data }`. Reuse `_push_update` to keep thread safety.

## 12. Style & Tooling
- Python 3.13 (see `setup_container` and requirements). Use Ruff for lint + formatting; prefer fixing issues via `./scripts/lint` rather than ad‑hoc reformatting.
- Avoid large-scale stylistic rewrites in automation unless explicitly requested.

## 13. Common Pitfalls
- Forgetting to ensure FX rates before computing multi-currency metrics → zero or incorrect EUR values.
- Mutating coordinator.data shape after sensors are created → attribute errors.
- Not updating `ALL_SCHEMAS` when adding a new table → table never created.
- Creating sensors before first coordinator refresh completes (ensure `async_config_entry_first_refresh` already called in setup flow as is).

## 14. Quick Reference Key Files
- Integration entry: `custom_components/pp_reader/__init__.py`
- Constants: `custom_components/pp_reader/const.py`
- Data orchestration: `custom_components/pp_reader/data/coordinator.py`
- Parse & Sync: `data/reader.py`, `data/sync_from_pclient.py`
- DB Schema & Init: `data/db_schema.py`, `data/db_init.py`
- Logic calculations: `logic/portfolio.py`, `logic/accounting.py`, `logic/securities.py`
- Sensors: `sensors/*.py`
- Frontend assets: `www/pp_reader_dashboard/`
- Scripts: `scripts/` (env, run, lint)

Feedback welcome: Identify unclear sections (e.g., additional websocket command behaviors, FX module details) and request elaboration to refine this doc.
