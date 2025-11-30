## Security history payload and rendering (pp_reader/get_security_history)

- The security detail tab requests historical closes and transaction markers via `fetchSecurityHistoryWS`, caching both series and markers per range to avoid refetches on range switches.
- Payload fields:
  - `security_uuid`: UUID of the requested security.
  - `prices`: array of `{date, close, close_raw?}`; dates are stored as integer day codes in SQLite.
  - `transactions`: array of trades (types 0/2 purchase, 1/3 sale, including deliveries) with `uuid`, `type`, `date`, `shares`, `price` (native gross per-share), optional `net_price_eur` for sells, `currency_code`, `amount`, `fees`, `taxes`, `portfolio`.
  - `start_date` / `end_date`: optional epoch-day bounds echoed from the request.
- Rendering path:
  - `src/tabs/security_detail.ts` normalises transactions into chart markers, formats labels with share counts, native price, and net EUR on sales, and caches markers alongside history per range.
  - `src/content/charting.ts` renders markers as SVG anchors plus speech-bubble overlays, with dedicated marker tooltips; styling lives in `custom_components/pp_reader/www/pp_reader_dashboard/css/cards.css`.
