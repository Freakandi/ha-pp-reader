# Walkthrough - Stacked Trades Columns Feature

## Feature Verification
We implemented a stacked column layout for the "Trades" (Realisierte Performance) tab to save space and improve readability.

### 1. Stacked Layout
The following column pairs were combined:
- **Verkaufskurs** / **Aktueller Kurs**
- **Einstandswert** / **Verkaufswert**
- **Bruttoergebnis** / **Nettoergebnis**

**Verification Screenshot:**
![Initial State](./artifacts/trades_tab_initial_1766278577547.png)

(Note: Screenshots are stored in artifacts directory)

### 2. Granular Sorting
We verified that sorting works independently for top and bottom metrics in the stacked columns.

**Sorting by Gross Result (Bruttoergebnis):**
![Sort Gross](./artifacts/trades_sort_gross_1766278600240.png)

**Sorting by Net Result (Nettoergebnis):**
![Sort Net](./artifacts/trades_sort_net_1766278624574.png)

## Implementation Details
- Modified `src/tabs/trades.ts`:
  - Updated `renderTradesTable` to use stacked HTML structure.
  - Added `renderLots` support for stacked structure.
  - Implemented custom `sortTrades` function to handle stacked data sorting via `data-val` attributes.
  - Added CSS for `.sort-stack`, `.cell-stack`, and `.val-top` / `.val-bottom`.
- Verified build and linting passes.

## Bug Fix: Currency Mismatch in "Seit Verkauf"
Fixed a critical bug where "Seit Verkauf" (Since Sale) gain was calculated by subtracting EUR-denominated sale price from foreign-currency current price (e.g., JPY), leading to massive erroneous gains.

### Verification
**Before Fix (Bug):**
Current Price (JPY) - Sell Price (EUR) = Huge Number.
![Erroneous Calculation](./artifacts/trades_tab_with_bug_1766311344863.png)

**After Fix (Correct):**
Current Price converted to EUR - Sell Price (EUR) = Correct Result.
Harmonic Drive Systems: ~ -158 EUR.
![Correct Calculation](./artifacts/harmonic_drive_row_1766311608875.png)

