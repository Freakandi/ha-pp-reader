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
2. [ ] Backend: Sunset legacy portfolio aggregation fallbacks
   - Summary: Remove the bespoke FIFO and DB aggregation helpers so price revaluation and sensor refreshes rely solely on the shared `fetch_live_portfolios` source of truth.
   - Legacy surfaces to touch:
     * Backend:
       - `custom_components/pp_reader/logic/portfolio.py`: Delete `calculate_portfolio_value`, `calculate_purchase_sum`, the supporting `_ensure_fx_rates_for_transactions`/`_build_fifo_holdings` stack, and the `db_calculate_portfolio_*` accessors once no call sites remain.
       - `custom_components/pp_reader/prices/revaluation.py`: Replace the fallback branches that await `calculate_portfolio_value`/`calculate_purchase_sum` with guarded reuse of the live aggregation payload or an executor call into `fetch_live_portfolios` for missing rows.
       - `custom_components/pp_reader/prices/price_service.py`: Remove the coordinator refresh fallback that replays `db_calculate_portfolio_value_and_count`/`db_calculate_portfolio_purchase_sum` after price cycles and reuse the cached live aggregation output instead.
     * Frontend: No action; the dashboard already consumes the websocket payload built from `fetch_live_portfolios`.
   - Modern replacements to keep:
     * `custom_components/pp_reader/data/db_access.py`: `fetch_live_portfolios` (and `_normalize_portfolio_row`) stay as the canonical aggregator for totals, purchase sums, and position counts.
     * `custom_components/pp_reader/data/websocket.py`: `_live_portfolios_payload`/`fetch_live_portfolios` executor path remains the shared delivery mechanism for dashboards and automations.
     * `custom_components/pp_reader/data/coordinator.py`: Coordinator refreshes should continue using `fetch_live_portfolios` to populate sensors, avoiding ad-hoc math.
   - Dependencies / blockers:
     * Ensure FX preloading previously handled inside `calculate_purchase_sum` is either obsolete (data already persisted in EUR) or replicated via existing exchange-rate guards before deleting the helper stack.
     * Confirm no HA services or user scripts import `logic.portfolio` directly; update or provide release notes if external consumers rely on the deprecated functions.
     * Coordinate with the price cycle to keep partial revaluation resilient—add regression coverage if new fallback paths rely on cached live aggregates or coordinator snapshots.
   - Validation steps:
     * Run `pytest tests/prices/test_revaluation_live_aggregation.py` and `pytest tests/test_fetch_live_portfolios.py` to cover revaluation, executor fallbacks, and the canonical aggregator.
     * Execute `pytest tests/test_ws_portfolios_live.py` to ensure websocket payloads still match expectations once the legacy helpers disappear.
3. [ ] Frontend: Drop the legacy `dashboard.js` fallback from the panel bootstrapper
   - Summary: Remove the legacy bundle loader so the panel element always imports the Vite-built module or the dev-server entry point, aligning production and development bootstrap paths.
   - Legacy surfaces to touch:
     * Frontend:
       - `custom_components/pp_reader/www/pp_reader_dashboard/panel.js`: Delete `LEGACY_DASHBOARD_SPECIFIER` and the `try` branch that imports `./js/dashboard.js`, ensuring the loader either boots the dev server or loads `dashboard.module.js` and fails fast if that import breaks.
       - `custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.dJ4vp7Nt.js`: Remove the static legacy bundle once no longer referenced so production builds only ship the module export that Vite manages.
       - `ARCHITECTURE.md` / `README-dev.md`: Update documentation to reflect that the panel now requires the Vite module and no longer references the legacy bundle fallback.
       - `tests/frontend/portfolio_update_gain_abs.mjs` & `tests/frontend/dashboard_smoke.mjs`: Adjust fixtures that assert the module path so they no longer expect a fallback file to exist in release packages.
   - Modern replacements to keep:
     * `src/panel.ts`: Remains the authoritative panel implementation compiled by Vite and loaded by Home Assistant.
     * `custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.module.js`: Continues exporting the hashed bundle produced by `npm run build` for stable specifiers.
     * `scripts/update_dashboard_module.mjs`: Keeps rewiring `dashboard.module.js` to the newest hash and pruning stale outputs during builds.
   - Dependencies / blockers:
     * Verify no Home Assistant release channels or custom themes still distribute a hand-copied `dashboard.js`; coordinate changelog guidance if integrators must update packaging scripts.
     * Ensure `npm run build` updates service-worker caches or bundler outputs referenced by Home Assistant updates; confirm the hashed bundle is published as part of release automation.
     * Audit translation or theming overrides that might import `window.__ppReaderDashboardElements` from `dashboard.js` to make sure they already migrated to the module build before deleting the fallback asset.
   - Validation steps:
     * Run `npm run build` followed by `node scripts/update_dashboard_module.mjs` to confirm the bundle pipeline still emits `dashboard.module.js` without requiring a fallback artefact.
     * Execute `npm run lint:ts` and `npm run test:frontend` (or the targeted dashboard smoke tests) to ensure the panel and dashboard entry points remain loadable without the legacy bundle.
     * Launch Home Assistant via `./scripts/develop` and open the panel with and without the Vite dev-server query param to verify both the hot-reload flow and the production bundle bootstrap succeed post-cleanup.
