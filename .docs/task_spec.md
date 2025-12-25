# Task Specification: Wealth Calculation Engine Refactor

## Mission
Refactor the core wealth calculation logic in `ha-pp-reader` to use a vectorized Pandas approach for persistence and a dynamic "On-the-Fly" engine for period-specific performance metrics.

## Deliverables

### 1. Database Schema Update
- [ ] Modify `daily_wealth` table:
    - Ensure all definition columns from **Section 1** are present.
    - Remove reliance on `daily_wealth_scopes` for top-level aggregation.
- [ ] Ensure `transaction_units` logic is robust for embedded fees/taxes.

### 2. Ingestion Pipeline (Vectorized + Iterative Hybrid)
- [ ] Implement `BackdatingEngine` using Pandas.
- [ ] **Vectorized Steps**: Calculate Wealth, Invested Capital, and simple Cashflow Accumulators (Divs, Fees) using `cumsum()` / `groupby()`.
- [ ] **Iterative Step**: Implement strict **FIFO Tax Lot** logic for FX Cost Basis tracking (for Foreign Cash Accounts) if needed for debugging, though main "Gains" logic is now moved to On-the-Fly.
- [ ] **Output**: Populate `daily_wealth` table efficiently.

### 3. On-the-Fly Calculator (The "View" Layer)
- [ ] Create a Python Service `PerformanceCalculator`.
- [ ] Input: Start Date, End Date.
- [ ] Logic:
    - **Absolute Performance**: `Delta Wealth - Delta Invested`.
    - **Capital Gains (Securities)**: Iterate Sales & End-Holdings vs Period-Start-Baseline (Section 2-C).
    - **FX Performance (Cash)**: Iterate Cash Flows vs Period-Start-Baseline (Section 2-D).
- [ ] **Validation**: Ensure `Total Wealth Change` ≈ `Performance + NetFlows`.

### 4. API & UI Update
- [ ] Update API endpoint to call `PerformanceCalculator`.
- [ ] Map results to the specific UI fields defined in **Section 3**.

---

# Reference Specification
(The following content defines the exact logic to implement)

## 1. Persisted Metrics (`daily_wealth` Table)

## 1. Persisted Metrics (`daily_wealth` Table)
These values are calculated during the **Backdating / Ingestion** phase and stored for every day in the SQLite database. They act as the "source of truth" for fast chart rendering.

### A. Total Wealth (`total_wealth_eur`)
*   **Definition**: The absolute market value of all assets (Cash + Securities) at the end of the day.
*   **Calculation**:
    1.  **Securities**: `Sum(Units Held * Daily Close Price / Daily FX Rate)` for all active positions.
    2.  **Cash Accounts**: `Sum(Daily Cash Balance / Daily FX Rate)` for all accounts.
    3.  **Result**: `Securities Value + Cash Value`.
    4.  **FX Fallback Logic**: If a daily FX rate is missing for a specific date, use the **last available rate** from prior to that date (Forward Fill). This applies even if the last known rate is well before the current calculation window.
*   **Persistence**: **Yes**, stored daily.

### B. Invested Capital (`invested_capital_eur`)
*   **Definition**: The net amount of "fresh money" the user has put into the system from the outside world. This represents the *principal* purely based on internal vs. external flows.
*   **Calculation**:
    1.  Identify **External Flows**:
        *   (+) `DEPOSIT` (Einlage)
        *   (+) `INBOUND_DELIVERY` (Einlieferung - valued at entry price)
        *   (-) `REMOVAL` (Entnahme)
        *   (-) `OUTBOUND_DELIVERY` (Auslieferung - valued at exit price)
    2.  **FX Normalization**: All flows must be converted to the reference currency (EUR).
        *   **Cash Flows** (`DEPOSIT`/`REMOVAL`): Use the FX rate of the transaction date.
        *   **Security Deliveries**: Use the **explicit share price** recorded in the transaction itself (not the historical market quote). Multiply this transaction price by the FX rate.
        *   **Fallback**: If no FX rate exists for the specific transaction date, use the **last available rate** (Forward Fill).
    3.  **Result**: `CumulativeSum(External Flows)` starting from day 0.
*   **Persistence**: **Yes**, stored daily to allow instant "Wealth vs. Capital" comparisons.

### C. Cashflow Accumulators (Daily Buckets)
*   **Definition**: Daily totals for specific flow types, used to break down *why* wealth changed.
*   **Items**:
    *   `dividends_eur`: Sum of `DIVIDEND` transactions.
    *   `interest_eur`: Sum of `INTEREST` (received) minus `INTEREST_CHARGE` (paid).
    *   `fees_eur`: Sum of **all fees**:
        1.  Standalone `FEE` transactions.
        2.  **Embedded Fees**: Sum of `TransactionUnits` (Type=2/Fee) attached to any transaction (Buy, Sell, Dividend, etc.).
        3.  *Minus* `FEE_REFUND` transactions.
    *   `taxes_eur`: Sum of **all taxes**:
        1.  Standalone `TAX` transactions.
        2.  **Embedded Taxes**: Sum of `TransactionUnits` (Type=1/Tax) attached to any transaction.
        3.  *Minus* `TAX_REFUND` transactions.
