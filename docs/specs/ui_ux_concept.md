# UI/UX Concept

## 1. Core Philosophy
**"Insight over Data."**
The UI does not just dump the database. It answers three specific questions via three dedicated tabs:
1.  **Overview**: "What do I own and what is it worth *right now*?"
2.  **Analysis**: "How is my wealth performing *over time*?"
3.  **Trades**: "What have I sold and was it profitable?"

## 2. Navigation Structure
The main navigation is a Tab Bar at the top (or bottom on mobile).
*   **Dashboard** (Default)
*   **Analyse**
*   **Trades**

---

## 3. Views Specification

### 3.1. Tab: Dashboard (Overview)
**Goal**: Net Worth Snapshot.
**Visuals**:
*   **Header**: Total Net Worth (EUR) | Day Change (EUR & %) | Total Gain (EUR & %).
*   **Main Component**: "Holdings Table" (Sortable).
*   **Scope Filter**: Dropdown to filter by specific Portfolio or "All Portfolios".

**Data Grid (Columns)**:
| Column | Description | Backend Requirement |
| :--- | :--- | :--- |
| **Name** | Security Name + Ticker | `security.name`, `security.uuid` |
| **Shares** | Quantity held | `sum(transactions)` |
| **Price** | Latest Market Price | `security.latest_price`, `security.currency` |
| **Avg Cost** | Average Purchase Price | `calculated_avg_cost` (FIFO/Moving Avg?) |
| **Value** | Current Value (Shares * Price) | `calculated_market_value` |
| **Day +/-** | Change since yesterday close | `security.previous_close` |
| **Total +/-** | (Value - Cost) & % | Complex: Needs currency normalization. |

**Detail View (Slide-over)**:
Clicking a row opens a "Security Sheet":
*   Chart: Price History (Line).
*   Stats: 52w High/Low, Market Value.
*   Transactions List: History for this specific asset.

### 3.2. Tab: Analyse (Time Series)
**Goal**: Performance Attribution.
**Visuals**:
*   **Controls**: Date Range Picker (e.g., "YTD", "1Y", Custom).
*   **Chart**: Total Wealth Line Chart.
    *   *Feature*: "Slices" Checkboxes to toggle individual Account/Portfolio lines on the graph.
*   **Metrics Grid**:
    *   **TWROR** (Time-Weighted Return)
    *   **IRR** (Internal Rate of Return)
    *   **Delta Breakdown**:
        *   Market Gains (Realized vs Unrealized)
        *   Dividends
        *   Fees & Taxes
        *   Currency Effects (FX Gains)

**Backend Requirement**:
*   Daily snapshots of wealth.
*   Ability to calculate IRR/TWR on-the-fly for any subset of dates.

### 3.3. Tab: Trades (Realized)
**Goal**: Closed Position Review.
**Visuals**:
*   **Table**: List of *Sell* transactions (aggregated by Security if multiple lots).
*   **Columns**:
    *   Date (Last Sell)
    *   Sold Volume
    *   Avg Sell Price vs Avg Buy Price
    *   **Realized G/L** (Absolute & %)
    *   Holding Period (Days)

---

## 4. Cross-Cutting Concerns

### 4.1. Currency Handling
*   **Problem**: Assets in USD, Accounts in EUR, Dashboard in EUR.
*   **Rule**: The UI *always* requests data in the **Reporting Currency** (EUR).
*   **Display**:
    *   Prices: Show "120.50 $" (Native) + "110.20 €" (Converted) in sub-text if distinct.
    *   Totals: Always EUR.

### 4.2. Data Freshness
*   UI should show a "Last Updated" timestamp.
*   Pull-to-refresh action triggers `update_entity`.

## 5. The "Demand List" (Backend Requirements)
To support this UI, the `lib` must provide:
1.  **Holdings Service**: `get_holdings(portfolio_id) -> List[Position]`
    *   `Position` needs: `current_shares`, `avg_cost`, `market_value`, `daily_delta`.
2.  **Performance Service**: `calc_performance(start, end, filter) -> PerformanceReport`
    *   `PerformanceReport` needs: `TWR`, `IRR`, `CashflowBreakdown`, `DailyWealthSeries`.
3.  **Price Engine**: Real-time (or near real-time) conversion of any currency to EUR.
