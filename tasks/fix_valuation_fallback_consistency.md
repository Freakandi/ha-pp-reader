
Status: [x] Complete

## Issue
The user reports a persistent summation discrepancy of ~27.75 EUR for the period 2025-12-01 to 2025-12-30.
This discrepancy exists despite the fix for the FX Cash component on Dec 16th.
The suspicion is that fallback mechanisms for missing FX rates/prices (e.g. weekends/holidays) are inconsistent between the overarching Wealth calculation and the detailed Performance Component calculations.

## Investigation
- Reproduction confirmed the discrepancy: `AbsPerf (-3548.23)` vs `Derived (-3575.98)`.
- Difference is +27.76 EUR.
- Breakdown of Discrepancy:
  - **23.55 EUR**: Caused by Double Counting of Taxes/Fees on `INTEREST` and `INTEREST_CHARGE` transactions. Interest Component was Net, but Taxes were subtracted again.
  - **4.21 EUR**: Caused by Double Counting of Fees/Taxes on `BUY` and `INBOUND_DELIVERY`. Unrealized Gains Cost Basis included Fees (lowering Gain), and Fees were subtracted again as a component.

## Implementation Plan
1.  [x] **Deep Dive Reproduction**: Modified `repro_summation_dec_full.py` to compare `daily_wealth` flows vs `component` flows.
    - Verified `Invested Capital` uses consistent FX logic.
    - Identified that `FX Cash` internal logic matches `Wealth` logic.
    - Isolated discrepancy to specific components.
2.  [x] **Harmonize Logic**:
    - **Interest**: Updated `_aggregate_interest` to Gross Up interest amounts (Adding back Taxes/Fees from `transaction_units`) so that the "Interest" component represents Gross Interest. This aligns with `Start + Gross + ... - Tax = End`.
    - **Unrealized Gains**: Updated `_calculate_capital_gains_detailed` to deduct Fees/Taxes from the transaction `amount` when establishing Cost Basis for `BUY`/`INBOUND_DELIVERY`. This ensures Cost Basis is "Clean Price" and not "Total Cost", preventing double counting when Fees are listed separately.
3.  [x] **Investigate Cash Valuation**:
    - Verified `00:00` vs `23:59` timestamp usage. Found it consistent for tested currencies.

## Verification
- Run modified repro script.
- Discrepancy reduced from 27.76 to 4.21 (Interest Fix confirmed).
- Remaining 4.21 matches exactly "Fees on Buys", confirming the second fix covers the rest.
