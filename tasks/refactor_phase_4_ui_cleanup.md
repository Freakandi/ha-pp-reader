# Refactor Phase 4: UI Data Cleanup & Consistency

**Goal:** Ensure the Frontend receives data solely from the *invariant* backend machinery (`PerformanceEngine` and `MarketResolver`), eliminating ad-hoc SQL logic in `securities.py` and `websocket.py` and strictly persisting historical wealth to `daily_wealth`.

**Context:**
- **Master Plan:** `tasks/refactor_calculations.md` (Phase 4)
- **Design Decisions:** `tasks/refactor_context.md`
- **Current State:**
    - `PerformanceEngine` requires `MarketResolver` injection but `websocket.py` instantiates it incorrectly (1 arg).
    - `securities.py` uses legacy ad-hoc SQL aggregation.
    - `ws_get_trades` is a stub returning a dummy "Total Realized Gains" item.
    - `ws_get_daily_wealth` calculates data on-the-fly using the engine instead of querying the `daily_wealth` table.
    - `engine_pandas.py` is confirmed deleted.
    - `metrics/history.py` exists with `rebuild_daily_wealth` logic.

## 1. Security Metrics Refactor (`metrics/securities.py`)
The `securities.py` module currently duplicates logic found in `PerformanceEngine`. It must be rewritten to delegate inventory and valuation logic to the engine/resolver. To achieve "Pure Delegation," the Engine must first be enhanced.

### 1.1 Enhance `PerformanceEngine` (`metrics/calculator.py`)
- [x] **Update `_get_holdings_at_date`**:
    - Add optional argument: `portfolio_uuid: str | None = None`.
    - Filter `self._df_txs` by `portfolio == portfolio_uuid` (if provided) *before* calculating inventory.
- [x] **Update `get_snapshot`**:
    - Add optional argument: `portfolio_uuid: str | None = None`.
    - Pass this argument to `_get_holdings_at_date`, `_get_account_balances` (add filter there too), and `_calculate_invested_capital` (filter transactions first).
- [x] **Expose `get_fifo_active_lots`**:
    - Add method `get_fifo_active_lots(self, scope_uuid: str | None = None) -> dict[str, list[Lot]]`.
    - This must perform the *same* FIFO replay logic as `calculate_realized_performance`, but return the **final inventory state** (Active Lots) instead of the popped realized trades.
    - Used by `securities.py` to calculate "Lifetime Unrealized Gain" (Current Value - Sum(Lot Cost)).

### 1.2 Rewrite `securities.py`
- [ ] **Import Dependencies**:
    - `from custom_components.pp_reader.metrics.calculator import PerformanceEngine`
    - `from custom_components.pp_reader.metrics.core.market_resolver import MarketResolver`
- [ ] **Rewrite `_compute_security_metrics_sync`**:
    - Initialize `MarketResolver(conn)` and `PerformanceEngine(conn, market_resolver)`. Load data (`engine.load_data()`).
    - **Loop Portfolios**: Query all portfolios from DB.
    - **Per Portfolio**:
        - Call `snapshot = engine.get_snapshot(today, portfolio_uuid=p_uuid)`.
        - Extract `invested_capital` from snapshot for the *portfolio* (used for "Purchase Value" fallback).
        - Call `holdings = engine._get_holdings_at_date(today, portfolio_uuid=p_uuid)` to get active securities in this portfolio (Aggregated Quantities).
        - Call `active_lots = engine.get_fifo_active_lots(scope_uuid=p_uuid)` to get granular cost basis.
    - **Per Security (in Portfolio)**:
        - Get Price/FX from `market_resolver`.
        - Calculate `current_value` using `holdings[sec_uuid] * price`.
        - **Gain Calculation:**
            - `Cost_Basis` = Sum of `(lot.price_native * lot.shares)` for all lots in `active_lots[sec_uuid]`.
            - `Unrealized_Gain` = `Current_Value - Cost_Basis`.
    - **Output:** Construct `SecurityMetricRecord` objects.

## 2. History & Charts Refactor (`metrics/history.py` & `websocket.py`)
Ensure historical data is pre-calculated in `daily_wealth` and simply queried by the UI.

- [ ] **Fix `metrics/history.py`**:
    - Ensure `rebuild_daily_wealth` correctly populates `daily_wealth` (Delete old -> Insert new).
    - Ensure it uses `PerformanceEngine` correctly instantiated with `MarketResolver`.
- [ ] **Update `websocket.py:ws_get_daily_wealth`**:
    - **Stop** instantiating `PerformanceEngine` for on-the-fly calculation.
    - **Start** querying `daily_wealth` table directly: `SELECT date, total_wealth_cents, total_invested_cents FROM daily_wealth WHERE ...`.
    - Implement `_fetch_daily_wealth_from_db(conn, start, end)` helper.
    - **Metrics Payload:** Only if `metrics_start` is requested, instantiate `PerformanceEngine` to calculate `calculate_period_performance` for the specific summary block. **Fix instantiation** to pass `MarketResolver`.

## 3. Realized Trades Refactor (`websocket.py:ws_get_trades`)
The Trades tab currently shows a dummy summary. It needs to show granular, per-trade FIFO results.

- [ ] **Update `ws_get_trades`**:
    - Instantiate `MarketResolver(conn)`.
    - Instantiate `PerformanceEngine(conn, market_resolver)`.
    - Call `engine.calculate_realized_performance(scope_uuid=filter)`.
    - Map result `RealizedTrade` objects to the JSON format expected by the frontend (updating `_serialize_realized_performance` if necessary to match the dataclass fields).

## 4. Test Plan
We need to verify the wiring.

- [ ] **Create `tests/metrics/test_ui_consistency.py`**:
    - `test_securities_snapshot`: Mock DB, `ws_get_portfolio_positions`. Verify it calls Engine and returns valid JSON.
    - `test_trades_fifo`: Mock DB with Buy/Sell. Call `ws_get_trades`. Verify correct FIFO gain calculated and returned.
    - `test_history_query`: Insert dummy data into `daily_wealth`. Call `ws_get_daily_wealth`. Verify it returns that data without calling `engine.get_snapshot`.
- [ ] **Run existing tests**:
    - `pytest tests/metrics/test_performance_summation.py` (Ensure engine still works).
    - `pytest tests/test_websocket.py` (Ensure no regressions in command signatures).

## Complexity Expecation
- **Complexity:** Medium
- **Risk:** High (Breaking UI). The `PerformanceEngine` constructor change (`+ market_resolver`) will break `websocket.py` immediately if not fixed simultaneously.
- **Verification:** Unit tests must pass before manual verification.
