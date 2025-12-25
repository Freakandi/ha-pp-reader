# Refactor Tracker: Wealth Calculation Engine

**Mission**: Refactor backend to use Vectorized Pandas ingestion + On-the-Fly Performance Calculation.
**Spec**: [.docs/task_spec.md](cci:7://file:///home/andreas/coding/repos/ha-pp-reader/.docs/task_spec.md:0:0-0:0)

## Phase A: Foundation (Schema & Ingestion)
**Objective**: Build reliable storage for daily wealth facts.
- [x] **Schema Update**:
    - Modify `daily_wealth` in `db_schema.py`.
    - Ensure columns: `total_wealth_eur`, `invested_capital_eur`, `dividends_eur`, `interest_eur`, `fees_eur`, `taxes_eur`, `performance_neutral_movements`.
    - (Remove old/unused columns if any, or keep for backward compat for now).
- [x] **Ingestion Engine (Pandas)**:
    - Create `custom_components/pp_reader/backdating/engine_pandas.py`.
    - Implement `load_data()`: Read transactions/prices into DataFrames.
    - Implement `calculate_daily_wealth()`:
        - Vectorized `groupby` / `resample` for Cashflows.
        - Vectorized `merge` + `ffill` for Prices/FX.
        - Calculate `total_wealth` & `invested_capital`.
    - Implement `persist_results()`: Bulk insert to DB.
- [x] **Validation**:
    - Compare new `daily_wealth` totals against old logic (smoke test).

## Phase B: The Calculator (Logic Core)
**Objective**: accurate dynamic performance math.
- [ ] **Service Creation**:
    - Create `custom_components/pp_reader/services/performance_calculator.py`.
- [ ] **Capital Gains Logic (Securities)**:
    - Implement Spec Section 2-C.
    - `Period Realized`: Iterate Sales.
    - `Period Unrealized`: Iterate Holdings.
- [ ] **FX Logic (Cash Accounts)**:
    - Implement Spec Section 2-D.
    - Iterate Cash Flows/Balances.
- [ ] **Unit Tests**:
    - Verify "Standard Share B" example (Buy 150 -> Sell 160 = +10 Realized).

## Phase C: Integration
**Objective**: UI Visibility.
- [ ] **API Update**:
    - Modify `websocket_api.py` (or relevant handler) to use `PerformanceCalculator`.
- [ ] **Frontend Check**:
    - Verify `time_series.ts` maps fields correctly.
