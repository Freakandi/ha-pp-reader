# TODO – Backdating testing (aggregate)

Focus on cross-cutting verification beyond items already listed in datamodel, backend, API, and frontend checklists.

## Checklist
- [x] End-to-end workflow (manual/automated where feasible)
  - [x] Ingestion-triggered rebuild: verify that importing a modified `.portfolio` file recomputes daily data across historical range and surfaces updated values in the Analyse tab (cards + chart).
  - [x] Range selection UX: manual sanity for single-date vs. range with mixed coverage (missing FX/prices) showing correct badges/warnings.
  - [x] Hooks: use HA dev instance with sample DB; simulate import, then load Analyse tab; compare UI values against expected fixtures.
  - [x] Pitfalls: ensure FX fetch is mocked/controlled to avoid network variance; clear caches between runs.
- [x] Integration tests (backend + API)
  - [x] Round-trip: metrics/backdating pipeline populates `daily_wealth` and per-scope slices, and `pp_reader/get_daily_wealth` returns them correctly for single date and range (with slices).
  - [x] Coverage propagation: responses include `fx_coverage_ratio`, `price_coverage_ratio`, `stale_price` and these reflect data gaps injected in fixtures.
  - [x] Modules: invoke pipeline (or a backdating helper) in tests; use seeded SQLite fixtures; call websocket handler or `data/api.ts` fetcher in a test harness.
  - [x] Pitfalls: keep fixtures small to avoid long test times; assert per-scope slices where requested only.
- [x] Contract/regression safeguards
  - [x] Snapshot/contract tests for the API payload shape to guard against breaking changes (including optional slices).
  - [x] Backward compatibility: ensure existing overview/header wealth remains unchanged by new backdating logic (e.g., guard tests for current snapshot handlers).
  - [x] Pattern: reuse frontend snapshot testing or backend response snapshots; add guard tests for `updateTotalWealth` flows.
- [x] Performance sanity
  - [x] Benchmark rebuild time for a representative history window; assert it stays within acceptable bounds or document expected duration.
  - [x] Approach: timed run of backdating pipeline on fixture DB; set threshold or record baseline.
- [x] Documentation validation
  - [x] Confirm README/README-dev and datamodel docs match implemented behaviour (fields, coverage semantics, UI flows).
  - [x] Checklist: verify `daily_wealth` schema/docs, API contract examples, and Analyse tab description align with implemented UI.
