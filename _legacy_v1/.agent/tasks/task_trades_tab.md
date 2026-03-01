# Task: Implement Trades Tab & Refactor Portfolio Securities (Status: Completed) & Add Trades Tab

## Context
The user wants to see "Trades" (past/closed holdings) in a new frontend tab. To support this "Single Source of Truth", we must refactor the `portfolio_securities` table to include ALL positions (Open + Closed), not just active ones.

## Critical Technical constraints
1.  **No Double Counting**: The `portfolios` table metrics (Current Value, Purchase Value) MUST NOT include closed positions in their sums. Only *active* holdings contribute to the Portfolio Total.
2.  **FIFO Correctness**: The simple aggregation in `canonical_sync.py` is insufficient for historical data. You MUST replace it with `logic.securities.db_calculate_sec_purchase_value` to correctly handle partial sales and cost basis.
3.  **Frontend Stability**: The existing "Overview" tab must NOT show closed positions.

## Implementation Steps

### 1. Verification & Testing (Pre-Flight)
*   Run `npm run test:ui` (or specific relevant tests) to establish a baseline.
*   Ensure you have a working "Before" state.

### 2. Backend Refactor (`canonical_sync.py`)
*   **Goal**: Populate `portfolio_securities` with ALL positions.
*   **Action**:
    *   Import `db_calculate_sec_purchase_value` from `custom_components.pp_reader.logic.securities`.
    *   Replace the manual aggregation loop in `_sync_portfolio_securities` (and helpers) with a call to this robust function.
    *   Remove the `if holdings <= 0: continue` checks.
    *   **Crucial**: Ensure that for Closed positions (holdings=0), `purchase_value` reflects the *Historical* Cost Basis (or 0 if preferred, but user wants history). *Architect Decision*: Store the **Realized Cost Basis** in `purchase_value` if possible, OR keep it clean.
    *   *Correction*: If we store "Realized Cost Basis" in `purchase_value`, we MUST update `metrics/portfolio.py` aggregation.

### 3. Metrics Aggregation Update (`metrics/portfolio.py`)
*   **File**: `custom_components/pp_reader/metrics/portfolio.py`
*   **Action**: Update `_PORTFOLIO_AGGREGATION_SQL` to strictly filter for active positions in the SUMs:
    ```sql
    COALESCE(SUM(CASE WHEN ps.current_holdings > 0 THEN ps.current_value ELSE 0 END), 0) AS current_value,
    COALESCE(SUM(CASE WHEN ps.current_holdings > 0 THEN ps.purchase_value ELSE 0 END), 0) AS purchase_sum,
    ```
*   This ensures that closed positions entering the DB do not bloat the Portfolio Totals.

### 4. Frontend "Overview" Protection (`src/tabs/overview.ts`)
*   **Action**: In `renderPositionsTable` (or the selector fetching data), apply a filter:
    `const activePositions = positions.filter(p => Number(p.current_holdings) > 0);`
*   Pass only `activePositions` to the rendering logic to preserve the current view.

### 5. Frontend "Trades" Tab (New Feature)
*   **File**: `src/tabs/trades.ts` (Create new)
*   **Action**:
    *   Clone structure from `overview.ts` but simplify.
    *   Fetch ALL positions (or filter for `current_holdings == 0`).
    *   Columns: Name, Symbol, "Last Holding" (0), "Status" (Closed).
    *   Register this tab in `src/dashboard/dashboard.ts` (or relevant registry).

## Done Definition
*   `portfolio_securities` contains closed positions.
*   Dashboard "Overview" still looks correct (totals match active holdings).
*   New "Trades" tab shows the closed positions.
*   All tests pass.
