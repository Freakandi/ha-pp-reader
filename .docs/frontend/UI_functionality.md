# Frontend UI Functionality Overview

This document provides a comprehensive overview of the frontend functionality of the Portfolio Performance Reader integration. It covers the displayed data, interactive elements, and navigation structure across the different views.

## 1. General UI Layout & Navigation

*   **Tabs:** The application is organized into two main tabs, **Dashboard** (Overview) and **Analyse**, with dynamic **Security Detail** tabs opening as needed.
*   **Navigation:**
    *   **Tab Switching:** Users can switch tabs by clicking on the tab titles or using the Left/Right navigation arrows in the header.
    *   **Swipe Gestures:** Swipe Left/Right on the header card to navigate between tabs (supports both Touch and Mouse dragging).
    *   **Sticky Header:** The header card remains visible (sticky) at the top of the viewport when scrolling down.
*   **Scroll Management:** The application remembers the scroll position of each tab when navigating away and restores it upon return.
*   **Live Updates:** The UI listens to WebSocket events (`panels_updated`) to reflect real-time changes in account balances, portfolio values, and positions.
*   **Responsive Design:** The layout adapts to different screen sizes (e.g., sticky header behavior, column visibility).
*   **Menu Toggle:** A button in the header toggles the Home Assistant sidebar.

## 2. Overview Tab (Dashboard)

The main dashboard provides a high-level view of all portfolios and liquidity accounts.

### Header
*   **Total Wealth:** Displays the calculated sum of all account balances and portfolio current values.
*   **Warnings:**
    *   Displays a warning note if partial missing FX rates or data issues affect the total wealth calculation.
    *   Specific icon warnings if foreign currency accounts lack exchange rates.

### Investment (Portfolios) Section
*   **Portfolios List:** A table listing all configured portfolios.
*   **Displayed Data (per portfolio row):**
    *   **Name:** Portfolio name (with optional badges for metadata).
    *   **Position Count:** Number of positions in the portfolio.
    *   **Purchase Value:** Total purchase value of all positions (EUR).
    *   **Current Value:** Total current market value (EUR).
    *   **Day Change:** Absolute value change (EUR) and percentage change (%) since the last close.
    *   **Total Gain:** Absolute gain/loss (EUR) and percentage gain/loss (%) relative to purchase value.
        *   *Visual Feedback:* Gain/Loss values are color-coded (Green for positive, Red for negative, Grey for neutral).
*   **Footer Row:** Displays the sum of all columns (Position Count, Purchase Value, Current Value, Gains) for all portfolios.
*   **Interactions:**
    *   **Expand/Collapse:** Each portfolio row has a toggle button to show/hide the list of positions within it.
    *   **Lazy Loading:** Positions are fetched from the server only when a portfolio is expanded.
    *   **Retry Mechanism:** A "Retry" button appears if loading positions fails.
    *   **State Persistence:** Expanded/Collapsed state of portfolios is preserved during the session.

### Portfolio Details (Expanded View)
When a portfolio is expanded, a nested table of positions is displayed.
*   **Positions Table:** Lists individual securities.
*   **Displayed Data (per position row):**
    *   **Security Name:** Name of the security.
    *   **Holdings:** Current number of shares/units.
    *   **Avg. Purchase Price:** Average purchase price. Displays primary currency value and optionally the EUR equivalent if different.
    *   **Purchase Value:** Total purchase cost (EUR).
    *   **Current Value:** Current market value (EUR).
    *   **Day Change:** Absolute (EUR) and Percentage (%) change for the day.
    *   **Total Gain:** Absolute (EUR) and Percentage (%) total gain/loss.
        *   *Visual Feedback:* Color-coded gain/loss indicators.
*   **Interactions:**
    *   **Sorting:** Clicking column headers sorts the positions table by that column (toggle Ascending/Descending).
    *   **Navigation:** Clicking on a position row opens the **Security Detail** view for that security.

