# Task: Harmonize Performance Valuation Logic

Status: [x] Complete
Est. Complexity: Medium
Suggested Mode: Local
Execution Mode: Local

## Issue
The "Time Series" tab shows a mathematical inconsistency where `Start Wealth + Sum(Performance Components) != End Wealth`.
The discrepancy (e.g., ~0.80 €) arises because `Start Wealth` is derived from `get_daily_wealth` (using batch pivot/ffill validation) while performance components (Unrealized Gains, Cash FX) are calculated using point-in-time scalar lookups (`_get_price`, `_get_fx`).
specifically, `_calculate_fx_performance` ignores the passed `basis_ts` (T-1) and uses `start_ts` (T) for its start valuation, creating a boundary gap.

## Investigation
- **Source of Divergence**:
  - `get_daily_wealth(start_prev, ...)`: Uses `price_pivot` (FFill/BFill) for valuations.
  - `_setup_virtual_inventory(start_prev)`: Uses `_get_price/_get_fx` (SearchSorted) for Cost Basis.
  - `_calculate_fx_performance(..., basis_ts)`: Receives `basis_ts` but currently hardcodes use of `start_ts` (T0) for `bal_start` and `rate_start` valuation.
- **Goal**: Consolidate determination of Portfolio Value at Period Boundaries to a Single Source of Truth (Point-in-Time).

## Implementation Plan

### Chunk 1: Refactor Valuation Logic
- [x] **Refactor `PerformanceEngine`**:
    - [x] Implement `_calculate_portfolio_state_at_date(date) -> PortfolioState` (or dict)
      - Should return: `total_wealth`, `invested_capital`, breakdown.
      - Logic:
        - Get Holdings (`_get_holdings_at_date`) & Balances (`_get_account_balances`).
        - Value them using `_get_price(date)` and `_get_fx(date)`.
        - **Critical**: Must match `_setup_virtual_inventory` valuation logic exactly.
    - [x] Update `calculate_period_performance` to decouple start/end wealth headers from `daily_wealth`.
        - Use `start_prev` state for Start Wealth.
        - Use conditional logic for End Wealth (Today vs History).
    - [x] Ensure `basis_ts` (T-1) is correctly propagated to all sub-calculators.

### Chunk 2: Align Components & Verification
- [x] **Fix `_calculate_fx_performance`**:
    - [x] Use `basis_ts` (T-1) for Start Valuation (`bal_start`, `rate_start`).
    - [x] Implement conditional End Valuation logic (Live for Today, Historical for Past).
- [x] **Enforce Component Consistency**:
    - [x] Verify `metrics.unrealized_gains` respects the Live/Today constraint.
    - [x] Verify `metrics.fx_gains_cash` respects the Live/Today constraint.
- [x] **Verification**:
    - [x] Run `tests/metrics/test_performance_summation.py`.
    - [x] Assert `diff < 0.01` with new logic.

## Verification
- **Automated**:
  - Run `tests/metrics/test_performance_summation.py`.
  - Assert `diff < 0.01`.
- **Manual**:
  - Check "Time Series" tab in Frontend.
  - Verify "Calculated" matches "End Value" exactly.
