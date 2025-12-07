# Wealth backdating – Implementation Plan (draft)

## Datamodel design (detailed)
- Implement `daily_wealth` table (and per-scope companion tables) capturing: `date`, `total_wealth_eur`, `portfolio_wealth_eur`, `account_wealth_eur`, `dividends_eur`, `interest_eur`, `inbound_transfers_eur`, `outbound_transfers_eur`, `fees_eur`, `taxes_eur`, `fx_coverage_ratio`, `price_coverage_ratio`, `stale_price`, `provenance`, timestamps.
- Per-scope slices: include `scope_type`, `scope_id`, `scope_name` plus the same metrics as `daily_wealth` to support account/portfolio filtering and charting.
- Optional: persist performance-neutral bucket if needed for UI mapping (net transfers, cash-neutral adjustments).
- Indexes: PK on `date` for global; PK on `(scope_type, scope_id, date)` for slices; supporting indexes on `date` for range queries.

## Backend data handling / computation
- Recompute historical days on every `.portfolio` ingestion (transactions can change retroactively): rebuild from earliest transaction date to “today” after each import.
- Holdings valuation: roll up transactions to per-(portfolio, security) holdings as of each date; price via historical close with previous-trading-day fallback; convert via same-day FX (fetch missing FX from Frankfurter starting at first transaction per currency).
- Account balances: roll up transactions per account to date; FX convert to EUR.
- Cashflow buckets per day: dividends, interest, inbound/outbound transfers (exclude internal transfers from global totals using “other account” flag; keep in per-account slices), fees, taxes; derive performance-neutral movements if required.
- Coverage flags: compute `fx_coverage_ratio`, `price_coverage_ratio`, `stale_price`; store provenance.
- Persistence: write `daily_wealth` and per-scope slices after metrics pipeline; support incremental update when past data unchanged.

## API requirements
- New websocket command `pp_reader/get_daily_wealth`:
  - Request: single date or range; optional scopes filter; flags to include per-scope slices.
  - Response: daily records with all metrics, coverage flags, and optional slices `{ accounts: [...], portfolios: [...] }`.
- Ensure serialization aligns with frontend needs (numbers, ISO dates, coverage booleans).
- Consider pagination/limit for long ranges; enforce validation on date inputs.

## Frontend design & data requirements
- New Analyse tab renderer (`src/tabs/analyse.ts`) registered in `dashboard.ts`.
- Card 1: date/range selector beneath header; displays total wealth + coverage/warnings; shows cashflow breakdown for selected window.
- Card 2: performance-style numeric overview (start value, unrealized/realized gains, Erträge, fees, taxes, FX gains on cash, net transfers/performance-neutral) with German labels and coverage badges.
- Chart: line chart using daily totals and per-scope series; filter selector for accounts/portfolios; shows total wealth plus selected scopes; tooltips indicate stale/coverage as needed.
- Data needs: daily totals, per-scope slices, component breakdown for card 2, coverage flags for UI hints.

## Testing
- Backend: unit tests for daily computation (prices/FX fallback, coverage), cashflow bucketing, per-scope slices, websocket handler responses; regression tests for ingestion rebuild.
- Frontend: render tests for new tab/cards, chart with mocked API data, date/range selector interactions; update type/lint expectations.
- Update/remove existing tests if they assume only current-day wealth.

## Documentation updates
- Update README/README-dev to describe the new Analyse tab, date/range selector, and data sources.
- Add datamodel docs for `daily_wealth` and per-scope slices; document API contract and coverage semantics.
- Note runtime expectations (recompute on each import) and any FX prerequisites.
