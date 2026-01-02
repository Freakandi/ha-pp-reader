# Investigation: Performance Summation Discrepancy

This document provides a detailed, code-derived explanation of how "Start Wealth", "Unrealized Gains", and "FX Cash Changes" are calculated in the integration. The goal is to highlight potential sources of the `Start + Components != End` summation discrepancy.

## 1. Start Wealth

**Location**: `get_daily_wealth(start_prev, start_prev)`
**Reference Date**: `start_date - 1 day` (T-1)

The Start Wealth is obtained by calculating the total portfolio wealth for the day **before** the period starts.

### Calculation Logic
1.  **Daily Cash Wealth (`daily_cash_wealth`)**:
    *   **Logic**: Cumulative Sum of all cash flows (Deposits, Removals, Buys, Sells, Dividends, Transfers, etc.) up to T-1.
    *   **Valuation**:
        *   Balances are grouped by Account and Currency.
        *   Converted to EUR using `fx_pivot` (Daily FX Rates).
        *   `fx_pivot` is typically populated using `ffill`/`bfill` on the `daily_wealth` range.
    *   **Code**:
        ```python
        val = bal / rates.where(rates > 0, 1.0)
        daily_cash_wealth = daily_cash_wealth.add(val.fillna(0.0))
        ```

2.  **Daily Security Wealth (`daily_sec_wealth`)**:
    *   **Logic**: Cumulative Sum of all share changes (Buys, Sells, Deliveries, Transfers) up to T-1.
    *   **Valuation**:
        *   Holdings are grouped by Security UUID.
        *   Valued using `price_pivot` (Daily Close Prices) and `fx_pivot`.
        *   `price_pivot` uses `ffill` logic for missing prices.
    *   **Code**:
        ```python
        val = (qty * prices) / rates.where(rates > 0, 1.0)
        daily_sec_wealth = daily_sec_wealth.add(val.fillna(0.0))
        ```

3.  **Total Start Wealth**: `daily_sec_wealth + daily_cash_wealth`.

**Potential Issue**:
*   The "Start Wealth" is based on **EOD (End of Day)** prices/rates of T-1.
*   It assumes `ffill` logic for prices if T-1 has no data.

---

## 2. Unrealized Gains (Cost Basis Validation)

**Location**: `_calculate_capital_gains` -> `_calculate_unrealized_security_gains_detailed`
**Reference State**: `_setup_virtual_inventory` at Start Date (T).

This component calculates the gain on securities held at the end of the period relative to their "Cost Basis".

### Calculation Logic
1.  **Virtual Inventory Setup (`_setup_virtual_inventory`)**:
    *   Calculates Holdings exactly at `Start Date` (T).
    *   **Crucial Step**: It establishes the "Initial Cost Basis" for pre-existing holdings using market data from **T-1** (`start_prev`).
    *   **Code**:
        ```python
        # Use basis_ts (t-1) for Mark-to-Market Valuation
        start_price = self._get_price(sec_uuid, basis_ts)  # searchsorted lookup
        start_fx = self._get_fx(curr, basis_ts)            # binary search lookup
        ```
    *   **Difference from Start Wealth**:
        *   `Start Wealth` uses `price_pivot` (Pandas Series lookup).
        *   `Unrealized Logic` uses `_get_price` (Numpy/Bisect `searchsorted`).
        *   While both attempt to get the price at T-1, `searchsorted` (side='right') finds the *last available price before or at* that timestamp. `price_pivot` relies on the pre-constructed dataframe index alignment.
        *   **Mismatch Vector**: If `price_pivot` and `_get_price` yield different values (e.g., due to different handling of intra-day timestamps or missing data fill logic), the "Start Wealth" (Pivot-based) will differ from the "Implicit Cost Basis" (Search-based) of the Unrealized Gain calculation.

2.  **Gain Calculation**:
    *   Iterates through the Final Inventory.
    *   For lots originating before Start Date:
        *   `Base Value = Share Count * Price(T-1) / FX(T-1)` (using `_get_price`).
    *   For lots acquired during the period:
        *   `Base Value = Share Count * Purchase Price / Purchase FX`.
    *   `Unrealized Gain = End Value - Base Value`.

---

## 3. FX Cash Changes

**Location**: `_calculate_fx_performance`
**Reference Dates**: Start Date (T) and End Date (T_end).

This calculates the gain/loss purely due to currency fluctuations on cash accounts.

### Calculation Logic
Using the **Balance Sheet Method**: `Gain = (End Value - Start Value) - Net Inflows`.

1.  **Start Value Calculation**:
    *   Calls `_get_account_balances(start_ts)` where `start_ts` is `Start Date` (T).
    *   **Code**:
        ```python
        bal_start = self._get_account_balances(start_ts)
        rate_start = self._get_fx(curr_code, start_ts)
        val_start_eur = qty_start / rate_start
        ```
    *   **Mismatch Vector**:
        *   `Start Wealth` uses T-1 EOD Rates (via `fx_pivot` aligned to T-1).
        *   `FX Perf` uses T Start Rates (via `_get_fx` at T).
        *   If `Rate(T-1 EOD)` != `Rate(T Start)`, the "Start Value" of the cash component differs between the Time Series sum and the Performance calculation.
        *   Typically `Rate(T)` should be the same as `Rate(T-1 EOD)` if no new rate came in at midnight. However, `_get_fx` might behave differently than `fx_pivot` (ffill).

2.  **Net Inflows**:
    *   Sums nominal flows for each account.
    *   Converts to EUR.
    *   Subtracts this Net Flow from the Change in Value.

## Summary of Discrepancy Vectors

The `0.80 €` (and similar revaluation) errors arise because **Start Wealth** and **Performance Baselines** are derived via different code paths:

| Component | Valuation Source | Timing Reference |
| :--- | :--- | :--- |
| **Start Wealth** (Time Series) | `price_pivot`, `fx_pivot` | `T-1` (End of Day) |
| **Unrealized Basis** (Perf) | `_get_price`, `_get_fx` | `T-1` (End of Day) |
| **FX Cash Start** (Perf) | `_get_fx` | `T` (Start of Day) |

**The Conflict**:
1.  **Start Wealth** relies on `pivot` tables (Batch).
2.  **Unrealized/FX Perf** rely on `_get_xxx` lookups (Point-in-Time).
3.  **FX Perf** specifically uses `T` Start, while Start Wealth uses `T-1` End.

If `_get_fx(T)` differs even slightly from `fx_pivot(T-1)`, the interpreted "Starting Cash Value" in the Performance block will not match the "Starting Cash Value" used in the Start Wealth sum. Since `Start Wealth` is a hard number in the summation, any deviation in the Performance block's internal baseline creates a "phantom" gain/loss that breaks the equation `Start + Perf = End`.
