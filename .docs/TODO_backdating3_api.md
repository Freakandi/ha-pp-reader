# TODO – Backdating API

Derived from `.docs/wealth-backdating-plan.md` (API requirements and wiring).

## Checklist
- [ ] Define request/response schema for `pp_reader/get_daily_wealth`
  - [ ] Request fields: `date` (single) or `range` (`start`, `end`), optional `include_slices` flag, optional `scopes` filter (accounts/portfolios).
  - [ ] Response fields per day: `date`, `total_wealth_eur`, `portfolio_wealth_eur`, `account_wealth_eur`, `dividends_eur`, `interest_eur`, `inbound_transfers_eur`, `outbound_transfers_eur`, `fees_eur`, `taxes_eur`, `fx_coverage_ratio`, `price_coverage_ratio`, `stale_price`.
  - [ ] Optional slices: `{ accounts: [...], portfolios: [...] }` with the same per-day fields plus `scope_type`, `scope_id`, `scope_name`.
  - [ ] Modules: `custom_components/pp_reader/data/websocket.py` (schema definitions for voluptuous), `src/data/api.ts` (frontend deserializer later).
  - [ ] Pitfalls: keep payload shape stable; avoid over-fetch—consider `include_slices` default false; include coverage flags always.
- [ ] Input validation
  - [ ] Enforce valid ISO dates and range ordering.
  - [ ] Limit range length or support pagination to prevent oversized payloads.
  - [ ] Validate scope filters against known types (account|portfolio).
  - [ ] Modules: `data/websocket.py` handler validation; align with frontend expectations in `src/data/api.ts` types.
  - [ ] Pitfalls: reject empty ranges; cap max days; guard against mixed single+range inputs.
- [ ] Data retrieval
  - [ ] Query `daily_wealth` for single date and ranges.
  - [ ] Query per-scope slices when `include_slices` is true and filter by requested scopes if provided.
  - [ ] Modules: `data/db_access.py` helper to fetch global/slice rows; consider reusing patterns from `normalized_store.py`.
  - [ ] Performance: add LIMIT/OFFSET for pagination; index usage `(date)` and `(scope_type, scope_id, date)`.
- [ ] Serialization
  - [ ] Ensure numeric fields remain numbers, dates remain ISO strings, booleans for `stale_price`.
  - [ ] Include coverage flags; avoid silent nulls—emit missing/partial coverage indicators.
  - [ ] Pitfalls: don’t coerce numbers to strings; preserve null vs missing semantics for optional fields; return slices only when requested.
- [ ] Error handling
  - [ ] Return descriptive errors for invalid inputs or unavailable data; keep German UI copy at the frontend layer.
  - [ ] Modules: `data/websocket.py` error responses; ensure Home Assistant websocket expectations are met.
- [ ] Wiring
  - [ ] Register websocket command in `data/websocket.py`.
  - [ ] Hook into coordinator to expose data after metrics/backdating run completes.
  - [ ] Dependencies: rely on populated `daily_wealth` tables; ensure coordinator triggers backdating before API is queried.
- [ ] Tests
  - [ ] Unit/integration tests for handler: single date, range, with slices, invalid inputs, large ranges (pagination).
  - [ ] Snapshot/contract tests for response shape (including coverage flags and slices).
  - [ ] Strategy: use in-repo HA websocket test harness (if available) or direct handler invocation with stubbed connection; fixture DB seeded with `daily_wealth`/slices; test pagination/limits.
