---
description: Critical review of the Refactor Plan for internal logic gaps, contradictions, and terminology mismatches.
---

# Refactor Plan Ambiguity Assessment

This workflow is a "Red Team" pass on `tasks/refactor_calculations.md`. Its goal is to find holes in the logic *before* we start estimating or writing code.

## 1. Context Loading
*   Read `tasks/refactor_calculations.md` (The Master Plan).
*   Read `tasks/refactor_context.md` (Design Decisions).

## 2. Analysis Dimensions

Perform a deep logical review focusing on the following areas:

### A. Internal Consistency (The "Contract" Check)
*   **Terminology:** Are terms used consistently? (e.g., "Market Resolver" vs "Oracle", "Ledger" vs "Transactions Table").
*   **Data Flow:**
    *   Does Phase 1 (Ingestion) output *exactly* what Phase 3 (Calculation) expects as input?
    *   Are the column names in the Schema section identical to the columns queried in the Logic section?
*   **Lifecycle:**
    *   Do we define a "Creation" step for every resource we attempt to "Consume"?
    *   Are deprecated components truly replaced, or are there orphaned references to them?

### B. Completeness vs. Complexity
*   **Edge Cases:** Does the plan explicitly handle:
    *   Missing Data (e.g., No Price available for today)?
    *   Zero-value scenarios (e.g., Free transfer)?
    *   Correction/Update flows (e.g., User changes the source file)?
*   **Magic Steps:** Are there steps described as "Normalize the transaction" without explaining *how*? (Ambiguity trap).

### C. Phase Dependencies
*   Does Phase N require a component from Phase N+1? (Circular dependency).
*   Is the testing strategy for Phase N executable immediately after Phase N is done, or does it wait for the whole project?

## 3. Output Report
Produce a structured report using the following format:

### 🔴 Critical Contradictions
*   *Logic that makes implementation impossible without clarification.*
*   *Example:* "Schema defines `amount_eur` as Integer (Cents), but Calculation logic treats it as Float (Euros)."

### 🟡 Ambiguities & Gaps
*   *Areas where the plan says 'do X' but doesn't define the rules for X.*
*   *Example:* "Transfer Protocol handles orphan legs, but doesn't specify the fallback rate source."

### 🟢 Terminology & Hygiene
*   *Minor cleanup items.*
*   *Example:* "Section 2 refers to 'Oracle', Section 4 refers to 'Resolver'."

## 4. Recommendation
*   **Proceed:** The plan is solid enough to estimate.
*   **Refine:** Specifically list which sections of `refactor_calculations.md` must be edited before estimation can begin.

For any ambiguities or contradictions found, create a file tasks/refactor_ambiguity_assessment.md and state your findings there. If you do not find any ambiguities or contradictions, state that in a simple response and do nothing else.