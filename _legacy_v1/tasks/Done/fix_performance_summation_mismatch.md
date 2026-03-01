# Task: Fix Performance Calculation Summation Mismatch

Status: [ ] Open
Est. Complexity: Medium
Suggested Mode: Local

## Issue
The Performance Calculation breakdown in the Time Series tab is mathematically inconsistent.
Specifically: `Start Wealth + Sum(Components) != End Wealth`.
The deviation is small but significant.
Additionally, the user suspects errors in "Unrealized Gains" and "Cash FX Changes" when comparing to Portfolio Performance (PP).

## Investigation
1.  **Cash FX "Leak" (Double Counting)**:
    - Inspect `_calculate_fx_performance` in `calculator.py`.
    - **Hypothesis**: The calculation uses "Balance Sheet Method" (`Gain = DeltaBalance - NetInflows`).
    - **Suspect**: `NetInflows` might fail to include flows like `FEES`, `TAXES`, `DIVIDENDS`, `INTEREST`.
    - **Impact**: If a Fee reduces the Cash Balance but isn't recorded as an Outflow in FX calc, the logic interprets the drop as an FX Loss. Since "Fees" is *also* listed as a separate component, the Fee is effectively counted twice (once as Fee, once as FX Loss). This causes `Sum != End`.

2.  **Unrealized Gains & Security FX**:
    - Inspect `_calculate_unrealized_security_gains_detailed`.
    - **Current Logic**: Appears to calculate `Total Delta` (EndVal - StartVal).
    - **PP Logic**: PP typically separates "Price Gains" (Kurserfolge) and "Currency Gains" (Währungserfolge).
    - **Impact**: If the user compares "Unrealized Gains" to PP's "Kurserfolge", there will be a mismatch if FX is significant.
    - **Action**: Determine if we should split Security Delta into `Price Component` and `FX Component`. If we keep them combined, we must ensure "FX Changes" in the breakdown ONLY refers to Cash FX, or explicitly states it. However, for the **Summation** bug, the priority is that `Total Delta` is correct.

## Implementation Plan

### Chunk 1: Reproduction & Logic Fix
- [x] **Create Verification Script**: Create `tests/test_performance_summation.py` (moved to `tests/metrics/`). Include a test case with foreign currency cash flows (Deposits with Fees) and FX rate changes, asserting `Start Wealth + Sum(Components) == End Wealth`.
- [x] **Fix Cash FX/Neutral Calculation**: Modify `get_daily_wealth` in `metrics/calculator.py`. Ensure that `neutral_flow` (Performance Neutral Movements) includes the GROSS amount (Net + Fees + Taxes) for Inflows (Deposits), so that when Fees are subtracted later, the math balances.
- [x] **Verify Summation**: Run the test script to confirm the fix, and run existing tests to prevent regressions.

### Chunk 2: Alignment Verification (Optional/Refinement)
- [x] **Review**: Confirmed that the summation mismatch was caused by the "Net vs Gross" handling of Neutral Inflows with Fees. The fix resolves the mismatch without needing to overhaul Unrealized Gains logic.
- [x] **Final Verification**: Tests pass. Codebase linted.
