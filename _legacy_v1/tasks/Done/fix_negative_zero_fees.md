# Task: Fix Negative Zero Display for Fees/Taxes

Status: [ ] Open

## Issue
In the Performance Calculation breakdown, the rows for "Fees" and "Taxes" display as -0,00 € (negative zero) even for periods with absolutely zero transactions (e.g., Live "Today" view). This is visually confusing.

## Investigation
Root Cause: In `calculate_period_performance` and `_calculate_cash_accumulators`, aggregation logic produces signed zeros (`-0.0`).
Operations like `sub()` or multiplication by `-1` (for sign mapping) flip the sign bit on the zero float.

## Implementation Plan
1.  **Modify `custom_components/pp_reader/metrics/calculator.py`**:
    *   In `calculate_period_performance`, sanitize `sum_fee`, `sum_tax`, `sum_neu`.
    *   In `_calculate_cash_accumulators`, sanitize return values `fees_net`, `taxes_net`.
    *   Sanitization logic: `val = 0.0 if val == 0 else val`.

## Verification
1.  **Manual Check**: Start HA and Vite, navigate to Time Series, look at Today's view (or empty period) and verify Fees/Taxes show "0,00 €".
2.  **Unit Tests**: Verify existing tests still pass.
