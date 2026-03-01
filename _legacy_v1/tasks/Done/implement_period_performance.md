# Task: Implement Reference Performance Logic (TWR/IRR & Virtual Inventory)

Status: [x] Done
Est. Complexity: Medium
Suggested Mode: Local
Execution Mode: Local

## Goal
Refactor the backend `PerformanceEngine` to correctly calculate "Time-Weighted Rate of Return" (TWR) and "Internal Rate of Return" (IRR) for arbitrary time periods. This requires implementing the "Virtual Inventory" logic (Partial Replay) to ensure that realized gains and cost basis are reset relative to the period start date, rather than the portfolio lifetime.

## Context
- **Document**: `docs/math_spec/performance_calculation_logic.md` (Formulas)
- **Document**: `docs/pp_gap_analysis.md` (Strategy)
- **File**: `custom_components/pp_reader/metrics/calculator.py`
- **File**: `custom_components/pp_reader/data/websocket.py`

## Draft Implementation Steps

### 1. Refactor `PerformanceMetrics` Data Class
- [x] Update `PerformanceMetrics` in `calculator.py` to include:
    - `twr: float = 0.0`
    - `irr: float = 0.0`

### 2. Implement TWR Calculation
- [x] Add `_calculate_twr(self, daily_wealth: pd.DataFrame, df_flows: pd.DataFrame) -> float` to `PerformanceEngine`.
    - **Logic**:
        - Identify external cash flows (Deposits, Removals).
        - Calculate daily returns: `r_t = (EndValue - Flow) / StartValue - 1`.
        - Chain returns: `Total_TWR = Product(1 + r_t) - 1`.
    - **Note**: Handle edge case where `StartValue` is 0.

### 3. Implement IRR Calculation
- [x] Add `_calculate_irr(self, start_date, end_date, start_value, end_value, df_flows) -> float`.
    - **Logic**:
        - Construct stream of cash flows:
            - `(start_date, -start_value)`
            - `(flow_date, -amount)` (for details check sign convention: usually inflows to portfolio are negative for investor wallet, strictly speaking IRR is for the investment).
            - Let's match PP: Flows defined as Transfers In/Out.
            - `(end_date, +end_value)`
        - Implement a Newton-Raphson solver (XIRR equivalent) as `npm.irr` is removed and we want to avoid extra deps.
        - Alternatively use `scipy` if we decide to add it, but a simple solver is preferred.

### 4. Optimize and Complete `calculate_period_performance`
- [x] Ensure `_get_holdings_at_date` is performant.
- [x] Verify `_calculate_capital_gains` correctly utilizes the `initial_inventory` (the "Virtual Inventory").
    - The logic `base_price = lot.price if lot.date >= start_ts else self._get_price(sec_id, start_ts)` must be rigorously tested.
- [x] Integrate TWR and IRR calls into `calculate_period_performance`.

### 5. Expose Metrics in WebSocket
- [x] Update `ws_get_daily_wealth` in `websocket.py`:
    - Extract `twr` and `irr` from `PerformanceMetrics`.
    - Add to the returned JSON payload under `metrics`.

### 6. Verification
- [x] Add unit tests in `tests/metrics/test_calculator_kpi.py` (create if needed).
    - Test against known scenarios (e.g. simple buy/sell, adding cash, withdrawing cash).
- [x] use `browser_subagent` to verify the "Time Series" tab shows reasonable numbers for TWR/IRR.
