# Task: Optimize Performance Calculation

Status: [x] Complete
Est. Complexity: Medium
Suggested Mode: Local

## Issue
The Time Series tab ("daily_wealth") is extremely slow to load, especially for longer periods. It currently causes the integration to seemingly stall.
Investigation reveals massive redundancy in the data loading and calculation pipeline:
1.  `ws_get_daily_wealth` instantiates `PerformanceEngine` and loads all data **twice** (once for the chart data, once for the "metrics" payload).
2.  `PerformanceEngine.calculate_period_performance` (used for metrics) internally calls `get_daily_wealth` again, triggering a full recalculation.
3.  Both `get_daily_wealth` and `calculate_period_performance` (via `_calculate_capital_gains` and `_calculate_fx_performance`) independently "replay" the entire transaction history to establish FIFO state.
4.  Consequently, a single user request results in **2 full DB loads** and **4 full history replays** (Python loops).

## Investigation
- **File**: `custom_components/pp_reader/data/websocket.py`
  - Handler `ws_get_daily_wealth` calls `_fetch_from_engine` (Load + Calc) then `_calc_metrics` (Load + Calc).
- **File**: `custom_components/pp_reader/metrics/calculator.py`
  - `calculate_period_performance` calls `get_daily_wealth`, `_calculate_capital_gains`, and `_calculate_fx_performance`.
  - `get_daily_wealth` calls `_calculate_fifo_series`.
  - All these protected methods (`_calculate_*`) iterate over the entire transaction history from the beginning of time.

## Implementation Plan

### Chunk 1: Optimize Performance Engine (Partial Replay)
- [x] **Modify `PerformanceEngine.calculate_period_performance`**:
    - **Concept**: Instead of replaying full history, compute a "Virtual Start State" and replay only the relevant window.
    - **Step A: Snapshot Holdings at Start Date**:
        - Implement `get_holdings_at_date(date)`: Calculate portfolio composition at `start_date` by summing all prior transaction deltas.
        - *Efficiency*: This is a simple vectorized `.sum()` on the `df_txs` dataframe filtered by `date < start`, vastly faster than row-by-row replay.
    - **Step B: Initialize Virtual Inventory**:
        - Use these holdings to create a "Virtual Inventory" where every position has a single lot.
        - **Cost Basis**: Mark-to-Market using the price/FX at `start_date`.
    - **Step C: Replay Window**:
        - Filter `_df_txs` to only include transactions `start_date <= date <= end_date`.
        - Feed this subset + the virtual inventory into `_calculate_capital_gains` (or a modified variant).
    - **Benefit**: Redundant processing drops from O(Total History) to O(Period Length).

### Chunk 2: Optimize Websocket Handler
- [x] **Modify `ws_get_daily_wealth` in `websocket.py`**:
    - Instantiate `PerformanceEngine` and load data **once**.
    - **Chart Data**: Call `get_daily_wealth(start - 1, end)` to get the time series.
    - **Metrics**: Call `calculate_period_performance(start, end)` using the same engine instance.
        - This will now trigger the new "Partial Replay" logic, which is cheap for short periods (Default 1M is fast, Max is slow but correct).
    - **Optimization**: For "Max" view (Start = Origin), the "Virtual Inventory" is empty, and it naturally degrades to a full replay (which is unavoidable for "Max"). But for "1Y" or "YTD", it saves massive computation.

### Chunk 3: Optimize Data Loading (Vectorization)
- [x] **Vectorize Data Loading in `calculator.py`**:
    - Replace `.apply(_parse_date_value)` loop with vectorized `pd.to_datetime`.
    - Handle mixed Epoch/YYYYMMDD formats using fast boolean masking.

## Verification
- [x] **Functionality Check**:
  - Load the frontend "Time Series" tab.
  - Switch between "Max", "1Y", "YTD".
  - Verify values match the previous known-good state (screenshots or memory).
- [x] **Performance Check**:
  - Verify that the "Max" view loads significantly faster (seconds vs stall).
