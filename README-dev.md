# Developer Guide – Portfolio Performance Reader

This guide targets contributors working on the Portfolio Performance Reader integration. Pair it with the user-facing [README](README.md) plus the in-depth references in [ARCHITECTURE.md](ARCHITECTURE.md), [TESTING.md](TESTING.md), and [`docs/network-access.md`](docs/network-access.md).

## Repository layout
| Path | Purpose |
| --- | --- |
| `custom_components/pp_reader/` | Integration entry points, config flow, pricing providers, SQLite helpers, WebSocket handlers, sensors, services, and compiled dashboard bundles. |
| `src/` | TypeScript sources compiled into `custom_components/pp_reader/www/pp_reader_dashboard/`. |
| `scripts/` | Helper scripts for environment bootstrap, running Home Assistant, linting, TypeScript tests, and release preparation. |
| `tests/` | Pytest suite plus Node-based dashboard smoke tests. |
| `config/` | Sample Home Assistant configuration seeded by `./scripts/develop`. |
| `docs/` & `pp_reader_dom_reference.md` | Supplemental references (network access, DOM data contracts, etc.). |

## Quick start
1. Run `./scripts/setup_container` (preferred) to install system packages, create `.venv`, and install runtime dependencies from `requirements.txt`.
2. Activate the virtual environment in every new shell: `source .venv/bin/activate`.
3. Install contributor extras before running tests: `pip install -r requirements-dev.txt`.
4. Install Node.js **18.18+** / npm **10+**, then execute `npm install` for the frontend toolchain.
5. For bare environments without virtualenv support, `./scripts/environment_setup` installs the Python dependencies globally.
6. Verify the pinned Home Assistant version when debugging core issues: `python -c "import homeassistant.const as c; print(c.__version__)"` should output `2025.2.4`.

Additional platform-specific hints (Windows, devcontainers, Codex) live in [TESTING.md §2](TESTING.md).

### Useful scripts
| Command | Description |
| --- | --- |
| `./scripts/develop` | Starts Home Assistant against the local integration, ensures `/config` is linked, and streams dashboard assets for live reload. |
| `./scripts/develop_VSC` / `./scripts/codex_develop` | Variants that wrap the launcher for VSCode or Codex shells where activating `.venv` is inconvenient. |
| `./scripts/lint` | Runs `ruff format .` followed by `ruff check . --fix`. |
| `npm run dev` | Launches Vite (`http://127.0.0.1:5173`) for hot-module dashboard development alongside Home Assistant. |
| `npm run build` | Builds production bundles and refreshes `dashboard.module.js` via `scripts/update_dashboard_module.mjs`. |
| `npm test` | Executes the TypeScript smoke tests through `scripts/run_ts_tests.mjs`. |
| `./scripts/prepare_main_pr.sh` | Generates a clean worktree with release artefacts when preparing pull requests against `main`. |

## Backend development notes
- Integration state is stored under `hass.data[DOMAIN][entry_id]`; `fetch_live_portfolios` is the authoritative aggregator for portfolio totals consumed by sensors, events, and WebSocket responses.
- Live pricing uses `yahooquery` with a minimum polling interval of 300 seconds. Respect the coordinator locks and logging hooks when adjusting the price service.
- SQLite persists mirrored portfolios, holdings, and daily closes. Imports are diff-based, and automatic backups create snapshots every six hours; the `pp_reader.trigger_backup_debug` service exposes manual backups for testing.
- Gains, day-change deltas, and coverage metadata flow through `custom_components/pp_reader/data/performance.py`. Call `select_performance_metrics` (and its helpers) so sensors, WebSocket commands, and events all emit the same structured `performance` payload.
- Holdings calculations return structured `aggregation` and `average_cost` data (including native currency and EUR totals). Legacy flat fields such as `gain_abs`, `gain_pct`, and `avg_price_*` must not reappear in new payloads.
- Canonical currency edge cases (SSR Mining CAD vs. EUR, Harmonic Drive JPY) are documented in `.docs/fix_native_purchase.md` and mirrored by unit tests; keep them intact when adjusting purchase logic.

## Frontend workflow
The dashboard is authored in TypeScript and bundled with Vite. Assets live under `custom_components/pp_reader/www/pp_reader_dashboard/js/` and are referenced by `dashboard.module.js`.

