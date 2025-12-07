# TODO – Backdating API

Derived from `.docs/wealth-backdating-plan.md` (API requirements and wiring).

## Checklist
- [ ] Define request/response schema for `pp_reader/get_daily_wealth`
  - [ ] Request fields: `date` (single) or `range` (`start`, `end`), optional `include_slices` flag, optional `scopes` filter (accounts/portfolios).
  - [ ] Response fields per day: `date`, `total_wealth_eur`, `portfolio_wealth_eur`, `account_wealth_eur`, `dividends_eur`, `interest_eur`, `inbound_transfers_eur`, `outbound_transfers_eur`, `fees_eur`, `taxes_eur`, `fx_coverage_ratio`, `price_coverage_ratio`, `stale_price`.
  - [ ] Optional slices: `{ accounts: [...], portfolios: [...] }` with the same per-day fields plus `scope_type`, `scope_id`, `scope_name`.
- [ ] Input validation
  - [ ] Enforce valid ISO dates and range ordering.
  - [ ] Limit range length or support pagination to prevent oversized payloads.
  - [ ] Validate scope filters against known types (account|portfolio).
- [ ] Data retrieval
  - [ ] Query `daily_wealth` for single date and ranges.
  - [ ] Query per-scope slices when `include_slices` is true and filter by requested scopes if provided.
- [ ] Serialization
  - [ ] Ensure numeric fields remain numbers, dates remain ISO strings, booleans for `stale_price`.
  - [ ] Include coverage flags; avoid silent nulls—emit missing/partial coverage indicators.
- [ ] Error handling
  - [ ] Return descriptive errors for invalid inputs or unavailable data; keep German UI copy at the frontend layer.
- [ ] Wiring
  - [ ] Register websocket command in `data/websocket.py`.
  - [ ] Hook into coordinator to expose data after metrics/backdating run completes.
- [ ] Tests
  - [ ] Unit/integration tests for handler: single date, range, with slices, invalid inputs, large ranges (pagination).
  - [ ] Snapshot/contract tests for response shape (including coverage flags and slices).
