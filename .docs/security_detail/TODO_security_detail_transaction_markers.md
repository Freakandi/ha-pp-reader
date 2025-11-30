# TODO – Security detail chart transaction markers

Goal: show purchase/sale “speech bubble” markers (including inbound/outbound deliveries treated as buys/sells) on the security detail history chart at the transaction date/price with text like `Purchase 20 @ 120,43 EUR`, only when the selected range includes the transaction date.

1. [x] Backend: extend history payload with transactions
   - Files: `custom_components/pp_reader/data/normalization_pipeline.py::async_fetch_security_history`, `custom_components/pp_reader/data/websocket.py::ws_get_security_history`, `custom_components/pp_reader/data/db_access.py` (transaction retrieval helpers as needed).
   - Add a `transactions` array alongside `prices`, filtered by `security_uuid` and optional `start_date`/`end_date`; include purchases, sales, inbound deliveries, outbound deliveries (types 0/1/2/3 mapped to buy/sell). Each entry should expose `uuid`, `type`, ISO `date`, `shares` (float via `normalize_shares`), `price` (gross per-share in native currency, derived from cents + shares), `currency_code`, `portfolio`, and `amount`/`fees`/`taxes` to allow net EUR-per-share computation for sells. Ensure `iter_security_close_prices`/range validation stays intact.

2. [x] Backend: per-share calculations + test coverage
   - Files: `custom_components/pp_reader/data/normalization_pipeline.py` (per-share derivation), `custom_components/pp_reader/util/currency.py` for `cent_to_eur`, `tests` (new test module for `ws_get_security_history`).
   - Compute marker values using gross per-share (native) and net EUR-per-share for sells (gross minus fees/taxes divided by shares), rounded to 2–4 fraction digits. Add a Python test that seeds transactions and asserts the history response includes correctly filtered transactions, type mapping (incl. deliveries), gross/native price, and net EUR-per-share for sells.

3. [x] Frontend types and API deserialization
   - Files: `src/data/api.ts` (`SecurityHistoryResponse`, `fetchSecurityHistoryWS`), `src/tabs/types.ts` if shared types are needed.
   - Broaden the history response to include the new `transactions` field, typed with gross native price and net EUR-per-share (for sells). Ensure deserialization preserves dates, types, shares, currencies, and per-share prices for downstream rendering.

4. [x] Frontend mapping in security detail tab
   - Files: `src/tabs/security_detail.ts`.
   - Build chart marker data from fetched transactions: filter to the active range, map type IDs (0/2 → purchase, 1/3 → sale), format labels with share count, gross price in native currency, and (for sells) append net EUR-per-share. Keep cache/range-switch logic intact; ensure markers are re-used per range or refetched with prices. Prevent crashes on missing dates.

5. [x] Charting API support for markers
   - Files: `src/content/charting.ts`.
   - Extend line chart options to accept marker/annotation inputs (x timestamp, y gross per-share) and expose hooks for custom tooltip/body content (to carry net EUR info on sells) without breaking existing tooltip/focus behaviour.

6. [x] Charting render pass for markers
   - Files: `src/content/charting.ts`.
   - Render the provided markers as SVG/HTML overlays with hit targets, anchored to x/y positions, ensuring coexistence with existing focus line/circle and tooltip state.

7. [x] Styling for speech bubbles
   - Files: `custom_components/pp_reader/www/pp_reader_dashboard/css/cards.css` (or a new scoped stylesheet loaded by the panel).
   - Add comic-style bubble styling with pointer anchored to the data point, accommodating two-line content (gross native + net EUR on sells). Respect existing color tokens and avoid overlapping the default chart tooltip.

8. [x] Frontend tests
   - Files: `src/tabs/__tests__/security_detail.metrics.test.ts` (or new dedicated test file), plus any charting unit tests if present.
   - Add tests for marker inclusion/exclusion by range, type mapping (including deliveries), label formatting (gross native + net EUR for sells), and safe handling of missing dates.

9. [x] Documentation and QA commands
   - Files: `datamodel/backend-datamodel-final.md` (document new `transactions` field in history response), `pp_reader_dom_reference.md` (security detail behaviour).
   - Run: `./scripts/lint`, targeted `pytest` for the new backend test, `npm run lint:ts`, `npm run test`. Note any runtime verifications if applicable.
