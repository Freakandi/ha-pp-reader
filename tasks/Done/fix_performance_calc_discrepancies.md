# Task: Fix Performance Calculation Discrepancies

Status: [x] Complete
Est. Complexity: Medium
Suggested Mode: Local

## Issue
The user reports significant discrepancies in the "Performance Calculation" section of the "Time Series" tab.
1.  **Summation Mismatch**: `AbsPerf` (End - Start - NetFlow) != Sum of Components (Derived).
    *   Log shows mismatch of ~4400-6500 EUR, often aligning with `Neu` (Neutral Movements).
2.  **Dividend Aggregation**: The "Dividends" total is displayed as a Net value (from DB transactions), while the breakdown list is calculated as Gross (adding back Tax/Fees). They must align (preferably Gross).
3.  **Realized/Unrealized Gains Inconsistency**: The aggregate total shown differs significantly from the sum of the breakdown list items.
    *   Realized: Aggregate seems Net (or wrong), List is Gross.
    *   Unrealized: Aggregate -480 EUR, List sum +31 EUR.
4.  **End Wealth Mismatch**: Time Series "End Value" differs from "Overview" Total Wealth, implying data source or calculation divergence (e.g. stale prices vs live prices).
5.  **FX Calculation**: FX losses on cash seem underestimated (-5 vs -25).

## Investigation
### 1. Summation Mismatch (Derived vs AbsPerf)
*   **Finding**: In `calculate_period_performance`, `derived_abs` adds `sum_neu`:
    ```python
    derived_abs = ... + sum_neu
    ```
    However, `AbsPerf` is calculated as `(EndWealth - StartWealth) - (EndInvested - StartInvested)`.
    `EndInvested - StartInvested` *is* the Neutral Flow (Deposits/Withdrawals).
    Since `AbsPerf` *excludes* Neutral Flows (to isolate performance), `Derived` must also *exclude* the `Neu` component to match.
    *   *Correction*: Remove `sum_neu` from `derived_abs` calculation for verification.
    *   *Also*: Check if `Neu` includes "Performance Neutral" items that *are not* Deposits (e.g. internal transfers with slight FX drift). If so, those might belong, but standard Deposits definitely do not.

### 2. Dividend Aggregation
*   **Finding**:
    *   `metrics.dividends_eur` (the total) comes from `get_daily_wealth` -> `_calculate_cash_accumulators` -> `_sum_by_type(TransactionType.DIVIDEND)`. This sums the DB `amount`, which is **Net**.
    *   Breakdown list uses `_aggregate_dividends`, which adds Tax/Fee units to the Net amount to get **Gross**.
*   **Fix**: Update `_calculate_cash_accumulators` to also add Tax/Fee units to the Dividend component so the Top-Line metric is Gross.
    *   This requires mirroring the logic from `_aggregate_dividends` into `_calculate_cash_accumulators` (or identifying taxes linked to dividends and adding them to the dividend bucket while keeping them in the tax bucket for the equation).
    *   *Wait*: If we make Dividends Gross in the Summation Eq:
        `AbsPerf = Realized + Unrealized + FX + Div(Gross) + Int - Fee - Tax`
        We must ensure `Tax` includes the Dividend Taxes.
        If `Div(Gross)` includes the tax, and `Tax` includes the tax, then `Div(Gross) - Tax` = `Div(Net)`. This is mathematically correct for the summation.
    *   So the fix is to make `metrics.dividends_eur` Gross.

### 3. Gains Inconsistency
*   **Finding**: `calculate_period_breakdown` calls `_calculate_capital_gains_detailed` separately from `calculate_period_performance`.
    *   Both use `start_prev` (t-1) logic now.
    *   However, `calculate_period_performance` uses `metrics.realized_gains`.
    *   If they differ, it might be due to a subtle difference in `initial_inventory` construction or `basis_ts` usage between the two methods during the refactor.
    *   *Check*: Ensure `calculate_period_breakdown` uses exact same `basis_ts` and `initial_inventory` logic.
    *   *Suspect*: `calculate_period_breakdown` might be creating `virtual_inventory` slightly differently or missing the `start_prev` adjustment correctly in its own scope (lines 563+ in `calculator.py`).
    *   Actually, looking at `calculate_period_breakdown` (lines 562+), it *does* calculate `basis_ts` and `virtual_inventory`.
    *   We should unify this to prevent drift.

