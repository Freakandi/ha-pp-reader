1. [ ] Backend: Retire `_normalize_currency_amount` wrapper in event push
   - Summary: Remove the bespoke cent/float normaliser and invoke the shared currency helpers directly so event payloads follow the canonical rounding rules without duplicate logic.
   - Legacy surfaces to touch:
     * Backend:
       - `custom_components/pp_reader/data/event_push.py`: Drop `_normalize_currency_amount` and replace its call sites inside `_normalize_portfolio_value_entry`, `_normalize_position_entry`, and `_compact_portfolio_values_payload` to rely on `cent_to_eur`/`round_currency`.
       - `custom_components/pp_reader/data/event_push.py`: Ensure `_push_update` and related payload builders keep importing the shared helpers instead of the wrapper after removal.
     * Frontend: No direct consumers; verify websocket caches (`src/data/updateConfigsWS.ts`) do not assume the helper still exists in payload metadata before deleting it.
   - Modern replacements to keep:
     * `custom_components/pp_reader/util/currency.py`: `cent_to_eur` for cent-to-euro conversion and `round_currency` for float rounding remain the single source of truth.
     * `custom_components/pp_reader/data/performance.py`: `select_performance_metrics` already returns rounded gain metrics; make sure event push keeps consuming it without additional wrappers.
   - Dependencies / blockers:
     * Confirm no other module imports `_normalize_currency_amount` (current scope is private to `event_push`); if additional wrappers appear in tests or fixtures they must be updated in the same patch.
     * Keep the event payload byte-size guard (`_estimate_event_size` / `_push_update`) intact; removing the wrapper must not expand payloads beyond recorder limits.
   - Validation steps:
     * Run `pytest tests/test_sync_from_pclient.py` and `pytest tests/test_ws_portfolio_positions.py` to verify event payload snapshots and websocket expectations still match.
     * Perform targeted manual inspection of emitted events via the Home Assistant dev tools after deploying the cleanup, ensuring currency fields match backend values without double rounding.

2. [ ] Frontend: Retire WebSocket position normaliser fallbacks
   - Summary: Remove the client-side re-derivation of holdings aggregations, average-cost payloads, and gain mirrors from WebSocket position updates so the UI trusts the backend-provided structures.
   - Legacy surfaces to touch:
     * Frontend:
       - `src/data/updateConfigsWS.ts`: Delete `deriveAggregation`, `normalizeAverageCost`, and the bespoke `normalizePosition(s)` flow; update `processPortfolioPositionsUpdate` to accept backend payloads verbatim when applying DOM patches and firing `PORTFOLIO_POSITIONS_UPDATED_EVENT`.
       - `src/data/updateConfigsWS.ts`: Audit consumers of `window.__ppReaderPortfolioPositionsCache` and DOM renderers so they no longer expect synthesized `gain_abs`/`gain_pct` fields once the normalization helpers are removed.
       - `src/utils/performance.ts`: Ensure `normalizePerformancePayload` remains the shared entrypoint for optional backend payload validation once the redundant wrappers disappear.
     * Backend:
       - `custom_components/pp_reader/data/websocket.py`: Confirm `ws_get_portfolio_positions` already forwards the structured `aggregation`, `average_cost`, and `performance` blocks without legacy fallbacks and adjust serializers only if gaps remain.
       - `custom_components/pp_reader/data/event_push.py`: Align push events for positions with the websocket payload contract so frontends can drop gain/aggregation reconstruction entirely.
       - `custom_components/pp_reader/data/db_access.py`: Treat its `get_portfolio_positions` output as the authoritative structure; document any remaining legacy mirrors before trimming them on the frontend.
   - Modern replacements to keep:
     * `custom_components/pp_reader/data/aggregations.py`: `compute_holdings_aggregation` and `select_average_cost` continue to derive holdings totals and cost payloads server-side.
     * `custom_components/pp_reader/data/performance.py`: `select_performance_metrics` (and `compose_performance_payload` where used) provide the canonical gain/day-change values to expose to clients.
     * `src/tabs/types.ts`: Retain the typed `HoldingsAggregationPayload`, `AverageCostPayload`, and `PerformanceMetricsPayload` interfaces as the single source of frontend schema truth.
   - Dependencies / blockers:
     * Audit event-driven consumers such as `src/tabs/security_detail.ts` and `src/tabs/overview.ts` to ensure they no longer rely on `gain_abs`/`gain_pct` mirrors once the websocket cache stops rehydrating them.
     * Coordinate with any remaining legacy DOM scripts that read from `window.__ppReaderPortfolioPositionsCache`; update or retire them so removing the normalization helpers does not break unpublished entry points.
     * Verify that backend payloads always include `aggregation`/`average_cost` for active positions; if the database sync omits them in edge cases, close those gaps before deleting the fallback.
   - Validation steps:
     * Run `pytest tests/test_ws_portfolio_positions.py` to confirm websocket payloads expose the expected structures without frontend-side fabrication.
     * Exercise the dashboard manually (expand portfolio positions, trigger live updates) while watching the browser console for missing-field warnings after the cleanup.
     * If available, add integration or component tests that load cached websocket data into the DOM without touching the normalization helpers to prevent regressions.

