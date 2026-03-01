# Task: Fix Performance Calculation & Breakdown

Status: [ ] Open
Est. Complexity: Medium
Suggested Mode: Local

## Issue
The "Performance Calculation" section in the Time Series tab exhibits two issues:
1.  **A) Accuracy**: Key metrics (Realized/Unrealized Gains) show slight deviations from Portfolio Performance (PP) reference values.
2.  **B) Missing Breakdowns**: Expanding rows for Realized Gains, Dividends, etc. yields no details ("Total" or empty), because the WebSocket handler is a stub.

## Investigation
*   **Math**: The current `PerformanceEngine.calculate_period_performance` uses a "Partial Replay" strategy with a "Virtual Inventory" reset at the start date. This aligns with `docs/math_spec/performance_calculation_logic.md`. However, potential inaccuracies may stem from:
    *   Rounding differences (float vs decimal/integer).
    *   Gross vs Net handling in `_calculate_capital_gains`.
    *   Price/FX fetch logic for the exact start timeframe.
*   **Breakdowns**: `ws_get_performance_breakdown` in `websocket.py` is explicitly a stub returning hardcoded "Total" lines.
*   **Code Structure**: `PerformanceEngine` currently calculates totals but discards the per-security detail needed for the UI.

## Implementation Steps

### Phase 1: Logic & Math Refactor
- [x] **Refactor `PerformanceEngine`**: Implement `calculate_period_breakdown` in `custom_components/pp_reader/metrics/calculator.py`.
    - Logic must aggregate Realized/Unrealized Gains, Dividends, Fees, Taxes, Interest by Security/Account.
    - Result must be a structured dictionary compatible with the frontend expectations.
- [x] **Math Audit**: Review `_calculate_capital_gains` in `custom_components/pp_reader/metrics/calculator.py`.
    - Ensure correct handling of partial sales (FIFO impact logic).
    - Verify Start Date valuation (mark-to-market) uses correct logic.

### Phase 2: API & Tests
- [x] **Update WebSocket**: Modify `ws_get_performance_breakdown` in `custom_components/pp_reader/data/websocket.py` to use the new engine method.
- [x] **Unit Testing**: Add comprehensive tests in `tests/metrics/test_calculator.py` verifying the breakdown structure and sum consistency.

### Phase 3: Verification
- [x] **Automated**: Run `pytest tests/metrics/`.
- [ ] **Visual**: Use `/verify-ui` or manual check to confirm expanding rows in Time Series works.
