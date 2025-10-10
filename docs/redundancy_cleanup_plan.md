# Redundancy Cleanup Concept

## Objective
Streamline the Portfolio Performance Reader data preparation and presentation layers by eliminating redundant calculations, aligning repeated logic behind shared helpers, and clarifying ownership of derived values across backend and frontend surfaces.

## Structuring the Work
To keep planning actionable without fragmenting coordination, maintain **one primary concept & tracker document** (this file) that captures the cleanup scope and the shared TODO list. Within the document, group tasks by logical redundancy clusters. For high-complexity clusters that later require deep dives or design spikes, spin out short, linked sub-notes rather than standalone concept documents for every variable. This balances visibility and avoids duplicating context across many files.

### Rationale
- **Single overview doc** keeps the cross-cutting nature of redundant calculations visible, helping contributors reason about shared helpers and sequencing.
- **Cluster-level sections** reduce noise compared with per-variable documents while still allowing focused work streams.
- **Optional sub-notes** only when necessary prevents over-managing trivial fixes yet leaves room for detailed exploration of complex refactors (for example, backend/frontend contract changes).

## Redundancy Clusters and Recommended Approach
Each cluster captures variables that share inputs, transformation patterns, or usage paths. The table notes the affected variables (from `portfolio_variables.yaml`), the main consolidation strategy, expected complexity, and immediate TODO pointers.

| Cluster | Variables | Strategy | Complexity | Initial TODOs |
| --- | --- | --- | --- | --- |
| Currency Conversion & Rounding | `purchase_value`, `current_value`, `purchase_value_eur`, `last_price_eur`, `last_close_eur`, `market_value_eur`, `dayPriceChangeEur`, `gain_abs_eur` | Centralise cent-to-EUR and FX conversions behind shared utilities, expose formatted outputs once per payload, and ensure cached values reuse the same helpers. | Medium | 1. Inventory existing conversion helpers in backend/frontend.<br>2. Define a shared conversion API (Python + TS).<br>3. Refactor payload builders to call the helper and drop inline divisions/rounding. |
| Native Price Scaling | `last_price_native`, `last_close_native`, `close`, `dayPriceChangeNative`, `dayChangePct` | Create a single native-price normaliser (including scale factors) used by snapshot builders and history processors. Cache paired deltas to feed change metrics. | Low | 1. Extract `PRICE_SCALE` usage to helper.<br>2. Update history and snapshot code to rely on helper.<br>3. Recompute day deltas using cached values. |
| Holdings & Aggregations | `current_holdings`, `total_holdings`, `purchase_total_security`, `purchase_total_account`, `market_value_eur` | Cache aggregated holdings/purchase totals per security snapshot and reuse them for valuations and averages instead of re-summing. | Medium | 1. Locate aggregation loops (portfolio builder, snapshot assembler).<br>2. Design shared data structure carrying totals and holdings.<br>3. Replace duplicate aggregations with structure references. |
| Average Cost Selection | `average_purchase_price_native`, `avg_price_security`, `avg_price_account`, `averagePurchaseNative`, `averagePurchaseAccount`, `averagePurchaseEur`, `purchase_total_security`, `purchase_total_account`, `purchase_value_eur` | Define a unified average-cost selection routine that encapsulates fallback order and currency handling, shared across backend serializers and frontend UI. | High | 1. Draft contract for `AverageCostContext` (inputs + outputs).<br>2. Implement backend helper returning structured averages.<br>3. Update frontend to consume precomputed context; remove duplicated fallback logic. |
| Gain & Change Metrics | `gain_abs`, `gain_pct`, `totalChangeEur`, `totalChangePct`, `dayPriceChangeNative`, `dayPriceChangeEur`, `dayChangePct`, `gain_abs_eur` | Compute gain and change deltas once per payload scope (position vs snapshot), expose them as structured objects, and share between frontend detail views and cached responses. | Medium | 1. Identify where gains are calculated (backend + cache + frontend).<br>2. Create `PerformanceMetrics` helper bundling absolute/percentage deltas.<br>3. Refactor UI/state layers to read from the helper outputs. |

## Recommended Next Step
Adopt this single clustered concept document as the authoritative plan. Begin execution by refining the **Currency Conversion & Rounding** cluster: it has moderate complexity, underpins several other clusters, and delivering shared helpers there unlocks reuse for gains, averages, and valuation work. Track progress by expanding the TODO lists into actionable checkboxes within this document, linking out to sub-notes only if a cluster’s design needs dedicated exploration.
