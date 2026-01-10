# System Architecture

## Overview
Project Phoenix creates a strictly layered architecture for the Portfolio Performance Reader. The goal is to decouple the financial logic from the Home Assistant framework and the UI.

### The Layers

1.  **Core Domain (`custom_components/pp_reader/lib/`)**
    *   **Responsibility**: Pure Python financial logic. Parsing, calculation, aggregation, currency conversion.
    *   **Dependencies**: Zero. No `homeassistant` imports. Only `pandas`, `numpy`, `xml`.
    *   **Testing**: Fast unit tests (`pytest`).
    *   **Key Components**:
        *   `Portfolio`: Aggregates Securities and Accounts.
        *   `Security`: Represents a single traded asset.
        *   `PerformanceEngine`: Calculates TWROR, IRR, Deltas.

2.  **Integration Layer (`custom_components/pp_reader/`)**
    *   **Responsibility**: Mapping the Core Domain to Home Assistant Entities.
    *   **Dependencies**: `homeassistant`, `lib`.
    *   **Key Components**:
        *   `Coordinator`: Fetches data using `lib` mechanisms.
        *   `Sensor`: Exposes values to HA State Machine.
        *   `Service`: Exposes actions (e.g., `refresh`).

3.  **Frontend Layer (`src/`)**
    *   **Responsibility**: Visualizing the data.
    *   **Dependencies**: `nodes`, `ha-frontend` (via websocket).
    *   **Key Components**:
        *   `Dashboard`: Main view.
        *   `WebsocketAPI`: Communicates with `custom_components`.

## Data Flow
1.  **Source**: `PP-Xml` file or `PP-Portfolio` server.
2.  **Ingest**: `lib.parser` reads raw data.
3.  **Process**: `lib.engine` normalizes and calculates metrics.
4.  **Expose**: `custom_components` updates `sensor.pp_portfolio`.
5.  **Visualize**: `src` reads sensor state or requests history via Websocket.

## Design Rules
*   **No Logic in UI**: The frontend only displays what the backend calculates.
*   **No HA in Lib**: The core library must run on any machine without HA installed.
*   **Schema First**: All data structures are defined using `dataclasses` or `pydantic`.
