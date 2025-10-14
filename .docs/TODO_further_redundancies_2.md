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
2. [ ] Backend: Retire legacy average-cost mirror fields from portfolio positions payloads
   - Summary: Remove the flat `average_purchase_price_native`, `purchase_total_security`, `purchase_total_account`, and `avg_price_account` mirrors from portfolio position responses so clients consume the structured `average_cost` and `aggregation` blocks instead of duplicate legacy keys.
   - Legacy surfaces to touch:
     * Backend:
       - `custom_components/pp_reader/data/db_access.py`: Update `get_portfolio_positions` to stop injecting the deprecated mirrors while keeping `aggregation`/`average_cost` hydrated via `compute_holdings_aggregation` and `_resolve_average_cost_totals`.
       - `custom_components/pp_reader/data/event_push.py`: Ensure `_normalize_position_entry` and downstream event payload builders no longer expect or backfill the removed keys when emitting websocket/cache updates.
       - `custom_components/pp_reader/data/websocket.py`: Trim `_normalize_portfolio_positions` and the websocket command responses so they forward only the structured payloads, adjusting any guards that currently special-case the legacy mirrors.
       - `custom_components/pp_reader/data/sync_from_pclient.py`: Confirm `fetch_positions_for_portfolios` and related push paths propagate the lean payload without reintroducing the legacy fields.
     * Frontend:
       - `src/data/api.ts`: Drop the deprecated keys from `PortfolioPositionData` and websocket response types so Home Assistant consumers migrate to `average_cost`/`aggregation`.
       - `src/tabs/types.ts`: Update `PortfolioPosition` and `HoldingsAggregationPayload` definitions to reflect the trimmed backend surface.
       - `src/data/updateConfigsWS.ts`: Remove normalization fallbacks that backfill the old mirrors and rely on the structured payload to drive caches.
       - `src/tabs/overview.ts` (and dependent render helpers/tests): Adjust aggregation and average-cost resolvers plus UI selectors to consume nested payloads instead of the top-level mirrors.
       - `src/tabs/security_detail.ts` and associated chart helpers/tests: Make sure detail metrics, baselines, and test fixtures derive values from `average_cost`/`aggregation` rather than the removed keys.
   - Modern replacements to keep:
     * `custom_components/pp_reader/data/aggregations.py`: `HoldingsAggregation` plus `select_average_cost` remain the canonical source for totals and share-weighted averages.
     * `custom_components/pp_reader/data/performance.py`: Portfolio performance helpers should continue populating the `performance` payload without needing the legacy mirrors.
     * Frontend selectors that already consume `average_cost`/`aggregation` (e.g., overview metrics resolvers) should be retained as the supported access pattern.
   - Dependencies / blockers:
     * Several pytest suites assert on the legacy fields (`tests/test_db_access.py`, `tests/test_ws_portfolio_positions.py`); they need coordinated updates once the mirrors disappear.
     * Frontend unit tests (`src/tabs/__tests__/overview.render.test.ts`, `src/tabs/__tests__/security_detail.metrics.test.ts`) and fixtures currently include the deprecated keys and must be migrated alongside the type changes.
     * Ensure automation relying on recorder payloads or custom dashboards is notified—consider a deprecation warning cycle or feature flag if external consumers need lead time.
     * Confirm Home Assistant recorder/export integrations consuming the websocket feed tolerate the leaner payload, especially any automations expecting `purchase_total_*` fields.
   - Validation steps:
     * Run `pytest tests/test_db_access.py` and `pytest tests/test_ws_portfolio_positions.py` to confirm backend payloads and websocket responses still align with structured helpers.
     * Execute targeted frontend checks: `npm run test -- src/tabs/__tests__/overview.render.test.ts` and `npm run test -- src/tabs/__tests__/security_detail.metrics.test.ts` after updating fixtures to ensure UI selectors handle the new shape.
     * Smoke-test the Home Assistant panel via `./scripts/develop` + `npm run dev` to verify portfolio detail tabs render average-cost metrics purely from the structured payloads.
