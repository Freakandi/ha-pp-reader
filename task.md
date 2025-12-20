# Task: Realized Performance View (Trades Tab)

## Context
The user wants to upgrade the "Trades" tab to show a detailed "Realized Performance" view. Currently, it only shows closed positions with zero metadata. The goal is to calculate and display the realized gains/losses for all sold positions, using **FIFO** accounting logic.

## Objectives
1.  **Backend**: Implement a FIFO engine that specifically tracks *Sold* lots to calculate realized performance (Cost Basis of Sold Share vs. Net Sales Proceeds).
2.  **API**: Expose this data via a new websocket command `pp_reader/get_trades`.
3.  **Frontend**: Update the Trades tab to show a rich table with expandable rows for positions with multiple sell events.

## Specifications

### 1. Logic: Realized Performance (FIFO)
**Location**: `custom_components/pp_reader/logic/securities.py` (or new module if preferred)

Extend or adapt the existing FIFO logic (`db_calculate_sec_purchase_value`) to compute **Realized Metrics** for every `SALE` (Type 1) or `OUTBOUND_DELIVERY` (Type 3) transaction.

*   **Logic**:
    *   Iterate all transactions chronologically.
    *   Maintain a "Purchase Queue" of available lots (Date, Price, Shares, Fees/Taxes).
    *   When a **BUY** occurs: Add to queue.
    *   When a **SELL** occurs:
        *   Consume lots from the front of the queue (FIFO).
        *   **Calculate Cost Basis (Sold)**: `Sum(Matches.Shares * Matches.PurchasePrice) + AllocatedPurchaseFees`.
        *   **Calculate Sales Value (Gross)**: `Sell.Shares * Sell.Price`.
        *   **Calculate Sales Value (Net)**: `Sales Value (Gross) - Sell.Fees - Sell.Taxes`.
        *   **Result (Abs)**: `Sales Value (Net) - Cost Basis (Sold)`.
        *   **Result (%)**: `Result (Abs) / Cost Basis (Sold)`.
    *   **Aggregation**: Group all realized sell events by `Security`.

### 2. Websocket Command: `pp_reader/get_trades`
**Location**: `custom_components/pp_reader/data/websocket.py`

*   **Input**: `entry_id` (string).
*   **Output**:
    ```json
    {
      "trades": [
        {
          "security_uuid": "...",
          "name": "Apple Inc.",
          "ticker_symbol": "AAPL",
          "current_price": 150.00, // Live price
          "current_holdings": 0,   // Remaining
          "last_sell_price": 145.00, // Price of most recent sell
          "purchase_value_gross": 1000.00, // Total Cost Basis of ALL sold shares
          "sales_value_gross": 1500.00,    // Total Gross Proceeds
          "sales_value_net": 1450.00,      // Total Net Proceeds
          "result_pct": 45.0,              // Total Result %
          "lots": [ // List of individual sell events
             {
               "date": "2023-01-01",
               "shares": 10,
               "sell_price": 145.00,
               "purchase_value_gross": ...,
               "sales_value_gross": ...,
               "sales_value_net": ...,
               "result_pct": ...
             }
          ]
        }
      ]
    }
    ```

### 3. Frontend: Trades Tab
**Location**: `src/tabs/trades.ts`

*   **Table Structure**:
    *   Columns:
        1.  **Wertpapier** (Name) - Show `(+)` expand icon if `lots.length > 1`.
        2.  **Symbol**
        3.  **Verkaufskurs** (`last_sell_price`).
        4.  **Aktueller Kurs** (`current_price`).
            *   Color: **Green** if `current_price > last_sell_price`.
            *   Color: **Red** if `current_price < last_sell_price`.
        5.  **Einstandswert** (`purchase_value_gross` of sold portion).
        6.  **Verkaufswert** (`sales_value_gross`).
        7.  **Nettoerlös** (`sales_value_net`).
        8.  **Resultat** (`result_pct`).
            *   Color: Standard Green/Red trend.
        9.  **Bestand** (`current_holdings`).
            *   Show Lock 🔒 icon if `0`.

*   **Behavior**:
    *   Clicking a row with multiple lots toggles the expansion.
    *   Child rows show the details for that specific sell event.
    *   Sorting: Sort by any column (Top-level aggregation used for sorting).

## Verification Steps
1.  **Backend Test**: Run `pytest tests/logic/test_realized_performance.py` (You must create this!).
    *   Scenario: Buy 10 @ 100, Buy 10 @ 200. Sell 5 (matches first lot), Sell 10 (matches remaining 5 of first, 5 of second). Verify Cost Basis calculations match manual FIFO math.
2.  **Frontend Check**:
    *   Run `npm run build`.
    *   Load the dashboard.
    *   Verify the table populates.
    *   Check colors for "Aktueller Kurs" vs "Verkaufskurs".
    *   Expand a multi-lot position and verify child rows appear.

## Reference
*   **FIFO Logic**: See `_apply_sale_fifo` in `logic/securities.py` for inspiration, but remember we need to *capture* the consumed lots, not just track the remaining ones.
