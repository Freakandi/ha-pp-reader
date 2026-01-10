# Portfolio Performance Math Concepts (Explained Simpler)

This document explains exactly how the numbers in the "Overview" tab are calculated in `ha-pp-reader`. This serves as the "Rule Book" for verifying discrepancies.

## 1. The Basics: Buying a Share

When you buy a share, two things happen:
1.  **You get Shares**: e.g., 10 Shares of "Apple".
2.  **You pay Money**: e.g., 105 EUR.

This "Money Paid" usually consists of:
*   **Price of Shares**: 100 EUR (10 shares * 10 EUR/share).
*   **Fees**: 5 EUR (Bank commission).

### The "Amount" Assumption
The system assumes that the **Transaction Amount** recorded in the database is the **Total Money Paid** (The Gross Amount).
*   In the example above, we expect `Transaction Amount = 105 EUR`.
*   We treat `Fees (5 EUR)` as being *inside* that 105 EUR. They explain *part* of the cost, they are not *extra* cost on top of the 105 EUR.

## 2. The "Position" (Line Item)

A "Position" represents the shares you currently own.

### Purchase Value (Buying Price)
This is the most critical number. It answers: "How much money did I effectively spend to get these specific shares?"

*   **Logic**: `(Shares Owned * Purchase Price per Share)`
*   **Purchase Price per Share**: We calculate this as `Total Transaction Amount / Total Shares`.
    *   Because we use `Transaction Amount`, this price is **Gross** (includes Fees & Taxes).
    *   Example: `105 EUR / 10 Shares = 10.50 EUR/share`.
*   **Result**: If you own 10 shares, your **Purchase Value** is `10 * 10.50 = 105.00 EUR`.

### Current Value
*   **Logic**: `Shares Owned * Current Market Price`
*   **Market Price**: The latest price from the data provider (e.g. Yahoo Finance), converted to EUR.
*   Example: Apple is now 12 EUR. `10 * 12 = 120 EUR`.

### Total Change (Total +/-)
*   **Logic**: `Current Value - Purchase Value`
*   Example: `120 EUR - 105 EUR = +15 EUR`.
*   *Note*: This means your profit is calculated against the *Gross* cost. You need to earn back your fees to be positive.

### Day Change (Today +/-)
*   **Logic**: `Current Value - Value Yesterday`.
*   **Value Yesterday**: `Shares * Yesterday's Closing Price`.

## 3. The "Portfolio" (Aggregates)

The rows at the top (e.g., "IBKR Portfolio", "S-Broker") are simply **Sums** of the active positions below them.

*   **Purchase Value Aggregate**: Sum of "Purchase Value" of all open positions in that portfolio.
*   **Current Value Aggregate**: Sum of "Current Value" of all open positions.
*   **Total Change Aggregate**: Sum of "Total Change" of all open positions.

## 4. Why Discrepancies Happen

If the numbers look "significantly" wrong (especially Purchase Value), usually one of these things is happening:

### Scenario A: The "Hidden Fee" Issue (Verified Refutation)
*Initial Hypothesis*: S-Broker might store `Transaction Amount` as Net (e.g. 2360 EUR) and Fees separately, causing us to undercount costs.
*Verification (2025-07-04)*: **FALSE**.
*   We verified a S-Broker transaction. The Database `amount` column contained **2,365.57 EUR** (The Gross Total/Belastung).
*   The Database `transaction_units` contained **5.57 EUR** (Fees).
*   **Conclusion**: PP stores the **Gross Total** in the `amount` field. Our logic correctly uses this as the Cost Basis. Determining the Purchase Value by simply taking `Transaction Amount` is correct.

### Scenario B: Currency conversion (Verified Refutation)
*Initial Hypothesis*: Buying USD stocks might cause discrepancies if we infer the EUR cost using a different FX rate than the bank.
*Verification (2025-08-04 - Berkshire)*: **FALSE**.
*   We verified a USD purchase. The Database `amount` was stored directly in **797.31 EUR** (Matching the bank debit).
*   The `currency_code` was `EUR` (Target Currency).
*   **Conclusion**: PP stores the **Gross EUR Cost** for cross-currency trades. We do not need to perform risky FX conversions to find the Cost Basis; the true EUR Cost is already in the DB.

### Scenario C: Separated Fee Transactions
If the Fee was recorded as a completely separate transaction (Type: FEE) and not linked to the BUY transaction:
*   The system calculates the Security's Purchase Value based *only* on the BUY transaction.
*   The Fee is lost to the "General Account Expenses" and does not increase the Cost Basis of the specific stock.
*   **Check**: Look for ~74 EUR worth of "FEE" transactions in S-Broker that standout or are unlinked.

### Scenario D: The "Zombie" or "Hidden" Position
If the Portfolio Aggregate (31,977 EUR) is higher than the Sum of visible Positions (31,903 EUR) by **73.70 EUR**:
*   It implies there is Investment Capital tracked in the Portfolio that is **not** assigned to the currently displayed open positions.
*   **Possibility 1**: A position with `0` shares but residual value? (Shouldn't happen in FIFO).
*   **Possibility 2**: A position that is "Open" in the database but filtered out in the UI?
*   **Possibility 3 (Dominant)**: A "Line Item" in the UI has a calculated Purchase Value of `0` or `X` (too low), while the Backend Aggregate includes specific costs.
    *   S-Broker discrepancies are exactly **73.70 EUR**.
    *   We need to find a transaction or set of transactions summing to ~73.70 EUR that might be treating a fee as a separate cost (Scenario C) or have a data anomaly.
