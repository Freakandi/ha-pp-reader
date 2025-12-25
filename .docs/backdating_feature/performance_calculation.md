# Performance Calculation Logic

This document describes the exact mathematical formulas used to populate the daily wealth tables in the backend and how performance metrics are derived in the frontend.

## 1. Backend Calculation (Day-by-Day)

The backend performs a daily rebuild of wealth data (`rebuild_daily_wealth`) by aggregating three primary components: **Holdings**, **Cashflows**, and **Accounts**.

### A. Holdings (`holdings.py`)
Calculations are performed per security, per portfolio, for every day.

*   **`shares`**: Cumulative sum of transaction shares (Buy = +, Sell = -).
*   **`purchase_value_eur` (Invested Capital)**:
    *   **Method**: Average Cost Basis.
    *   **Buy**: `accumulated_cost += transaction_value_eur`
    *   **Sell**: `accumulated_cost -= (shares_sold / total_shares_before) * accumulated_cost`
    *   *Note*: This represents the cost basis of currently held shares (excluding realized PnL).
*   **`value_eur`**: `shares * daily_historical_close * daily_fx_rate`.
    *   Uses the historical close price for that specific day.
*   **`realized_gains_eur`**:
    *   Calculated **only on Sale**.
    *   `gain = transaction_value_gross_eur - cost_basis_of_sold_shares`
    *   Aggregated to `daily_wealth.realized_gains_eur`.
*   **`portfolio_wealth_eur`**: Sum of `value_eur` for all securities.

### B. Cashflows (`cashflows.py`)
Transactions are classified into buckets based on `type`. Amounts are converted to EUR using the daily FX rate.

*   **`fees_eur`**: Explicit Fees (`Type 13`) + Attached Fees. Stored as positive.
*   **`taxes_eur`**: Explicit Taxes (`Type 11`) + Attached Taxes. Stored as positive.
*   **`dividends_eur`**, **`interest_eur`**, **`inbound_transfers_eur`**, **`outbound_transfers_eur`** are summed from respective transaction types.

### C. Aggregation (`aggregate.py`)
The final `daily_wealth` record combines these snapshots:

*   **`total_wealth_eur`** = `portfolio_wealth_eur` + `account_wealth_eur`
*   **`invested_capital_eur`** = Sum of `purchase_value_eur` from Holdings.
*   **`unrealized_gains_eur`** = `portfolio_wealth_eur` - `invested_capital_eur`
    *   *Note*: This captures the gross unrealized gain (Value minus Cost) of currently held assets.
*   **`realized_gains_eur`**: Sum of daily realized gains from Holdings.

---

## 2. Frontend Calculation (`analyse.ts`)

The "Analyze" tab fetches the `daily_wealth` records and explains the change in wealth over the selected period.

### A. Metrics Calculation
*   **`startValue`** / **`endValue`**: `total_wealth_eur` at start/end.
*   **`realizedGains`**: Sum of `records.realized_gains_eur` (from DB).
*   **`unrealizedGains`**: `end.unrealized_gains_eur - start.unrealized_gains_eur` (Change in Unrealized Gains from DB).
    *   *Note*: We use the explicit DB value here, rather than deriving it.

### B. Performance Derivation & FX Gains
We calculate the **Gross Market Gain** (Total Investment Performance) and then attribute the residual to **FX Gains**.

1.  **Total Market Gain (Implied)**:
    $$
    \text{MarketGain} = (\text{End} - \text{Start}) - \text{Earnings} - \text{Transfers} - \text{Neutral} + \text{Fees} + \text{Taxes}
    $$
    *(Fees/Taxes are added back because they are costs that reduced the End Value; Market Gain represents performance before these costs.)*

2.  **FX Gains (Residual)**:
    $$
    \text{FX Gains} = \text{MarketGain} - \text{RealizedGains} - \text{ChangeInUnrealizedGains}
    $$

    *   **Interpretation**:
        *   **Realized Gains**: PnL locked in by sales in EUR.
        *   **Unrealized Gains**: PnL of held assets (driven by Price delta and *some* FX delta on the asset).
        *   **FX Gains**: The remaining discrepancy. This captures:
            *   FX impact on Cash (e.g. holding USD cash).
            *   Differences between daily FX rates used for unrealized valuation vs. transaction rates.
            *   Cross-terms (Price * FX) not perfectly captured in the linear split.