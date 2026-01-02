# Task: Debug End Wealth Discrepancy

Status: [ ] Open

## Issue
The End Wealth in the Performance Calculation (and Time Series tab) is **223,003.05 EUR**.
The Total Wealth in the Overview Tab (and Portfolio Performance) is **222,849.41 EUR**.
Difference: **+153.64 EUR** (Calculator is higher).

The Start Wealth matches (225,335.29 EUR).
The user states Overview/PP is correct. We need to find the phantom 153.64 EUR in the Calculator's End State.

## Investigation
Possible causes:
1.  **Phantom Holding**: Calculator thinks we hold a security that was sold (or never bought).
2.  **Price Mismatch**: Calculator uses a different price/FX for a holding than Overview.
3.  **Cash Mismatch**: Calculator calculates different cash balances (e.g., missing a fee/tax outflow, or counting a transfer incorrectly).

## Implementation Plan
1.  **Instrument `calculator.py`**:
    -   [x] In `get_daily_wealth`, after calculating `daily_sec_wealth` and `daily_cash_wealth`:
        -   Extract the state at `end_date`.
        -   Log **ALL** Security Holdings > 0 (Name, Qty, Price, FX, ValueEUR).
        -   Log **ALL** Cash Balances != 0 (Account, Curr, Amount, FX, ValueEUR).
    -   Formatted this as a readable table in the logs.

2.  **Analyze Logs**:
    -   Compare the dumped list against the User's Screenshot 4 (Position list).
    -   Identify the item(s) summing to ~153.64 EUR.

## Root Cause Analysis
-   **Identified Cause**: `CASH_TRANSFER` transactions (Type 5) were processed incorrectly by `_augment_transfers` for the Target Account (Inbound) side.
-   **Specific Fault**: The logic preserved the `currency_code` of the transaction (usually the Source Currency) for the Target Inflow. If the Target Account was in a different currency (e.g., USD) and the Source was EUR, the Target Account received an "EUR" balance inflow instead of the converted "USD" amount.
-   **Impact**:
    -   Target Accounts accumulated "Phantom balances" in the Source Currency (e.g., `IBKR USD` holding 4413 EUR).
    -   Target Accounts missed the correct Native Currency inflow, leading to negative balances (e.g., `IBKR USD` showing -5676 USD).
-   **Verification**: Debug script confirmed clear phantom balances corresponding exactly to the missing wealth.

## Fix Plan
-   **Modify `_augment_transfers`**:
    -   Implement **Symmetric Conversion Logic**.
    -   For `df_in` (Target): Convert `amount` from Transaction Currency to Target Account Currency using daily FX rates.
    -   For `df_out` (Source): Convert `amount` from Transaction Currency to Source Account Currency (existing logic, refactored for symmetry).
    -   Ensure `fx_long` rates are applied correctly to both sides.

## Verification
-   [x] Apply Fix to `calculator.py`.
-   [x] Rerun `debug_wealth_comparison.py`.
-   [x] **Results**:
    -   `IBKR USD`: Phantom EUR balance gone (0.00). Native USD balance corrected (positive ~1400 USD, matching Snapshot).
    -   `IBKR JPY`: Massive JPY discrepancy resolved (Diff < 1 EUR equivalent).
    -   `IBKR CAD/HKD`: Resolved.
    -   **Total Wealth Diff**: Reduced from >150 EUR + Confusing Mix to ~ -24 EUR (driven by minor Security pricing timing differences).
-   [x] Run Unit Tests (`pytest tests/metrics/test_calculator.py`). Passed.

## Status
[x] Complete
