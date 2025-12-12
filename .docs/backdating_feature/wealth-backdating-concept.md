# Analyse tab & wealth backdating – Concept

Purpose: Provide a new “Analyse” tab with an “Entwicklung” card that can show total wealth and cashflow categories (dividends, interest, inbound & outbound transfers, fees, taxes) for arbitrary past dates. This document outlines the data flow, storage approach, API contract, UI expectations, and risks so coding tasks can be derived directly.

## Current state (today)
- UI shows only latest total wealth in the overview header, computed client-side from current accounts + portfolios (`renderDashboard`, `updateTotalWealth`).
- Backend websocket endpoints expose only current snapshots (no per-day series).
- SQLite contents (sample DB):
  - Transactions: 2021-12-31 … 2025-12-03T12:06:00+00:00.
  - Historical prices: epoch day 9435–20428 (broad coverage).
  - FX rates: `fx_rates` dates 2025-09-09 … 2025-12-06 (sparse outside this window).
  - Snapshots/metrics tables hold only the latest normalization run (2025-12-06).

## Target capability (what we want)
- For any selected calendar day:
  - Total wealth in EUR as of end-of-day (portfolio holdings at closing prices + account balances).
  - Cashflow buckets for that day: dividends, interest, inbound transfers (manual additions), fees, taxes.
  - Coverage metadata: FX availability, price freshness (stale previous-close vs. same-day), and any missing-data flags.
- UI surface: new “Analyse” tab with an “Entwicklung” card; later a date picker will drive the selected day.
- Fast responses: avoid recomputing the entire history on each request.

## Approach overview
- Introduce a materialized per-day table to store wealth and cashflow aggregates, computed in the backend metrics pipeline. This provides O(1) fetches for the UI and predictable performance.
- Recompute historical days on each ingestion when the source `.portfolio` file changes (transactions can be added/modified/removed for past dates). At minimum, rebuild from the earliest transaction date up to “today” whenever a new file is ingested or the last file date changes, so daily wealth stays correct for all scopes. Incremental maintenance still applies between ingestions when no past data changed.
- Add a websocket endpoint to fetch a single day or a range slice, returning totals plus coverage info.
- Keep computations in EUR; store raw coverage hints to avoid silent inaccuracies.

## Data model – proposed table
`daily_wealth` (one row per date):
- `date` (TEXT ISO date, PK)
- `total_wealth_eur` (REAL) – aggregated portfolios + accounts in EUR
- `portfolio_wealth_eur` (REAL) – optional slice for holdings only
- `account_wealth_eur` (REAL) – optional slice for cash accounts only
- `dividends_eur` (REAL)
- `interest_eur` (REAL)
- `inbound_transfers_eur` (REAL) – manual additions
- `outbound_transfers_eur` (REAL) – manual withdrawals
- `performance_neutral_movements` (REAL) – net transfers/adjustments treated as performance-neutral
- `fees_eur` (REAL)
- `taxes_eur` (REAL)
- `fx_coverage_ratio` (REAL) – 0..1 coverage across needed FX points
- `price_coverage_ratio` (REAL) – 0..1 coverage across needed closes
- `stale_price` (INTEGER bool) – true if previous trading day close used
- `provenance` (TEXT) – e.g., “metrics_pipeline v1”, “backfill”
- `created_at` / `updated_at` (TEXT)

Indexes: PK on `date`; add per-scope tables or indexes `(scope_type, scope_id, date)` for per-account and per-portfolio slices to enable flexible sorting/filtering in the Analyse tab.

Canonical definitions live in `datamodel/SQLite_data.md` sections `daily_wealth` and `daily_wealth_scopes`, which include coverage semantics and example values.

## Computation plan
1) Inputs per date:
   - Transactions up to and including the date for holdings and cash movements.
   - Historical prices for each security; if no close on the date, use the latest prior trading day and mark `stale_price=true` (previous-trading-day fallback is the rule).
   - FX rate for the date per currency; fetch missing rates from Frankfurter during backfill/refresh. For each currency, the time series starts on the date of the first transaction in that currency.
2) Holdings valuation:
   - Derive holdings per (portfolio, security) as of the date (transaction rollup filtered to date).
   - Apply close price (native); convert to EUR using same-day FX (or prior-day rate if policy allows).
3) Account balances:
   - Sum account transactions to date; convert non-EUR via FX for the date; store as `account_wealth_eur`.
4) Cashflow buckets (per day):
   - Dividends: transaction types for dividends; sum EUR value.
   - Interest: transaction types/notes for interest; sum EUR value.
   - Inbound transfers: manual additions/inbound money transfers. Internal transfers are detected by a populated “other account” field; exclude them from global totals, but keep them in the relevant per-account slices.
   - Outbound transfers: manual withdrawals/outbound money transfers. Internal transfers (other account populated) stay excluded from global totals, included only in per-account slices.
   - Fees: fee transaction units.
   - Taxes: tax transaction units.
   - Performance-neutral movements: derived as net transfers (inbound − outbound) if we need a display bucket mirroring the screenshot; store explicitly if used in the UI aggregate.
