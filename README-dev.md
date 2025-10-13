# Developer Guide – Portfolio Performance Reader

This document targets contributors working on the Portfolio Performance Reader integration. It complements the user-facing [README](README.md) as well as in-depth references such as [ARCHITECTURE.md](ARCHITECTURE.md) and [TESTING.md](TESTING.md).

## Repository layout
Runtime code resides in `custom_components/pp_reader/` with dedicated packages for configuration flows, database access, pricing, and the dashboard assets that ship with the integration. Supporting assets live at the repository root.

| Path | Purpose |
| --- | --- |
| `custom_components/pp_reader/` | Integration entry points, config flow, Yahoo Finance polling, SQLite helpers, WebSocket handlers, and compiled dashboard bundles. |
| `src/` | TypeScript sources compiled into `custom_components/pp_reader/www/pp_reader_dashboard/`. |
| `scripts/` | Helper scripts for setup, development server management, linting, and release preparation. |
| `tests/` | Pytest suite plus lightweight Node-based dashboard smoke tests. |
| `config/` | Sample Home Assistant configuration seeded by `./scripts/develop`. |

## Development environment setup
1. Run `./scripts/setup_container` (preferred) to install system packages, create `.venv`, and install runtime dependencies from `requirements.txt`.
2. Activate the virtual environment in every new shell via `source .venv/bin/activate`.
3. Install contributor extras when you plan to run tests: `pip install -r requirements-dev.txt`.
4. For bare environments without virtualenv support, `./scripts/environment_setup` installs the same dependencies globally.
5. Confirm the Home Assistant version pinned for development: `python -c "import homeassistant.const as c; print(c.__version__)"` should output `2025.2.4`.

Additional setup variations (Windows, devcontainers) are covered in [TESTING.md §2](TESTING.md).

### Useful scripts
| Command | Description |
| --- | --- |
| `./scripts/develop` | Starts Home Assistant using the local integration, seeds `config/`, and exports the dashboard so you can test UI changes in <http://127.0.0.1:8123>. |
| `./scripts/codex_develop` | Alternate launcher that runs Home Assistant with the virtualenv Python binary for shells where activation is inconvenient. |
| `./scripts/lint` | Runs `ruff format .` followed by `ruff check . --fix`. |
| `./scripts/prepare_main_pr.sh` | Generates a clean worktree with release artefacts when preparing pull requests against `main`. |

## Working on the backend
- The integration bootstraps state under `hass.data[DOMAIN][entry_id]` and relies on `fetch_live_portfolios` to aggregate data for WebSocket commands and events. Schema changes must keep this helper in sync.
- Live pricing uses `yahooquery` with a minimum polling interval of 300 seconds. Respect the coordinator locks and logging expectations when adjusting the price service or revaluation logic.
- The SQLite layer persists portfolio mirrors as well as daily close history for securities. Imports run diff-based updates, and automatic backups create snapshots every six hours; manual backups are exposed through `pp_reader.trigger_backup_debug`.
- Gains, losses, and day-change deltas are centralised in `custom_components/pp_reader/data/performance.py`. Call `select_performance_metrics` (and its `DayChangeMetrics` helpers) with holdings and totals sourced from `HoldingsAggregation` so WebSocket responses, coordinator events, and sensors stay aligned. Avoid reimplementing rounding or FX fallbacks outside this module.
- `portfolio_securities` stores EUR-denominated purchase totals (`purchase_value`, `avg_price`) alongside native totals and per-share averages (`avg_price_native`, `security_currency_total`, `account_currency_total`). These values feed `compute_holdings_aggregation`/`select_average_cost`, which populate the structured `aggregation` and `average_cost` payloads exposed over WebSockets and events. Legacy columns such as `avg_price_security` or `avg_price_account` remain in the database for historical data but must not leak back into payloads.
- Canonical purchase samples (SSR Mining CAD vs. EUR and Harmonic Drive JPY) are documented in `.docs/fix_native_purchase.md`. The dataset mirrors the fixtures used in the FIFO regression tests and is safe to reference when validating new currency scenarios.

## Frontend workflow
The dashboard is authored in TypeScript and built with Vite. Bundles live in `custom_components/pp_reader/www/pp_reader_dashboard/js/` and are referenced by `dashboard.module.js`.

1. Install Node.js **18.18+** and npm **10+**, then run `npm install` once.
2. Use `npm run dev` to launch Vite for hot module reloads while Home Assistant runs. Open <http://127.0.0.1:8123/ppreader?pp_reader_dev_server=http://127.0.0.1:5173> to stream assets directly from the dev server. Append `?pp_reader_dev_server=disable` to fall back to bundled assets.
3. Run `npm run build` for production bundles; the script updates `dashboard.module.js` with the latest hashed filename and regenerates the published `panel.js`, so the runtime picks up changes such as the new stylesheet versioning logic.
4. Auxiliary commands: `npm run typecheck` (strict `tsc --noEmit`) and `npm run lint:ts` (ESLint ruleset for `src/`).

The security detail tab introduced in v0.12.0 consumes WebSocket commands `pp_reader/get_security_snapshot` and `pp_reader/get_security_history` to render snapshots and SVG charts using the imported daily close data. Keep these APIs backward compatible when evolving the dashboard.

