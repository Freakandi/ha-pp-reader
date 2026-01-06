# Refactoring Context & Decisions

## Session Log

### Session: Refine Flow Aggregation (2026-01-03)
*   **Decision:** Added detailed "Cash FX-Changes" calculation logic to `tasks/refactor_calculations.md`.
*   **Rationale:** "Enrichment at Source" strategy means we calculate flows linearly. FX Cash changes are the residual valuation change of foreign cash balances minus the net flow of that currency.

### Session: Refine Calculation Refactor Plan (2026-01-03)
*   **Decision:** Created this context file.
*   **Decision:** "Market Performance (Delta)" renamed to "Total Performance Delta" with explicit "Top-Down" calculation mandate.

### Session: Refine Tab Cleanup Plan (2026-01-03)
*   **Decision:** Rewrote Phase 4 to explicitly target UI consistency via `PerformanceEngine`.
*   **Decision:** `backdating/engine_pandas.py` confirmed for DELETION, replaced by `metrics/history.py`.
*   **Decision:** `Overview` tab must be powered by `PerformanceEngine` snapshot logic, not raw SQL sums.
*   **Correction:** `Overview` tab aggregation logic must remain unchanged (Lifetime/Snapshot), but the *Price Source* must be unified via `MarketResolver` to match History.
*   **Decision:** `daily_wealth` does NOT exist yet, confirmed for creation with `scope_type` support for fast chart switching.
*   **Decision:** History rebuild loop defined with strict EOD cut-offs: Price @ `d (Close)`, Holdings @ `d 23:59`.
*   **Refinement:** `daily_wealth` will NOT store dynamic Gains (Realized/Unrealized). It stores only Invariant State (`total_wealth`) and Flows (`net_external_flow`) to support dynamic filtering and performance calculation on-the-fly.
*   **Clarification:** Performance calculation for Period Start `T` uses stored state at `T-1`.
*   **Correction:** `daily_wealth` will NOT store Flows. It only stores `total_wealth_eur` (Snapshot @ EOD) for simple graphing purposes. No TWR/Delta calculation is performed on the graph.
*   **Correction:** "Trades" Tab is for **Realized Performance**, not just transaction listing. `ws_get_trades` must return detailed per-security realized gains (Buy vs Sell FIFO), not a dummy sum.

### Session: Refine Detail Tabs (2026-01-03)
*   **Refinement:** Phase 4 now explicitly covers "Security Detail View" (Active) and "Trade Detail View" (Prior/Closed).
*   **Decision:** `Trade Detail` requires `since_sell_*` metrics (Opportunity Cost), necessitating `MarketResolver` lookups for assets *no longer held*.
*   **Wiring:** `get_security_snapshot` -> `MarketResolver` (History). `get_trades` -> `PerformanceEngine` (FIFO & Ghost Positions).

### Session: Refine Risks & Next Actions (2026-01-03)
*   **Cleanup:** Removed obsolete "Ledger" terminology from Risks and Next Actions.
*   **Correction:** "Today's Data" is now handled by standard `transactions` table.
*   **Refinement:** "Zero-Sum Transfers" risk rephrased as "Transfer Protocol & Orphans".
*   **Definition:** "Stale Enrichment" explicitly accepted as a trade-off for consistency.
*   **Terminology:** Replaced "Market Oracle" with "Market Resolver" to match Phase 2 specs.

### Session: Refine Refactor Plan Ambiguity (2026-01-04)
*   **Decision:** Renamed schema column `amount_eur` to `amount_eur_cents` (INTEGER) to prevent float precision scaling errors.
*   **Architecture:** Split Phase 3 Logic into two distinct aggregations: "Period Attribution" (for Delta Invariant Check) and "Lifetime Trade Metrics" (FIFO for Trades Tab).
*   **Clarification:** Defined `Start_Price_Reset` for intra-period Unrealized/Realized calculations to correctly handle buys/sells within the reporting period.
*   **Correction:** `Sum_Components` in reconciliation loop now sums `Valuation_Changes` (Period based), not Lifetime Realized gains.
*   **Requirement:** `MarketResolver` must fetch prices for closed positions ("Ghost Positions") to support Opportunity Cost metrics in the Trades Tab.

### Session: Test Logic Refinement (2026-01-04)
*   **Correction:** Removed `test_flow_enrichment_consistency` which compared against the faulty legacy engine.
*   **Replacement:** Added `test_enrichment_logic_verification` to verify "Transfer Zero-Sum" and "Explicit Rate Compliance" instead.

### Session: Refinement Finalization (2026-01-04)
*   **Clarification:** `PerformanceEngine.get_snapshot` explicitly defined to derive Inventory (Shares/Cash) by summing the `transactions` event log (Ledger), avoiding cache drift.
*   **Architecture:** `get_daily_wealth` looping logic moved out of Engine to `metrics/history.py`. Engine remains "Point-in-Time" only.
*   **Requirement:** `get_snapshot` must return `total_invested_cents` (derived from External Flows) to support the `daily_wealth` table schema.
*   **Cleanup:** Fixed typos (Validation -> Valuation) and specified `_apply_transfer_protocol` call site in `canonical_sync.py`.

