# Task: Unify FX Cash Calculation Logic

Status: [x] Complete

## Issue
Performance Summation indicates a discrepancy (e.g., 2.04 EUR) even after standardizing Component flows.
Investigation reveals that `_calculate_fx_performance` (which calculates the "FX Cash" component) uses a **Hybrid/Mixed** approach:
1.  **Start/End Balances**: Valued using **Scalar** `_get_fx` (Lookups).
2.  **Standard Flows**: Valued using **Scalar** `_get_fx` (or implicitly via standard logic).
3.  **Transfers**: Valued using **Vectorized** `_augment_transfers` with a locally constructed `fx_long` (Pivot/FFill).

The mismatch between Scalar (Start/End) and Vectorized (Transfers Flow) causes the "FX Cash" component to be mathematically inconsistent `(Delta != End - Start - Flow)` when the Flow valuation differs (Vector vs Scalar boundary).

## Goal
Refactor `_calculate_fx_performance` to use **Scalar** `_get_fx` logic for **Transfers** as well, ensuring the entire "FX Cash" calculation is internally consistent (all Scalar).

Execution Mode: Local
Est. Complexity: Medium

## Implementation Plan
1.  **Modify `custom_components/pp_reader/metrics/calculator.py`**:
    *   Target: `_calculate_fx_performance` (approx line 2041).
    *   **Action**: Remove local `fx_pivot/fx_long` construction (lines 2070-2086).
    *   **Action**: Remove `fx_long` argument from `_augment_transfers` call.
    *   Target: `_augment_transfers` (approx line 522).
    *   **Action**: Update signature to remove `fx_long`.
    *   **Action**: Remove the `if not fx_long.empty:` block (vectorized lookup).
    *   **Action**: Implement row-wise (or applied) lookup using `self._get_fx(curr, date)` to calculate `flow_eur` for transfers.
    *   **Logic**:
        *   Iterate rows (or `apply`).
        *   `rate_source = self._get_fx(source_curr, row.date)`
        *   `rate_target = self._get_fx(target_curr, row.date)`
        *   Calculate `val_source_eur` and `val_target_eur`.
        *   Apply average/source/target logic as before (Lines 637-648).
        *   Set `flow_eur`.
        *   Update `df_in["amount"]` if currency mismatch and no explicit FX unit (Lines 733-752).

2.  **Detailed Logic for Scalar Transfers**:
    ```python
    # Pseudo-code for replacement logic in _augment_transfers
    def get_rate(row, curr_col):
        curr = getattr(row, curr_col)
        return self._get_fx(curr, row.date)

    # Use a loop or apply. Since transfers are usually few, apply is fine.
    # But loop might be cleaner for reading.
    for i, row in df_out.iterrows():
        # ... fetch rates ...
        # ... calc flow ...
    ```

## Verification
*   [x] Run `pytest tests/metrics/test_performance_summation.py` to ensure no regression.
*   [x] Run full test suite `pytest tests/`.
*   [x] (Optional) Check provided logs (if user runs again) to confirm discrepancy drops to 0.00.
