# Refactor Ambiguity Assessment (Pass 2)

**Assessment Date:** 2026-01-04
**Reviewer:** Antigravity
**Status:** ✅ **PASSED** (With one minor clarification)

## 1. Analysis Summary

The `tasks/refactor_calculations.md` plan has been reviewed against the codebase and architectural constraints. The previous rounds of refinement have successfully addressed the major structural issues (Foreign Transfers, Circular Dependencies, Schema Precision). The plan is now logic-complete and ready for estimation.

## 2. Findings

### 🔴 Critical Contradictions
*   *None Found.* The logic is internally consistent. Use of `amount_eur_cents` is uniform. The "Transfer Protocol" math is sound.

### 🟡 Ambiguities & Gaps

*   **Phase 4 (History Rebuild) Vectorization Detail**
    *   *Location:* Phase 4, Step 2, Item 423.
    *   *Text:* "Use `df.groupby('date').sum().cumsum()` to compute Daily Inventory..."
    *   *Ambiguity:* Grouping only by `date` is insufficient. It would collapse all distinct securities/accounts into a single scalar, losing the granularity needed to apply specific prices in the next step.
    *   *Clarification:* The implementation **MUST** group by `['date', 'security_uuid']` (for securities) and `['date', 'account_uuid', 'currency_code']` (for cash) before performing the `cumsum`. This ensures we validly track the inventory of *each* asset over time.

### 🟢 Terminology & Hygiene

*   **Transfer Protocol Verification:** The "Average of Magnitudes" approach for Foreign-to-Foreign transfers has been verified. It correctly preserves the Global Net Flow = 0.00 invariant while effectively capturing the "Realized Transfer Value" for FX Gain/Loss calculations.
*   **Phase Order:** The extraction of `metrics/core/fx_access.py` in Phase 0 correctly resolves the circular dependency between Ingestion (Phase 1) and MarketResolver (Phase 2).
*   **Schema Consistency:** The plan correctly identifies `TRANSACTION_SCHEMA` in `db_schema.py` as the target for the `transaction_units` table definition update.

## 3. Recommendation

**PROCEED**.
The plan is robust. The ambiguity noted above is an implementation detail that acts as a guardrail, not a plan defect requiring a rewrite. Proceed to estimation.