## Testing & quality checks
Follow the recommended sequence before submitting a pull request:

```bash
./scripts/lint
pytest -q
pytest --cov=custom_components/pp_reader --cov-report=term-missing
python -m script.hassfest  # optional
```

- Pytest relies on fixtures from `pytest-homeassistant-custom-component`; ensure the virtualenv is active and `requirements-dev.txt` is installed.
- Frontend smoke tests live under `tests/frontend/` and execute Node scripts (powered by `jsdom`) to validate dashboard bundles.
- For verbose logging during async tests, invoke `pytest -vv -o log_cli=true --log-cli-level=INFO`.
- FIFO coverage for the native average purchase price lives in `tests/test_logic_securities_native_avg.py`, and targeted regression tests for the SSR Mining and Harmonic Drive samples reside in `tests/test_logic_securities.py`. Update both when adjusting purchase calculations or currency handling so the documented reference transactions remain accurate.

More background on the available fixtures and test structure is available in [TESTING.md](TESTING.md).

## Linting toolchain

### Python (Ruff)
- Configuration lives in [`.ruff.toml`](.ruff.toml) and mirrors the Home Assistant core profile (`select = ["ALL"]`). Expect Ruff to report findings across both runtime code and the test suite until those areas have been brought up to standard.
- Run `./scripts/lint` for the canonical formatter + linter combo or call `ruff format .` / `ruff check .` directly inside the virtual environment.

### TypeScript (ESLint)
- Rules are defined in [`eslint.config.js`](eslint.config.js) using the flat-config API. The project extends `eslint:recommended` and `plugin:@typescript-eslint/recommended` while adding local overrides for consistent type-only imports and unused variable handling.
- Install Node dependencies with `npm install`, then execute `npm run lint:ts` to lint all dashboard sources under `src/`.
- Jest-style dashboard tests under `src/**/__tests__/` are configured to allow un-awaited promise helpers so snapshot utilities continue to work without excessive boilerplate.
- Execute the TypeScript unit tests with `npm test`; the script runs the Node test runner via `tsx` so `.test.ts` and `.test.tsx` files under `src/` are transpiled automatically.

### Development environment settings
- **VSCode**
  1. Accept the recommended extensions when prompted (`charliermarsh.ruff` and `dbaeumer.vscode-eslint`).
  2. Ensure the interpreter selector (`Ctrl`+`Shift`+`P` → “Python: Select Interpreter”) points at `${workspaceFolder}/.venv/bin/python`.
  3. Keep `eslint.experimental.useFlatConfig` enabled and verify TypeScript files use ESLint as the default formatter. These workspace settings live in [`.vscode/settings.json`](.vscode/settings.json); adjust them via “Preferences: Open Workspace Settings (JSON)” if you prefer manual edits.
- **Codex environment / devcontainer**
  - The devcontainer bootstrap (`.devcontainer.json`) now runs `scripts/setup_VSC`, installs `requirements-dev.txt`, and executes `npm install` so both Ruff and ESLint have their dependencies immediately after `Dev Containers: Rebuild and Reopen in Container`.
  - If you are using the Codex execution environment outside of VSCode, run the same commands manually: `./scripts/setup_container`, `pip install -r requirements-dev.txt`, and `npm install`.
  - Both environments share the same workspace settings, so no additional Codex-specific toggles are required beyond using the `.venv` interpreter and keeping the Node dependencies up to date.

## Coding standards
- Ruff is the canonical formatter and linter for Python; do not mix alternative formatters.
- TypeScript code must pass the ESLint configuration and strict type checking via `npm run typecheck`.
- Documentation updates should accompany behavioural changes so that `README.md`, `README-dev.md`, and `CHANGELOG.md` stay accurate.
- All documentation must remain in English.

## Release process
1. Develop features on topic branches and target pull requests at `dev`. Maintainers promote `dev` to `main` when publishing releases.
2. Run `./scripts/prepare_main_pr.sh` to create a clean worktree containing release artefacts before opening a release PR.
3. Bump the integration version in `custom_components/pp_reader/manifest.json` and update `CHANGELOG.md` as part of the release commit.

## Architecture highlights for contributors
- `fetch_live_portfolios` is the single source of truth for portfolio totals; WebSocket responses, price events, and the dashboard footer all consume its output.
- WebSocket commands (`pp_reader/get_dashboard_data`, `pp_reader/get_portfolio_data`, `pp_reader/get_accounts`, `pp_reader/get_security_snapshot`, `pp_reader/get_security_history`) must handle coordinator fallbacks and return aggregated data sourced from SQLite.
- Daily close history stored during sync powers the security charts. Migrations or schema changes must ensure historical data and backups remain restorable across upgrades.
- The shared `performance` payload (gain/percentage totals plus optional `day_change` details) flows unchanged from `select_performance_metrics` through database helpers, WebSocket serializers, event push, and frontend caches. Legacy flat fields such as `gain_abs`, `gain_pct`, or `day_price_change_*` have been removed from payloads; update all consumers together when evolving the structure.

## Additional resources
- [ARCHITECTURE.md](ARCHITECTURE.md) – module responsibilities and data flow diagrams.
- [TESTING.md](TESTING.md) – QA workflows, fixtures, and script documentation.
- [CHANGELOG.md](CHANGELOG.md) – release history and behavioural changes.
