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
