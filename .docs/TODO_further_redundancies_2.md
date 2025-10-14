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
2. [ ] Backend: Remove `_normalize_portfolio_value_entry` recomputation
   - Summary: Trust the canonical portfolio aggregates instead of rebuilding gains and day-change payloads inside the event compaction helper so push events mirror `fetch_live_portfolios` output byte-for-byte.
   - Legacy surfaces to touch:
     * Backend:
       - `custom_components/pp_reader/data/event_push.py`: Refactor `_normalize_portfolio_value_entry` (and `_compact_portfolio_values_payload`) to pass through the `performance` block and gain fields that arrive from upstream payloads instead of recomputing them with ad-hoc rounding.
       - `custom_components/pp_reader/data/sync_from_pclient.py`: Verify `_emit_portfolio_updates` keeps forwarding the raw `fetch_live_portfolios` result without stripping performance metadata once the compactor stops mutating it.
       - `custom_components/pp_reader/prices/price_service.py`: Align `_build_portfolio_values_payload` (revaluation event path) so it no longer mirrors the legacy recomputation logic and instead reuses the same normalized payload structure that event push expects.
       - `custom_components/pp_reader/prices/revaluation.py`: Confirm `_build_portfolio_values_from_live_entries` and related fallbacks continue to supply `name`, `value`, `purchase_sum`, and counts that match the canonical schema when performance fields are preserved.
     * Frontend: No direct API change required, but double-check websocket cache helpers in `src/data/updateConfigsWS.ts` continue to accept the unchanged payload schema when recomputed fields disappear.
   - Modern replacements to keep:
     * `custom_components/pp_reader/data/db_access.py`: `_normalize_portfolio_row` used by `fetch_live_portfolios` already returns rounded `gain_*` values plus the structured `performance` dataclass payload—this should remain the single source of truth.
     * `custom_components/pp_reader/data/performance.py`: `select_performance_metrics` and `compose_performance_payload` encapsulate gain/day-change calculations for both sensors and UI consumers; event push should delegate to them rather than recalculating inline.
     * `custom_components/pp_reader/data/coordinator.py`: `_portfolio_contract_entry` demonstrates the canonical contract for coordinator consumers; keep this logic authoritative when validating event payload parity.
   - Dependencies / blockers:
     * Ensure revaluation payloads populate a full `performance` block (or compose it via the shared helper) so event push can pass through the metrics without fallback calculations; otherwise we risk stripping data during price updates.
     * Update any fixtures or tests that assert recomputed `gain_abs`/`gain_pct` so they now expect the canonical rounding emitted by `fetch_live_portfolios` and the coordinator contract.
     * Audit HA recorder size constraints after removing recomputation to confirm payload size remains within `EVENT_DATA_MAX_BYTES`, especially when embedding the richer `performance.day_change` structure.
   - Validation steps:
     * Run `pytest tests/test_event_push.py`, `pytest tests/test_sync_from_pclient.py`, and `pytest tests/test_price_service.py` to cover both manual sync and revaluation event paths.
     * In a dev instance, trigger a portfolio sync and a price revaluation cycle, then inspect the `portfolio_values` event payloads in the HA dev tools to confirm the emitted metrics exactly match the records from `fetch_live_portfolios`.