*   **Data Model Note**: Portfolio Performance **does not** create separate transactions for fees/taxes embedded in a Trade (Buy/Sell). The `transaction_units` table is the **single point of truth** for these components. The aggregation logic must sum these units alongside the standalone transaction types to get the correct total.
*   **Calculation**: Group by `Date`, sum components (Standalone + Units), convert to EUR using the transaction's FX rate.
*   **Persistence**: **Yes**, stored as simple daily sums.

### D. Performance Neutral Movements (`performance_neutral_movements`)
*   **Definition**: Net flow of transfers that are internal to the system or explicitly neutral.
*   **Purpose**: Displayed as a distinct figure to explain "Money moved around" vs "Money made/lost".
*   **Items to Include**:
    *   `CASH_TRANSFER` (Internal Cash Move)
    *   `SECURITY_TRANSFER` (Internal Security Move)
    *   `DEPOSIT` (Einlage)
    *   `REMOVAL` (Entnahme)
    *   `INBOUND_DELIVERY` (Einlieferung)
    *   `OUTBOUND_DELIVERY` (Auslieferung)
    *   Any transaction explicitly flagged as `Neutral`.
*   **Cross-Currency Transfers**:
    *   **At Transaction Time**: A transfer between a EUR and USD account balances to exactly **zero** in EUR terms at the moment it happens. The transaction record (`transaction_units`) stores the FX rate used for the conversion, ensuring the EUR outflow matches the EUR inflow.
    *   **FX Gains/Losses**: These are **not** created by the transfer itself. Instead, they emerge over time as the target account (e.g., USD) is revalued daily against the original EUR cost basis.
    *   **Handling**: The neutral movement bucket simply sums the EUR values of these flows. Since Inflow = Outflow, the net effect on this bucket for a transfer is **0.00 EUR**.
*   **Persistence**: **Yes**, stored daily.

### E. Capital Gains (Dynamic Calculation Required)
*   **Context**: "Period-Specific Performance" implies that the baseline for any gain (Realized or Unrealized) is the **Market Value at Period Start** (not the original cost basis). Since the "Period Start" varies with every user query, these metrics **cannot be pre-calculated** in the database.
*   **Solution**: On-the-Fly Calculation using Pandas.
*   **Required Data**:
    1.  List of `Holdings` at the exact start of the period.
    2.  List of `Transactions` (Sales/Buys) during the period.
    3.  Historical Prices for all involved securities.
*   **No Persistence**: We do *not* add specific 'gain' columns to `daily_wealth`. Instead, we rely on the efficient processing of the transaction list and price history relative to the requested Start Date.

---

## 2. On-the-Fly Metrics (The "View" Layer)
These metrics are **derived** from the persisted series above when the user selects a specific time range (e.g., "Year to Date" or "Last 3 Years") in the UI. They are **not** stored in the DB because they depend on the *start date* of the view.

### A. Absolute Performance ("Absolut")
*   **Definition**: Net increase in wealth over the period from the user's perspective.
*   **Formula**:
    ```text
    Delta Total Wealth (End - Start)
    - Delta Invested Capital (End - Start)
    ```
    *Where:* `Delta Invested Capital` represents the net external money added/removed during the period.

### B. Internal Rate of Return ("IZF / IRR")
*   **Definition**: The money-weighted return rate.
*   **Formula**: Standard IRR calculation using:
    *   `Start Date`: Negative Cashflow (`-Total Wealth @ Start`)
    *   `End Date`: Positive Cashflow (`+Total Wealth @ End`)
    *   `Interim Flows`: All `Invested Capital` movements (Deposits, Removals, Deliveries) occurring between Start and End.

### C. Capital Gains ("Kurserfolge") - Securities Only
*   **Definition**: Wealth growth from **Securities** driven by market price changes and FX fluctuations.
*   **Scope**: strictly **Securities** (Stocks, ETFs, etc.). Foreign Cash Account gains are excluded here (see Section D).
*   **1. Period Realized Gains**:
    *   *Iterate*: All `SALE` transactions of securities within the period.
    *   *Formula (EUR)*: `Sum( (Sale_Price_Native / Sale_FX_Rate) - (Baseline_Price_Native / Baseline_FX_Rate) * Units_Sold )`.
    *   *Baseline*: `Price/FX @ Period_Start` (if held at start) **OR** `Price/FX @ Purchase_Date` (if bought during period).
