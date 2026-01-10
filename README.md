# HA Portfolio Performance Reader (Phoenix Edition)

An advanced Home Assistant integration to read, analyze, and visualize Portfolio Performance data.

## Project Status: Rebirth
This project is currently undergoing a complete rewrite ("Project Phoenix") to ensure strict architectural separation and code quality.

*   **Legacy Code**: See `_legacy_v1/`
*   **Documentation**: See `docs/`

## Architecture
The project is divided into three layers:
1.  **Core Lib**: Pure Python financial engine.
2.  **Integration**: Home Assistant Custom Component.
3.  **Frontend**: Vite-based Dashboard.

## Development
This project uses a "Antigravity Only" workflow.
All changes must start with a Task file in `docs/backlog/`.
