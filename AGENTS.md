# Codex Agent Instructions

This repository hosts the Home Assistant integration **Portfolio Performance Reader**. Runtime Python lives under `custom_components/pp_reader/`, the dashboard source is in `src/`, and tests (Python + frontend) sit under `tests/`.

Backend tooling must run inside the project virtual environment populated from `requirements.txt` (pins Home Assistant **2025.2.4**). Frontend tooling requires Node.js **18.18+** (or newer 20.x) with npm **10+**.

## Development setup
- Preferred bootstrap: `./scripts/setup_container`. The script installs the required system packages (ffmpeg, libturbojpeg, libpcap-dev, libsqlite3-dev, python3-venv), ensures Python 3.13.3 via `pyenv` when available, creates `.venv`, upgrades `pip`, installs `requirements.txt`, and prepares `config/` plus the `/config` symlink.
- Activate the virtual environment in every new shell with `source .venv/bin/activate`.
- Install contributor extras when you plan to run tests or linting: `pip install -r requirements-dev.txt`.
- Alternative bootstraps:
  - `./scripts/setup` (expects Python already available) seeds dependencies in-place and sets up `/config`.
  - `./scripts/environment_setup` installs the same dependencies globally (no virtualenv).
- Install Node.js dependencies once after cloning: `npm install`.

## Day-to-day workflow
- Start the development Home Assistant instance with `./scripts/develop`. The script seeds `config/`, maintains the `/config` symlink, and exports `PYTHONPATH` so Home Assistant sees `custom_components/`.
- Format and lint Python code with `./scripts/lint` (runs `ruff format .` then `ruff check . --fix`).
- Run the Python tests with `pytest`. For coverage reporting use `pytest --cov=custom_components/pp_reader --cov-report=term-missing`.
- Optional validation: run Home Assistant's integration validator with `python -m script.hassfest`.
- Develop dashboard changes with `npm run dev` while Home Assistant runs; open `http://127.0.0.1:8123/ppreader?pp_reader_dev_server=http://127.0.0.1:5173` to stream assets from Vite.
- Keep frontend quality checks green with `npm run lint:ts`, `npm run typecheck`, and `npm test` (Node test runner via `tsx`).
- Build production dashboard bundles before committing UI changes: `npm run build` updates `custom_components/pp_reader/www/pp_reader_dashboard/js/` and rewrites `dashboard.module.js` via `scripts/update_dashboard_module.mjs`.
- Update documentation (`README.md`, `README-dev.md`, `CHANGELOG.md`, etc.) alongside behavioural changes; keep all docs in English.

## Release workflow
- Develop features on topic branches and open pull requests targeting `dev`. Maintainers promote `dev` to the release branch (`main` unless otherwise noted) when cutting a release.
- Before opening a release PR, run `npm run build` and `./scripts/prepare_main_pr.sh dev main` so bundled assets and the generated worktree stay in sync with the branch targeting `main`.
- Bump the integration version in `custom_components/pp_reader/manifest.json` and update `CHANGELOG.md` as part of the release work.
