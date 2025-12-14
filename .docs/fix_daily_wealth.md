# Daily Wealth Calculation Discrepancies

## Context
We observed discrepancies between `ha-pp-reader`'s "Analyse" dashboard and Portfolio Performance's (PP) "Calculation" widget for the same timeframe. Key metrics (Taxes, Fees, Realized Gains) differ significantly.

## Known Discrepancies

### 1. Taxes (Steuern)
- **Symptom**: `ha-pp-reader` shows significantly HIGHER taxes (e.g., -816€ vs PP -198€).
- **Root Cause Identified**:
  - `ha-pp-reader` includes ALL tax events within the date range `[Start, End]`.
  - PP appears to exclude large tax events occurring ON the "Start Date" (e.g., a Sell transaction on 13.05 at 11:20 was excluded from PP's view starting 13.05).
  - **Hypothesis**: PP calculates "Start Period Value" as the Close of the Start Date (or after transactions), whereas we handle it as Open of Start Date.
  - **Evidence**: A specific Sell Transaction on 13.05 had ~593 EUR tax. 816 - 593 = 223, which is close to PP's 198.
- **Fix Strategy**:
  - Verify Start Date handling consistency.
  - Determine if we should adopt "Start Date Exclusive" logic for flows, or "Start Date Open" for balances.

### 2. Realized Gains (Realisierte Kurserfolge)
- **Symptom**: `ha-pp-reader` consistently shows `0.00` or fails to capture gains (PP shows +164€).
- **Root Cause Identified**:
  - Backend logic in `backdating/holdings.py` (`_apply_transaction_update`) has a FIFO/AverageCost mechanism, but it produces 0.
  - **Suspects**:
    - `cost_basis_sold` might be equating to `proceeds` (if cost history is missing/zero).
    - `tx_val_eur` might be 0 if FX rates are missing for the transaction date.
    - Transaction Type handling: `Type 1` (Sell) is recognized, but maybe the input `shares` or `amount` are interpreted incorrectly (Net vs Gross).
- **Fix Strategy**:
  - Debug `custom_components/pp_reader/backdating/holdings.py`.
  - Ensure `_load_relevant_transactions` loads FULL history (pre-start-date) to establish correct Cost Basis.
  - Verify `_apply_transaction_update` actually computes non-zero gains for known profitable Sells.

### 3. Fees (Gebühren)
- **Symptom**: `ha-pp-reader` shows higher fees (74€ vs PP 39€).
- **Root Cause Identified**:
  - We sum ALL `transaction_units` of Type 2 (Fees).
  - PP likely nets some fees against Cost Basis (reducing Realized Gain) or excludes Fees on specific transaction types (Start Day events?).
- **Fix Strategy**:
  - Compare line-by-line which Fees PP includes.
  - Check if Fees on "Buy" transactions are treated as "Expenses" or "Cost Adjustment". (Usually Cost Adjustment -> reduces unrealized gain, doesn't appear as explicit "Fee" expense).

## Technical Reference
- **Key File**: `custom_components/pp_reader/backdating/holdings.py`
  - `_compute_daily_holdings_snapshots_sync`: Main loop.
  - `_apply_transaction_update`: Logic for gain calculation.
- **Database Tables**:
  - `transactions` (Core event).
  - `transaction_units` (Splits: Type 1=Tax, Type 2=Fee).
  - `daily_wealth` (Stores calculated generic metrics).
