# TODO – Backdating backend

Derived from `.docs/wealth-backdating-plan.md` (Backend data handling / computation, API).

## Checklist
- [ ] Recompute strategy
  - [ ] Implement trigger on `.portfolio` ingestion to rebuild daily data from earliest transaction date to “today” (past transactions can change).
  - [ ] Preserve incremental update path when past data unchanged between ingestions.
- [ ] Holdings and prices
  - [ ] Roll up transactions to holdings per (portfolio, security) as of each date.
  - [ ] Resolve historical close per day; apply previous-trading-day fallback; flag `stale_price`.
  - [ ] Convert holdings to EUR using same-day FX.
- [ ] FX handling
  - [ ] Fetch missing FX from Frankfurter during rebuild; start each currency series at its first transaction date.
  - [ ] Compute `fx_coverage_ratio` for the day.
- [ ] Account balances
  - [ ] Roll up account transactions to per-day balances; FX-convert non-EUR.
  - [ ] Store `account_wealth_eur` and include in totals.
- [ ] Cashflow buckets
  - [ ] Derive dividends, interest from transaction types/notes.
  - [ ] Derive inbound/outbound transfers; detect internal transfers via “other account” and exclude from global totals, include in per-account slices.
  - [ ] Derive fees and taxes from transaction units/types.
  - [ ] (Optional) Compute performance-neutral movements (net transfers/adjustments) for UI mapping.
- [ ] Coverage/provenance
  - [ ] Compute `price_coverage_ratio`, `stale_price`, set `provenance` per run (e.g., metrics_pipeline vs backfill).
- [ ] Persistence
  - [ ] Write `daily_wealth` rows per date with all metrics and coverage fields.
  - [ ] Write per-scope slices (accounts, portfolios) with the same metrics and scope identifiers.
  - [ ] Ensure idempotent upsert semantics (replace existing date rows on rebuild).
- [ ] API: websocket handler `pp_reader/get_daily_wealth`
  - [ ] Validate inputs (single date or range, optional scope filters, flags for slices).
  - [ ] Fetch daily records (and slices if requested) and serialize numbers/dates/flags.
  - [ ] Support range responses and optional pagination/limits.
  - [ ] Emit coverage warnings in payload (not silent nulls).
- [ ] Wiring
  - [ ] Hook computation into metrics pipeline after existing metrics finish.
  - [ ] Ensure coordinator schedules rebuild on import completion.
- [ ] Tests (backend)
  - [ ] Unit tests for holdings valuation with price fallback and FX coverage.
  - [ ] Unit tests for cashflow buckets and internal transfer exclusion.
  - [ ] Tests for per-scope slice generation.
  - [ ] Tests for websocket handler responses (single date, range, with slices).