3. [ ] Backend: Retire legacy average-cost mirror fields from security snapshot payloads
   - Summary: Stop surfacing `average_purchase_price_native`, `purchase_total_security`, `purchase_total_account`, and `avg_price_account` on security snapshot responses so the detail views rely solely on the structured `average_cost` object and holdings aggregation metadata.
   - Legacy surfaces to touch:
     * Backend:
       - `custom_components/pp_reader/data/db_access.py`: Update `get_security_snapshot` to return only the structured `average_cost`/`performance` payloads from `_resolve_average_cost_totals`, trimming the duplicate flat keys and ensuring coordinator fallbacks match the lean schema.
       - `custom_components/pp_reader/data/websocket.py`: Align `_serialise_security_snapshot` and `ws_get_security_snapshot` responses with the slimmer payload, removing normalization/backfill logic for the deprecated mirrors and keeping fallback snapshots compatible.
     * Frontend:
       - `src/data/api.ts`: Drop the mirror fields from `SecuritySnapshotResponse` so Home Assistant callers stop expecting them in websocket replies.
       - `src/tabs/types.ts`: Update `SecuritySnapshotLike` (and any dependent types) to reflect the new backend contract without the legacy purchase-total keys.
       - `src/tabs/security_detail.ts`: Rework snapshot metrics, baseline resolvers, and tooltip helpers to derive purchase totals and averages from `average_cost`/`aggregation` instead of the removed flat fields.
       - `src/tabs/__tests__/security_detail.metrics.test.ts` and other detail-tab fixtures: Refresh mocks to consume the structured payload, ensuring chart and metric assertions no longer depend on the legacy mirrors.
   - Modern replacements to keep:
     * `custom_components/pp_reader/data/aggregations.py`: Continue using `HoldingsAggregation`, `select_average_cost`, and `_resolve_average_cost_totals` as the canonical sources for average-cost numbers across snapshots and positions.
     * `custom_components/pp_reader/data/performance.py`: Preserve the `select_performance_metrics` output as the unified gain/day-change payload for websocket consumers.
     * Frontend normalization utilities that already parse `average_cost` (e.g., `normalizeAverageCost` in `src/tabs/security_detail.ts`) should remain and become the single inputs for UI metrics.
   - Dependencies / blockers:
     * Backend unit tests asserting on the legacy fields (`tests/test_db_access.py::test_get_security_snapshot_*`, `tests/test_sync_from_pclient.py`) must be updated alongside the schema change.
     * Websocket integration tests (`tests/test_ws_security_history.py`) and YAML fixtures (`tests/panel_event_payload.yaml`) include the mirrors and will need synchronized updates once the payload slims down.
     * The detail tab metrics suite relies on purchase-total mirrors for derived FX ratios; plan the migration so alternative data (e.g., aggregation totals) is available before removing the fields.
     * Communicate the contract change for any downstream automations or custom dashboards that consume `pp_reader/get_security_snapshot` responses to avoid breaking user setups.
   - Validation steps:
     * Run `pytest tests/test_db_access.py::test_get_security_snapshot*` and `pytest tests/test_sync_from_pclient.py` to confirm snapshots still serialise correctly after removing the mirrors.
     * Exercise websocket flows with `pytest tests/test_ws_security_history.py` (and targeted smoke tests via `pytest tests/test_ws_security_history.py::test_ws_get_security_snapshot_success`) to ensure the lean payload remains compatible.
     * Execute the detail tab metrics tests with `npm run test -- src/tabs/__tests__/security_detail.metrics.test.ts` and review the dashboard smoke tests to verify charts render correctly using only the structured average-cost data.
