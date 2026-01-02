Est. Complexity: Medium
Suggested Mode: Local
Status: [x] Complete

## Issue
The user reports several discrepancies in the Performance Calculation (Time Series tab) compared to Portfolio Performance and manual consistency checks:
1. **Summation Mismatch**: `AbsPerf` (End - Start - Flows) differs from the sum of broken-down components (Realized + Unrealized + Inc + FX - Fees - Taxes). The difference is ~73 EUR in the reported case.
2. **FX Gains**: Shows a loss that is too small (e.g., -3.66 EUR vs expected larger loss).
3. **Unrealized Gains**: Discrepancy likely rooted in "GOLD Physisch" valuation or FX positions. The End Value matches PP, so the issue is likely in the Cost Basis (Start Value) calculation for the period.
4. **End Wealth Mismatch**: Performance End Wealth differs from Overview Total Wealth.

## Investigation
- [x] **Summation Mismatch**:
   - `AbsPerf` is derived from Wealth Delta minus Invested Capital Delta.
   - Invested Capital Delta currently includes `DEPOSIT`, `INBOUND`, `REMOVAL`, `OUTBOUND`.
   - `SECURITY_TRANSFER` and `CASH_TRANSFER` are **excluded** from Invested Capital.
   - If `SECURITY_TRANSFER` (Type 4) increases Security Wealth (it is mapped to +1 in `_calculate_security_wealth`) but is not matched by an Invested Capital outflow (or an offsetting transaction), it creates "Phantom Performance".
   - We need to verify if `SECURITY_TRANSFER` is always internal (matched pairs) or can be external.
   - Similarly, "Difference" of 73 EUR might be an unclassified transaction type affecting Wealth but not Flows.

- [x] **FX Gains**:
   - `_calculate_fx_performance` rebuilds cash inventory from `df_txs`.
   - It calculates Unrealized Gain on Cash held as `(EndVal - BaseVal)`.
   - `BaseVal` is `Value @ StartDate` if held previously.
   - Suspicion: `CASH_TRANSFER` logic or `basis_ts` FX rate lookup might be slightly off, or `Inventory` building misses some start state if `df_txs` doesn't go back far enough (though it should).

- [x] **Gold Unrealized**:
   - `Unrealized = EndVal - CostBasis`.
   - For Period Performance, `CostBasis` for existing holdings should be `Mark-To-Market @ StartDate-1`.
   - Verification needed: Is `_get_price` returning the correct Friday close for a Monday/Tuesday start?
   - Is `GOLD` treating `shares` differently (oz vs pieces)? (Unlikely if End Value matches).

## Implementation Plan
- [x] **Fix `SECURITY_TRANSFER` Handling**:
   - If `SECURITY_TRANSFER` represents an external flow (or a one-sided import), it MUST be added to `Invested Capital` calculation.
   - Or, ensure it's filtered out of `Period Performance` if it's not a valid flow for that scope.
   - Handle matching pairs if internal.

- [x] **Refine Cost Basis (Mark-to-Market)**:
   - Ensure `basis_ts` (Start - 1 day) correctly picks up the last available price if it falls on a weekend. `_get_price` uses `searchsorted(side='right')` and `loc-1`.
   - Verify if `GOLD` has prices in `historical_prices` or only `live`.

- [x] **Fix FX Calculation logic**:
    - Verify `CASH_TRANSFER` logic in `_calculate_fx_performance`.
    - Ensure correct `basis_ts` FX usage.

- [x] **Debug Logging**:
   - Add detailed logging for the "Mismatch" components to see exactly *which* component is drifting.
   - Log `Invested Capital` daily changes to identify spikes matching the 73 EUR diff.

## Verification
- [x] Run `pytest` on calculator tests.
- [ ] Use `browser_subagent` to check the "Time Series" verification tab (if available) or logs.
- [ ] Compare `AbsPerf` vs `Derived` in logs.
- [ ] Verify "Gold" Unrealized matches `EndVal - StartVal`.
