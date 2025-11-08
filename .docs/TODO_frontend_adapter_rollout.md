1. [ ] Phase 0 – Payload Contract & Feature Flag
   a) [ ] Document the canonical dashboard payload contract (accounts, portfolios, positions, diagnostics) under `pp_reader_dom_reference.md` and ensure it mirrors `datamodel/backend-datamodel-final.md`.
      - Ziel: Frontend contributors have a single source of truth for field names, types, and provenance metadata.
   b) [ ] Introduce a `normalized_dashboard_adapter` feature flag (if needed) in `custom_components/pp_reader/feature_flags.py` tied to config-entry options so UI work can ship incrementally.
      - Ziel: Allow developers to flip between legacy adapters and the normalized pipeline during rollout without reintroducing compatibility logic.
   c) [ ] Extend `.docs/cleanup/normalization_followups.md` with the entry point and validation checklist for the frontend adapter handoff.

2. [ ] Phase 1 – API Client & Store Foundations
   a) [ ] Refactor `src/data/api.ts` (and the derived helpers in `src/lib/api/portfolio/`) to deserialize the canonical normalization payloads, including `metric_run_uuid`, `coverage_ratio`, `provenance`, and `normalized_payload` metadata.
      - Ziel: API helpers expose typed records that match backend dataclasses so stores don’t rely on legacy field shapes.
   b) [ ] Update the Zustand/utility stores (`src/lib/store/portfolioStore.ts`, `src/data/positionsCache.ts`, `src/data/updateConfigsWS.ts`) to track normalized `PortfolioSnapshot` / `AccountSnapshot` records instead of bespoke dictionaries.
      - Ziel: Ensure websocket updates and initial fetches go through a single normalized store path.
   c) [ ] Remove any remaining global overrides (e.g., `window.__ppReaderPortfolioValueOverrides`) and replace them with store-driven computed selectors.
      - Ziel: Eliminate legacy client-side caches now that backend snapshots are authoritative.

3. [ ] Phase 2 – View Integration
   a) [ ] Overview tab (`src/tabs/overview.ts` / `custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/overview.js`): migrate table renderers to consume the normalized store selectors, including coverage and provenance badges.
      - Ziel: Overview reflects canonical payloads without per-column adapters.
   b) [ ] Accounts tab / header cards: ensure normalized account snapshots drive balances, FX provenance, and warning banners (files under `custom_components/pp_reader/www/pp_reader_dashboard/js/content/` and `src/views/portfolio/`).
      - Ziel: Accounts view shows the same converted/original balances as backend diagnostics.
   c) [ ] Security detail + positions expansion (`src/tabs/security_detail.ts`, `src/data/positionsCache.ts`): reuse normalization helpers for positions (average_cost, aggregation, performance) and drop bespoke parsing logic.
      - Ziel: Drilldowns stay in sync with backend positions while keeping lazy-load semantics.

4. [ ] Phase 3 – WebSocket & Event Adapter Cleanup
   a) [ ] Align websocket handlers in `src/data/api.ts` / `src/data/updateConfigsWS.ts` with the backend `data_type` discriminators (`accounts`, `portfolio_values`, `portfolio_positions`, `security_snapshot`, `security_history`) and ensure payload typing matches the new stores.
      - Ziel: Guarantee that push updates patch the same normalized records used during initial fetch.
   b) [ ] Update the dashboard event bridge (`custom_components/pp_reader/www/pp_reader_dashboard/js/data/updateConfigsWS.js` or TS equivalent) to emit structured diagnostics (e.g., log coverage/provenance deltas) for developer tooling.
      - Ziel: Simplify debugging when backend snapshots change without requiring browser overrides.
   c) [ ] Remove legacy retry/patch helpers that assumed coordinator-derived payloads (e.g., `_normalizePortfolioValueEntry` equivalents) and reference the normalization serializer helpers instead.
      - Ziel: Frontend no longer reimplements backend math.

5. [ ] Phase 4 – Tests & QA Automation
   a) [ ] Update TypeScript unit/integration tests (`tests/dashboard`, `tests/frontend`, `src/tabs/__tests__`) to assert the normalized payload contract, including edge cases for missing metrics, FX unavailability, and partial coverage.
      - Ziel: Prevent regressions when backend payloads evolve.
   b) [ ] Add fixtures mirroring `tests/integration/test_normalization_smoketest.py` outputs for dashboard tests; wire them through `scripts/run_ts_tests.mjs`.
      - Ziel: Keep backend and frontend fixtures aligned without manual JSON edits.
   c) [ ] Extend QA docs (`.docs/qa_docs_comms.md`) with a frontend adapter checklist (manual steps + automated verification) and note cross-team owners.
      - Ziel: Provide traceability for frontend parity sign-off.

6. [ ] Phase 5 – Documentation, Release Notes & Cleanup
   a) [ ] Update user and developer docs (`README.md`, `README-dev.md`, `ARCHITECTURE.md`) to describe the normalized frontend adapter, including how websocket pushes map to UI stores.
      - Ziel: Contributors understand the new flow without reading historical TODOs.
   b) [ ] Amend `.docs/legacy_cleanup_strategy.md` with the acceptance criteria for deleting `_normalize_portfolio_row`, coordinator portfolio caches, and any TypeScript overrides after the adapter ships.
      - Ziel: Track downstream cleanup unlocked by this milestone.
   c) [ ] Add release notes to `CHANGELOG.md` summarizing the frontend adapter rollout (no fallback path, normalized payload contract) and flag any operator actions (e.g., rebuild dashboard assets).
      - Ziel: Prepare for M6 QA/release enablement without surprise regressions.
