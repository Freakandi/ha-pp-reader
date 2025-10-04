# Developer Guide – Portfolio Performance Reader

This guide summarises how to work on the Portfolio Performance Reader integration, from preparing your environment to cutting a release. It complements the user-facing [README](README.md) and the in-depth [Architecture](ARCHITECTURE.md) and [Testing](TESTING.md) references.

## Repository layout
Runtime code lives under `custom_components/pp_reader/` with sub-packages for data ingestion, pricing, sensors, and the frontend dashboard. Supporting assets such as scripts and tests sit at the repository root.【F:ARCHITECTURE.md†L47-L100】

Key directories:
- `custom_components/pp_reader/` – Integration entrypoints, config flow, price orchestration, SQLite helpers, and dashboard assets.【F:ARCHITECTURE.md†L47-L100】
- `scripts/` – Bootstrap, development, lint, and release helpers (see below).【F:TESTING.md†L179-L189】
- `tests/` – Pytest suite covering price orchestration, WebSocket flows, and regression scenarios.【F:CHANGELOG.md†L8-L15】【F:TESTING.md†L9-L24】

## Environment setup
1. Run `./scripts/setup_container` once to install system packages, create `.venv`, and install runtime dependencies.【F:AGENTS.md†L5-L9】
2. Activate the virtual environment in new shells with `source .venv/bin/activate`.【F:AGENTS.md†L7-L8】
3. Install developer extras when you plan to run tests: `pip install -r requirements-dev.txt`.【F:AGENTS.md†L7-L9】【F:TESTING.md†L38-L59】
4. For environments without virtualenv support, `./scripts/environment_setup` installs the same dependencies globally.【F:AGENTS.md†L5-L9】【F:TESTING.md†L179-L189】
5. Validate the runtime by running `python -c "import homeassistant.const as c; print(c.__version__)"` inside the same shell. The command should output the pinned Home Assistant build (`2025.2.4`).

Additional options (Windows, devcontainers) are documented in [TESTING.md §2](TESTING.md).【F:TESTING.md†L40-L71】

## Day-to-day development workflow
- **Start Home Assistant locally:** `./scripts/develop` seeds the sample config and adjusts `PYTHONPATH` so the custom component is discovered.【F:AGENTS.md†L11-L13】【F:TESTING.md†L63-L67】
- **Alternative launcher:** `./scripts/codex_develop` runs Home Assistant from the virtualenv binary when you cannot keep the shell activated.【F:TESTING.md†L179-L189】
- **Formatting & linting:** Execute `./scripts/lint` to run `ruff format .` followed by `ruff check . --fix`.【F:AGENTS.md†L13-L14】【F:TESTING.md†L179-L189】
- **Source layout awareness:** The integration registers a custom panel (`ppreader`) and WebSocket commands during setup; ensure changes keep the static asset paths and registration logic intact.【F:custom_components/pp_reader/__init__.py†L121-L199】

### Frontend TypeScript workflow

The dashboard assets under `src/` are authored in TypeScript and compiled into `custom_components/pp_reader/www/pp_reader_dashboard/js/` through Vite. Install Node dependencies once with `npm install` (or `npm ci` in CI) and use the provided scripts during development:

- `npm run dev` – starts Vite in watch mode and rebuilds the dashboard whenever files in `src/` change. The generated output is written directly into the Home Assistant `www` directory so reloading the browser reflects updates immediately.
- `npm run build` – produces the production bundle with hashed filenames and updates `dashboard.module.js` to reference the latest artifact.
- `npm run typecheck` – executes `tsc --noEmit` to validate the strict TypeScript configuration and declaration outputs.
- `npm run lint:ts` – runs the ESLint ruleset dedicated to the TypeScript sources.

When iterating on the frontend while Home Assistant is running, keep both `./scripts/develop` and `npm run dev` active to ensure the backend serves fresh assets.

### Accessing the development UI

Once `./scripts/develop` reports that Home Assistant is listening on port `8123`, open <http://127.0.0.1:8123> in a browser on the same machine to finish onboarding and validate dashboard changes. The script binds to all interfaces by default, so the loopback adapter is always available without extra flags.

1. Click **CREATE MY SMART HOME** to start the onboarding wizard.
2. Create the local account with the following credentials so that automated fixtures and screenshots stay consistent:
   - **Name:** `Dev`
   - **Username:** `dev`
   - **Password / Confirm password:** `dev`
3. Walk through the remaining onboarding steps with the defaults (choose any country when prompted) and click **Finish**. Home Assistant will display the login screen.
4. Sign in with the `dev` credentials and navigate to <http://127.0.0.1:8123/portfolio> to open the integration dashboard.

## Feature flags

The integration retains a feature-flag infrastructure to stage experimental capabilities when required. Flags are normalised to lower-case strings and resolved against defaults defined in `feature_flags.py`. At the moment no flags are active and all features, including the security history WebSocket command, are enabled by default. When new flags are introduced they can be toggled via the config entry options in `.storage/core.config_entries` using the `feature_flags` mapping.【F:custom_components/pp_reader/feature_flags.py†L11-L101】【F:custom_components/pp_reader/data/websocket.py†L408-L453】

## Dashboard navigation and security drilldowns