### Session: Unit Normalization Refinement (2026-01-04)
*   **Verification:** Confirmed existence of reusable `cent_to_eur` helper in `custom_components/pp_reader/util/currency.py`.
*   **Decision:** Phase 3 Aggregation logic MUST use `cent_to_eur` to normalize all `amount_eur_cents` values before performing float-based arithmetic.
*   **Refinement:** Phase 4 History Rebuild changed to **Vectorized** approach (Pandas cumsum) to avoid O(T*N) complexity.
*   **Safety:** Phase 1/2 Bootstrapping logic refined to handle missing historical rates defensively during fresh DB creation.
*   **Resolution:** Introduced "Feed-Forward Ingestion Context" (`latest_rates` dict) in Phase 1 to capture and reuse explicit rates immediately within the ingestion batch. This solves the "New Currency Timing" issue by making the first transaction's rate available as a fallback before DB commit.
*   **Precision:** Phase 3 text explicitly updated to require `T-1 @ 23:59:59` (EOD) timestamps for `Start_Val` and `Start_Price_Reset` lookups, replacing ambiguous "Start" references.

### Session: Ambiguity Assessment Implementation (2026-01-04)
*   **Validation:** Confirmed User's hypothesis that "Feed-Forward" rate logic works perfectly *if* transactions are processed chronologically. Added "Sort by Date" step to Ingestion plan to enforce this precondition.
*   **Enrichment:** Added specification to enrich `transaction_units` (Fees/Taxes) by inheriting the parent transaction's FX/EUR Rate.
*   **Architecture:** Explicitly defined "Phase 3.1 Lifetime Realized Performance (FIFO)" to replace the missing `breakdown.py` logic powering the Trades Tab.
*   **Clarification:** Disambiguated signs in `Net_External_Flows` formula.

### Session: Refine Calculation Refactor Plan (2026-01-04)
*   **Correction:** Transfer Protocol math explicitly defined as "Average of Magnitudes" (`(|V_out| + |V_in|) / 2`) with sign re-application to ensure `Net Flow = 0.00` even when legs are cross-currency.
*   **API Update:** Added `get_price_series(uuid, start, end)` to `MarketResolver` to support vectorized history charting requirements in Phase 4.

### Session: Ingestion Logic Specificity (2026-01-04)
*   **Verification:** Verified existence of `_lookup_fx_rate` in `custom_components/pp_reader/data/canonical_sync.py`. It correctly implements the "Latest Rate <= Date" logic required for Level 3a.
*   **Decision:** Explicitly mandated the **reuse** of this existing function in Phase 1 (Ingestion) to avoid code duplication. The "Feed-Forward" context check is defined as a wrapper/fallback around this core DB lookup.

### Session: Phase Ordering Resolution (2026-01-04)
*   **Paradox:** Ingestion (Phase 1) needs robust FX logic, but `MarketResolver` (Phase 2) owns it.
*   **Solution:** **Extraction Pattern**. Implemented "Phase 0" to extract `_lookup_fx_rate` into a shared stateless kernel `metrics/core/fx_access.py`.
*   **Architecture:** Both Ingestion (Writer) and `MarketResolver` (Reader) will consume this shared kernel, eliminating the circular dependency and preventing logic drift.

### Session: Plan Refinement (2026-01-04)
*   **Refinement:** Clarified Phase 4 Vectorization logic. Explicitly stated that groupby must include `security_uuid` (for securities) or `account_uuid` + `currency_code` (for cash) to ensure inventory tracking granularity is not lost.

### Session: Refactor Phase 2 Refinement (2026-01-04)
*   **Correction:** Identified that Phase 2 documentation incorrectly specified in-memory FX FX management for `MarketResolver`.
*   **Resolution:** Updated `tasks/refactor_calculations.md` to explicitly state that `MarketResolver` delegates FX lookups to the shared `metrics.core.fx_access` kernel, ensuring consistency with Ingestion (Phase 1).
*   **Cleanup:** Removed references to bulk loading `fx_rates` and `exchange_rates` from `MarketResolver` responsibilities.

### Session: Refactor Phase 4 Refinement (2026-01-06)
*   **Correction:** `PerformanceEngine.get_snapshot` is insufficient for the "Overview Tab" because it does not provide granular FIFO cost basis for active lots.
*   **Decision:** Updated Phase 4 Section 1.1 plan to expose `get_fifo_active_lots` from `PerformanceEngine`. This ensures we can calculate Lifetime Unrealized Gains correctly by summing the cost of remaining tax lots.
