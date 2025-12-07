# TODO – Backdating frontend

Derived from `.docs/wealth-backdating-plan.md` (Frontend design & data requirements).

## Checklist
- [x] Tab scaffolding
  - [x] Create `src/tabs/analyse.ts` renderer; register the tab in `dashboard.ts`.
  - [x] Ensure tab wiring supports swipe/navigation parity with existing tabs.
  - [x] Pattern: mirror `src/tabs/overview.ts` structure for registration; hook into `dashboard.ts` tab registry; ensure cleanup if needed.
- [x] Data fetch & state
  - [x] Add API client for `pp_reader/get_daily_wealth` supporting single date and range, plus optional slices.
  - [x] Define state shape for daily totals, per-scope slices, coverage flags, and selected range/scopes.
  - [x] Handle loading/error/empty states; cache last response for quick re-render.
  - [x] Modules: `src/data/api.ts` for fetcher; consider a small store/helper (like `positionsCache` pattern) for caching.
  - [x] Pitfalls: match backend payload types; keep numbers as numbers; handle large ranges with paging if introduced.
- [x] Card 1 – Date/range selector + headline
  - [x] Implement date/range picker below the card header (single-day and range modes).
  - [x] Display total wealth for selection with coverage/stale warnings.
  - [x] Show cashflow breakdown (dividends, interest, inbound/outbound transfers, fees, taxes) for the window.
  - [x] Patterns: reuse date control styling from security detail range selectors if possible; coverage badge styles from overview header meta.
- [x] Card 2 – Performance-style numeric overview
  - [x] Render starting value (range start) and ending value (range end).
  - [x] Show components: unrealized gains, realized gains, Erträge (dividends + interest), fees, taxes, FX gains on cash, net transfers/performance-neutral moves.
  - [x] Align numbers right; German labels; surface coverage badges when partial data.
  - [x] Pitfalls: ensure component sums reconcile with start/end; guard when fields are missing; follow number formatting used in overview (currency.ts helpers).
- [x] Chart
  - [x] Implement line chart (reuse security detail charting where possible).
  - [x] Filter selector (accounts or portfolios) to pick scopes; always include total wealth series.
  - [x] Plot daily totals plus per-scope series for selected range; indicate stale/coverage in tooltips/legend.
  - [x] Handle no-data/partial-data placeholders.
  - [x] Modules: `src/content/charting.ts` for rendering; `src/tabs/security_detail.ts` as reference for series handling and legends.
  - [x] Pitfalls: avoid over-plotting large ranges without thinning; ensure color palette distinct for multiple scopes; handle sparse data gracefully.
- [x] Filters & interactions
  - [x] Add scope filter control for chart; ensure deselect/select updates series.
  - [x] Sync date/range selector with cards and chart.
  - [x] Pitfalls: keep filter state in sync with fetched slices; disable unavailable scopes when slices omitted; debounce updates to avoid excessive renders.
- [x] UX/accessibility/i18n
  - [x] German copy consistent with existing UI; aria labels for inputs and warnings.
  - [x] Keyboard/focus handling for selectors; responsive layout for mobile/desktop.
  - [x] Pitfalls: ensure tabbing order sensible; use existing CSS utility classes; verify mobile layout with stacked cards/chart.
- [x] Tests (frontend)
  - [x] Render test for Analyse tab with mocked API payload (cards + chart).
  - [x] Interaction tests: date/range change, scope filter change updates displays.
  - [x] Coverage/stale badge display under partial data.
  - [x] Strategy: use existing Jest/Vitest patterns in `tests/frontend`; mock API module; snapshot chart container structure if feasible.
- [x] Lint/typecheck wiring
  - [x] Ensure new files pass `npm run lint:ts` and `npm run typecheck`; update configs if necessary.
  - [x] Pitfalls: update imports/paths in lint config if new files added; keep types aligned with API client typings.
