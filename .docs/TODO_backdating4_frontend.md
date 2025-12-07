# TODO – Backdating frontend

Derived from `.docs/wealth-backdating-plan.md` (Frontend design & data requirements).

## Checklist
- [ ] Tab scaffolding
  - [ ] Create `src/tabs/analyse.ts` renderer; register the tab in `dashboard.ts`.
  - [ ] Ensure tab wiring supports swipe/navigation parity with existing tabs.
- [ ] Data fetch & state
  - [ ] Add API client for `pp_reader/get_daily_wealth` supporting single date and range, plus optional slices.
  - [ ] Define state shape for daily totals, per-scope slices, coverage flags, and selected range/scopes.
  - [ ] Handle loading/error/empty states; cache last response for quick re-render.
- [ ] Card 1 – Date/range selector + headline
  - [ ] Implement date/range picker below the card header (single-day and range modes).
  - [ ] Display total wealth for selection with coverage/stale warnings.
  - [ ] Show cashflow breakdown (dividends, interest, inbound/outbound transfers, fees, taxes) for the window.
- [ ] Card 2 – Performance-style numeric overview
  - [ ] Render starting value (range start) and ending value (range end).
  - [ ] Show components: unrealized gains, realized gains, Erträge (dividends + interest), fees, taxes, FX gains on cash, net transfers/performance-neutral moves.
  - [ ] Align numbers right; German labels; surface coverage badges when partial data.
- [ ] Chart
  - [ ] Implement line chart (reuse security detail charting where possible).
  - [ ] Filter selector (accounts or portfolios) to pick scopes; always include total wealth series.
  - [ ] Plot daily totals plus per-scope series for selected range; indicate stale/coverage in tooltips/legend.
  - [ ] Handle no-data/partial-data placeholders.
- [ ] Filters & interactions
  - [ ] Add scope filter control for chart; ensure deselect/select updates series.
  - [ ] Sync date/range selector with cards and chart.
- [ ] UX/accessibility/i18n
  - [ ] German copy consistent with existing UI; aria labels for inputs and warnings.
  - [ ] Keyboard/focus handling for selectors; responsive layout for mobile/desktop.
- [ ] Tests (frontend)
  - [ ] Render test for Analyse tab with mocked API payload (cards + chart).
  - [ ] Interaction tests: date/range change, scope filter change updates displays.
  - [ ] Coverage/stale badge display under partial data.
- [ ] Lint/typecheck wiring
  - [ ] Ensure new files pass `npm run lint:ts` and `npm run typecheck`; update configs if necessary.