3. [ ] Backend: Retire `_normalize_position_entry` fallbacks in event push
   - Summary: Stop rebuilding holdings aggregates, average-cost selections, and performance metrics inside `_normalize_position_entry` so push events forward the canonical payload from `get_portfolio_positions` without divergent rounding.
   - Legacy surfaces to touch:
     * Backend:
       - `custom_components/pp_reader/data/event_push.py`: Delete the bespoke coercion helpers and aggregation rebuild inside `_normalize_position_entry`, letting `_compact_portfolio_positions_payload` pass through the `positions` list with minimal filtering while still respecting the event size guard.
       - `custom_components/pp_reader/data/event_push.py`: Adjust `_compact_event_data` and related tests to ensure portfolio position events remain stable once the compactor stops injecting `gain_*`, `average_cost`, and `aggregation` overrides.
       - `custom_components/pp_reader/data/sync_from_pclient.py`: Confirm `_emit_portfolio_updates` and `fetch_positions_for_portfolios` keep delivering the enriched payload returned by `get_portfolio_positions` so no upstream caller relies on the compactor to populate missing metrics.
       - `custom_components/pp_reader/prices/price_service.py`: Review the revaluation push flow that calls `_push_update(..., "portfolio_positions", ...)` to make sure it supplies the canonical positions payload (or loads it via `fetch_positions_for_portfolios`) once the compactor no longer repairs fields.
       - `custom_components/pp_reader/prices/revaluation.py`: Validate `_collect_positions_payload`/`_build_portfolio_positions_payload` (via `fetch_positions_for_portfolios`) align with the streamlined compactor and still ship full `average_cost`/`performance` blocks without post-processing.
     * Frontend:
       - `src/data/updateConfigsWS.ts`: The websocket cache updater reads `average_cost`, `aggregation`, and `performance` from push events; verify it gracefully handles the direct payload and drop any assumptions about compactor-generated fallbacks.
       - `src/tabs/overview.ts` & `src/tabs/security_detail.ts`: Spot-check that dashboard state derives metrics from the structured payload rather than deprecated `gain_*` mirrors so UI logic remains consistent when the backend stops patching values.
   - Modern replacements to keep:
     * `custom_components/pp_reader/data/db_access.py`: `get_portfolio_positions` already normalises holdings, totals, and performance via `compute_holdings_aggregation` and `select_performance_metrics`; treat its output as the contract for both websockets and push events.
     * `custom_components/pp_reader/data/aggregations.py`: `compute_holdings_aggregation` and `select_average_cost` remain the authoritative helpers for holdings totals and average-cost derivation.
     * `custom_components/pp_reader/data/performance.py`: `select_performance_metrics` and `compose_performance_payload` provide the canonical gain/day-change calculations consumed by sensors, websockets, and db access.
     * `custom_components/pp_reader/data/websocket.py`: `_normalize_portfolio_positions` demonstrates the target schema that consumers already expect; align the push path with this structure.
   - Dependencies / blockers:
     * Ensure every producer of `portfolio_positions` events (manual sync, price revaluation, future coordinator backfills) sends the complete payload, otherwise removing the fallback could surface `None` gaps; add fixtures for sparse DB rows to cover the edge cases.
     * Update event snapshot fixtures (`tests/fixtures/event_push/*.json`) and websocket assertions that previously relied on compactor-generated fields so they now match the canonical `get_portfolio_positions` output.
     * Reassess payload size against `EVENT_DATA_MAX_BYTES` once we stop pruning fields; if necessary, extend `_estimate_event_size` thresholds or chunk pushes by portfolio.
   - Validation steps:
     * Run `pytest tests/test_event_push.py`, `pytest tests/test_sync_from_pclient.py`, `pytest tests/test_price_service.py`, and `pytest tests/test_ws_portfolio_positions.py` to cover manual sync, revaluation, and websocket consumers end-to-end.
     * In a dev HA instance, trigger a portfolio sync and inspect the emitted `portfolio_positions` event plus the websocket response from `pp_reader/get_portfolio_positions` to confirm both paths now deliver identical payloads.
4. [ ] Backend: Align `_portfolio_contract_entry` gain rounding with shared helpers
   - Summary: Remove the coordinator's manual `round(...)` fallbacks for `gain_abs`/`gain_pct` so portfolio sensor payloads inherit the canonical rounding from `compose_performance_payload` and the shared currency utilities.
   - Legacy surfaces to touch:
     * Backend:
       - `custom_components/pp_reader/data/coordinator.py`: Refactor `_portfolio_contract_entry` to trust `compose_performance_payload` (and the upstream portfolio rows) for gain rounding instead of coercing floats locally; ensure `_build_portfolio_data` continues to expose `gain_*` mirrors sourced from the shared helper so sensors stay backwards compatible.
       - `custom_components/pp_reader/data/coordinator.py`: Audit `_normalize_portfolio_amount` usage and the surrounding imports so currency rounding comes exclusively from `cent_to_eur`/`round_currency` rather than ad-hoc float math when composing the coordinator contract.
       - `custom_components/pp_reader/sensors/depot_sensors.py` & `custom_components/pp_reader/sensors/gain_sensors.py`: Verify entity state assembly still reads the coordinator payload (or recomputes metrics via `select_performance_metrics`) without assuming the legacy rounding behaviour once `_portfolio_contract_entry` stops patching values.
       - `custom_components/pp_reader/data/sync_from_pclient.py`: Double-check `_emit_portfolio_updates` keeps parity between coordinator data and websocket/event payloads so the removal of inline rounding doesn't reintroduce mismatches between sensor values and push events.
     * Frontend: No direct code change expected, but confirm dashboards or websocket consumers comparing sensor values (e.g. QA scripts under `tests/frontend/`) remain stable when sensor rounding is sourced from the shared helper.
   - Modern replacements to keep:
     * `custom_components/pp_reader/data/db_access.py`: `_normalize_portfolio_row` and `fetch_live_portfolios` already emit rounded `gain_*` metrics using `select_performance_metrics`; treat their payload as the source of truth for coordinator parity tests.
     * `custom_components/pp_reader/data/performance.py`: `select_performance_metrics` and `compose_performance_payload` encapsulate the rounding semantics for gain and day-change fields—reuse them instead of duplicating float operations.
     * `custom_components/pp_reader/util/currency.py`: `round_currency` (and related helpers) remain the only approved primitives for EUR rounding and should back any residual conversions during the cleanup.
   - Dependencies / blockers:
     * Confirm coordinator fixtures (`tests/fixtures/coordinator/*.json`) or sensor tests do not assert the legacy `round()` behaviour; update them alongside the refactor to match the shared helper output.
     * Ensure `compose_performance_payload` always returns numeric floats for `gain_*`; if upstream data can contain strings, add coercion before delegating to avoid reintroducing manual rounding.
     * Keep parity with websocket live portfolio payloads by adding regression tests that compare coordinator output against `fetch_live_portfolios`, so future changes do not drift again.
   - Validation steps:
     * Run `pytest tests/test_fetch_live_portfolios.py`, `pytest tests/test_ws_portfolios_live.py`, and `pytest tests/test_event_push.py` to verify gain rounding stays consistent across coordinator, websocket, and push payloads.
     * In a dev Home Assistant instance, refresh the integration and inspect the `portfolio` sensor entities alongside the `pp_reader/get_live_portfolios` websocket response to confirm `gain_abs`/`gain_pct` match to two decimals without extra rounding artifacts.
