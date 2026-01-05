# Refactor Phase 3: The Financial Engine Core

## Goal
Implement the core mathematical verification engine ("The Chain") and the detailed realized performance logic (Phase 3 + 3.1). This phase unifies the calculation architecture, ensuring that `Start Wealth + Flows (+/- Market) = End Wealth` is strictly observed, and implements the "Transfer Neutrality" logic to guarantee zero-sum cross-currency transfers.

## Context
*   **Master Plan:** `tasks/refactor_calculations.md` (Phases 3 & 3.1)
*   **Design Decisions:** `tasks/refactor_context.md`
*   **Prerequisites:** Phase 1 (Enrichment) and Phase 2 (Market Resolver) must be complete for this to function, relevant tasks have been completed.

## Proposed Changes

### 1. New Core Modules
*   **Create** `metrics/history.py`: Dedicated module for rebuilding the `daily_wealth` table efficiently (Vectorized).

### 2. Refactor `metrics/calculator.py` (The Heavy Lift)
*   **Replace** `PerformanceEngine` (Monolithic) with a streamlined version:
    *   **Input:** Enriched `transactions` (amount_eur_cents), `transaction_units`.
    *   **Dependency:** `MarketResolver` (for Price/FX).
    *   **Method 1:** `calculate_period_performance(start, end)` -> strictly Period Attribution (Mark-to-Market).
    *   **Method 2:** `calculate_realized_performance(scope)` -> Life-time result (FIFO) for Trades Tab.
    *   **Method 3:** `get_snapshot(date)` -> Inventory & Valuation at a single point in time.

### 3. Database Schema
*   **Add** `daily_wealth` table to `custom_components/pp_reader/data/db_schema.py`.
    *   Columns: `date`, `scope_uuid`, `scope_type`, `total_wealth_cents`, `total_invested_cents`.

### 4. Deletions & Deprecations
*   **Delete** `metrics/breakdown.py`: Replaced by `PerformanceEngine` returning structured results directly.
*   **Deprecate** `backdating/engine_pandas.py`: Legacy engine is fully obsoleted.
*   **Remove** `PerformanceEngine.get_daily_wealth`: Replaced by `metrics/history.py`.

## Detailed Steps

### Block 1: The "Chain" Logic (Period Performance)
- [x] **Step 1: Simplify PerformanceEngine Init & Snapshot**
    *   Modify `PerformanceEngine.__init__` to accept `MarketResolver` and `sqlite3.Connection`.
    *   Implement `get_snapshot(date)`:
        *   Sum `transactions` (Date <= T) to get Shares/Cash inventory.
        *   Call `MarketResolver.get_price(T)` and `get_fx(T)` to value inventory.
        *   Sum External Flows (Deposits/Removals) for `invested_capital`.
        *   Return dictionary `Values`.
- [ ] **Step 2: Implement Period Attribution Logic**
    *   Implement `calculate_period_performance(start, end)`:
        *   Fetch Snapshots for `Start` (T-1) and `End` (T).
        *   Calculate `System_Delta = End - Start - Net_External_Flows`.
        *   Calculate Components (Mark-to-Market):
            *   **Valuation Change:** `Price_Diff * Qty`.
            *   **FX Cash:** `(End_Val - Start_Val) - Net_Flow_EUR`.
            *   **Income/Costs:** Sum `amount_eur_cents` (normalized) from `transactions`/`units`.
        *   **Invariant Check:** Log warning if `System_Delta != Sum(Components)`.
- [ ] **Step 3: Transfer Neutrality Verification**
    *   Ensure the "FX Cash" calculation handles Foreign-to-Foreign transfers correctly.
    *   Since Phase 1 ensures `amount_eur_cents` sums to 0.00 for transfers, the "Net Flow" component in the FX formula `(End - Start) - Net_Flow` naturally absorbs the transfer "loss" into the FX Bucket without creating a ghost delta. verify this with a test case.

### Block 2: Lifetime Realized Performance (FIFO)
- [ ] **Step 4: Implement Lifecycle FIFO Engine**
    *   Implement `calculate_realized_performance(scope_uuid)`:
        *   Load all transactions for scope (sorted by date).
        *   Maintain `TaxLot` queue `{date, shares, cost_basis_eur}`.
        *   Process BUY (Push to Queue) / SELL (Pop from Queue).
        *   Calculate `Realized_Gain_EUR` and `Hold_Time`.
        *   **Ghost Enrichment:** Call `MarketResolver` for *closed* positions to calculate "Opportunity Cost" (`Current_Price - Sell_Price`).
    *   Return list of `RealizedTrade` objects.

### Block 3: History & Persistence
- [ ] **Step 5: Database Schema Update**
    *   Modify `custom_components/pp_reader/data/db_schema.py`.
    *   Add `DAILY_WEALTH_SCHEMA` definition with columns: `date` (TEXT), `scope_uuid` (TEXT), `scope_type` (TEXT), `total_wealth_cents` (INTEGER), `total_invested_cents` (INTEGER).
    *   Ensure the schema version or creation logic includes this new table.

- [ ] **Step 6: Implement Daily Wealth Rebuild**
    *   Create `metrics/history.py`.
    *   Implement `rebuild_daily_wealth(start_date)`:
        *   Vectorized Rebuild:
            *   Load Enriched Txs -> Pandas.
            *   Group by `[date, uuid]` -> CumSum (Inventory).
            *   Resample to Daily -> FFill.
            *   Apply `MarketResolver` prices (map).
        *   Write to `daily_wealth` table.

### Block 4: Cleanup & Testing
- [ ] **Step 7: Remove Legacy Code**
    *   Delete `metrics/breakdown.py`.
    *   Delete `backdating/engine_pandas.py`.
    *   Remove obsolete methods from `PerformanceEngine` (`_prepare_market_data`, pivot logic).
- [ ] **Step 8: Verification Testing**
    *   Update `tests/metrics/test_performance_summation.py` to cover the Invariant Check.
    *   Add `tests/metrics/test_transfer_neutrality.py`: Create a pure test case for USD->JPY transfer and assert `Net Flow == 0` for the system.
    *   Add `tests/metrics/test_fifo_lifecycle.py`: Verify FIFO queue logic matches manual calculations.

## Test Plan
*   **Unit Tests:**
    *   `pytest tests/metrics/test_performance_summation.py` (The primary gatekeeper).
    *   `pytest tests/metrics/test_fifo_lifecycle.py` (New).
    *   `pytest tests/metrics/test_transfer_neutrality.py` (New).
*   **Obsolete Tests:**
    *   `tests/metrics/test_calculator_breakdown.py` (Will likely fail or need heavy refactoring. If logic is moved to Engine, rename to `test_calculator_components.py`).
    *   `tests/backdating/` (Delete generic pandas engine tests).

## Complexity Expecation
*   **Complexity:** High (Critical Math Core).
*   **Risk:** High (Regression of numbers).
*   **Strategy:** Pure TDD. Write the "Invariant Test" first, then make the engine pass it.
