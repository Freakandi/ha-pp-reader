# Performance Calculation Details & Definitions

This document defines the logic and calculation methods for the metrics displayed in the **Time Series / Analyse Tab**.
The goal is a **Vectorized (Pandas)** approach for reliability and speed, with all calculations performed on-the-fly.

## 1. Computed Metrics (On-the-Fly)
These values are calculated by the `PerformanceEngine` when requested by the API. They are not stored in the database.

### A. Total Wealth (`total_wealth_eur`)
*   **Definition**: The absolute market value of all assets (Cash + Securities) at the end of the day.
*   **Calculation**:
    1.  **Securities**: `Sum(Units Held * Daily Close Price / Daily FX Rate)` for all active positions.
    2.  **Cash Accounts**: `Sum(Daily Cash Balance / Daily FX Rate)` for all accounts.
    3.  **Result**: `Securities Value + Cash Value`.
    4.  **FX Fallback Logic**: If a daily FX rate is missing for a specific date, use the **last available rate** from prior to that date (Forward Fill).

### B. Invested Capital (`invested_capital_eur`)
*   **Definition**: The net amount of "fresh money" the user has put into the system from the outside world.
*   **Calculation**:
    1.  Identify **External Flows**:
        *   (+) `DEPOSIT` (Einlage)
        *   (+) `INBOUND_DELIVERY` (Einlieferung - valued at entry price)
        *   (-) `REMOVAL` (Entnahme)
        *   (-) `OUTBOUND_DELIVERY` (Auslieferung - valued at exit price)
    2.  **FX Normalization**: All flows are converted to EUR using the FX rate of the transaction date.
    3.  **Result**: `CumulativeSum(External Flows)` starting from day 0.

### C. Cashflow Accumulators (Daily Buckets)
*   **Definition**: Daily totals for specific flow types.
*   **Items**:
    *   `dividends_eur`: Sum of `DIVIDEND` transactions.
    *   `interest_eur`: Sum of `INTEREST` (received) minus `INTEREST_CHARGE` (paid).
    *   `fees_eur`: Sum of `FEE` transactions and embedded fees from `transaction_units`.
    *   `taxes_eur`: Sum of `TAX` transactions and embedded taxes from `transaction_units`.

### D. Performance Neutral Movements (`performance_neutral_movements`)
*   **Definition**: Net flow of transfers that are internal to the system or explicitly neutral.
*   **Items to Include**: `CASH_TRANSFER`, `SECURITY_TRANSFER`, `DEPOSIT`, `REMOVAL`, `INBOUND_DELIVERY`, `OUTBOUND_DELIVERY`.

### E. Capital Gains (FIFO Logic)
*   **Context**: "Period-Specific Performance" implies that the baseline for any gain is the **Market Value at Period Start**.
*   **Solution**: On-the-Fly Calculation using Pandas and iterative FIFO logic.
*   **Required Data**:
    1.  List of `Holdings` at the start of the period.
    2.  List of `Transactions` (Sales/Buys) during the period.
    3.  Historical Prices for all involved securities.

---

## 2. On-the-Fly Metrics (The "View" Layer)
These metrics are derived from the computed series above when the user selects a specific time range.

### A. Absolute Performance ("Absolut")
*   **Definition**: Net increase in wealth over the period.
*   **Formula**: `Delta Total Wealth (End - Start) - Delta Invested Capital (End - Start)`

### B. Capital Gains ("Kurserfolge") - Securities Only
*   **Definition**: Wealth growth from **Securities** driven by market price changes and FX fluctuations.
*   **1. Period Realized Gains**:
    *   *Iterate*: All `SALE` transactions of securities within the period.
    *   *Formula (EUR)*: `Sum( (Sale_Price_Native / Sale_FX_Rate) - (Baseline_Price_Native / Baseline_FX_Rate) * Units_Sold )`.
    *   *Baseline*: `Price/FX @ Period_Start` (if held at start) **OR** `Price/FX @ Purchase_Date` (if bought during period).
*   **2. Period Unrealized Gains**:
    *   *Iterate*: All `Security Positions` held at the end of the period.
    *   *Formula (EUR)*: `Sum( (End_Price_Native / End_FX_Rate) - (Baseline_Price_Native / Baseline_FX_Rate) * Units_Held )`.

### C. FX Performance ("FX-Veränderung") - Cash Accounts Only
*   **Definition**: Wealth change driven by currency fluctuations on **Foreign Cash Accounts**.
*   **Concept**: Treat Foreign Cash as a Security with `Native_Price = 1.0`.
*   **Calculation**: Use the same FIFO logic as Capital Gains, but applied to cash balances.

---

## 3. UI Field Mapping (Time Series Tab)

| UI Label | Data Source / Formula | Notes |
| :--- | :--- | :--- |
| **Anfangswert** | `total_wealth_eur` @ (Start Date - 1 Day) | Represents the "Morning" state of the start date. |
| **Endwert** | `total_wealth_eur` @ End Date | Value at close of End Date. |
| **Kurserfolge (Gesamt)** | Sum(`Period Realized`) + Sum(`Period Unrealized`) | Period-specific market performance. |
| &nbsp;&nbsp;↳ Realisiert | **On-the-Fly**: `(Sell_Value - Baseline_Value)` | Baseline is `Start_Price` or `Buy_Price`. |
| &nbsp;&nbsp;↳ Nicht realisiert | **On-the-Fly**: `(End_Value - Baseline_Value)` | Baseline is `Start_Price` or `Buy_Price`. |
| **Dividenden** | Sum of `dividends_eur` | Cumulative dividends over the period. |
| **Zinsen** | Sum of `interest_eur` | Cumulative interest (net) over the period. |
| **Gebühren** | Sum of `fees_eur` | Cumulative fees over the period. |
| **Steuern** | Sum of `taxes_eur` | Cumulative taxes over the period. |
| **FX-Veränderung** | On-the-fly calculation | See Section 2C. |
| **Performanceneutrale Bew.** | Sum of `performance_neutral_movements` | Net flow of internal/neutral transfers. |

---

## 4. Summary of Data Flow

1.  **API Request**:
    *   User asks for "2024-01-01 to 2024-12-31".
2.  **Compute (PerformanceEngine)**:
    *   Load all Transactions, Prices, FX Rates into Pandas DataFrames.
    *   Vectorized calculation of `Daily Wealth` and other metrics for the requested date range.
    *   Iterative FIFO calculation for period-specific gains.
3.  **Response**:
    *   JSON with the daily series for the chart and aggregate numbers for the header.