5. [ ] Backend: Eliminate price revaluation cent scaling duplication
   - Summary: Ensure the price revaluation pipeline reuses the shared currency utilities and canonical aggregation payloads instead of reconverting EUR floats back to cents and hand-rounding totals before database upserts or event emission.
   - Legacy surfaces to touch:
     * Backend:
       - `custom_components/pp_reader/prices/price_service.py`: Refactor `_refresh_impacted_portfolio_securities` so portfolio security upserts rely on `round_currency`/`cent_to_eur` (or a shared cent-scaling helper) rather than multiplying floats by 100 and casting to `int`, and stop locally rounding `security_currency_total` / `account_currency_total` when the aggregation helpers already provide canonical precision.
       - `custom_components/pp_reader/prices/price_service.py`: Audit `_build_portfolio_values_payload` and any downstream emitters to guarantee they pass through the canonical `performance` block from live aggregates instead of recomputing gain mirrors after manual rounding shortcuts.
       - `custom_components/pp_reader/prices/revaluation.py`: Update `_build_portfolio_values_from_live_entries` to treat the rows from `fetch_live_portfolios` as the source of truth, removing the extra `round(float(...), 2)` conversions and preserving the structured performance payload when present.
       - `custom_components/pp_reader/logic/securities.py`: Verify `db_calculate_holdings_value` and the supporting purchase metric helpers expose data that already conforms to the shared cent/rounding helpers so price revaluation no longer needs to massage the values before persistence.
     * Frontend: No direct consumers should change, but double-check websocket cache helpers in `src/data/updateConfigsWS.ts` continue to accept the untouched payload when the backend stops coercing floats into legacy cent fields.
   - Modern replacements to keep:
     * `custom_components/pp_reader/util/currency.py`: Continue to treat `cent_to_eur`, `round_currency`, and the related primitives as the only sanctioned currency normalisers for both persistence and payload assembly.
     * `custom_components/pp_reader/data/db_access.py`: `fetch_live_portfolios` and `get_portfolio_positions` already surface correctly rounded `purchase_sum`, `current_value`, and `performance` payloads—mirror these contracts when revaluation rebuilds events.
     * `custom_components/pp_reader/data/performance.py`: Preserve `select_performance_metrics` / `compose_performance_payload` as the single source of truth for gain and day-change calculations rather than recomputing them inside the revaluation path.
     * `custom_components/pp_reader/data/event_push.py`: Use its compaction helpers as the downstream contract to validate that revaluation payloads remain identical once the duplicate scaling logic is removed.
   - Dependencies / blockers:
     * Coordinate with the legacy sync flow in `custom_components/pp_reader/data/sync_from_pclient.py`, which currently persists cents similarly, to either share the new helper or update both paths in the same migration so the database layout stays consistent.
     * Confirm fixtures and tests relying on integer-cent snapshots (e.g. under `tests/fixtures/event_push/` and `tests/fixtures/price_service/`) are updated to expect the helper-driven rounding semantics.
     * Validate that recorder/event size guards (`_estimate_event_size` in event push) do not regress once we stop truncating floats manually; adjust chunking thresholds if payloads grow slightly.
     * Ensure FX fallback logic in `db_calculate_holdings_value` still emits finite floats before delegating to the shared helpers; add guards for `None` paths uncovered by the tighter normalisation.
   - Validation steps:
     * Run `pytest tests/test_price_service.py`, `pytest tests/test_sync_from_pclient.py`, and `pytest tests/test_event_push.py` to cover the price revaluation cycle, portfolio sync fallback, and event emission paths.
     * In a dev Home Assistant instance, trigger a price update cycle and compare the resulting `portfolio_values` event plus the `pp_reader/get_live_portfolios` websocket response to confirm both payloads now match without extra cent-scaling conversions.
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
