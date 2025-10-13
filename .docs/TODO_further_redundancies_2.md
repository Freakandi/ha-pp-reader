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
2. [ ] Frontend: Sunset `buildSnapshotFromPortfolioCache` snapshot fallback
   - Summary: Remove the security-detail snapshot reconstruction that walks cached portfolio positions so the tab relies solely on backend-provided snapshot payloads and shared utilities for holdings, totals, and performance values.
   - Legacy surfaces to touch:
     * Frontend:
       - `src/tabs/security_detail.ts`: Delete `buildSnapshotFromPortfolioCache`, `resolvePortfolioPositionsCache`, and related helpers (`extractAggregation`, `extractAverageCost`, fallback performance assembly) and stop registering the cache-derived snapshot inside `getCachedSecuritySnapshot`.
       - `src/tabs/overview.ts`: Drop the `window.__ppReaderPortfolioPositionsCache` export and associated `getSecurityPositionsFromCache` wiring once the security detail view no longer depends on cached positions.
       - `src/data/updateConfigsWS.ts`: Remove the websocket updater logic that mutates the global positions cache purely for the snapshot fallback, keeping only the DOM update path for live portfolio refreshes.
     * Tests:
       - `tests/frontend/dashboard_smoke.mjs` & `tests/frontend/portfolio_update_gain_abs.mjs`: Update fixtures and assertions that seed/inspect `window.__ppReaderPortfolioPositionsCache` so they instead validate snapshot handling via backend responses.
   - Modern replacements to keep:
     * Frontend: `src/data/api.ts` `fetchSecuritySnapshotWS` remains the only entry point for loading detail snapshots, and `src/utils/performance.ts` `normalizePerformancePayload` continues to normalise backend metrics without recomputation.
     * Backend: `custom_components/pp_reader/data/websocket.py::ws_get_security_snapshot` and `custom_components/pp_reader/data/db_access.py::get_security_snapshot` keep aggregating holdings with `custom_components/pp_reader/data/aggregations.py::compute_holdings_aggregation` and `custom_components/pp_reader/data/performance.py::select_performance_metrics`.
   - Dependencies / blockers:
     * Confirm no other panel logic consumes `window.__ppReaderPortfolioPositionsCache` or `window.__ppReaderGetSecurityPositionsFromCache` (beyond legacy tests) before deletion, and provide a migration note if custom cards rely on the globals.
     * Ensure websocket live updates still invalidate `SNAPSHOT_DETAIL_REGISTRY` via `PortfolioPositionsUpdatedEventDetail` handlers so freshly fetched snapshots reflect new backend data without the local fallback.
     * Coordinate with documentation to announce removal of cache-based snapshot support for offline mode if any guides referenced the legacy behaviour.
   - Validation steps:
     * Run `npm run test` to exercise the frontend integration tests that cover portfolio updates and security detail rendering without the cache fallback.
     * Smoke-test the security detail tab manually against a development backend to confirm snapshots load, refresh, and render correctly solely through the websocket snapshot endpoint.
3. [ ] Frontend: Retire `ensureSnapshotMetrics` derived metrics fallback
   - Summary: Remove the security detail metrics registry logic that recomputes holdings, FX rates, and performance deltas client-side so the dashboard trusts the backend-provided snapshot metrics without duplicating math.
   - Legacy surfaces to touch:
     * Frontend:
       - `src/tabs/security_detail.ts`: Simplify `ensureSnapshotMetrics`, `deriveFxRate`, and helper number guards to stop deriving purchase totals, FX conversions, and day-change deltas from raw snapshot fields; rely on the `snapshot.performance`, `total_holdings_precise`, and `average_cost` payloads instead. Audit `resolvePurchaseFxTooltip`, `resolveAveragePurchaseBaseline`, and chart builders so they read the preserved backend metrics rather than calling fallback calculators.
       - `src/tabs/security_detail.ts`: Prune legacy exports from `__TEST_ONLY__` that only supported the fallback math (e.g. `normalizeAverageCostForTest`, `resolvePurchaseFxTooltipForTest`) or rework them to cover the streamlined flow.
       - `src/tabs/__tests__/security_detail.metrics.test.ts`: Update fixture snapshots and assertions that expect derived averages, FX rates, or percentage changes to match the backend payload contract once the fallback is removed.
     * Shared utilities:
       - `src/utils/performance.ts`: Ensure `normalizePerformancePayload` remains the canonical formatter for backend `performance` blocks and tighten typings if the fallback removal changes accepted inputs.
   - Modern replacements to keep:
     * Backend: `custom_components/pp_reader/data/db_access.py::get_security_snapshot` already aggregates holdings, average cost, and performance data via `custom_components/pp_reader/data/aggregations.py::compute_holdings_aggregation` and `custom_components/pp_reader/data/performance.py::select_performance_metrics`; the frontend should consume these values verbatim.
     * WebSocket: `custom_components/pp_reader/data/websocket.py::ws_get_security_snapshot` remains the only delivery path for security detail snapshots and should continue serialising the backend metrics without lossy coercion.
     * Frontend utilities: `normalizePerformancePayload` and the existing type definitions in `src/tabs/types.ts` and `src/utils/performance.ts` should stay as-is to parse backend payloads without recomputation.
   - Dependencies / blockers:
     * Confirm no other dashboard modules (history overlays, overview tab cards) read from `SNAPSHOT_METRICS_REGISTRY` expecting fallback-populated fields before trimming them; update call sites or provide migration scaffolding where necessary.
     * Coordinate with backend teams to guarantee `performance.day_change` and `average_cost` blocks are populated for securities across asset classes; log or surface diagnostics if required fields are missing so we do not regress UI coverage.
     * Ensure currency formatting helpers continue to handle `null` gracefully once fallback numbers are removed, especially for zero-holdings securities where the backend intentionally omits averages.
   - Validation steps:
     * Run `npm run test` to cover the updated security detail unit tests and verify no regressions in metrics rendering.
     * Execute `npm run lint:ts` and `npm run typecheck` to confirm stricter typings after the fallback removal.
     * Perform a manual smoke test of the security detail tab against a dev backend, specifically checking holdings, FX tooltips, and day-change ribbons for securities with and without FX conversions.