3. [ ] Frontend: Retire overview tab average-cost resolver fallback
   - Summary: Drop the local `resolveAverageCost`/`resolveAggregation` logic on the overview tab so purchase price cells render the backend-provided `average_cost` payload directly without recomputing holdings totals.
   - Legacy surfaces to touch:
     * Frontend:
       - `src/tabs/overview.ts`: Remove `resolveAverageCost`, `resolveAggregation`, and `normalizePositionLike` fallbacks, update `buildPurchasePriceDisplay`/`renderPositionsTable` to trust the typed websocket payload, and ensure gain metadata keeps consuming `normalizePerformancePayload` without rehydrating legacy mirrors.
       - `src/tabs/__tests__/overview.render.test.ts`: Refresh the purchase price rendering expectations to align with direct backend payload usage and eliminate assumptions about client-side derived averages.
       - `src/data/api.ts`: Reaffirm the `PortfolioPosition` contract for overview consumers so `average_cost`, `aggregation`, and `performance` remain required inputs while deprecated flat fields stop influencing the render path.
     * Backend:
       - `custom_components/pp_reader/data/websocket.py`: Verify `_normalize_portfolio_positions` forwards `average_cost`/`aggregation` untouched (besides dataclass-to-dict conversion) and continues to supply purchase totals the overview relies on after the resolver removal.
       - `custom_components/pp_reader/data/db_access.py`: Treat its computed `average_cost` and aggregation payloads as canonical and document any remaining legacy mirrors before the frontend removes fallback parsing.
       - `custom_components/pp_reader/data/event_push.py`: Ensure push updates emit the same `average_cost`/`performance` structure so live refreshes stay consistent once the overview stops normalising locally.
   - Modern replacements to keep:
     * `custom_components/pp_reader/data/aggregations.py`: `compute_holdings_aggregation` and `select_average_cost` continue to produce authoritative holdings and cost figures.
     * `custom_components/pp_reader/data/performance.py`: `select_performance_metrics` remains the single source for gain and change metrics delivered to clients.
     * `src/utils/performance.ts`: `normalizePerformancePayload` stays the frontend guardrail for optional payload validation.
     * `src/tabs/types.ts`: The shared `AverageCostPayload`/`HoldingsAggregationPayload` interfaces define the schema consumed across tabs.
   - Dependencies / blockers:
     * Audit cached access via `window.__ppReaderPortfolioPositionsCache` and `getSecurityPositionsFromCache` to ensure downstream consumers (including legacy DOM shims) accept raw backend payloads without relying on the resolver’s patched numbers.
     * Confirm overview sorting and formatting helpers handle backend-rounded purchase totals, updating `makeTable` column formatters or currency helpers if they expect resolver-produced strings.
     * Coordinate with `src/data/updateConfigsWS.ts` portfolio update handlers so websocket cache mutations do not reintroduce conflicting gain or average-cost recalculations.
   - Validation steps:
     * Run `npm test` to update `overview.render.test.ts` assertions and ensure purchase price rendering matches backend payloads.
     * Execute `pytest tests/test_ws_portfolio_positions.py` to verify websocket payloads still ship the normalized cost and performance blocks consumed by the overview tab.
     * Manually expand portfolios in the dashboard (via `npm run dev` + Home Assistant) and monitor browser console warnings to confirm direct backend values render without fallback logic.

