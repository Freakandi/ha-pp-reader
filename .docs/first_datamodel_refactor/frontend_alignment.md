# Frontend Alignment Plan for the Datamodel Refactor

This concept document outlines the frontend adjustments required to consume the canonical datasets described in [`datamodel/backend-datamodel-visualizations.md`](../datamodel/backend-datamodel-visualizations.md) and the flows in [`datamodel/dataflow_frontend.md`](../datamodel/dataflow_frontend.md). The goal is to migrate the dashboard to normalized payloads produced by the new ingestion → normalization → delivery pipeline while preserving usability during the transition.

## Contract Updates & API Surface
- **Normalized payload adoption.** Update the Portfolio Performance API layer under `src/lib/api/portfolio` so REST and websocket helpers deserialize the canonical envelopes (`accounts`, `portfolio_positions`, `portfolio_values`, `history`). Mirror backend fields (cent-based amounts, `synced_at`, `coverage_ratio`, `data_source`) in the TypeScript contracts and eliminate ad-hoc transforms currently implemented in `src/lib/api/legacy_portfolio.ts`.
- **Selector compatibility.** Revise selectors in `src/lib/store/selectors/portfolio.ts` and `src/lib/store/selectors/accounts.ts` to ingest normalized structures. Introduce transition shims only when required for staged rollout, marked with TODOs tied to roadmap milestones.
- **Diagnostics exposure.** Extend Home Assistant-bound bindings in `custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.module.js` to surface new metadata (normalization telemetry, enrichment provenance) for frontend debugging panels.

## State Management & View Model Migration
- **Store restructuring.** Align Zustand stores under `src/lib/store/portfolio` and `src/lib/store/accounts` with normalized schemas. Replace derived state that recalculates totals client-side with selectors reading pre-computed metrics emitted by the backend (`portfolio_metrics`, `account_metrics`).
- **View model normalization.** Refactor adapters in `src/lib/adapters/` and `src/lib/view-models/portfolio.ts` to map normalized payloads into chart/table props without bespoke per-panel mapping. Ensure history views pull from the canonical `historical_prices` slices and remove manual FX conversions.
- **Component updates.** Sequence component rewrites in `src/views/portfolio/`, `src/views/accounts/`, and shared widgets under `src/components/portfolio/` so they rely solely on normalized stores. Document interim compatibility props when backend milestones require dual support.

## Legacy Asset Retirement
- **Deprecation candidates.** Identify modules such as `src/lib/api/legacy_portfolio.ts`, `src/lib/store/legacy_portfolio_store.ts`, and legacy chart helpers in `src/components/legacy/` for removal once normalized flows stabilize.
- **Removal gates.** Require backend parser + normalization milestones (Milestones 1–3 in [`refactor_roadmap.md`](./refactor_roadmap.md)) to complete, with dual-path smoke tests passing, before deleting legacy assets. Capture sign-off in the cleanup tracker to be produced in Task 4.
- **Documentation updates.** Update `README-dev.md` and `.docs/frontend_architecture.md` (to be amended) once legacy components are removed, ensuring developer onboarding references normalized stores only.

## Coordination with Backend Milestones
- **Staged rollouts.** Align frontend contract merges with backend feature flags. During Milestone 2 (enrichment services), gate UI changes behind runtime guards that detect availability of enrichment metadata before exposing new tooltips.
- **Contract freeze windows.** Schedule contract updates ahead of backend releases so Home Assistant dashboards can be smoke-tested with fixture payloads generated via `scripts/sample_payloads.py`.
- **Telemetry validation.** Integrate normalization telemetry surfaced by coordinators into the frontend diagnostic drawer (`src/views/settings/diagnostics/`) to confirm backend pipelines emit expected metrics.

## Testing & Verification
- **Dashboard tests.** Expand dashboard integration tests under `tests/dashboard/portfolio.test.ts` and snapshot suites in `tests/dashboard/__snapshots__/` to reflect normalized payloads. Generate new fixtures via `npm run build:fixtures` (script to be updated alongside backend changes).
- **Contract guards.** Introduce TypeScript contract tests using `npm run test -- src/lib/api/portfolio/*.test.ts` to assert decoded payloads match canonical schemas and to prevent regressions when backend fields change.
- **End-to-end validation.** Collaborate with backend to run Home Assistant end-to-end scenarios (import, enrichment, metrics) and capture evidence in `.docs/live_aggregation/frontend_notes.md` before toggling off legacy code paths.

## Delivery Sequencing
1. **Contract scaffolding (Milestone 1).** Ship updated TypeScript interfaces and optional feature flags so components can opt into normalized data without breaking existing dashboards.
2. **Store & selector migration (Milestone 2).** Transition Zustand stores and selectors to canonical data while maintaining backwards compatibility wrappers.
3. **Component refactors (Milestone 3).** Update portfolio/account views and shared widgets to rely exclusively on normalized view models.
4. **Legacy removal (Post-Milestone 3).** Delete deprecated assets, update documentation, and finalize telemetry dashboards once backend and frontend validation completes.

This plan feeds into the overall roadmap tracked in [`refactor_roadmap.md`](./refactor_roadmap.md) and should be revisited at the completion of each milestone to adjust sequencing and decommissioning checkpoints.
