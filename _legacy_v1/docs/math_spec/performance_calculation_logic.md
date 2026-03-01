# Performance Calculation Logic Map

## 1. Beginning Value (Anfangswert)

### A. Portfolio Performance (Source of Truth)
*   **Java Class**: `ClientPerformanceSnapshot`
*   **Method**: `calculate()` -> `snapshotStart.getMonetaryAssets()`
*   **Logic**:
    > Sum of Market Value of all Securities + Cash Balances at `start_date`.
    > *   Securities: `Shares_Held * Closing_Price`
    > *   Cash: `Sum(Deposits - Withdrawals + Realized PnL + Income)`
    > *   **All converted to Report Currency using FX Rate at `start_date`.**
*   **Handling FX**: Explicitly converted at `start_date` rates.

### B. Python Integration (Implementation Plan)
*   **Input Data**: `PerformanceEngine._get_holdings_at_date(start_date)` + `PerformanceEngine.get_daily_wealth(start_prev)`
*   **Filter Condition**: Snapshot state at `start_date`.
*   **Formula**:
    ```python
    # Cash Component
    cash_balance = daily_wealth.loc[start_date, 'account_wealth_eur']

    # Security Component
    security_value = sum(
        holdings[sec_uuid] * price_at_start(sec_uuid) / fx_rate_at_start(curr)
        for sec_uuid in holdings
    )
    ```
*   **Discrepancy Checks**:
    *   [ ] **Missing Column**: `daily_wealth` table is populated ? ( *Yes, via `PerformanceEngine`* )
    *   [ ] **Verification**: Ensure `account_wealth_eur` includes interest/dividends received prior to `start_date`.

---

## 2. Capital Gains (Kurserfolge - Unrealized)

### A. Portfolio Performance (Source of Truth)
*   **Java Class**: `CapitalGainsCalculation` (called via `ClientPerformanceSnapshot.addCapitalGainsFifo`)
*   **Method**: `visit()` logic -> `unrealizedCapitalGains` accumulation.
*   **Logic**:
    > Change in value of securities held *during* the period.
    > The Cost Basis for these positions is **RESET** to their Market Value at `start_date`.
    > Formula: `(Market_Value_End - Cost_Basis_Reset)`
*   **Handling FX**: Calculated in Reporting Currency. `Cost_Basis_Reset` uses FX Rate at `start_date`. `Market_Value_End` uses FX Rate at `end_date`.

### B. Python Integration (Implementation Plan)
*   **Input Table**: `transactions` (for iterating moves), `historical_prices` (for MTM).
*   **Runtime Object**: `PerformanceEngine.calculate_period_performance` -> `_calculate_capital_gains`
*   **Filter Condition**: `date >= start_date` AND `date <= end_date`
*   **Formula**:
    ```python
    # This is NOT a simple SQL query. It requires the 'Virtual Inventory' logic.
    virtual_inventory = [
       Lot(shares=h, price=price_at_start, fx=fx_at_start) for h in holdings_at_start
    ]
    # Run FIFO on transactions in period against this virtual inventory.
    unrealized_gains = sum(
        (current_price/current_fx - lot.price_native/lot.fx_rate) * lot.shares
        for lot in remaining_inventory
    )
    ```
*   **Discrepancy Checks**:
    *   [ ] **Virtual Injection**: Does the current `PerformanceEngine` implementation correctly inject the start-of-period Holdings as synthetic "BUYS" with `price = close_at_start`? (**Yes**, explicitly verified in `calculate_period_performance`).

---

## 3. Realized Capital Gains (Realisierte Kurserfolge)

### A. Portfolio Performance (Source of Truth)
*   **Java Class**: `CapitalGainsCalculation`
*   **Method**: `visit(..., SELL)`
*   **Logic**:
    > Sum of (Sell Proceeds - Cost Basis) for all SELL transactions in period.
    > *   For shares held *before* start: Cost Basis = **Market Value at Start Date**.
    > *   For shares bought *during* period: Cost Basis = **Actual Buy Price**.
*   **Handling FX**:
    *   Proceeds: Converted at Transaction Date FX.
    *   Cost Basis (Historical): Converted at Transaction Date FX (Wait, strictly PP uses the *value* of the matched lot. If the lot was a Reset-Lot, it uses Start-Date FX. If it was a new Buy, it uses Buy-Date FX).

### B. Python Integration (Implementation Plan)
*   **Input Table**: `transactions`
*   **Filter Condition**: `type IN (SELL, DELIVERY_OUTBOUND)` AND `date >= start_date` AND `date <= end_date`
*   **Formula**:
    ```python
    # Requires FIFO Engine State
    realized_gain = (sell_price_eur - lot.price_eur_at_entry) * shares_sold
    ```
*   **Discrepancy Checks**:
    *   [x] **Column Check**: `fifo_cost_basis` DOES NOT EXIST in `transactions`. Must be calculated runtime.
    *   [ ] **Fee Handling**: PP `getGrossValue` for Sell implies `Amount + Taxes + Fees`. Wait, Realized Gain is purely Price Delta. Fees usually kept separate.
    *   **Clarification**: In PP, "Realized Capital Gains" is strictly `(Price_Sell - Price_Buy) * Shares`. Fees/Taxes are separate line items.
    *   **Python Check**: `_calculate_capital_gains` in `calculator.py` uses `gross_amt_cents = abs(row.amount) + fees + taxes` to derive `tx_price`. This isolates the pure price component. Correct.

---

## 4. Earnings (Erträge)

### A. Portfolio Performance (Source of Truth)
*   **Java Class**: `ClientPerformanceSnapshot`
*   **Method**: `addEarnings()`
*   **Logic**:
    > Sum of Gross Value of Income Transactions.
