# Task: Fix Last Price Date Parsing

Status: [x] Done
Est. Complexity: Low
Suggested Mode: Local

## Issue
The "End Wealth" in the Time Series tab differs from the "Total Wealth" in the Overview tab by ~24 EUR (on 222k EUR).
The user requires 100.00% matching.

## Investigation
-   **Discrepancy Source**: Identified specific securities (GOLD Physisch, Alibaba) where the `PerformanceEngine` uses a slightly different price than the Authoritative DB Snapshot.
-   **Root Cause**:
    -   `PerformanceEngine.load_data` parses `securities.last_price_date` as **Unix Seconds**.
    -   The DB actually stores these dates as **Days since Epoch** (e.g., `20453` for 2026-01-01) for these securities.
    -   Result: The "Live/Last" price is dated to 1970-01-01 and effectively ignored, causing the engine to fall back to the "Historical Close" (e.g., 4325.60 vs 4332.10 for Gold).
-   **Confirmation**:
    -   Debug logs show `Eng Val` based on `4325.60` (Historical).
    -   Auth Val matches `4332.10` (Last Price).
    -   DB inspection shows `last_price_date` = `20453`.

## Implementation Plan
- [x] **Modify `calculator.py`**:
    - Update `PerformanceEngine.load_data` to apply adaptive date parsing (Seconds vs Days) to `securities.last_price_date`, similar to how `historical_prices` are handled.

## Verification
- [x] **Run Reconciliation**: Execute `source .venv/bin/activate && python3 tests/debug_wealth_reconciliation.py`.
- [x] **Expectation**: `Diff Secs` must be `0.00`.
- [x] **Cleanup**: Remove `tests/analyze_debug_log.py` and `tests/check_db_data.py`.
