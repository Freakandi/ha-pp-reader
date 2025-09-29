# Codex Agent Instructions

This repository hosts the Home Assistant integration **Portfolio Performance Reader**. The integration source lives under `custom_components/pp_reader/` and test fixtures live in `tests/`.

## Development setup
- Preferred bootstrap: `./scripts/setup_container`. The script installs the required system packages (ffmpeg, libturbojpeg, libpcap, libsqlite3, python3-venv), creates/updates `.venv`, upgrades `pip`, and installs `requirements.txt`.
- Activate the virtual environment in every new shell with `source .venv/bin/activate`.
- Run pytest only from an activated `.venv`; Home Assistant (2025.4.2) and the integration dependencies are preinstalled via `requirements.txt` and won't be importable outside the virtual environment.
- Install the testing dependencies when you plan to run pytest: `pip install -r requirements-dev.txt`.
- As a fallback for bare environments, `./scripts/environment_setup` performs the same dependency installation without creating a virtual environment.

## Day-to-day workflow
- Start the development Home Assistant instance with `./scripts/develop`. The script ensures `config/` exists, seeds a default configuration if needed, and extends `PYTHONPATH` so Home Assistant finds the integration under `custom_components/`.
- Format and lint the codebase with `./scripts/lint`. It runs `ruff format .` followed by `ruff check . --fix`.
- Run the Python test suite with `pytest`. For coverage reporting use `pytest --cov=custom_components/pp_reader --cov-report=term-missing`.
- Optional validation: run Home Assistant's integration validator with `python -m script.hassfest`.

## Release workflow
- Released versions live on `main`; ongoing integration happens on feature branches that merge through `dev`.
- Open pull requests targeting `dev` by default. Maintainers will promote changes from `dev` to `main` when cutting a release.
- Update documentation (README, CHANGELOG, etc.) alongside functional changes when relevant so `dev` always mirrors the intended release notes.
- Documentation style: keep all documentation in English.