### Liquidity (Accounts) Section
*   **EUR Accounts Table:**
    *   **Name:** Account name (with badges).
    *   **Balance:** Current balance in EUR.
*   **Foreign Currency (FX) Accounts Table:**
    *   **Name:** Account name.
    *   **Amount (FX):** Balance in the native currency (e.g., USD).
    *   **Balance (EUR):** Converted balance in EUR.
    *   **Warning:** Displays a warning if exchange rates are unavailable.

### Footer
*   **Last Update:** Displays the timestamp of the last file update from the backend.

## 3. Analyse Tab (Backdating & Performance)

Allows users to analyze wealth development and performance over a specific time period.

### Time Selection
*   **Modes:**
    *   **Range:** Select a start and end date.
    *   **Single Day:** Select a specific date.
*   **Interactive Elements:** Date pickers and an "Apply" (Übernehmen) button to fetch data.
*   **State:** The selected mode and dates are preserved.

### Totals Section
*   **Total Wealth:** The wealth value at the end of the selected period.
*   **Data Quality Indicators (Badges):**
    *   **FX Coverage:** Warning if exchange rates are missing.
    *   **Price Coverage:** Warning if price data is incomplete.
    *   **Stale Prices:** Warning if the latest available prices are outdated.

### Cashflows Section
Breakdown of cash flow types during the selected period:
*   Dividends
*   Interest
*   Inbound Transfers
*   Outbound Transfers
*   Fees
*   Taxes

### Performance Section
Detailed breakdown of value changes:
*   Start Value & End Value.
*   Market/FX Gain (residual gain).
*   Earnings (Dividends + Interest).
*   Fees & Taxes.
*   Net Transfers.
*   Performance Neutral Movements.

### Wealth Chart
*   **Visualization:** Line chart showing the development of Total Wealth over time.
*   **Scope Filters:** Checkboxes to toggle the visibility of specific Accounts and Portfolios on the chart (multi-line comparison).
*   **Interactions:**
    *   **Tooltips:** Hovering over the chart displays the date and value.
    *   **Focus Line:** A vertical line follows the cursor to pinpoint values on the timeline.

## 4. Security Detail View

A dynamic view providing in-depth information about a specific security.

### Header & Meta Information
*   **Title:** Name of the Security.
*   **Key Metrics (Snapshot):**
    *   **Last Price:** Current price (Native currency & EUR).
    *   **Average Purchase Price:** Weighted average purchase price.
        *   *Tooltip:* Hovering reveals the data source (e.g., "Aggregated") and the FX rate used for conversion.
    *   **Day Change:** Absolute and Percentage change.
    *   **Total Change:** Absolute and Percentage gain/loss.
    *   **Holdings:** Current quantity.
    *   **Market Value:** Current value in EUR.
*   **Stale Data Notice:** A warning banner appears if the data displayed is from a cached snapshot and live data could not be fetched.
*   **News Integration:**
    *   **"Check recent news via ChatGPT":** A button that copies a predefined prompt (including the ticker symbol) to the clipboard and opens ChatGPT in a new tab/window. Includes a fallback if the Clipboard API is unavailable.

### Price History Section
*   **Info Bar:** Displays the price change (absolute & %) for the currently selected time range.
*   **Range Selector:** Buttons to select the history timeframe: **1M** (1 Month), **6M**, **1Y**, **5Y**, **ALL**.
    *   *Interaction:* Clicking a range fetches historical data and updates the chart and info bar.
*   **Price History Chart:**
    *   **Line Chart:** Visualizes the price trend over the selected range.
    *   **Transaction Markers:** Visual dots on the chart line indicating **Buy** (Green) and **Sell** (Red) transactions at their respective dates and prices.
    *   **Tooltips:**
        *   **Chart:** Hovering displays date and price.
        *   **Markers:** Hovering a transaction marker displays details: Type (Buy/Sell), Shares, Price, and Date.
*   **Live Updates:** The view automatically refreshes when new data is pushed via WebSocket.