The custom panel uses a dynamic tab registry so the overview dashboard and per-security detail pages share navigation affordances. `dashboard.js` exposes helpers such as `registerDetailTab`, `openSecurityDetail`, and `closeSecurityDetail` to register descriptors, ensure only one tab per security UUID, and wire navigation arrows or swipe gestures to the active tab list.【F:custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.js†L14-L258】 Lazy-loaded portfolio tables delegate row clicks to `openSecurityDetail`, allowing security rows to spawn a matching detail tab without interfering with expand/collapse buttons.【F:custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/overview.js†L1-L210】 The security tab factory is provided by `registerSecurityDetailTab`, which renders the drilldown view and cleans up listeners when the tab closes.【F:custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.js†L734-L740】【F:custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/security_detail.js†L650-L660】

### Security snapshot and history APIs

Security headers pull data from the new `pp_reader/get_security_snapshot` WebSocket command that aggregates holdings, normalises the latest EUR price using existing FX helpers, and returns the payload under the calling security UUID.【F:custom_components/pp_reader/data/db_access.py†L360-L438】【F:custom_components/pp_reader/data/websocket.py†L574-L635】 Historical chart ranges are sourced via the permanently enabled `pp_reader/get_security_history` command; the frontend invokes both endpoints through `fetchSecuritySnapshotWS` and `fetchSecurityHistoryWS`, which forward the current config entry ID and optional date boundaries.【F:custom_components/pp_reader/www/pp_reader_dashboard/js/data/api.js†L63-L140】【F:custom_components/pp_reader/data/websocket.py†L408-L520】 The detail renderer caches responses per security and range, recalculates EUR gains for the active period and latest day, and reuses existing formatting utilities for header cards and info bars.【F:custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/security_detail.js†L1-L637】 Live portfolio updates invalidate cached history and tear down event listeners through `cleanupSecurityDetailState` to keep subsequent openings fresh.【F:custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/security_detail.js†L23-L109】

## Testing & quality checks
Follow the recommended pipeline before submitting a PR: lint, run targeted tests, then run the full suite with coverage and optional hassfest.【F:AGENTS.md†L13-L15】【F:TESTING.md†L20-L96】

Common commands:
```bash
./scripts/lint
pytest -q
pytest --cov=custom_components/pp_reader --cov-report=term-missing
python -m script.hassfest  # optional validation
```
【F:AGENTS.md†L13-L15】【F:TESTING.md†L74-L96】

Pytest structure and tips:
- Async-heavy tests live in `tests/prices/` and use `pytest-homeassistant-custom-component` fixtures (`hass`, `MockConfigEntry`).【F:TESTING.md†L107-L176】
- Logging-heavy scenarios (price debug scope, zero quotes) help verify option handling and event ordering introduced in recent releases.【F:CHANGELOG.md†L8-L19】【F:TESTING.md†L107-L148】
- When debugging frontend changes, run Home Assistant via `./scripts/develop` and watch the browser console alongside the `custom_components.pp_reader.*` loggers declared in the manifest.【F:custom_components/pp_reader/manifest.json†L19-L24】【F:AGENTS.md†L11-L14】

## Coding standards
- Ruff is the canonical formatter and linter; do not mix in `black` or alternative tools.【F:AGENTS.md†L13-L14】【F:TESTING.md†L179-L200】
- Target Python 3.13 features conservatively—tooling pins to 3.13.3 via the setup scripts.【F:TESTING.md†L31-L49】
- Keep documentation changes in English and update user docs (`README.md`, `CHANGELOG.md`) alongside functional work.【F:AGENTS.md†L17-L21】

## Release process
1. Develop features on topic branches and merge into `dev`; maintainers promote `dev` to `main` for releases.【F:AGENTS.md†L17-L20】
2. Use `scripts/prepare_main_pr.sh` to create a clean worktree containing only release artefacts (`custom_components/` and curated root files) before opening a PR against `main` or the release branch.【F:scripts/prepare_main_pr.sh†L4-L45】
3. Ensure the changelog, documentation, and manifest version reflect the release payload.【F:AGENTS.md†L17-L21】【F:custom_components/pp_reader/manifest.json†L1-L25】

## Architecture highlights for contributors
- Portfolio data is ingested into SQLite and kept consistent via diff sync; `fetch_live_portfolios` powers WebSocket responses and event payloads, so schema changes must consider this helper first.【F:ARCHITECTURE.md†L29-L44】【F:custom_components/pp_reader/data/db_access.py†L428-L486】
- Live pricing depends on Yahoo Finance (`yahooquery`) with default 15‑minute polling; respect the minimum interval (300 s) when adjusting behaviour or tests.【F:custom_components/pp_reader/__init__.py†L51-L109】【F:custom_components/pp_reader/config_flow.py†L159-L244】【F:CHANGELOG.md†L82-L105】
- Backups run every six hours and expose `pp_reader.trigger_backup_debug`—ensure schema migrations keep backups restorable.【F:custom_components/pp_reader/data/backup_db.py†L28-L93】【F:custom_components/pp_reader/services.yaml†L1-L4】

## Additional resources
- [Architecture.md](ARCHITECTURE.md) for deeper module documentation.
- [Testing.md](TESTING.md) for extensive quality assurance guidance.
- [CHANGELOG.md](CHANGELOG.md) to track behaviour changes affecting tests or docs.
