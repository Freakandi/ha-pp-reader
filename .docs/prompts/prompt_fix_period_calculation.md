
# Deep-Dive: Period Unrealized Gains Discrepancy

## Context
We have significantly improved the Period Performance Calculation, moving from an erroneous `-600 €` to `~1.580 €`. However, the user expects `~1.975 €`.
We suspect a discrepancy on a per-position basis (possibly FX or Price data issues for specific assets).

## Objective
Generate a detailed, itemized report of Unrealized Gains for the period **2025-11-23 to 2025-12-22** to identify exactly which securities are under-reporting gains compared to expectations.

## Knowns & Fixed Logic
- **Inventory Logic**: We MUST exclude transaction `Type 8` (Divs) and `Type 11` (Accumulation) from share counts. Only `Type 0` (Buy) and `Type 2` (Delivery In) add shares. `Type 1` (Sell) and `Type 3` (Delivery Out) reduce shares.
- **Mark-to-Market**:
    - `Start Value` = `Shares_at_Start * Price_at_Start / FX_at_Start`
    - `End Value` = `Remaining_Shares * Price_at_End / FX_at_End`
    - `Unrealized Gain` = `End Value` - `Start Value` (for held positions).
- **Current Total**: ~1.578 €
- **Target Total**: ~1.975 €
- **Gap**: ~400 €

## Task Plan

### 1. Run Granular Reporting Script
Run the existing script `scripts/debug_unrealized_granular.py` to generate the detailed breakdown.
The script outputs to `.docs/unrealized_breakdown.md`.
1.  **Security Name**
2.  **Shares Start** (Inventory at 2025-11-23)
3.  **Price Start (Native)**
4.  **FX Start**
5.  **Start Value (EUR)**
6.  **Shares End** (Inventory at 2025-12-22)
7.  **Price End (Native)**
8.  **FX End**
9.  **End Value (EUR)**
10. **Unrealized Gain (EUR)** (The calculated delta)

### 2. Execution & Analysis
- Run the script.
- Sort the output by `Unrealized Gain (EUR)` descending.
- Identify the top gainers.
- Compare these against a manual check or external data if possible (e.g., look for "suspiciously low" gains for known high-performers like Gold, Tech, etc. if known).

### 3. Hypothesis Generation
Based on the list, determine:
- Are we missing specific price updates (e.g. `Price End` is same as `Price Start`)?
- Is FX applied correctly?
- Is there a specific asset class (e.g., USD stocks) that is consistently lower?

## Constraints
- **Strict Inventory**: Ensure `Type 8` and `Type 11` are IGNORED.
- **Price Fallback**: If a price is missing on the exact start/end date, ensure the script finds the *last known price* before or on that date.
- **Output**: Save the detailed table to `.docs/unrealized_breakdown.md` for user review.