4. [ ] Backend: Retire flattened gain metrics duplicated alongside structured performance payloads
   - Summary: Remove the legacy top-level `gain_abs`/`gain_pct` mirrors from portfolio payloads and events so clients exclusively consume the nested `performance` object for gain data.
   - Legacy surfaces to touch:
     * Backend:
       - `custom_components/pp_reader/data/db_access.py`: Stop injecting `gain_abs`/`gain_pct` into `get_portfolio_positions`, `_normalize_portfolio_row`, and `fetch_live_portfolios`, instead forwarding only the `performance` payload produced by `select_performance_metrics`.
       - `custom_components/pp_reader/data/event_push.py`: Update `_normalize_portfolio_value_entry` and `_normalize_position_entry` (plus the compactors) to avoid recalculating the flat gain mirrors when emitting websocket events.
       - `custom_components/pp_reader/data/coordinator.py`: Trim `_portfolio_contract_entry` so coordinator snapshots rely on `compose_performance_payload` and no longer maintain separately rounded gain fields.
       - `custom_components/pp_reader/prices/price_service.py`: Ensure `_build_portfolio_values_payload` and downstream price-cycle upserts propagate only the structured performance metrics without recreating `gain_abs`/`gain_pct`.
     * Frontend:
       - `src/data/updateConfigsWS.ts`: Drop normalization fallbacks that repopulate `gain_abs`/`gain_pct`, letting cache entries read the nested `performance` metrics instead.
       - `src/tabs/types.ts`: Remove the deprecated gain mirror fields from `PortfolioPosition`/`PortfolioSummary` contracts so the UI types align with the slim backend payload.
       - `src/tabs/overview.ts` & `src/tabs/security_detail.ts`: Refactor table builders, aggregators, and formatting helpers to derive gain displays from `performance.gain_abs`/`performance.gain_pct` exclusively.
       - `src/content/elements.ts`, `src/utils/performance.ts`, and related formatters: Ensure helper utilities no longer expect the flat keys when rendering gain values.
   - Modern replacements to keep:
     * `custom_components/pp_reader/data/performance.py`: `select_performance_metrics` and `compose_performance_payload` remain the single source for gain and change calculations.
     * `custom_components/pp_reader/data/db_access.py`: Preserve the `performance` dict embedding while slimming payloads so downstream consumers retain metadata like `source` and `coverage_ratio`.
     * Frontend selectors/utilities already consuming `performance` (e.g., `normalizePerformanceMetrics` in `src/data/updateConfigsWS.ts`) become the standard access path.
   - Dependencies / blockers:
     * Backend tests asserting on the mirrors (`tests/test_db_access.py`, `tests/test_fetch_live_portfolios.py`, `tests/test_event_push.py`, `tests/test_price_service.py`, `tests/test_ws_portfolios_live.py`) require coordinated fixture and assertion updates.
     * Websocket contract tests (`tests/test_ws_portfolio_positions.py`, `tests/test_ws_security_history.py`) and YAML fixtures (`tests/panel_event_payload.yaml`) must be updated to consume gains via `performance` only.
     * Frontend unit and smoke tests (`src/tabs/__tests__/overview.render.test.ts`, `src/tabs/__tests__/security_detail.metrics.test.ts`, `tests/frontend/dashboard_smoke.mjs`, `tests/frontend/portfolio_update_gain_abs.mjs`) currently rely on the flat fields and need migration.
     * Communicate the contract change for custom dashboards/automations that read recorder exports or websocket events expecting `gain_abs`/`gain_pct` at the top level.
   - Validation steps:
     * Run targeted backend suites: `pytest tests/test_db_access.py`, `pytest tests/test_fetch_live_portfolios.py`, `pytest tests/test_price_service.py`, and `pytest tests/test_event_push.py` to confirm payload generation uses the structured metrics.
     * Re-run websocket tests: `pytest tests/test_ws_portfolios_live.py` and `pytest tests/test_ws_portfolio_positions.py` to verify event payloads continue to align with expectations.
     * Execute frontend checks: `npm run test -- src/tabs/__tests__/overview.render.test.ts`, `npm run test -- src/tabs/__tests__/security_detail.metrics.test.ts`, and the dashboard smoke suites to ensure UI rendering logic operates solely on the `performance` object.
5. [ ] Backend: Retire legacy day-change mirrors from security snapshot payloads
   - Summary: Remove the flat `day_price_change_native`/`day_price_change_eur`/`day_change_pct` mirrors from `get_security_snapshot` responses so downstream consumers rely on the structured `performance.day_change` block for intraday deltas.
   - Legacy surfaces to touch:
     * Backend:
       - `custom_components/pp_reader/data/db_access.py`: Stop serialising the legacy day-change keys when building the snapshot dict, ensuring the returned payload only exposes `performance.day_change` alongside the other structured metrics.
       - `custom_components/pp_reader/data/websocket.py`: Keep `_serialise_security_snapshot` from backfilling the removed fields, validate that cache fallbacks and empty-snapshot defaults no longer mention `day_price_change_*` mirrors, and rely on the nested performance payload for websocket responses.
       - `custom_components/pp_reader/data/coordinator.py` & `custom_components/pp_reader/prices/price_service.py`: Double-check the coordinator contract and price-refresh upserts propagate the structured `performance` payload as-is without recreating the deprecated mirrors during cache hydration.
     * Frontend:
       - `src/data/api.ts` & `src/tabs/types.ts`: Verify the TypeScript contracts stay aligned with the slimmer backend payload, explicitly documenting that day-change data now lives exclusively under `performance.day_change`.
       - `src/tabs/security_detail.ts`: Confirm metrics derivations, chart helpers, and websocket cache normalisers consume the nested day-change payload and do not attempt to read the removed flat fields when rendering intraday changes.
   - Modern replacements to keep:
     * `custom_components/pp_reader/data/performance.py`: `select_performance_metrics` and `compose_performance_payload` remain the single source for gain/day-change metrics and should continue embedding the `day_change` dict in all snapshot payloads.
     * Existing frontend helpers (`normalizePerformanceMetrics` and detail-tab selectors) that already read `performance.day_change` should become the canonical access pattern for intraday deltas.
   - Dependencies / blockers:
     * Update backend test fixtures and assertions that still expect the flat fields (`tests/test_db_access.py::test_get_security_snapshot*`, `tests/test_ws_security_history.py`) alongside any YAML payloads that capture snapshot shapes.
     * Confirm downstream automation or recorder exports reading historical websocket payloads tolerate the missing keys; coordinate documentation or migration notes if third-party dashboards rely on them.
     * Ensure cached snapshot stores (e.g., coordinator cache, price-service persistence) handle schema versioning gracefully so legacy entries with the old keys do not break deserialisation.
   - Validation steps:
     * Execute `pytest tests/test_db_access.py::test_get_security_snapshot*` and `pytest tests/test_ws_security_history.py` to prove websocket and direct snapshot responses surface only the structured `performance.day_change` data.
     * Smoke-test the Home Assistant panel via `./scripts/develop` + `npm run dev` to confirm security detail widgets render day-change deltas correctly from the nested payload.
     * Spot-check any recorder exports or saved snapshot caches after the cleanup to verify they serialise without the deprecated keys and continue to hydrate into the UI without errors.
