# Walkthrough - Portfolio Last Price Column

## Feature Overview
Added a new column **"Letzter Kurs"** (Last Price) to the expanded portfolio positions table in the Overview tab.

- **Content**:
  - **Native Price**: The last fetched price in the security's native currency (e.g., USD, CAD, HKD).
  - **EUR Price**: If the security is non-EUR, the second line shows the converted EUR price using the latest FX rate.
- **Layout**: Stacked cell design consistent with "Kaufwert" and other columns.
- **Sorting**: Sortable by numeric value (using EUR equivalent for consistent comparison).

## Verification success

### Visual Verification
Verified that the column appears and populates correctly for both EUR and non-EUR securities.

**Screenshot:**
![Last Price Verification](./artifacts/last_price_verification.png)

(See "Letzter Kurs" column with HKD value on top and EUR value below for Alibaba)

### Automated Tests
- Updated `src/tabs/__tests__/overview.render.test.ts` to include coverage for the new column and adjusted indices.
- Validated `npm run lint:ts` passes.
- Validated `npm test` passes.

# Walkthrough - Dynamic Period Performance & FX Fixes

## Feature Overview
Implemented dynamic calculation of realized gains for the "Time Series" tab to correctly reflect performance for any selected period.

- **Dynamic Realized Gains**:
  - Sell transactions now calculate realized gains based on the requested period.
  - **Mark-to-Market**: For positions held before the period start, the cost basis is the market value at the start of the period.
  - **Within Period**: For positions bought during the period, the actual cost basis is used.
  - All values are correctly converted to EUR.

## Bug Fixes
- **JPY Currency Conversion**:
  - Fixed a critical issue where a large JPY sell transaction was using a fallback FX rate (1.0) instead of the correct JPY rate.
  - Re-enabled FX rate preparation in the backdating pipeline and rebuilt the history.
  - **Result**: Corrected unrealized gains and start values for portfolios containing JPY assets.

## Verification
- **Linting & Build**:
  - `ruff check .` -> Passed.
  - `npm run lint:ts` -> Passed.
  - `npm run build` -> Passed (verified fix for `update_dashboard_module.mjs`).
