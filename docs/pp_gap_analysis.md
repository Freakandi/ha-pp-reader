# Portfolio Performance Gap Analysis

## Executive Summary

**Portfolio Performance (Java)** uses an **Object-Oriented, In-Memory Domain Model**. It loads the entire XML file into a rich graph of objects (`Client`, `Account`, `Security`) and calculates metrics on the fly using the **Visitor Pattern** (iterating over transactions event-by-event).

**HA-PP-Reader (Python/SQLite)** uses a **Relational, Disk-Based Data Model**. It flattens the complex object graph into SQL tables (`transactions`, `securities`, `prices`). Calculations are (or should be) vectorised using **Pandas/SQL** rather than event loops.

To achieve 100% KPI parity, you must **mimic the math, not the implementation**. You should *not* try to rebuild the Java object graph in Python. Instead, you should build a "Financial Engine" that applies PP's logic to your dataframe structures.

---

## 1. Data Model Comparison

### A. Transactions (The Core Discrepancy)
*   **PP (Java)**: Uses a polymorphic hierarchy (`AccountTransaction`, `PortfolioTransaction`). Crucially, it uses **"Units"**—little sub-objects attached to a transaction to represent Taxes, Fees, and Gross Value. A single "Dividend" transaction in Java is a tree containing the main transaction plus a list of tax/fee units.
*   **HA-PP-Reader**: Uses a flattened `transactions` table.
    *   *Gap*: You currently pre-aggregate `fees` and `taxes` into columns. This is generally fine, but you lose the distinction between types of taxes or fees if that ever becomes relevant.
    *   **Recommendation**: Stick to the flattened model. It fits SQL/Pandas perfectly. Ensure your ingestion layer accurately sums all attached "Units" into the respective `fees` and `taxes` columns.

### B. Taxonomies (Missing Feature)
*   **PP (Java)**: Has a powerful `Taxonomy` system. Users create "Classifications" (e.g., "Asset Class", "Region") and assign investments to them. This drives the "Asset Allocation" pie charts and "Rebalancing" views.
*   **HA-PP-Reader**: **Completely missing**.
    *   **Recommendation**: To reach feature parity, you need to implement a relational structure for this.
    *   *New Table*: `classifications` (uuid, name, taxonomy_id, weight).
    *   *New Table*: `classification_assignments` (investment_uuid, classification_uuid, weight).
    *   This is required to calculate "Exposure per Region" or "Allocation per Asset Class."

### C. Cross-Entries (Double Entry Bookkeeping)
*   **PP (Java)**: Explicit hard links (`transaction.getCrossEntry()`). A "Deposit" in an account is directly linked in memory to the "Removal" from another account.
*   **HA-PP-Reader**: Loose coupling. You likely rely on matching UUIDs or implicit `transfer_uuid` columns.
    *   **Recommendation**: Ensure your `transactions` table has a self-referencing `cross_entry_uuid` column. This is critical for filtering out "Performance Neutral Transfers" correctly when calculating global performance.

---

## 2. Calculation Logic Comparison

### A. Reporting Periods (The "Off-By-One" Trap)
*   **PP Logic**: PP uses **half-open intervals** for reporting periods.
    *   *Start Date* defines the **baseline state** (holdings, cache).
    *   *Flows* are counted if `date > start_date` and `date <= end_date`.
    *   Example: "YTD 2024" usually means State at `2023-12-31` vs State at `2024-12-31`.
*   **HA-PP-Reader Approach**: SQL `BETWEEN` is inclusive-inclusive.
*   **Recommendation**: Rigorously adopt PP's interval logic.
    *   KPI Start Value = `End_Value(start_date - 1 day)`
    *   KPI Flows = `Transactions where date > (start_date - 1 day) and date <= end_date`

### B. Capital Gains (The "Virtual Inventory")
*   **PP Logic**: When calculating standard performance for a specific period (e.g., "Last Month"), PP does not simply sum up trades. It performs a **Partial Replay**:
    1.  Calculate exact holdings at \(t_{start}\).
    2.  Pretend you "Bought" all these holdings at the Market Price of \(t_{start}\). This resets the Cost Basis.
    3.  Run FIFO logic from \(t_{start}\) to \(t_{end}\).
    4.  The result is the "Performance *during* the period".
*   **Recommendation**: You must implement this **Virtual Inventory** logic in your `PerformanceEngine`. Do not rely on life-time `realized_gains` stored in the DB. Those are irrelevant for period-specific KPIs.

### C. Time-Weighted Rate of Return (TWR / TTWROR)
*   **PP Logic**: Breaks the period into sub-periods every time a cash flow (deposit/withdrawal) occurs.
    *   \(TWR = (1 + r_1) * (1 + r_2) * ... * (1 + r_n) - 1\)
*   **Recommendation**: This is hard to do in pure SQL. Use **Pandas**.
    1.  Get daily valuations (`daily_wealth` table).
    2.  Get list of external cash flows (Deposits/Removals, *excluding* internal transfers).
    3.  Calculate daily returns: \(r_t = \frac{V_{end} - V_{flow}}{V_{start}} - 1\).
    4.  Chain them: Product of \((1+r_t)\).

### D. Internal Rate of Return (IRR)
*   **PP Logic**: Solves the Net Present Value equation: \(NPV = \sum \frac{C_t}{(1+r)^t} = 0\).
*   **Recommendation**: Use `scipy.optimize.newton` or `numpy_financial.irr`. Input is a list of tuples `(date, amount)`:
    *   Initial Date: `-Start_Value`
    *   Flow Dates: `+Deposits / -Withdrawals`
    *   End Date: `+End_Value`

---

## 3. Gap Analysis Checklist

To achieve "All KPIs", you need to fill these specific gaps:

| Feature | Java (PP) | Python (HA-PP-Reader) | Action Required |
| :--- | :--- | :--- | :--- |
| **Taxonomies** | Root object -> Classifications | **Missing** | Create tables `taxonomies`, `classifications`, `assignments`. |
| **Benchmarks** | `Security` as benchmark | **Missing** | Allow selecting a security UUID as a "Benchmark" for a dashboard widget. |
| **Currency** | `ExchangeRate` provider | `prices` table | Ensure `historical_prices` supports "Currency Pairs" (e.g., `USD-EUR`). |
| **Volatility** | `StandardDeviation` calc | **Missing** | Implement `pandas.std()` on daily returns. |
| **Drawdown** | `MaxDrawdown` calc | **Missing** | Implement `rolling_max` vs `current` in Pandas. |

## Final Recommendation

1.  **Do not change your persistence**: Keep the flat SQL tables. They are correct for a read-heavy Python app.
2.  **Focus on the "Engine"**: Your `PerformanceEngine` class is the most critical piece. It should accept a `Period` (start, end) and return a `PerformanceResult` object containing distinct metrics (TWR, IRR, Delta, Realized, Unrealized).
3.  **Strictly Separate "Lifetime" vs "Period"**:
    *   **Lifetime** (Total Portfolio): Can be approximated by simple SQL sums.
    *   **Period** (Last Year): **REQUIRES** the "Virtual Inventory" method (resetting cost basis at start date). **Do not** attempt to calculate period performance by summing pre-calculated SQL columns. It will be wrong.

By implementing the **Virtual Inventory** logic and standardizing on **Pandas** for the TWR/IRR math, you will match Portfolio Performance's numbers exactly.
