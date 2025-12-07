# TODO – Backdating frontend

Derived from `.docs/wealth-backdating-plan.md` (Frontend design & data requirements).

## Checklist
- [ ] Tab scaffolding
  - [ ] Create `src/tabs/analyse.ts` renderer; register the tab in `dashboard.ts`.
  - [ ] Ensure tab wiring supports swipe/navigation parity with existing tabs.
  - [ ] Pattern: mirror `src/tabs/overview.ts` structure for registration; hook into `dashboard.ts` tab registry; ensure cleanup if needed.
- [ ] Data fetch & state
  - [ ] Add API client for `pp_reader/get_daily_wealth` supporting single date and range, plus optional slices.
  - [ ] Define state shape for daily totals, per-scope slices, coverage flags, and selected range/scopes.
  - [ ] Handle loading/error/empty states; cache last response for quick re-render.
  - [ ] Modules: `src/data/api.ts` for fetcher; consider a small store/helper (like `positionsCache` pattern) for caching.
  - [ ] Pitfalls: match backend payload types; keep numbers as numbers; handle large ranges with paging if introduced.
- [ ] Card 1 – Date/range selector + headline
  - [ ] Implement date/range picker below the card header (single-day and range modes).
  - [ ] Display total wealth for selection with coverage/stale warnings.
  - [ ] Show cashflow breakdown (dividends, interest, inbound/outbound transfers, fees, taxes) for the window.
  - [ ] Patterns: reuse date control styling from security detail range selectors if possible; coverage badge styles from overview header meta.
- [ ] Card 2 – Performance-style numeric overview
  - [ ] Render starting value (range start) and ending value (range end).
  - [ ] Show components: unrealized gains, realized gains, Erträge (dividends + interest), fees, taxes, FX gains on cash, net transfers/performance-neutral moves.
  - [ ] Align numbers right; German labels; surface coverage badges when partial data.
  - [ ] Pitfalls: ensure component sums reconcile with start/end; guard when fields are missing; follow number formatting used in overview (currency.ts helpers).
- [ ] Chart
  - [ ] Implement line chart (reuse security detail charting where possible).
  - [ ] Filter selector (accounts or portfolios) to pick scopes; always include total wealth series.
  - [ ] Plot daily totals plus per-scope series for selected range; indicate stale/coverage in tooltips/legend.
  - [ ] Handle no-data/partial-data placeholders.
  - [ ] Modules: `src/content/charting.ts` for rendering; `src/tabs/security_detail.ts` as reference for series handling and legends.
  - [ ] Pitfalls: avoid over-plotting large ranges without thinning; ensure color palette distinct for multiple scopes; handle sparse data gracefully.
- [ ] Filters & interactions
  - [ ] Add scope filter control for chart; ensure deselect/select updates series.
  - [ ] Sync date/range selector with cards and chart.
  - [ ] Pitfalls: keep filter state in sync with fetched slices; disable unavailable scopes when slices omitted; debounce updates to avoid excessive renders.
- [ ] UX/accessibility/i18n
  - [ ] German copy consistent with existing UI; aria labels for inputs and warnings.
  - [ ] Keyboard/focus handling for selectors; responsive layout for mobile/desktop.
  - [ ] Pitfalls: ensure tabbing order sensible; use existing CSS utility classes; verify mobile layout with stacked cards/chart.
- [ ] Tests (frontend)
  - [ ] Render test for Analyse tab with mocked API payload (cards + chart).
  - [ ] Interaction tests: date/range change, scope filter change updates displays.
  - [ ] Coverage/stale badge display under partial data.
  - [ ] Strategy: use existing Jest/Vitest patterns in `tests/frontend`; mock API module; snapshot chart container structure if feasible.
- [ ] Lint/typecheck wiring
  - [ ] Ensure new files pass `npm run lint:ts` and `npm run typecheck`; update configs if necessary.
  - [ ] Pitfalls: update imports/paths in lint config if new files added; keep types aligned with API client typings.
