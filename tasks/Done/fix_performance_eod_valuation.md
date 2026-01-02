# Task: Fix Performance Engine End-of-Day Valuation

Status: [x] Complete
Est. Complexity: Low
Suggested Mode: Local

## Issue
When calculating performance, the system consistently underestimates gains/losses for the final day of the period, specifically in "Single Day" views (e.g. `2025-12-16` to `2025-12-16`). While Start/End Wealth differ correctly, Performance Components (Realized, Unrealized, FX) report **0.00 €**.
This is caused by `end_date` being interpreted as Start of Day (`00:00:00`), so the interval becomes `[T 00:00, T 00:00]`, effectively capturing zero change.

## Investigation
*   **Loc**: `custom_components/pp_reader/metrics/calculator.py`
    *   `_calculate_capital_gains_detailed`: Converts `end_date` to `pd.Timestamp(end_date)` (00:00:00).
    *   `_calculate_fx_performance`: Same issue.
*   **Root Cause**: The valuation logic compares value at `Start 00:00` vs `End 00:00`. For a single day, this means no time has passed.
*   **Requirement**: End Valuation should represent the **End of Day** (e.g., `23:59:59.999999` or just after the day's events).

## Implementation Plan

### Chunk 1: Fix EOD Timestamp Logic
- [x] **Modify `_calculate_capital_gains_detailed` in `calculator.py`**:
    - [x] Update `end_ts` logic to use `23:59:59.999999` offset for the given `end_date`.
- [x] **Modify `_calculate_fx_performance` in `calculator.py`**:
    - [x] Apply the same `end_ts` logic (End of Day).
    - [x] Ensure `mask_window` filtering includes transactions on `end_date`.
- [x] **Verify Pricing Logic**:
    - [x] Confirm `_get_price` retrieves T's close price when queried with `T 23:59:59`.
    - [x] Confirm `_get_fx` retrieval behaves similarly.

## Verification
- [x] **Regression Test**: Run `tests/metrics/test_performance_summation.py` to ensure no existing logic breaks.
- [x] **Single Day Test**: Create and run a specific test case for a Single Day (e.g. `2025-12-16`) checking that returns are non-zero if prices changed.
