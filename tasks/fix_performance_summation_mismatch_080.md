# Task: Fix Performance Summation Mismatch (0.80 €)

Status: [x] Complete
Est. Complexity: Medium
Suggested Mode: Local

## Issue
The "Time Series" tab shows a mathematical discrepancy of **0.80 €** for the period `2025-12-03` to `2026-01-02`.
The relationship `Start Wealth + Sum(Components) = End Wealth` is violated: `225,181.05 + 225.40 (Perf) - 849.99 (Neutral) != 222,901.82`.
The calculated sum is `222,902.62`, resulting in a `+0.80 €` mismatch.

## Investigation
The mismatch is caused by divergent logic between `Invested Capital` calculation (used to derive Absolute Performance) and `Performance Neutral Movements` (used for the breakdown).

1.  **Missing Security Transfers**: `_calculate_invested_capital` includes `SECURITY_TRANSFER` (Type 4) valuations. `get_daily_wealth` (Breakdown) excludes Type 4 from `neutral_map`.
    *   *Effect*: Any FX/Price valuation difference in transfers (e.g. 0.80 €) shifts Invested Capital (and Absolute Performance) but vanishes from the Breakdown.

2.  **Removal Fee Double-Counting**:
    *   Inflows are correctly "Grossed Up" (Amount + Fee).
    *   Outflows (Removals) use raw `amount`. If this amount includes the fee (Net Debit), the Fee is counted twice (once in Neutral, once in Fees).
    *   *Effect*: Summation is lower than actual Wealth Change.

3.  **Delivery Valuation**:
    *   `_calculate_invested_capital` assumes `INBOUND_DELIVERY` has a valid Cash `amount`. If `amount=0` (share-only transfer), it calculates 0 Invested Capital change, treating the added share value as "Unknown Performance Gain".

## Implementation Plan

### Chunk 1: Shared Neutral Flow Logic
- [x] **Refactor**: Extract `_calculate_gross_neutral_flows` method in `calculator.py`.
    - Should accept `df_augmented` (or `df_txs` + `fx`), `date_range`.
    - Should return a daily Series of "Net External Flow" (EUR).
- [x] **Logic Update - Transfers**: Include `SECURITY_TRANSFER` (Type 4) in the calculation.
    - Value = Match logic in `_calculate_invested_capital` (value of securities moved).
- [x] **Logic Update - Removals**: Implement "Gross Down".
    - `Flow = Net_Amount (Negative) + Fee_Amount (Positive)`.
    - Ensure correct sign handling (Result should be *more* negative if fee was internal, or same if external? Wait. If I remove 100 net, and paid 10 fee. If fee was separate, I removed 100. If fee was part of 100, I removed 90? No.
    - *Definition*: "Neutral Movement" is the amount of money/value that cleanly entered/left the portfolio boundary.
    - If I have 100. I remove 100 (Transfer Out). Fee is 10.
    - Scenario A: 100 deducted from account. 10 fee deducted separately. Total delta -110. Neutral Flow = -100. Fee = 10. Sum = -90? No. End = Start - 110. Start (110) + Neutral (-100) - Fee (10) = 0. Correct.
    - Scenario B: 100 deducted (includes 10 fee). Recipient gets 90.
    - Total delta -100. Net Amount -100. Fee 10.
    - Neutral Flow should be -90 (what left). Fee 10.
    - Start (100) + Neutral (-90) - Fee (10) = 0.
    - Current Logic: Uses `amount` (-100). Neutral = -100. Fee = 10.
    - Sum = -90 (implies End=10). But End=0. Mismatch!
    - Fix: Neutral Flow must be `amount (-100) + fee (10) = -90`.
- [x] **Logic Update - Deliveries**: Handle `amount=0`.
    - If `amount == 0`, calculate `qty * price / fx`.

### Chunk 2: Integration & Verification
- [x] **Update Consumers**:
    - Modify `_calculate_invested_capital` to use `_calculate_gross_neutral_flows` (or ensure logic matches exactly).
    - Modify `get_daily_wealth` to use `_calculate_gross_neutral_flows` for `performance_neutral_movements`.
- [x] **Verify**: Update `tests/metrics/test_performance_summation.py`.
    - Add test case for Removal with Fee (ensure summation holds).
    - Add test case for Security Transfer (ensure summation holds).
    - Run `pytest tests/metrics/test_performance_summation.py`.
