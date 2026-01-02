# Task: Unify Performance Summation vs Daily Wealth Logic

Status: [x] Complete

## Issue
Performance Summation (Breakdown) does not match Wealth Delta.
Log investigation reveals a discrepancy (e.g., 2.04 EUR) because **Cash Flow Components** (Dividends, Taxes) are calculated using a different FX logic than **Wealth Delta** and **Invested Capital**.

*   **Logic A (`_augment_transactions`)**: Uses `merge` with a **Vectorized Pivot Table** (`fx_pivot`). Used by `get_daily_wealth` for component breakdowns.
*   **Logic B (`_augment_txs_with_market_data`)**: Uses **Scalar `_get_fx` Lookups** (recently unified). Used by `Invested Capital`, `Capital Gains`, and `Start/End Wealth`.

The discrepancy arises because Vectorized Pivot (`reindex` + `fill`) handles boundaries and sparse data differently than Scalar `searchsorted`, creating a "Two Watches" problem.

## Goal
Harmonize `get_daily_wealth` to use the unified Scalar FX logic (**Logic B**) for calculating component values (Dividends, Taxes, Fees), ensuring they mathematically sum up to the Start/End Wealth delta.

## Architectural Decision
We will **NOT** remove `_augment_transactions` yet, as it also generates `fx_long` required by `_calculate_cash_wealth` (which calculates daily balance history, a separate concern usually tolerant of vector approximations).

Instead, we will modify `get_daily_wealth` to:
1.  Use `_augment_txs_with_market_data` (Logic B) to generate the `df_augmented` used for **Component Accumulators**.
2.  Retain `fx_pivot` only for constructing `fx_long` needed by `_calculate_cash_wealth` (until that too is refactored in a future task).

## Implementation Plan
1.  **Refactor `custom_components/pp_reader/metrics/calculator.py`**:
    *   Target: `get_daily_wealth`.
    *   **Action**: Switch the augmentation source for `df_augmented`.
    *   **Code Change**:
        ```python
        # OLD: df_augmented, fx_long = self._augment_transactions(self._df_txs, fx_pivot)

        # NEW:
        # 1. Use Unified Scalar Logic for the main transactions DataFrame
        df_augmented = self._augment_txs_with_market_data(self._df_txs)

        # 2. Add compatibility columns required by _calculate_cash_accumulators
        #    - 'daily_fx_rate': Alias of 'fx_rate'
        #    - 'amount_eur': explicit calculation (amount/100 / fx_rate)
        df_augmented["daily_fx_rate"] = df_augmented["fx_rate"]
        df_augmented["amount_eur"] = (df_augmented["amount"] / 100.0) / df_augmented["daily_fx_rate"]

        # 3. Generate fx_long separately (derived from fx_pivot) for _calculate_cash_wealth usage
        fx_long = fx_pivot.reset_index(names="date").melt(...)
        ```

2.  **Verify**:
    *   Run `pytest tests/metrics/test_performance_summation.py`.

## Estimation
*   **Est. Complexity**: Medium
*   **Suggested Mode**: Local
*   **Execution Mode**: Local

## Chunk 1: Refactor get_daily_wealth
- [x] Refactor `get_daily_wealth` in `custom_components/pp_reader/metrics/calculator.py`
    - [x] Use `_augment_txs_with_market_data` for main DataFrame.
    - [x] Manually construct `fx_long` for `_calculate_cash_wealth`.
- [x] Verify fix with `pytest tests/metrics/test_performance_summation.py`.
