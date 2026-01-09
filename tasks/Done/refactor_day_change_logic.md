# Task: Restore Day Change Calculation in Security Metrics

Status: [ ] Plan Created
Est. Complexity: Medium
Suggested Mode: Local
Execution Mode: Local

## Goal
Restore the missing "Day Change" and "Previous Close" values in the portfolio dashboard by implementing their calculation within the `metrics/securities.py` module, leveraging the `PerformanceEngine` and `MarketResolver`.

## Context
- **Root Cause**: The recent refactoring of `_compute_security_metrics_sync` in `custom_components/pp_reader/metrics/securities.py` completely removed the calculation logic for `day_change` fields and `last_close_native_raw`, setting them to `None`.
- **Impact**: "Day Change" values disappear from the UI whenever a price update triggers a metrics refresh.
- **Architecture**: The `MarketResolver` uses `ffill` for `get_price`. This means asking for `T-1` will return the latest price available on or before `T-1`, which correctly represents the "Last Close" relative to today.

## Refined Implementation Steps

1.  [x] **Modify `custom_components/pp_reader/metrics/securities.py`** (Function `_compute_security_metrics_sync`):
    *   **Action**: Update the iteration logic to calculating previous day's metrics.
    *   **Logic**:
        *   Define `prev_date = now_ts - timedelta(days=1)` inside the loop.
        *   Get `prev_price = market_resolver.get_price(sec_uuid, prev_date)`.
        *   Get `prev_fx = market_resolver.get_fx(currency, prev_date)`.
        *   **Day Change Definition**: The change in value of the *currently held shares* attributed to price/FX movements since the previous close. This ignores intra-day trading activity (e.g., if shares were bought today, their "Day Change" is still calculated as `Current_Price - Previous_Close`, representing the market movement of that asset).
        *   Calculate `day_change_native` (if `price` and `prev_price` exist): `price - prev_price`.
        *   Calculate `day_change_pct`: `(day_change_native / prev_price) * 100` (guard for 0 division).
        *   Calculate `prev_value_eur`: `(quantity * prev_price) / prev_fx` (guard for missing FX).
        *   Calculate `day_change_eur`: `current_value - prev_value_eur`.
        *   Calculate `last_close_native_raw`: `int(prev_price * EIGHT_DECIMAL_SCALE)` (guard for `prev_price` being 0 or None).
    *   **Assignment**: Update the `SecurityMetricRecord` constructor call:
        *   `day_change_native=day_change_native`
        *   `day_change_eur=day_change_eur`
        *   `day_change_pct=day_change_pct`
        *   `day_change_source="FIFO/Market"`
        *   `day_change_coverage=1.0` (since we have full resolution)
        *   `last_close_native_raw=last_close_native_raw`

2.  [x] **Verify Correctness**:
    *   **Definition Verification**: Ensure the code strictly implements `Delta = (Current_Price - Previous_Price)`.
    *   **FX Handling**: Ensure the EUR calculation accounts for FX rate shifts: `Day_Change_EUR = (Current_Price_Native / Current_FX) - (Prev_Price_Native / Prev_FX)`. This correctly captures both price change and currency fluctuation.

3.  [x] **Lint & Test**:
    *   Run `ruff check .` and `ruff format .`
    *   Run `npm run test` (if applicable, though this is backend).
    *   Run `pytest tests/metrics` to ensure no regression in calculation stability.