1. Run `npm run dev` to enable hot module reloads while Home Assistant runs. Open `http://127.0.0.1:8123/ppreader?pp_reader_dev_server=http://127.0.0.1:5173` to stream assets from Vite. Append `?pp_reader_dev_server=disable` to fall back to bundled assets.
2. Execute `npm run build` before committing UI changes. The build refreshes hashed filenames and regenerates the published `panel.js`.
3. Keep quality checks green with `npm run lint:ts`, `npm run typecheck`, and `npm test` (Node smoke tests powered by `jsdom`).
4. The security detail tab consumes WebSocket commands `pp_reader/get_security_snapshot` and `pp_reader/get_security_history`; maintain backward-compatible payloads when evolving the UI.

## Testing & QA
Run the shared lint stack and automated tests before opening a pull request:

```bash
./scripts/lint
npm run lint:ts
npm run typecheck
npm test
pytest -q
pytest --cov=custom_components/pp_reader --cov-report=term-missing
python -m script.hassfest  # optional Home Assistant validation
```

- `./scripts/lint`, `npm run lint:ts`, and `npm run typecheck` are mandatory for both backend and frontend contributions.
- Pytest relies on fixtures from `pytest-homeassistant-custom-component`; ensure the virtual environment is active and `requirements-dev.txt` is installed.
- Frontend smoke tests live in `tests/frontend/` and execute through `scripts/run_ts_tests.mjs` (invoked via `npm test`).
- Enable verbose async logging during debugging with `pytest -vv -o log_cli=true --log-cli-level=INFO`.
- FIFO coverage for native average purchase prices lives in `tests/test_logic_securities_native_avg.py`; regression fixtures for SSR Mining and Harmonic Drive sit in `tests/test_logic_securities.py`.

See [TESTING.md](TESTING.md) for expanded instructions, fixture details, and CI parity checks.

## Coding standards & tooling
### Python (Ruff)
- Configuration lives in [`.ruff.toml`](.ruff.toml) and mirrors the Home Assistant profile (`select = ["ALL"]`).
- Use `./scripts/lint` or call `ruff format .` and `ruff check .` manually inside the virtual environment.

### TypeScript (ESLint + TypeScript)
- Rules are defined in [`eslint.config.js`](eslint.config.js) using the flat-config API. The project extends `eslint:recommended` and `@typescript-eslint/recommended` with local overrides for type-only imports and unused variables.
- Run `npm run lint:ts` for ESLint, `npm run typecheck` for strict `tsc --noEmit`, and `npm test` for dashboard smoke tests.

### Editor settings
- **VSCode**: accept the recommended extensions (`charliermarsh.ruff`, `dbaeumer.vscode-eslint`), select `${workspaceFolder}/.venv/bin/python` as the interpreter, and keep `eslint.experimental.useFlatConfig` enabled.
- **Devcontainers / Codex**: the bootstrap (`scripts/setup_VSC` or `scripts/setup_container`) installs Python and Node dependencies automatically; mirror the same steps if you are outside VSCode.

## Release workflow
1. Develop features on topic branches and open pull requests against `dev`. Maintainers promote `dev` to `main` for releases.
2. Run `npm run build` and `./scripts/prepare_main_pr.sh` before raising a release PR so bundled assets and artefacts are refreshed.
3. Bump the integration version in `custom_components/pp_reader/manifest.json` and update `CHANGELOG.md` as part of the release commit.

## Architecture highlights
- `fetch_live_portfolios` is the single source of truth for aggregated totals; sensors, WebSocket responses, coordinator events, and dashboard footers reuse its output.
- WebSocket commands (`pp_reader/get_dashboard_data`, `pp_reader/get_portfolio_data`, `pp_reader/get_accounts`, `pp_reader/get_security_snapshot`, `pp_reader/get_security_history`) must handle coordinator fallbacks and return data sourced from SQLite.
- Daily close history stored during sync powers security charts. Database migrations must keep historic data and backups restorable.
- The shared `performance` payload (gain, percentage, and optional `day_change` details) travels unchanged from the performance helpers through database serializers, events, and frontend caches. Update all consumers together if the structure evolves.

## Additional resources
- [ARCHITECTURE.md](ARCHITECTURE.md) — module responsibilities and data flow diagrams.
- [TESTING.md](TESTING.md) — QA workflows, fixtures, and helper scripts.
- [CHANGELOG.md](CHANGELOG.md) — release history and behaviour changes.
- [`docs/network-access.md`](docs/network-access.md) — optional outbound request overview.
