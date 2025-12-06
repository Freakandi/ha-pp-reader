# Day-Change Weekend Handling – ToDo

Goal: ensure day-change metrics compare the last market price against the close from the prior trading day (not today), so weekend/holiday fetches still show the last trading day’s move.

Findings so far
- Metrics currently call `fetch_previous_close` with `reference_date = now`, so on non-trading days the previous close is the same as the stale last price → day_change = 0.
- Live price persistence writes `last_price` + `last_price_fetched_at` only; the `last_price_date` column from ingestion is not refreshed by yahooquery quotes.
- yahooquery delivers `regularMarketTime` timestamps even on Saturday; today’s fetch (2025-12-06) returned 2025-12-05T21:00:01Z for AAPL/MSFT (timestamp = Friday market close), which we can reuse as the price date.

Tasks
- [ ] Capture and persist the quote timestamp
  - [x] Extend the yahooquery provider to forward `regularMarketTime` (or fallback) in the Quote.
  - [x] Thread that timestamp through the price service and persist it into `securities.last_price_date` (UTC seconds) alongside `last_price`; keep `last_price_fetched_at` untouched.
  - [x] Guard against missing/zero timestamps by falling back to the previous behaviour without breaking existing schema constraints.

- [ ] Use the price date to select the comparison close
  - [x] Derive a reference epoch-day from the stored price timestamp (or fallback) and pass it to `fetch_previous_close` in `metrics/securities.py` so the previous close resolves to the day before the price date.
  - [x] Mirror the same logic in normalization pipeline day-change recomputation and any snapshot fallbacks that still call `fetch_previous_close`, preserving the existing “no data” handling.

- [ ] Surface the timestamp in price state where needed
  - [x] Extend `_PriceState`/related payloads so downstream consumers can compute coverage/percentage using the correct reference date without re-querying now().
  - [x] Keep backwards compatibility for callers that don’t need the timestamp.

- [ ] Tests
  - [x] Add unit coverage for the weekend scenario (price date Friday, latest close Thursday) in metrics and normalization layers.
  - [x] Add a small provider test asserting that `regularMarketTime` is mapped into the Quote/DB write path.

- [ ] Docs/validation
  - [x] Update backend datamodel notes to clarify `last_price_date` semantics (market timestamp vs. fetch time).
  - [x] Run lint + targeted pytest once wiring is done; note any new fixtures needed for timestamp-aware paths.
  - [x] Add a changelog entry in the "unreleased" section explaning the change done in this todo-list (1 item only)
