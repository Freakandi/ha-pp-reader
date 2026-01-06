# Refactor Phase 4: UI Data Cleanup & Consistency

**Goal:** Clean up the Frontend/Backend contract. Frontend must receive data solely from the *invariant* backend machinery (`PerformanceEngine` and `MarketResolver`). `daily_wealth` must be strictly "Wealth Only" (no performance breakdown). The Frontend must display the full "Performance Waterfall" (Start + Flows + Gains = End) by receiving aggregated totals from the `PerformanceEngine`.

**Context:**
- **Master Plan:** `tasks/refactor_calculations.md` (Phase 4)
- **Design Decisions:** `tasks/refactor_context.md`
- **Current State:**
    - `PerformanceEngine` implementation is progressing (Phase 4.1/4.2 complete).
    - `securities.py` is refactored (Phase 4.2 complete).
    - `history.py` and `websocket.py` still rely on legacy/hybrid logic.
    - **Crucial:** The previous frontend implementation calculated performance client-side by summing daily columns (`dividends_eur`, etc.). These columns are being DELETED. We must move this aggregation to the `PerformanceEngine`.

## 1. Security Metrics Refactor (`metrics/securities.py`)
*Status: Completed in previous sessions (PR #777, PR #778).*
- [x] **Enhance `PerformanceEngine`** (`_get_holdings_at_date`, `get_snapshot`, `get_fifo_active_lots`).
- [x] **Rewrite `securities.py`** to use Pure Delegation.

## 2. Backend Engine Refactor (`metrics/calculator.py`)
We must enrich the `PerformanceMetrics` object to support the UI's waterfall chart.

### 2.1 Update `PerformanceMetrics` Dataclass
- [ ] **Update `PerformanceMetrics`** in `custom_components/pp_reader/metrics/calculator.py`:
    - Add fields: `dividends`, `fees`, `taxes`, `interest` (floats, default 0.0).
    - Add field: `net_transfers` (float, default 0.0).

### 2.2 Update `calculate_period_performance`
- [ ] **Populate new fields**:
    - During the `invariant check` phase (where we already sum up components), explicitly assign these sums to the `metrics` object.
    - `metrics.dividends` = Sum of DIVIDEND transactions (augmented EUR).
    - `metrics.fees` = Sum of FEE transactions (augmented EUR).
    - `metrics.taxes` = Sum of TAX transactions (augmented EUR).
    - `metrics.interest` = Sum of INTEREST (charge/income) transactions.
    - `metrics.net_transfers` = `self._calculate_invested_capital(transactions_in_period)`.
    - **Note:** Ensure `fees` and `taxes` are stored as **Positive Magnitudes** (sum of absolute values) to match `daily_wealth` legacy contract, simplifying frontend migration. `net_transfers` should be signed (Net Flow).

## 3. Frontend & API Contract Refactor
**Goal:** strict separation. Backend provides truths, Frontend renders them.

### 3.1 Refactor Frontend Types (`src/data/api.ts`)
- [ ] **Update `DailyWealthRecord` interface**:
    - **Remove** all breakdown fields: `dividends_eur`, `fees_eur`, `taxes_eur`, `interest_eur`, `realized_gains_eur`, `unrealized_gains_eur`, `performance_neutral_movements`.
    - **Keep**: `date`, `total_wealth_eur`, `invested_capital_eur`, `fx_coverage_ratio`, `price_coverage_ratio`, `stale_price`, `provenance`.
- [ ] **Update `PerformanceMetrics` interface**:
    - Add: `dividends: number;`
    - Add: `fees: number;`
    - Add: `taxes: number;`
    - Add: `interest: number;`
    - Add: `net_transfers: number;`

### 3.2 Refactor Frontend Logic (`src/tabs/time_series.ts`)
- [ ] **Update `derivePerformance` function**:
    - **DELETE** the "Legacy Client-Side Calculation" branch.
    - **Logic:**
        - If `responseMetrics` is missing: return `null`.
        - If `responseMetrics` is present: Map fields directly.
        - `dividends = responseMetrics.dividends`
        - `fees = responseMetrics.fees` (expect positive magnitude)
        - `taxes = responseMetrics.taxes` (expect positive magnitude)
        - `fxGains = responseMetrics.fx_gains_cash`
        - `netTransfers = metrics.net_transfers`
        - `marketGain = realized + unrealized`
- [ ] **Verify `renderMetrics`**:
    - **Strict Waterfall Order:**
        1. Start Wealth
        2. Unrealized Gains (Expandable)
        3. Realized Gains (Expandable)
        4. Dividends (Expandable)
        5. Interest (Expandable)
        6. Taxes (Expandable - Negative Flow)
        7. Fees (Expandable - Negative Flow)
        8. FX Gains on Cash (Expandable)
        9. Performance Neutral Movements (Net Transfers)
        10. End Wealth
    - **Expandability:** Ensure the UI components for these rows support clicking/expanding to show details if provided by the backend.

## 4. History & Charts Refactor (`metrics/history.py` & `websocket.py`)
Ensure historical data is pre-calculated in `daily_wealth` and queried.

- [ ] **Fix `metrics/history.py`**:
    - Ensure `rebuild_daily_wealth` populates `daily_wealth` (Insert new Wealth-Only records).
    - **Delete** logic that calculated breakdown columns.
- [ ] **Update `websocket.py:ws_get_daily_wealth`**:
    - **Stop** instantiating `PerformanceEngine` for on-the-fly calculation of *daily* records.
    - **Start** querying `daily_wealth` table directly.
    - **Metrics Handling:**
        - If `options['metrics_start']` is requested:
        - Instantiate `PerformanceEngine(conn, market_resolver)`.
        - Call `metrics = engine.calculate_period_performance(start, end)`.
        - Attach `metrics` to the response.
    - **Strict API:** Do **NOT** inject placeholder columns (zeros) for the deleted breakdown fields in `records`.

## 5. Realized Trades Refactor (`websocket.py:ws_get_trades`)
- [ ] **Update `ws_get_trades`**:
    - Instantiate `MarketResolver(conn)`.
    - Instantiate `PerformanceEngine(conn, market_resolver)`.
    - Call `engine.calculate_realized_performance(scope_uuid=filter)`.
    - Serialize and return.

## 6. Test Plan
- [ ] **Create `tests/metrics/test_ui_consistency.py`**:
    - `test_waterfall_completeness`: Mock Engine response. Verify `websocket.py` returns the populated `metrics` object.
- [ ] **Update `tests/metrics/test_performance_summation.py`**:
    - Verify `calculate_period_performance` returns correct sums for Dividends/Fees/Taxes in the new fields.
- [ ] **Fix `tests/test_ws_daily_wealth.py`**:
    - Update expectations to match the new "Lean" `DailyWealthRecord` and "Rich" `PerformanceMetrics`.

## Complexity & Risk
- **Complexity:** Medium
- **Risk:** Medium (UI regression if waterfall math doesn't balance).
- **Mitigation:** The Engine already has an Invariant Check (`system_delta - sum_components`). We are simply exposing those components.