### 4. End Wealth Mismatch
*   Reference: User says `End Wealth` (223.001,53) != Overview (222.847,89). Diff ~153 EUR.
*   `calculate_period_performance` uses `get_daily_wealth` for `End Wealth`.
*   `get_daily_wealth` uses `_df_prices` (Historical) + `_df_latest` (Live).
*   Overview uses `normalization_pipeline` which likely uses the same.
*   *Possible Cause*: Timezone handling or "Today" inclusion.
    *   If "Today" is 2026-01-01 (in user context), and one includes it and one doesn't (or has different latest price).
    *   User screenshot shows "Stale Kurse".
    *   We need to ensure `calculate_period_performance` aligns with the "official" current value.

## Implementation Plan

### Chunk 1: Summation & Metrics Logic
- [x] **Fix Summation Verification**:
    - Modify `derived_abs` in `calculate_period_performance` to exclude `sum_neu`.
- [x] **Align Dividends to Gross**:
    - Update `_calculate_cash_accumulators` in `calculator.py` to fetch `transaction_units`.
    - Calculate `div_gross` by adding linked Tax/Fee units to the base dividend amount.
    - Ensure `taxes_net` and `fees_net` continue to include these amounts (for mathematical correctness in the summation equation).

### Chunk 2: Unified Virtual Inventory
- [x] **Extract Logic**:
    - Create `_setup_virtual_inventory(self, start_date: date) -> tuple[dict, pd.Timestamp, pd.Timestamp]` in `PerformanceEngine`.
    - This method should handle: `start_prev` (t-1), `basis_ts` (t-1), loading holdings at `start_date`, and valuing them at `basis_ts` (t-1).
- [x] **Refactor `calculate_period_performance`**:
    - Replace inline inventory setup with call to `_setup_virtual_inventory`.
- [x] **Refactor `calculate_period_breakdown`**:
    - Replace inline inventory setup with call to `_setup_virtual_inventory`.
    - Verify `window_mask` uses exact same start/end timestamps.

### Chunk 3: FX & End Wealth Polish
- [x] **Verify FX Calculation**:
    - Review `_calculate_fx_performance` calls to ensure `basis_ts` is passed correctly from the new shared setup.
- [x] **End Wealth Investigation** (Time Permitting):
    - Add debug logging to `get_daily_wealth` to print the exact `total_wealth` for the last day and the price source used.
    - Compare with Overview pipeline logic if visible.

### Chunk 4: Final Discrepancy Analysis
- [x] **Analyze Debug Logs**:
    - Confirmed Backend Logic is correct for precise dates (+31 EUR).
    - Identified Frontend fetches Start-1 (Dec 1st) for chart baseline.
    - Confirmed Dec 1st had -500 EUR swing, causing the mismatch.
- [x] **Fix Remaining Mismatch**:
    - Backend: Added `metrics_start` parameter to `get_daily_wealth`.
    - Frontend: Passing `metrics_start` (User Selection) while keeping `range` extended (Chart Baseline).
- [x] **Verify Fix**:
    - Confirmed code path handles explicit start date for metrics.

## Verification
- [x] **Manual Verification**:
    - [x] Run `npm run dev` and `hass` (if not running/if needing restart).
    - [x] Check Logs for "Performance Summation Mismatch" - it should be gone or < 0.01.
    - [x] Check UI "Dividends" - Aggregated Total must equal Sum of list items.
    - [x] Check UI "Realized Gains" - Aggregated Total must equal Sum of list items.
    - [x] Check UI "Unrealized Gains" - Aggregated Total must equal Sum of list items.
    - [x] Validate End Wealth vs Overview (capture screenshot if possible).
