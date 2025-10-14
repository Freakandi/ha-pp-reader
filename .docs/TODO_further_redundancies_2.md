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