6. [ ] Backend: Retire legacy `avg_price_account` payload mirrors
   - Summary: Stop surfacing the deprecated `avg_price_account` field alongside modern average-cost payloads so backend responses and websocket/event payloads rely solely on the structured `average_cost.account` value.
   - Legacy surfaces to touch:
     * Backend:
       - `custom_components/pp_reader/data/db_access.py`: Update `get_portfolio_positions` and `get_security_snapshot` to drop `avg_price_account` from serialized payloads while preserving the structured `average_cost` and `aggregation` data returned by `_resolve_average_cost_totals`.
       - `custom_components/pp_reader/data/event_push.py`: Remove ingestion/backfill of `avg_price_account` inside `_normalize_position_entry` and the compactors so live portfolio updates no longer expect or emit the deprecated key.
       - `custom_components/pp_reader/data/websocket.py`: Ensure `_normalize_portfolio_positions` and `_serialise_security_snapshot` no longer handle `avg_price_account`, and verify websocket command responses avoid reinserting the legacy field.
       - `custom_components/pp_reader/prices/price_service.py`: Align the cache refresh upserts and impacted portfolio recomputations so coordinator snapshots and stored portfolio_securities rows stop persisting `avg_price_account` purely for payload compatibility.
       - `custom_components/pp_reader/logic/securities.py`: Trim purchase-metrics computations to avoid calculating `avg_price_account` once downstream payloads have migrated, or gate the calculation behind an internal feature flag during rollout.
     * Frontend:
       - `src/tabs/types.ts`: Remove the deprecated optional `avg_price_account` property from `PortfolioPosition` and any derived types so dashboard code consumes the structured average-cost payload exclusively.
       - Identify and update any remaining TS/JS helpers (e.g., selectors or fixtures under `src/tabs/**`, websocket normalisers in `src/data/**`) that still reference `avg_price_account`, ensuring they read `average_cost.account` instead.
   - Modern replacements to keep:
     * `custom_components/pp_reader/data/aggregations.py`: Retain `HoldingsAggregation`/`AverageCostSelection` as the canonical source, emitting `average_cost.account` plus `aggregation.account_currency_total` for account-denominated totals.
     * `custom_components/pp_reader/data/performance.py`: Keep the structured `performance` payload unchanged so account-level gain/valuation logic continues to flow through the nested helpers.
     * Frontend selectors that already hydrate `average_cost` (e.g., `normalizeAverageCost` / `resolveAverageCost`) should remain the blessed access pattern for account-level prices.
   - Dependencies / blockers:
     * Database schema still includes the `avg_price_account` column for historical data; coordinate a follow-up migration plan if the column can eventually be dropped or backfilled into structured aggregates.
     * Backend tests asserting on the legacy key (`tests/test_db_access.py`, `tests/test_sync_from_pclient.py`, websocket suites) and fixtures (`tests/panel_event_payload.yaml`) require synchronized updates when the field is removed.
     * Frontend unit tests and dashboard smoke suites must refresh fixtures/mocks that currently expect `avg_price_account` to exist.
     * Communicate the contract change to downstream automations that might parse recorder exports or websocket payloads expecting the legacy field.
   - Validation steps:
     * Run `pytest tests/test_db_access.py` and targeted websocket suites (`pytest tests/test_ws_portfolio_positions.py`, `pytest tests/test_ws_security_history.py`) to confirm payloads still hydrate correctly without the deprecated key.
     * Exercise the price-service pipeline via `pytest tests/test_sync_from_pclient.py` to ensure portfolio cache refreshes persist and emit consistent aggregates post-removal.
     * Execute representative frontend checks (`npm run test -- src/tabs/__tests__/overview.render.test.ts`, `npm run test -- src/tabs/__tests__/security_detail.metrics.test.ts`, and dashboard smoke tests) after updating fixtures to validate UI selectors rely solely on `average_cost.account`.
