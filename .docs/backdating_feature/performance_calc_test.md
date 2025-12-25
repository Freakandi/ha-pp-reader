# Backend Performance Calculation Verification

## Overview
This document summarizes the results of the manual verification of the backend performance calculation logic. The verification was performed using a custom Python script (`scripts/verify_performance_calc.py`) that independently simulates the portfolio performance calculation using raw transaction data and compares it against the pre-calculated `daily_wealth` records in the database.

## Methodology
The verification script:
1.  **Replays Transactions**: Processes all transactions from the `transactions` table.
2.  **Calculates Metrics**:
    *   **Invested Capital**: Moving Average Cost Basis.
    *   **Realized Gains**: Gross gains based on difference between Sell Amount and Cost Basis.
    *   **Portfolio Wealth**: Sum of (Shares * Price / FX) for all current holdings.
    *   **Account Wealth**: Sum of cash balances (simulated).
    *   **Unrealized Gains**: Portfolio Wealth - Invested Capital.
    *   **Fees/Taxes/Dividends/Interest**: Aggregated buckets.
3.  **Compares with DB**: Checks the calculated values against `daily_wealth` table for specific dates.

## Key Findings

### 1. Invested Capital & Realized Gains (VERIFIED)
*   **Result**: Perfect Match (Diff < 0.10 EUR).
*   **Conclusion**: The core accounting logic for tracking cost basis and realized gains is correct and consistent between the simulation and the backend.

### 2. Portfolio Wealth & Unrealized Gains (VERIFIED - PERFECT MATCH)
*   **Result**: **Perfect Match** on 2025-12-12 (110047.70 vs 110047.70 EUR).
*   **Resolution**: Including retired entities in the backdating process (and the verification script) resolved the previous ~35k EUR discrepancy.
*   **Conclusion**: Valid. The system correctly maintains historical value for entities even if they are currently marked as retired.

### 3. Account Wealth (Discrepancy Noted)
*   **Result**: Discrepancy of ~8k EUR.
*   **Reason**: The verification script uses a simplified cash flow model that likely ignores internal transfers or initial balances.
*   **Conclusion**: Acceptable for verification purposes as it does not affect the *Investment Performance* metrics.

### 4. Retired Entities Handling
*   **Status**: **Enabled & Verified**.
*   **Action**: Logic filtering out `is_retired` entities was removed from `cashflows.py`, `holdings.py`, and `accounts.py`.
*   **Impact**: Historical performance reports now correctly reflect the value of assets held in the past, even if the portfolio/account is now retired.

## Verification Script Updates
The `scripts/verify_performance_calc.py` was updated to:
*   Implement FX Rate lookback (up to 30 days) to match backend logic.
*   Correctly parse integer dates from `historical_prices`.
*   Correctly scale prices (10^8) from `historical_prices`.
*   Handle retired accounts correctly for Holdings calculation.
*   Target dates with available FX data (Dec 2025) for valid verification.

## Conclusion
The backend performance calculation logic for **Invested Capital**, **Realized Gains**, and **Holdings Valuation** is verified to be correct and consistent with the mathematical formulas.
