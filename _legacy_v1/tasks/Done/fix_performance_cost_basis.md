# Task: Fix Performance Calculation Logic & Discrepancies

Status: [x] Complete
Est. Complexity: High
Suggested Mode: Local

## Issue
The "Performance Calculation" in the Time Series tab produces inconsistent numbers and diverges from the Portfolio Performance (PP) reference.
1.  **Summation Error**: The sum of gains/fees/taxes/neutral does not equal the calculated Total Wealth change. (~428€ missing).
2.  **Realized Gains Polarity Inversion**: Newmont Corp shows gain instead of loss, indicating incorrect Cost Basis reference (using Start Date instead of Previous Day Close).
3.  **End Value Mismatch**: Time Series End Value differs from Overview Total Wealth.

## Investigation
### Root Cause 1: Correct Cost Basis Timing (t-1)
Standard TWR/IRR calculations define the "Start Value" of a period as the **Mark-to-Market value at the end of the previous day**.
The current implementation in `calculator.py` uses `start_date` (current day Close) to establish the Virtual Inventory.
*   **Impact**:
    *   Price movements on `start_date` are missed or mis-attributed.
    *   Transactions on `start_date` are compared against `start_date` Close instead of the previous baseline, causing massive swings in Realized Gains (e.g., Newmont).
    *   FX Gains on Cash are similarly distorted because the "Start Cash Value" is wrong.

### Root Cause 2: FX Gains Mismatch
`_calculate_fx_performance` likely suffers from the same "Start Date" reference error. Additionally, if the prices used for "Cash" valuation in `get_daily_wealth` (Daily FX) differ from the specific rates used in `_calculate_fx_performance` (Transaction FX), a "drift" occurs which contributes to the summation error.

## Implementation Plan

### Chunk 1: Core Cost Basis & Inventory Logic
- [x] **Refine `_get_holdings_at_date`**: Ensure it can correctly capture state at `start_prev_ts`.
- [x] **Update `calculate_period_performance`**:
    - [x] Calculate `start_prev_ts = start_date - 1 day` (UTC adjusted).
    - [x] Initialize Virtual Inventory using `start_prev_ts` for quantity AND valuation (Mark-to-Market using `start_prev_ts` prices/FX).
- [x] **Update `calculate_period_breakdown`**:
    - [x] Apply similar `start_prev_ts` logic for the breakdown initialization.

### Chunk 2: Helper Method Updates
- [x] **Update Security Helpers**:
    - [x] Modify `_process_security_sale` to accept `basis_ts` (for cost basis lookups) separate from transaction time.
    - [x] Modify `_calculate_unrealized_security_gains_detailed` to use `basis_ts` for base price/FX lookups.
- [x] **Update Cash/FX Helpers**:
    - [x] Modify `_process_cash_outflow` to accept `basis_ts`.
    - [x] Modify `_calculate_fx_performance` to accept `start_prev_ts` and use it for the initial cash inventory valuation.

### Chunk 3: Verification & Polish
- [x] **Summation Consistency**:
    - [x] Add debug logging in `calculate_period_performance` to compare `absolute_performance` vs sum of components.
- [x] **Verify Fixes**:
    - [x] Verify Newmont Corp gain is now a loss (matching PP).
    - [x] Verify Start Value + Components ≈ End Value.
    - [x] Verify Time Series End flows correctly.

## Verification
1.  **Polarity Check**: Newmont Corp gain should flip to match PP reference.
2.  **Summation Check**: `Start Value + Components` should equal `End Value` within a few cents.
3.  **End Value Check**: Re-verification of "Time Series End" vs "Overview Total" (Should align closer now that `t-1` captures the full day's move).
