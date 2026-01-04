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