4. [ ] Frontend: Remove `window.__ppReader*` compatibility shims from the dashboard bundle
   - Summary: Stop exposing websocket handlers, DOM caches, and helpers on `window` so the dashboard relies solely on module imports, eliminating the legacy DOM-integration bridge that kept the globals alive.
   - Legacy surfaces to touch:
     * Frontend:
       - `src/data/updateConfigsWS.ts`: Inline the pending-update maps, sorter hooks, and DOM helper access so `restoreSortAndInit`, `renderPositionsTableInline`, `updatePortfolioFooter`, and related routines no longer read or write `window.__ppReader*` state.
       - `src/tabs/overview.ts`: Drop the assignments that seed `window.__ppReaderPortfolioPositionsCache`, `__ppReaderAttachSecurityDetailListener`, `__ppReaderAttachPortfolioPositionsSorting`, `__ppReaderUpdatePortfolioFooter`, and the other helper globals; ensure lazy-load flows call the imported websocket helpers directly.
       - `src/types/global.d.ts`: Remove the global window augmentation and DOM extension interfaces once the last call sites use module symbols, tightening the TypeScript surface to genuine exports.
       - `tests/frontend/dashboard_smoke.mjs` & `tests/frontend/portfolio_update_gain_abs.mjs`: Rewrite the harness to import helpers from `src/data/updateConfigsWS` / `src/tabs/overview` instead of stubbing globals, keeping regression coverage without resurrecting the shims.
   - Modern replacements to keep:
     * `src/dashboard.ts`: Continues orchestrating websocket updates via the typed exports from `src/data/updateConfigsWS` and `src/tabs/overview`.
     * `src/tabs/overview.ts`: Preserve module-level caches (`portfolioPositionsCache`), `attachPortfolioPositionsSorting`, `attachSecurityDetailListener`, and `updatePortfolioFooterFromDom` as canonical helpers consumed through imports.
     * `src/data/updateConfigsWS.ts`: Retain `flushPendingPositions`, `flushAllPendingPositions`, `handlePortfolioPositionsUpdate`, and `reapplyPositionsSort` as exported utilities for other tabs/components.
   - Dependencies / blockers:
     * Confirm no custom templates or third-party themes still reach into `window.__ppReader*`; provide migration notes if community snippets rely on the globals.
     * Update the test harnesses and any storybook/demo scaffolding that currently mocks `window.__ppReader` helpers before deleting the declarations to avoid breaking CI.
     * Ensure Vite build output (`custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.module.js`) no longer references the globals by running a fresh build and updating hashed artefacts.
   - Validation steps:
     * Run `npm run lint:ts` and `npm run typecheck` to confirm the TypeScript surface still compiles after the window augmentation is removed.
     * Execute `npm run test:frontend` to cover the dashboard smoke tests with the new import-based wiring.
     * Build the production assets via `npm run build` (followed by `node scripts/update_dashboard_module.mjs`) to verify the emitted module stays self-contained without the shims.

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
