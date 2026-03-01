# Task: Fix Performance Summation Consistency (16.12.2025 Deep Dive)

Status: [x] Complete

## Issue
The user reports a persistent discrepancy in the Performance Summation on the "Time Series" tab.
Specifically, `Start Wealth + Sum(Performance Components) != End Wealth`.
A manual calculation for **16.12.2025** is requested to isolate the error.
Logs show discrepancies like `2.04 EUR` for a single day, or `0.80 EUR` for a month.

## Investigation
Inspection of `custom_components/pp_reader/metrics/calculator.py` reveals:
1.  **Wealth Calculation**: Uses `_calculate_portfolio_state_at_date` which relies on `_get_price`/`_get_fx` at T-1 (basis) or T (end).
2.  **Performance Components**: Calculated separately:
    -   `Unrealized`: Uses `_calculate_capital_gains_detailed` (FIFO logic).
    -   `Realized`: Also FIFO.
    -   `FX Cash`: Balance Sheet method (`End - Start - NetFlows`).
    -   `Fees/Taxes/Divs/Int`: Aggregation of transactions.
3.  **Potential Mismatch**:
    -   `Unrealized Gains` calculation might use a different "Start Price" (from `basis_ts=T-1`) than the `Start Wealth` calculation.
    -   `FX Cash` might miss subtle shifts if `basis_ts` alignments differ between "Start Wealth" (EOD 15.12) and "Start of FX Period" (Are they strictly identical?).
    -   **Taxes/Fees**: If flow is negative (Wealth down), and Tax component is positive (subtracted), math holds. But if FX is involved, `Flow_EUR` calculated in `FX Cash` (Line 2034) might differ from `Amount_EUR` used in `Taxes` aggregation (Line 1318), leading to "Leakage".

## Implementation Plan
1.  **Reproduction**:
    -   Create a dedicated test script `tests/repro_summation_16dec.py` that loads production data (available in config/pp_reader_data/S-Depot.db), DO NOT MOCK the data!
    -   The script will perform the "Manual Calculation" requested:
        -   Calculate `Start Wealth` (15.12 EOD).
        -   Calculate `End Wealth` (16.12 EOD).
        -   Sum all components.
        -   Print the difference.
2.  **Manual Calculation Logic in Script**:
    -   Explicitly fetch Prices/FX for 15.12 and 16.12.
    -   Manually compute `Unrealized = Shares * (P_16 - P_15)`.
    -   Manually compute `FX Cash`.
3.  **Fix Strategy**:
    -   Ensure `FX Cash` flow valuation (`_calculate_fx_performance` -> `calc_flow_val`) uses the **EXACT SAME** `flow_eur` as the Taxes/Fees accumulator.
    -   Currently `_calculate_fx_performance` recalculates `flow_eur` (lines 2086+) separately from `_calculate_cash_accumulators` (lines 1303+ matches `df_augmented`).
    -   **Critical**: If `df_augmented` uses `_augment_txs_with_market_data` (lines 1158+ -> `_get_fx`), and `FX Cash` uses `_get_fx` inside `calc_flow_val` (line 2099), they *should* match.
    -   **Hypothesis**: Rounding differences or `_get_fx` timing nuance (though `_get_fx` looks scalar and deterministic).
    -   **Alternative**: The `Derived` sum subtracts `Fees` and `Taxes`. If `FX Cash` *also* implicitly accounts for the "loss" of Fee/Tax (by reducing End Balance), we might be double counting?
        -   No, my analysis showed Fees are neutral for FX Cash.
        -   BUT, if `TransactionType.TAX` is involved, `FX Cash` treats it as Outflow (-1).
        -   Gain = (End - Start) - NetFlow.
        -   NetFlow = -Amount.
        -   Gain = (B-A) - (-Amt) = B - A + Amt.
        -   If B = A - Amt (assuming only Tax happened), Gain = A - Amt - A + Amt = 0.
        -   So FX Cash is 0.
        -   Total Sum = 0 (Unrealized) + 0 (FX) - Amt (Tax).
        -   Result = -Amt. Matches Wealth delta (-Amt).
    -   We will rely on the Reproduction Script to pinpoint the leak.

## Verification
-   Run `python3 tests/repro_summation_16dec.py`.
-   Verify diff is 0.00.
