# Codex Agent Instructions

This repository hosts the Home Assistant integration **Portfolio Performance Reader**. Python sources live under `custom_components/pp_reader/`, the TypeScript dashboard lives in `src/`, and tests plus fixtures sit under `tests/`.

All Python tooling must run inside the project virtual environment created from `requirements.txt` (Home Assistant 2025.2.4). Frontend tooling requires Node.js **18.18+** with npm **10+**.

## Development setup
- Preferred bootstrap: `./scripts/setup_container`. The script installs the required system packages (ffmpeg, libturbojpeg, libpcap-dev, libsqlite3-dev, python3-venv), creates or refreshes `.venv`, upgrades `pip`, installs `requirements.txt`, and ensures `config/` is available.
- Activate the virtual environment in every new shell with `source .venv/bin/activate`.
- Install contributor extras when you plan to run tests or linting: `pip install -r requirements-dev.txt`.
- As a fallback for bare environments, `./scripts/environment_setup` performs the same dependency installation globally.
- Install Node.js dependencies once after cloning: `npm install`.

## Day-to-day workflow
- Always start the development Home Assistant instance with `./scripts/develop` in a separate terminal session from inside the virtual environment. The script seeds `config/` when needed, maintains the `/config` symlink, and extends `PYTHONPATH` so Home Assistant discovers `custom_components/`.
- Format and lint Python code with `./scripts/lint` (runs `ruff format .` followed by `ruff check . --fix`).
- Run the Python test suite with `pytest`. For coverage reporting use `pytest --cov=custom_components/pp_reader --cov-report=term-missing`.
- Optional validation: run Home Assistant's integration validator with `python -m script.hassfest`.
- Develop dashboard changes with `npm run dev` while Home Assistant runs; open `http://127.0.0.1:8123/ppreader?pp_reader_dev_server=http://127.0.0.1:5173` to stream assets from Vite.
- Build production dashboard bundles before committing UI changes: `npm run build` (updates `dashboard.module.js` via `scripts/update_dashboard_module.mjs`).
- Keep TypeScript quality checks green with `npm run lint:ts` and `npm run typecheck`.
- Update documentation (`README.md`, `README-dev.md`, `CHANGELOG.md`, etc.) alongside behavioural changes; keep all docs in English.

## Release workflow
- Develop features on topic branches and open pull requests targeting `dev`. Maintainers promote `dev` to `main` when cutting a release.
- Run `npm run build` and `./scripts/prepare_main_pr.sh` when preparing a release PR so bundled assets and release artefacts are up to date.
- Bump the integration version in `custom_components/pp_reader/manifest.json` and refresh the changelog as part of the release work.
