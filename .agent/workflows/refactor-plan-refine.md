---
description: Iterative workflow for refining the major refactoring plan (tasks/refactor_calculations.md) for the Performance & Wealth Engine.
---

# Architecture Refinement Workflow

This workflow is designed to iteratively refine the architectural plan in `tasks/refactor_calculations.md`. Since this refactoring touches the core financial logic (Ingestion, Wealth, Performance, Database), precision and context preservation are critical.

## Workflow Context (Crucial Reading)
Existing implementation suffers from divergent calculation paths:
1.  **State (Start/End Wealth):** Calculated using Scalar lookups (Price @ T).
2.  **Flows (Performance):** Calculated using Vectorized operations (Price Series T1..T2) with different fallback/fill logic.
3.  **Redundancy:** Logic is duplicated across `calculator.py` (Live), `engine_pandas.py` (Backdating), and `breakdown.py`.

**The Target Architecture ("Enrichment at Source"):**
*   **Ingestion:** Calculate canonical EUR values (`amount_eur`, `fx_rate_used`) ONCE during XML parsing and store in `transactions`/`transaction_units`.
*   **Consistency:** Downstream engines (Wealth, Performance) Must NEVER recalculate EUR values for flows. They simply SUM the persisted columns.
*   **Oracle:** A single `MarketOracle` component handles all Price/FX lookups for Valuations (Wealth), strictly enforcing fallback policies.
*   **Transfer Protocol:** Strict logic ensures Cross-Currency Transfers sum to Net Zero EUR Flow by averaging/centering values at ingestion.

## Workflow Steps

1.  **Context Loading**
    *   Read `tasks/refactor_calculations.md` (The Plan).
    *   Read `tasks/refactor_context.md` (If exists - create this if not) to track decisions made in previous sessions.
    *   Read the User's Request for this specific refinement iteration.

2.  **Impact Analysis (Deep Dive)**
    *   Identify which specific modules/tables are affected by the user's request.
    *   **Action:** Use `grep_search` or `view_file` to inspect the *current* implementation of these targeted areas.
    *   *Checkpoint:* Does the request conflict with the core "Single Source of Truth" philosophy?
    *   *Checkpoint:* Does the request introduce new potential for drift (e.g. calculated values that depend on mutable state)?

3.  **Architectural Recommendation**
    *   Formulate a recommendation: **COMPLY**, **ALTER**, or **REJECT**.
    *   *If Comply:* detail how it fits the schema.
    *   *If Alter:* proposing a safer/cleaner technical alternative that achieves the user's functional goal.
    *   *If Reject:* explain the mathematical or architectural risk (e.g. Reintroducing "Double Counting").

4.  **Drafting the Spec (Detailed)**
    *   Update `tasks/refactor_calculations.md` with a new or modified section.
    *   **Requirement:** The text must be technical and implementable. "Make it better" is not allowed. Write pseudo-SQL or Class Signatures.
    *   **Requirement:** Explicitly name the functions/classes to be Deprecated/Deleted.
    *   **Requirement:** Explicitly name the Tests (`tests/...`) that verify this logic and how they must change.

5.  **Validation**
    *   Ask the user for confirmation of the updated section.
    *   If confirmed, mark this iteration as done.

## Important Considerations for Future Sessions
*   **Database:** We are rebuilding `S-Depot.db` from scratch. Schema changes are cheap. Data migration scripts are NOT needed.
*   **Legacy Code:** `backdating/engine_pandas.py` is largely redundant. Assume we want to delete/minimize it.
*   **Performance:** "Read-Time" speed is paramount. "Write-Time" (Ingestion) can be slower (0.5s is fine). Shift complexity to Ingestion.
