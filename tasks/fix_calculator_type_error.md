# Task: Fix Calculator TypeError

Status: [x] Closed

## Issue
The user reports the integration "stalling" or taking too long. Logs reveal a `TypeError: Expected numeric dtype, got object instead.` in `PerformanceEngine.get_daily_wealth`, caused by `daily_realized.round(2)`. This happens when `pd.Series` is initialized with an empty dictionary, resulting in `object` dtype instead of `float`.

## Investigation
*   **Log Error**: `TypeError: Expected numeric dtype, got object instead.` at `result["realized_gains_eur"] = daily_realized.round(2)`.
*   **Root Cause**: `_calculate_fifo_series` creates `pd.Series(daily_realized)` without specifying `dtype=float`. If `daily_realized` is empty (no gains), the Series is `object` dtype. Reindexing an object Series preserves object dtype even if `fill_value` is float.
*   **Reproduction**: Confirmed via `test_pandas_issue.py`. `pd.Series({}).reindex(..., fill_value=0.0).round(2)` fails.

## Implementation Plan
1.  **Modify `custom_components/pp_reader/metrics/calculator.py`**:
    *   In `_calculate_fifo_series`, change the empty return (line 812) to return properly typed empty Series: `pd.Series(dtype=float)`.
    *   In `_calculate_fifo_series`, explicitly set `dtype=float` when creating `realized_series` and `cost_basis_series` from dictionaries (lines 906-907).

## Verification
1.  **Automated Test**: Run `test_pandas_issue.py` (modified to match fix) or simply rely on the fact that restarting HA and loading the page should no longer error.
2.  **Manual Verification**:
    *   Restart HA (`/bf_01_init`).
    *   Open Time Series tab.
    *   Verify it loads quickly and correctly (gains are visible).
