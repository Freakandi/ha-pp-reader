# Bugfix: Time Series Skew & JPY Valuation

## The Issue
The user reported massively skewed metrics in the "Time Series" tab:
- **Unrealized Gains**: +386,598 €
- **FX Change**: -510,741 €

This anomaly suggested a valuation error where asset values were inflated, and the "FX Change" metric (which compares End Value to Start Value) was compensating for this inflation with a massive negative swing.

## Root Cause Analysis
Investigating `custom_components/pp_reader/services/performance_calculator.py` revealed a critical flaw in data loading:

1.  **Silent Failure**: The method `_load_data` wrapped SQL queries in `try...except pd.errors.DatabaseError`, returning **empty DataFrames** if the database was locked or busy.
2.  **Default to 1.0**: The `_get_fx` method defaults to an exchange rate of `1.0` when rates are missing.
3.  **The Impact**:
    - For **JPY** assets (approx rate 1 EUR = 180 JPY), a missing rate caused the system to calculate value as `Amount / 1.0` instead of `Amount / 180.0`.
    - This inflated the value of JPY holdings by a factor of 180x.
    - Example: 1,000,000 JPY should be ~5,500 €. At rate 1.0, it became 1,000,000 €.
    - This 994,500 € "phantom gain" appeared as Unrealized Gains.
    - The "FX Change" metric, seeing the value jump from Correct (Start) to Inflated (End) purely due to "rate change" (180 -> 1), reported a massive negative currency impact.

## The Fix
1.  **Removed Silent Exception Handling**: Modified `services/performance_calculator.py` to allow `pd.errors.DatabaseError` to propagate.
    - **Why**: Calculations should fail explicitly rather than producing corrupt financial data. The WebSocket handler already catches generic exceptions and reports a user-friendly error.
2.  **Log Noise Reduction**: Removed verbose "Using valid fallback rate" debug logs in `util/currency.py` to declutter the logs, as requested.

## Verification
- **Reproduction**: A script confirmed that forcing a 1.0 FX rate for JPY exactly reproduced the skewed numbers.
- **Logic Check**: `pytest tests/services/test_performance_calculator.py` passed, confirming the removal of `try/except` didn't break normal operation.
- **Linting**: Applied strict linting to all modified files.

The system is now robust against partial data loads during database contention.

## Additional Fixes (Backdating & Wealth Accuracy)
Following the initial fix, substantial discrepancies remained (~12k € in Total Wealth, phantom Neutral Movements). Further investigation resolved these:

1.  **Total Wealth Backdating**:
    *   **Root Cause**: The calculation engine was slicing the transaction history *before* calculating cumulative sums (`cumsum`). This meant any assets held or cash accumulated *before* the start date were ignored.
    *   **Fix**: Modified `engine_pandas.py` to calculate `cumsum` on the full history first, then reindex to the requested date range. Total Wealth is now accurate (~224k €).

2.  **Security Valuation (SEK/EUR Mismatch)**:
    *   **Root Cause**: Securities trading in non-EUR currencies (e.g., SEK) but bought via EUR accounts were tracking as `EUR` in transaction logs. This caused the engine to value them as `Price (SEK) / 1.0 (EUR)`, inflating values by ~11x.
    *   **Fix**: The engine now loads the authoritative `currency_code` from the `securities` table metadata.

3.  **Gross Dividends**:
    *   **Root Cause**: Logic was double-counting dividend units by including "Type 0" (Gross Base) units alongside Tax/Fee units when reconstructing Gross amounts.
    *   **Fix**: Strictly filter addition logic to only include `UNIT_TYPE_TAX` (1) and `UNIT_TYPE_FEE` (2). 25.44€ discrepancy resolved.

4.  **Performance Neutral Movements**:
    *   **Root Cause**: Internal transfers were summing up instead of netting to zero, and "Removals" were treated as positive inflows.
    *   **Fix**: Excluded internal transfers and applied correct signs. Phantom 130k inflow removed.

5.  **Cash Transfers**:
    *   **Fix**: Properly split Type 5 transfers into source-debit and target-credit to ensure accurate account balances.
