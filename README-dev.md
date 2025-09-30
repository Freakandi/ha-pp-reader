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

## Feature flags

The integration retains a feature-flag infrastructure to stage experimental capabilities when required. Flags are normalised to lower-case strings and resolved against defaults defined in `feature_flags.py`. At the moment no flags are active and all features, including the security history WebSocket command, are enabled by default. When new flags are introduced they can be toggled via the config entry options in `.storage/core.config_entries` using the `feature_flags` mapping.【F:custom_components/pp_reader/feature_flags.py†L11-L101】【F:custom_components/pp_reader/data/websocket.py†L408-L453】

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
