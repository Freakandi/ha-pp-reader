# Codex Agent Instructions

This repository hosts the Home Assistant integration **Portfolio Performance Reader**. The core integration code lives under `custom_components/pp_reader/`.

## Development
- Create the development environment with `./scripts/setup_container` and activate the virtual environment (`source .venv/bin/activate`).
- Start Home Assistant using `./scripts/develop`.
- Run `./scripts/lint` to format and lint the code using Ruff.

## Release workflow
- The `main` branch contains released versions. Development is done on a separate branch (e.g. `dev`).
- When preparing a release, open a pull request from the dev branch to `main`.
- Copy the current state of `custom_components/pp_reader/` to `main`, ensuring that the commit history for each file is preserved so the latest commit message for every file remains intact.
