
# Debug and Fix Period Performance Calculation

## Context
We have established that the frontend correctly displays the values provided by the backend. However, the backend calculation in `period_calculations.py` is incorrect.
- **Period**: 2025-11-23 to 2025-12-22 (30 days)
- **Current Output**: `-598,07 €` (matches a legacy/static state, potentially suspicious)
- **Expected Output**: `~1.975,26 €` (User provided expectation)

## Objective
Identify the flaw in the "Mark-to-Market" calculation logic or data retrieval and correct it to match the expected value.

## Plan

### 1. Establish Ground Truth (The "Audit Script")
We cannot fix the logic until we know *exactly* which security is causing the deviation.
- Create a Python script (`scripts/audit_period_math.py`) that performs a "dumb", strictly itemized calculation for the target period.
- **Inputs**:
    - `start_date` = 2025-11-23
    - `end_date` = 2025-12-22
- **Logic for each Security**:
    1.  **Identify Inventory**:
        - `Held_Start`: Shares held at `start_date`. Cost Basis = `Price_Start` (Mark-to-Market).
        - `Bought_During`: Shares bought between `start_date` and `end_date`. Cost Basis = `Purchase_Price` (Actual).
    2.  **Process Sells (FIFO)**:
        - For every sell transaction during the period, reduce the inventory (consuming `Held_Start` first, then `Bought_During`).
        - Shares sold during the period do **not** contribute to Unrealized Gains (their performance is captured in Realized Gains).
    3.  **Calculate Unrealized Gain (for Remaining Shares only)**:
        - For shares remaining from `Held_Start`: `Gain = Shares * (Price_End - Price_Start) / FX_End`
          *(Note: Ensure strictly consistent FX handling. If Start Price was converted with FX_Start, then delta is `(Price_End/FX_End) - (Price_Start/FX_Start)`)*.
        - For shares remaining from `Bought_During`: `Gain = Shares * ((Price_End/FX_End) - (Purchase_Price_EUR))`
    4.  **Summation**: Sum the calculated gains for all securities.
- **Output**: A table listing every security with its individual calculated Unrealized Gain for the period.
- **Goal**: Sum these deltas to see if we get `~1.975 €`. If yes, this simple logic is correct, and the complex `period_calculations.py` is wrong. If no, our data (prices/FX) might be wrong.

### 2. Isolate the Divergence
- Run the existing `scripts/debug_period_calc_exact.py` (which uses the *current* buggy logic) and the new `scripts/audit_period_math.py` side-by-side.
- Identify the specific security or securities where the values differ significantly.
- **Hypothesis Checklist**:
    - **Initialization**: is the "Mark-to-Market" start value being set to 0 or a lifetime average instead of the spot value on `start_date`?
    - **FX Handling**: Are we dividing by `1.0` (missing FX rate) at the start or end?
    - **Transaction Timing**: Are transactions on the start/end date being included/excluded incorrectly?

### 3. Refine `period_calculations.py`
- Modify the core logic in `custom_components/pp_reader/metrics/period_calculations.py`.
- **Focus**:
    - The `lots` initialization loop (Lines 242-262).
    - The `start_prices` and `start_fx_rates` fetching.
    - Ensure logical consistency: `Unrealized = (Vol_End * Price_End) - (Vol_Start * Price_Start)` for held positions.

### 4. Verification
- The `scripts/debug_period_calc_exact.py` must output `~1.975,26 €`.
- The frontend (via Browser verification) must display this exact number.

## Constraint
- Do **not** use `daily_wealth` pre-calculated columns. You must calculate from `transactions`, `historical_prices`, and `fx_rates`.
- **Expected Output**: ~1.975,26 € (based on user calculation)
