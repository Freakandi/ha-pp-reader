# Walkthrough - Realized Gains Calculation Fix

## Root Cause
The discrepancy in Realized Gains (appearing as Net Gains instead of Gross Gains) was caused by a logic error in `metrics/period_calculations.py` concerning the **Cost Basis for BUY transactions**.

1.  **Double Counting of Fees on BUY**:
    -   The code was calculating `gross_native = (raw_amount + fees + taxes) / 100.0` for all transaction types (Buy and Sell).
    -   For **BUY** transactions (Type 0), the `amount` field in the database (ingested from Portfolio Performance) represents the **Total Cash Outflow**, which *already includes* fees and taxes.
    -   Adding fees/taxes again resulted in an inflated Cost Basis (e.g., Cost 110 instead of 105).
    -   This inflation reduced the calculated Capital Gain on subsequent sales (Gain = Proceeds - Cost Basis), making the result appear closer to a Net Gain figure.

2.  **Uninitialized Variable**:
    -   A secondary bug was found where `start_fx_rates` could be accessed without initialization if no relevant currencies were found, causing a crash in edge cases (fixed to enable testing).

## Fix
Modified `custom_components/pp_reader/metrics/period_calculations.py` to differentiate between transaction types:
-   **BUY (Type 0)**: Cost Basis is now calculated as `raw_amount / 100.0`. Fees are not added again.
-   **INBOUND DELIVERY (Type 2)**: Maintained logic to add fees (`(raw_amount + fees) / 100.0`), as delivery amount typically represents asset value, not cash flow.
-   **SELL (Type 1)**: Maintained logic to add fees/taxes to `raw_amount` (Net Payout) to correctly reconstruct Gross Proceeds.

## Verification
Created a regression test `tests/metrics/test_period_calculations.py` simulating a Buy/Sell cycle with fees.
-   **Scenario**:
    -   Buy 1 share @ 100 EUR + 5 EUR Fee. (Total Cash Flow 105).
    -   Sell 1 share @ 120 EUR Gross. (Fee 5, Tax 5. Net Payout 110).
-   **Before Fix**: Realized Gain = 10.0 EUR (120 - 110).
-   **After Fix**: Realized Gain = 15.0 EUR (120 - 105).
    -   This matches the expected Gross Gain (120 - 105).

## Next Steps
-   Restart Home Assistant to load the patched integration code.
-   Verify the "Time Series" tab now accurately reflects Gross Realized Gains.
