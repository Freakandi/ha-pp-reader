# Task: Fix Time Series Gains Zeros

Status: [ ] Open

## Issue
Realized and Unrealized Gains appear as 0.0 in the frontend Time Series tab. This is caused by `custom_components/pp_reader/data/websocket.py` explicitly hardcoding these values to 0.0 during serialization and subsequently attempting a redundant legacy calculation (`calculate_period_performance_series`) that suppresses the authoritative `PerformanceEngine` data.

## Investigation
*   **File**: `custom_components/pp_reader/data/websocket.py`
*   **Findings**:
    *   `_serialize_daily_wealth` (lines 553-554) and `_serialize_daily_scope` (lines 580-581) hardcode `realized_gains_eur` and `unrealized_gains_eur` to `0.0`.
    *   `ws_get_daily_wealth` (lines 1466-1517) performs a "Period-Specific Realized Gains Calculation" using `calculate_period_performance_series`, which the user identifies as redundant and legacy.
    *   `PerformanceEngine.get_daily_wealth` (in `metrics/calculator.py`) already calculates and returns `realized_gains_eur` and `unrealized_gains_eur` (lines 287-288).

## Implementation Plan
1.  **Modify `custom_components/pp_reader/data/websocket.py`**:
    *   Update `_serialize_daily_wealth` to map `realized_gains_eur` and `unrealized_gains_eur` from the input record.
    *   Update `_serialize_daily_scope` to map `realized_gains_eur` and `unrealized_gains_eur` from the input record.
    *   Remove the legacy calculation block in `ws_get_daily_wealth` (approx lines 1466-1517) that overwrites these values.
    *   Ensure the `metrics_payload` calculation (lines 1498-1513) is preserved or adjusted if it's still needed for the "aggregate" metrics, BUT looking at the code, it uses `calculate_period_performance` from `PerformanceEngine` which IS using the new engine. Wait, lines 1477 uses `calculate_period_performance_series` (old) but lines 1498 uses `PerformanceEngine.calculate_period_performance` (new).
    *   The block `calculate_period_performance_series` (lines 1466-1496) is the one to remove.
    *   The block `_calc_metrics` (lines 1498-1513) uses `PerformanceEngine` and seems correct/desired for the `metrics` field of the payload. I will keep that unless instructed otherwise, but the user spoke of "redundant legacy calculation". `calculate_period_performance_series` is definitely legacy (imported from `period_calculations`). `PerformanceEngine` is the new one. So I will remove `calculate_period_performance_series` usage and the loop that overwrites `records`.

## Verification
1.  **Manual Verification**:
    *   Restart HA (`/bf_01_init`).
    *   Open Time Series tab.
    *   Verify Realized and Unrealized Gains are no longer 0.0.