5) Coverage:
   - `fx_coverage_ratio` = available FX datapoints / required FX datapoints for that day.
   - `price_coverage_ratio` = available closes / required closes for that day.
   - `stale_price` = true if any security used a prior-day close.
6) Persistence:
   - Run inside the metrics pipeline after portfolio/account/security metrics.
   - Upsert one row per date; incremental update only for dates from last run to latest transaction date.
7) Scope granularity:
   - Persist per-account and per-portfolio slices (companion tables or extended schema) mirroring the daily aggregates to enable sorting/filtering in the UI and to surface internal transfers correctly at the account level.
   - Per-scope rows should include the same fields as `daily_wealth` plus scope identifiers (`scope_type`, `scope_id`, `scope_name`).

## API contract (frontend-facing)
- New websocket command: `pp_reader/get_daily_wealth`.
- Request: `{ date: "YYYY-MM-DD", range?: { start: "...", end: "..." } }`
- Response:
  - For single date: `{ date, total_wealth_eur, portfolio_wealth_eur, account_wealth_eur, dividends_eur, interest_eur, inbound_transfers_eur, outbound_transfers_eur, fees_eur, taxes_eur, fx_coverage_ratio, price_coverage_ratio, stale_price }`
  - For range: `{ start, end, days: [<same shape as single>] }`
  - Optional per-scope slices (if requested): `{ accounts: [...], portfolios: [...] }` with the same per-day fields, enabling sorting/filtering by scope.
- Errors: emit coverage/availability warnings rather than silent nulls; preserve German UI copy at rendering layer.

## Frontend expectations
- New “Vermögensentwicklung” tab renderer (e.g., `src/tabs/analyse.ts`) registered in `dashboard.ts`.
- Card 1 (“Zeitraum” header card):
  - Date picker / range selector placed directly below the header. Supports single-day and range queries. Defaults to the most recent available date/range.
  - Shows total wealth for the selected date/range with coverage badge/warning and missing-FX/stale-price hints.
  - Breakdown rows for dividends, interest, inbound transfers, fees, taxes in the selected window.
- Card 2 (“Performance-Berechnung” style numeric overview):
  - Numeric summary mirroring the attached screenshot: starting value at range start, plus/minus components (unrealized gains, realized gains, dividends/interest as Erträge, fees, taxes, FX gains/losses, cash-neutral moves), ending value at range end.
  - Totals aligned right; labels in German; includes coverage badges if any component is partial.
  - Use backend-provided components: start value = total wealth on first day of range; end value = total wealth on last day; component mapping:
    - Kursfolge (unrealized): change in portfolio valuation excluding realized trades.
    - Realisierte Kursfolge: realized P&L from transactions in range.
    - Erträge: dividends + interest.
    - Gebühren: fees.
    - Steuern: taxes.
    - Cash Fremdwährungsgewinne: FX gains/losses on cash (can be inferred from FX-adjusted account balances delta minus net transfers).
    - Performanceneutrale Bewegungen: net transfers (inbound − outbound) and other cash-neutral adjustments.
- Chart below card 2:
  - Line chart similar to security detail history charts.
  - Filter selector (scoped to accounts or portfolios) to choose which scopes to display; always includes the total wealth series plus one line per selected account/portfolio.
  - Uses daily `daily_wealth` (and per-scope slices) for the chosen range; applies the same coverage/stale markers to tooltips/legends.

## Performance considerations
- Precomputing per-day rows keeps UI fetches cheap and avoids repeated historical rollups.
- Storage footprint is small (~N days). Even 10 years ~3.6k rows is negligible vs. price history size.
- Incremental update strategy prevents full recompute on every import.

## Testing & validation (future tasks)
- Backend unit tests for:
  - Holdings-at-date valuation with price fallback and FX coverage flags.
  - Cashflow bucketing per day (dividends/interest/inbound/fees/taxes) with transaction fixtures.
  - Upsert logic for `daily_wealth` and incremental refresh.
  - Websocket handler response shape and error paths.
- Frontend tests:
  - Render test for Analyse tab/card with mocked API payload (coverage badges, stale warning).
  - Type checks (`npm run typecheck`) and lint (`npm run lint:ts`).

## Migration/backfill plan
- Backfill `daily_wealth` from earliest transaction date to latest transaction date (or today).
- FX handling during backfill: fetch missing FX from Frankfurter; the first transaction per currency defines the start date for that currency’s time series.
- Mark provenance = “backfill” for the initial run; subsequent runs provenance = “metrics_pipeline”.
- Retention: keep full history (no pruning planned).
