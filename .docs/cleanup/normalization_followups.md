# Normalization Follow-Ups (Next Milestone)

This note captures the artifacts that were archived after shipping the canonical normalization pipeline and the remaining cleanup tasks that need to ride the next milestone (M5 frontend alignment).

## Archived references

- `.docs/cleanup/live_aggregation/updateGoals.md` – historical concept describing the on-demand portfolio aggregation rollout and override cache removal in the dashboard.
- `.docs/cleanup/live_aggregation/TODO_updateGoals.md` – the original checklist for the live-aggregation migration (backend helpers, websocket rewrites, frontend overrides).

Both documents stay available under `./.docs/cleanup/live_aggregation/` for auditing purposes but no longer represent the active implementation because websocket/data/event payloads now source from `custom_components/pp_reader/data/normalization_pipeline.py`.

## Next milestone cleanup tasks

### 1. Frontend adapter handoff
- Align the dashboard data layer (`src/data/api.ts`, `src/data/updateConfigsWS.ts`, `src/data/positionsCache.ts`, `src/tabs/overview.ts`) with the normalized payload contract so Zustand helpers no longer treat websocket payloads as ad-hoc structures.
- Emit the normalization metadata (coverage/provenance, `metric_run_uuid`) through the frontend stores and document the adapter flow in `pp_reader_dom_reference.md`.
- Update the dashboard tests (`tests/dashboard`, `tests/frontend`) to assert the normalized payload mirrors `tests/integration/test_normalization_smoketest.py` fixtures.

#### Entry point & rollout guardrails
1. Enable the `normalized_dashboard_adapter` feature flag per config entry via **Settings → Devices & Services → Portfolio Performance Reader → Configure** (Options flow stores the override in `config_entry.options["feature_flags"]`). Keep the flag off in stable deployments until all tabs consume the normalized stores.
2. Backend gate: wire adapter code paths through `feature_flags.is_enabled("normalized_dashboard_adapter", hass, entry_id=...)` so the new selectors activate only when the flag is on. Avoid changing coordinator payload keys—frontend logic must branch locally.
3. Frontend gate: derive store observers from the same `featureFlags` snapshot exposed by `src/data/api.ts` so tabs can toggle between legacy adapters and normalized selectors without reloading.

#### Validation checklist
- ☑ Feature flag flips without requiring a Home Assistant restart (options update + reload entry).  
- ☑ Initial dashboard load pulls normalized payloads when the flag is on (verify via browser devtools: `pp_reader/get_dashboard_data` response includes `metric_run_uuid`, `provenance`, `coverage_ratio`).  
- ☑ Live websocket pushes (`accounts`, `portfolio_values`, `portfolio_positions`, `security_snapshot`, `security_history`) continue to render both when the flag is on and off.  
- ☑ Overview, Accounts, and Security Detail tabs show identical EUR totals and coverage/provenance badges to `tests/integration/test_normalization_smoketest.py` fixtures.  
- ☑ Diagnostics download (`Settings → Devices & Services → … → Download diagnostics`) includes the `normalized_payload` bundle and matches the dashboard view under the same flag state.  
- ☑ `npm run lint:ts`, `npm run typecheck`, `npm test`, and `pytest --maxfail=1 -q` stay green with the flag toggled on to catch wiring gaps before rollout.

### 2. Sensor and diagnostics alignment
- Retire `_normalize_portfolio_row` and related helpers in `custom_components/pp_reader/data/db_access.py` once sensors (`custom_components/pp_reader/sensors/*.py`) and diagnostics (`custom_components/pp_reader/util/diagnostics.py`) hydrate directly from serialized `PortfolioSnapshot` / `AccountSnapshot` rows.
- Expand the cleanup tracker entry in `.docs/legacy_cleanup_strategy.md` once the sensor adapter lands, and extend `tests/test_db_access.py` plus sensor regression suites to cover the new source of truth.

### 3. Performance & positions fetch parity
- Introduce a normalized positions helper (successor to the optional `fetch_portfolio_positions_live` placeholder) in `custom_components/pp_reader/data/normalization_pipeline.py` or a sibling module so websocket `pp_reader/get_portfolio_positions` can reuse the same serialization hooks.
- Evaluate micro-caching or batching hooks for heavy dashboards and capture findings in `scripts/enrichment_smoketest.py` / `tests/perf` fixtures before widening scope.

These follow-ups keep normalization as the single source of truth across backend and frontend consumers while documenting the pending work for the frontend adapter handoff milestone.

## Components eligible for removal post-release

| Component | Owner | Blocking tests / validation | Notes |
| --- | --- | --- | --- |
| `_normalize_portfolio_row` / `_build_portfolio_data` shims (`custom_components/pp_reader/data/db_access.py`) | Backend (DB + sensors) | `pytest tests/test_db_access.py tests/sensors/test_*`, normalization regression matrix (`tests/integration/test_normalization_smoketest.py`) | LC-201 tracks the removal; sensors/diagnostics must read serialized `PortfolioSnapshot` / `AccountSnapshot` rows once adapter wiring lands.【F:.docs/legacy_cleanup_strategy.md†L36-L39】 |
| Coordinator `portfolio_cache` / `account_cache` dicts and `fetch_live_portfolios` consumers | Backend (coordinator) | Websocket suite (`tests/test_event_push.py`, `tests/test_ws_portfolios_live.py`, `tests/test_ws_portfolio_positions.py`) plus enrichment smoke (`tests/prices/test_history_queue.py`) | LC-202 covers deletion once telemetry parity is documented in `pp_reader_dom_reference.md`; live payloads already stream normalized snapshots post-GA.【F:.docs/legacy_cleanup_strategy.md†L38-L39】 |
| Frontend TS overrides (`window.__ppReader*`, legacy adapter bundles) | Frontend | `npm run lint:ts`, `npm run typecheck`, `npm test`, `tests/frontend/test_dashboard_smoke.py`, `tests/dashboard/*` | LC-203 removes overrides after Zustand selectors ship; regenerate DOM reference + dashboard bundles when dropping adapters.【F:.docs/legacy_cleanup_strategy.md†L40-L40】 |