*   **2. Period Unrealized Gains**:
    *   *Iterate*: All `Security Positions` held at the end of the period.
    *   *Formula (EUR)*: `Sum( (End_Price_Native / End_FX_Rate) - (Baseline_Price_Native / Baseline_FX_Rate) * Units_Held )`.
*   **3. Informational Breakdown (The "Thereof" View)**:
    *   **Pure Price Gain (Constant Currency)**: The gain if FX rates had not changed.
        *   `Sum( (End_Price_Native - Baseline_Price_Native) / Baseline_FX_Rate * Units )`
    *   **FX Impact**: The residual portion of the gain.
        *   `Total Gain EUR - Pure Price Gain EUR`.

### D. FX Performance ("FX-Veränderung") - Cash Accounts Only
*   **Definition**: The definitive portion of wealth change driven by currency fluctuations on **Foreign Cash Accounts**.
*   **Scope**: Strictly **Cash Accounts** (e.g., USD Account).
*   **Concept**: Treat Foreign Cash exactly like a Security with `Native_Price = 1.0`.
*   **Calculation**:
    *   Use the **same Dynamic On-the-Fly Calculator** as Section C, but applied to Cash Assets.
    *   **Asset**: The Foreign Currency itself.
    *   **Units**: Amount of Currency held.
    *   **Price**: Constant `1.0`.
    *   **Baseline**: `FX_Rate @ Period_Start` (if balance held) **OR** `FX_Rate @ Transaction_Date` (for inflows).
*   **Formula (EUR)**:
    *   `Sum( (End_Balance_Native / End_FX_Rate) - (Baseline_Balance_Native / Baseline_FX_Rate) )`.
*   **Result**: This bucket captures the purely FX-driven gain/loss of holding foreign cash during the period (e.g., holding USD while EUR gets stronger = Loss).
*   **Persistence**: None (On-the-Fly).

---

## 3. UI Field Mapping (Time Series Tab)

This section maps the specific rows displayed in the "Analyse" tab to their data sources.

| UI Label | Data Source / Formula | Notes |
| :--- | :--- | :--- |
| **Anfangswert** | `daily_wealth.total_wealth_eur` @ (Start Date - 1 Day) | Represents the "Morning" state of the start date (Close of previous day). |
| **Endwert** | `daily_wealth.total_wealth_eur` @ End Date | Value at close of End Date. <br>**Note for Today**: If End Date is "Today", this record must be updated intraday with `last_price` data to reflect current Live Wealth, not just yesterday's close. |
| **Kurserfolge (Gesamt)** | Sum(`Period Realized`) + Sum(`Period Unrealized`) | Period-specific market performance. |
| &nbsp;&nbsp;↳ Realisiert | **On-the-Fly**: Iterate Sales in Period.<br>`Gain = Sell_Value - Baseline_Value`. | Baseline is `Start_Price` (if held at start) or `Buy_Price` (if bought later). |
| &nbsp;&nbsp;↳ Nicht realisiert | **On-the-Fly**: Iterate Holdings at End.<br>`Gain = End_Value - Baseline_Value`. | Baseline is `Start_Price` (if held at start) or `Buy_Price` (if bought later). |
| **Dividenden** | Sum of `dividends_eur` | Cumulative dividends over the period. |
| **Zinsen** | Sum of `interest_eur` | Cumulative interest (net) over the period. |
| **Gebühren** | Sum of `fees_eur` | Cumulative fees over the period. |
| **Steuern** | Sum of `taxes_eur` | Cumulative taxes over the period. |
| **FX-Veränderung** | **Target Architecture**: `cumulative_fx_gains_eur` @ End - Start | See Section 2D. Explicitly tracks FX revaluation gains/losses separately from price gains. |
| **Performanceneutrale Bew.** | Sum of `performance_neutral_movements` | Net flow of internal/neutral transfers. |

---

## 4. Summary of Data Flow

1.  **Ingestion (Pandas)**:
    *   Load all Transactions.
    *   Vectorized calculation of `Daily Wealth` and `Daily Invested Capital` columns.
    *   **Write to DB**: `daily_wealth` table.
2.  **API Request**:
    *   User asks for "2024-01-01 to 2024-12-31".
3.  **Read (Pandas)**:
    *   `SELECT * FROM daily_wealth WHERE date BETWEEN ...`
4.  **Compute (Pandas/Python)**:
    *   `Start Invested` = row 0, `End Invested` = row N.
    *   `Flows` = Sum of `dividends`, `fees`, etc.
    *   `Perf` = `(EndWealth - StartWealth) - (EndInvested - StartInvested)`.
5.  **Response**:
    *   JSON with the daily series (chart) + the single aggregate numbers (header).