*   **Handling FX**: Converted at Transaction Date FX.

### B. Python Integration (Implementation Plan)
*   **Input Table**: `transactions`
*   **Filter Condition**: `type IN (DIVIDEND, INTEREST, INTEREST_CHARGE)` AND `date >= start_date` AND `date <= end_date`
*   **Formula**:
    ```python
    sum(
      CASE
        WHEN type IN (DIVIDEND, INTEREST) THEN amount_eur
        WHEN type = INTEREST_CHARGE THEN -amount_eur
      END
    )
    ```
*   **Discrepancy Checks**:
    *   [ ] **Gross vs Net**: PP adds `taxes` back to `amount` to get Gross for Dividends? (`Transaction.getGrossValue()` usually implies Amount before taxes).
    *   **Python check**: `transactions.amount` for Dividends is usually Net in many imports. We need to check if `transactions.amount` + `transaction_units.taxes` is required.
    *   **Confirmed**: `calculator.py` lines 532-541 sums `amount_eur` directly. If `amount` is Net, this will be wrong. Need to verify if `amount` in DB is Gross or Net.

---

## 5. Fees (Gebühren)

### A. Portfolio Performance (Source of Truth)
*   **Java Class**: `ClientPerformanceSnapshot`
*   **Method**: `addEarnings()` (Metrics Collection)
*   **Logic**:
    > Sum of all explicit FEES transactions + Fee components of Trades.
*   **Handling FX**: Converted at Transaction Date FX.

### B. Python Integration (Implementation Plan)
*   **Input Table**: `transaction_units`, `transactions`
*   **Filter Condition**: `unit_type = FEE` OR `tx_type = FEE`
*   **Formula**:
    ```python
    sum(fee_amount_eur)
    ```
*   **Discrepancy Checks**:
    *   [ ] **Signage**: PP displays Fees as Positive in the table but mathematically they reduce performance. Ensure consistency.

---

## 6. Taxes (Steuern)

### A. Portfolio Performance (Source of Truth)
*   **Java Class**: `ClientPerformanceSnapshot`
*   **Method**: `addEarnings()`
*   **Logic**:
    > Sum of all explicit TAX transactions + Tax components of Trades.
*   **Handling FX**: Converted at Transaction Date FX.

### B. Python Integration (Implementation Plan)
*   **Input Table**: `transaction_units`, `transactions`
*   **Filter Condition**: `unit_type = TAX` OR `tx_type = TAX`
*   **Formula**:
    ```python
    sum(tax_amount_eur)
    ```
*   **Discrepancy Checks**:
    *   [ ] **Signage**: Same as Fees.

---

## 7. Forex Gains (Cash Fremdwährungsgewinne)

### A. Portfolio Performance (Source of Truth)
*   **Java Class**: `ClientPerformanceSnapshot`
*   **Method**: `addCurrencyGains()`
*   **Logic**:
    > Measures the FX impact on **Cash Holdings** only.
    > `(End_Balance_Valuated - Start_Balance_Valuated) - (Net_Cash_Flow_Valuated_At_Txn_Date)`
*   **Handling FX**: Compares "Value at boundary" vs "Value at transaction".

### B. Python Integration (Implementation Plan)
*   **Input Table**: `transactions` (for cash flows), Fx Rates.
*   **Runtime Logic**: `PerformanceEngine._calculate_fx_performance`
*   **Formula**:
    ```python
    delta_cash_balance_eur_actual = (end_bal_native / end_fx) - (start_bal_native / start_fx)
    net_cash_flow_eur = sum(flow_native / flow_date_fx)
    fx_gain = delta_cash_balance_eur_actual - net_cash_flow_eur
    ```
*   **Discrepancy Checks**:
    *   [ ] **Scope**: Must only apply to accounts where `currency != 'EUR'`.

---

## 8. Performance-neutral Movements (Transfers)

### A. Portfolio Performance (Source of Truth)
*   **Java Class**: `ClientPerformanceSnapshot`
*   **Method**: `categories.get(CategoryType.TRANSFERS)`
*   **Logic**:
    > Sum of Deposits - Sum of Removals.
    > *   Deposits: `DEPOSIT`, `DELIVERY_INBOUND`.
    > *   Removals: `REMOVAL`, `DELIVERY_OUTBOUND`.
    > *   **Internal Transfers (`TRANSFER_IN`/`OUT`) are ignored** in this view.
*   **Handling FX**: Converted at Transaction Date FX.

### B. Python Integration (Implementation Plan)
*   **Input Table**: `transactions`
*   **Filter Condition**: `type IN (DEPOSIT, REMOVAL, INBOUND_DELIVERY, OUTBOUND_DELIVERY)`
*   **Formula**:
    ```python
    sum(amount_eur * sign)
    ```
    (Where Deposit/Inbound = +1, Removal/Outbound = -1)
*   **Discrepancy Checks**:
    *   [ ] **Completeness**: Ensure `DELIVERY` types are included, not just Account types.

---

## 9. End Value (Endwert)

### A. Portfolio Performance (Source of Truth)
*   **Java Class**: `ClientPerformanceSnapshot`
*   **Method**: `snapshotEnd.getMonetaryAssets()`
*   **Logic**:
    > Sum of Market Value of all Securities + Cash Balances at `end_date`.
*   **Handling FX**: Explicitly converted at `end_date` rates.

### B. Python Integration (Implementation Plan)
*   **Input Data**: `PerformanceEngine.get_daily_wealth(end_date)`
*   **Formula**:
    ```python
    daily_wealth.loc[end_date, 'total_wealth_eur']
    ```
*   **Discrepancy Checks**:
    *   [ ] **Consistency**: Must equal `Line 1 + Sum(Lines 2..8)`.
