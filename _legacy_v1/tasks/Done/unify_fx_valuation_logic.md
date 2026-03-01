# Task: Unify FX Valuation Logic

Status: [x] Complete

## Issue
Performance summation consistency (`Start + Components == End`) occasionally fails with small discrepancies (e.g., ~0.01% - 1.0%). Investigation reveals this is caused by "Two Watches" logic:
*   **Valuation (Wealth)** uses a precise scalar lookup (`_get_fx` with `searchsorted`).
*   **Flows (Dividends, Neutral)** use a vectorized augmentation (`merge_asof` with `direction='backward'`).

This divergence leads to mismatches when timestamps are not perfectly aligned or when looking up dates *before* the first available FX rate (where PP reference logic mandates using the First Rate, but `merge_asof` might drop or return NaN).

## Investigation
The `PerformanceEngine` uses two different methods to determine "What was the USD/EUR rate on Date T?":
*   `_get_fx(date)`: Implements the correct PP logic (Forward Fill + Backward Limit for pre-history).
*   `_augment_txs_with_market_data`: Uses pandas `merge_asof`, which differs in boundary handling (especially for pre-history dates) and timestamp precision.

## Implementation Plan
Refactor `custom_components/pp_reader/metrics/calculator.py` to enforce a **Single Source of Truth** for FX rates.

1.  **Deprecate `merge_asof` for FX Rates**:
    *   [x] Target: `_augment_txs_with_market_data` (lines ~1254).
    *   [x] Action: Remove the `pd.merge_asof` logic for FX rates.
    *   [x] Replacement: Iterate over the transactions (or use `apply`) and manually call `self._get_fx(currency, date)` for each row.
    *   [x] *Note*: Ensure we fill `fx_rate` with 1.0 for base currency (EUR) or if lookup fails (consistent with `_get_fx` behavior).

2.  **Harmonize `_calculate_gross_neutral_flows`**:
    *   [x] Target: `_calculate_gross_neutral_flows` (lines ~1299).
    *   [x] Action: Ensure it uses the updated `_augment_txs_with_market_data` (or replicates the `_get_fx` logic if it iterates manually).
    *   [x] Observation: This method currently calls `_augment_txs_with_market_data`, so updating that single method might implicitly fix this one, provided `_augment_txs_with_market_data` returns the exact same "scalar-derived" rate.
    *   [x] Additional: Check the "Logic A" and "Logic B" sections in this method (lines ~1357) to ensure they use the `fx_rate` column from the augmented dataframe.

3.  **Optimization Check**:
    *   [x] While Python loops over ~1000s of transactions are generally acceptable, can we use `np.vectorize` or `apply` with the `_get_fx` method for better performance?
    *   [x] Decision: Start with explicit `apply` or a list comprehension map which is usually fast enough for typical portfolio sizes (thousands of TXs). If performance is an issue, we can optimize later.

## Verification
1.  **Run Existing Tests**:
    *   Execute `pytest tests/metrics/test_performance_summation.py` to check for regressions and see if the summation mismatch improves.
    *   Execute `pytest tests/metrics/test_calculator.py` to ensure core calculator logic remains intact.

2.  **Verify Summation**:
    *   The primary success metric is that `Start Wealth + Sum(Components) == End Wealth` holds true even for edge cases (pre-history dates, same-day multiple events).

## Estimation
*   **Est. Complexity**: Low
*   **Suggested Mode**: Local
*   **Files Touched**: `custom_components/pp_reader/metrics/calculator.py`