4. [ ] Frontend: Retire security detail average-cost & baseline fallbacks
   - Summary: Delete the security detail tab's bespoke average-cost parsing, FX tooltip maths, and cached snapshot reconstruction so the UI renders backend-provided `average_cost`/`performance` payloads directly for snapshots, charts, and history overlays.
   - Legacy surfaces to touch:
     * Frontend:
       - `src/tabs/security_detail.ts`: Remove `normalizeAverageCost`, `extractAverageCost`, `resolvePurchaseFxTooltip`, and `resolveAveragePurchaseBaseline` fallbacks; eliminate `buildSnapshotFromPortfolioCache`/`window.__ppReaderPortfolioPositionsCache` dependencies when loading security detail snapshots; and adjust snapshot metrics initialisers so they trust backend `average_cost`/`performance` blocks without recomputing baselines.【F:src/tabs/security_detail.ts†L101-L608】【F:src/tabs/security_detail.ts†L1489-L1783】【F:src/tabs/security_detail.ts†L1830-L1846】
       - `src/tabs/__tests__/security_detail.metrics.test.ts`: Refresh assertions that currently exercise the fallback helpers so they validate direct consumption of backend payloads instead of derived averages or FX conversions.【F:src/tabs/__tests__/security_detail.metrics.test.ts†L1-L118】
       - `src/tabs/types.ts`: Confirm the shared `AverageCostPayload`/`PerformanceMetricsPayload` interfaces remain the canonical contract and drop any leftover optional fields that only existed to satisfy fallback maths once the cleanup lands.【F:src/tabs/types.ts†L13-L104】
     * Backend:
       - `custom_components/pp_reader/data/db_access.py`: Treat `get_security_snapshot`'s structured `average_cost`, `purchase_total_*`, and `performance` payloads as authoritative; ensure no additional legacy mirrors are required once the frontend trusts these blocks directly.【F:custom_components/pp_reader/data/db_access.py†L507-L646】
       - `custom_components/pp_reader/data/websocket.py`: Keep `_serialise_security_snapshot` forwarding backend `average_cost`/`performance` fields verbatim while stripping deprecated mirrors, and document any outstanding compatibility conversions before the frontend drops its own normalisers.【F:custom_components/pp_reader/data/websocket.py†L142-L212】【F:custom_components/pp_reader/data/websocket.py†L851-L906】
   - Modern replacements to keep:
     * `custom_components/pp_reader/data/aggregations.py`: Continue relying on `compute_holdings_aggregation` + `select_average_cost` for canonical average-cost derivation consumed by snapshots and websocket payloads.【F:custom_components/pp_reader/data/aggregations.py†L175-L238】
     * `custom_components/pp_reader/data/performance.py`: Preserve `select_performance_metrics` outputs as the single source of truth for gain/day-change metrics used by the security detail view.【F:custom_components/pp_reader/data/performance.py†L83-L154】
     * `src/utils/performance.ts`: Maintain `normalizePerformancePayload` as the lightweight frontend validator for optional payloads after removing bespoke recomputation paths.【F:src/utils/performance.ts†L1-L100】
     * `src/tabs/types.ts`: Keep shared snapshot/position type definitions aligned with backend payloads so other tabs remain compatible with the cleanup.【F:src/tabs/types.ts†L13-L147】
   - Dependencies / blockers:
     * Coordinate with websocket cache updates in `src/data/updateConfigsWS.ts` to ensure cached snapshots already expose backend `average_cost`/`performance` blocks, preventing the security detail tab from needing to rebuild averages when websocket updates arrive.【F:src/data/updateConfigsWS.ts†L69-L249】
     * Audit DOM shims that still read from `window.__ppReaderPortfolioPositionsCache` (e.g. legacy scripts relying on `__ppReader` globals) and update or retire them so removing the cache-based snapshot reconstruction does not break hidden integrations.【F:src/tabs/security_detail.ts†L320-L456】【F:src/data/updateConfigsWS.ts†L200-L249】
     * Verify backend snapshots always include the structured payloads in error/fallback states; fill any gaps uncovered during manual QA before dropping the frontend guardrails.【F:custom_components/pp_reader/data/websocket.py†L142-L212】【F:custom_components/pp_reader/data/db_access.py†L507-L646】
   - Validation steps:
     * Run `npm test` to update security detail metrics tests and ensure snapshot rendering logic passes without the fallback helpers.
     * Execute `pytest tests/test_ws_security_snapshot.py` (or add an equivalent coverage target) to confirm websocket snapshot payloads stay stable while the frontend stops synthesising averages.
     * Smoke-test the security detail tab via `npm run dev` + Home Assistant, toggling history ranges and FX tooltips to confirm baselines, averages, and tooltips render directly from backend data without regression.
