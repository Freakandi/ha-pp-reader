# Concept: Security Detail Drilldown Tab

Goal: Introduce an interactive security detail tab that opens from the portfolio positions table, providing per-security fundamentals and historical price visualization based on the persisted history dataset while superseding the placeholder test tab.

---

## 1. Current State
- The overview tab renders an expandable portfolio table and lazy-loads position rows via `fetchPortfolioPositionsWS`, but position cells do not expose interactions beyond expand/collapse toggles. (custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/overview.js)
- WebSocket support already delivers full position payloads per portfolio, including `security_uuid`, `current_holdings`, `current_value`, and gains, which are cached client-side in `portfolioPositionsCache`. (custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/overview.js)
- Historical daily close prices are persisted in SQLite (`historical_prices` table) and retrievable through `iter_security_close_prices`, but the dashboard does not yet consume these values. (custom_components/pp_reader/data/db_schema.py, custom_components/pp_reader/data/db_access.py)
- A guarded WebSocket command (`pp_reader/get_security_history`) can stream close-price series to the frontend when feature flag `pp_reader_history` is enabled, although no UI currently invokes it. (custom_components/pp_reader/data/websocket.py)
- Tab infrastructure in `dashboard.js` assumes a static `tabs` array (`Dashboard`, `Test Tab`) and lacks navigation affordances for on-demand drilldown pages. The placeholder test tab currently serves as a development stub. (custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.js)

## 2. Target State
- Clicking any security row inside an expanded portfolio opens a new dashboard tab labeled with the security name and shows a detail layout aligned with the overview card styling. (custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/overview.js)
- The detail tab header displays: security name, the security's trading currency, aggregated holdings across all portfolios, last known price per share shown in that original currency, and the EUR market value derived from holdings × last price; values refresh alongside existing WebSocket updates.
- A price history chart renders below the header, defaulting to the trailing 1-year window with toggle buttons (1M, 6M, 1Y active by default, 5Y) to refetch and redraw the dataset via the existing history WebSocket command on demand, plotting share prices in the security's original currency.
- An informational gain/loss strip sits between the header and chart, summarizing the total EUR gain or loss for the selected period and for the trailing day so users can relate currency movements to overall portfolio impact.
- Navigating back to the overview keeps expanded state and cached positions untouched; multiple security tabs can be reopened without reloading the base dashboard.
- The detail tab inherits the same navigation affordances as the overview (tab strip arrows, swipe gestures), ensuring consistent UX across dashboard sections.
- The feature flag `pp_reader_history` transitions to an always-on embedded capability; the detail tab assumes history support is available and surfaces a dedicated message only when no data exists for the selected security.

## 3. Proposed Data Flow / Architecture
1. User expands a portfolio; `portfolioPositionsCache` stores fetched position rows keyed by security UUID. (custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/overview.js)
2. On row click, a delegated handler extracts `security_uuid` and forwards it to a new dashboard controller `openSecurityDetail(securityUuid)`. (custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/overview.js)
3. `openSecurityDetail` resolves cumulative holdings and EUR value either from cached rows or via a lightweight backend summary call (`pp_reader/get_security_snapshot`) that joins `portfolio_securities` and `securities`. (custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.js)
4. The dashboard controller replaces the legacy test tab entry with a dynamic detail-tab slot, registers `{ title, render }`, and triggers `renderTab`, keeping navigation arrows and swipe gestures in sync. (custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.js)
5. The new tab renderer `renderSecurityDetail(root, hass, panelConfig, securityUuid)`:
   1. Requests the snapshot payload (if not already provided) for header metrics, preserving native-currency pricing alongside EUR conversions.
   2. Issues `pp_reader/get_security_history` with epoch-day boundaries derived from the selected range whenever the range changes, ensuring data is fetched on demand via WebSocket. (custom_components/pp_reader/www/pp_reader_dashboard/js/data/api.js, custom_components/pp_reader/data/websocket.py)
   3. Transforms the returned `close` values from 10⁻⁸ precision to the security's original currency for charting while retaining EUR equivalents for gain summaries, filling missing days where needed for chart continuity.
   4. Computes total gain/loss in EUR for the active range and for the last 24 hours to power the informational strip.
   5. Renders header cards and injects a chart canvas using a lightweight chart helper (new `charting.js`) driven by plain SVG or Canvas (no external CDN dependency by default).
6. Range selector buttons mutate component state, reusing cached history responses per range to avoid redundant WebSocket calls while still sourcing each range on demand; stale caches are invalidated when live price push events signal updates for the same `security_uuid`.
7. Closing the detail tab (via new close control or navigation) removes the dynamic descriptor and returns focus to the overview without leaving orphaned listeners.

## 4. Affected Modules / Functions

| Change | File | Action |
|--------|------|--------|
| Add security snapshot query helper | custom_components/pp_reader/data/db_access.py | Introduce `get_security_snapshot` returning holdings, last price, currency, and EUR conversion |
| New WebSocket command `pp_reader/get_security_snapshot` | custom_components/pp_reader/data/websocket.py | Validate entry, call helper, and expose snapshot payload as core functionality |
| Extend API layer with history & snapshot fetchers | custom_components/pp_reader/www/pp_reader_dashboard/js/data/api.js | Add `fetchSecuritySnapshotWS` and `fetchSecurityHistoryWS(range)` utilities |
| Portfolio row click delegate | custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/overview.js | Attach handler to `.positions-container` to emit security detail navigation |
| Dynamic tab management | custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.js | Convert static `tabs` array to registry supporting add/remove detail tabs and remove the legacy Test Tab |
| Security detail renderer | custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/security_detail.js (new) | Build header, range buttons, chart; manage state & cleanups |
| Chart helper styles | custom_components/pp_reader/www/pp_reader_dashboard/css/cards.css | Add styles for chart container, buttons, empty state |
| Documentation | README-dev.md, CHANGELOG.md | Summarize new navigation and requirements |

Supporting helpers already available:
- `makeTable`, `formatNumber`, and gain formatters provide consistent currency formatting for header metrics. (custom_components/pp_reader/www/pp_reader_dashboard/js/content/elements.js)
- `portfolioPositionsCache` exposes per-portfolio position arrays keyed by security UUID, enabling reuse without extra round-trips. (custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/overview.js)

## 5. Out of Scope
- Enhancements to server-side aggregation beyond the new snapshot endpoint (e.g., rewriting live price push flows) remain excluded.
- Comparative benchmarks or multi-security overlays within the chart are not part of this iteration.
- Editing holdings, initiating trades, or modifying Portfolio Performance data from Home Assistant is explicitly out of scope.
- Mobile-specific responsiveness adjustments beyond reusing existing card styles are deferred.

## 6. Incremental Implementation

1. **Backend plumbing**
   1. Implement `get_security_snapshot(db_path, security_uuid)` returning `{name, currency_code, total_holdings, last_price_native, last_price_eur, market_value_eur}` by summing `portfolio_securities` rows, retaining the original-currency quote, and converting `securities.last_price` using FX helpers if needed.
   2. Add `pp_reader/get_security_snapshot` WebSocket handler without feature-flag gating (history is now always enabled), including tests covering missing UUID paths.
   3. Extend `ws_get_security_history` unit tests (if present) to assert 1M/5Y range input handling now that the handler is part of the core experience.

2. **Frontend foundation**
   1. Refactor `dashboard.js` to hold a base tab list and a mutable map of detail tabs keyed by security UUID; update navigation state handling and ensure overview/detail tabs respond to arrow and swipe navigation consistently.
   2. Create `security_detail.js` exporting `renderSecurityDetail` and `registerSecurityDetailTab`, with header markup mirroring overview cards.
   3. Update `overview.js` to delegate clicks on `.positions-container tr` elements, call a shared navigation helper, and prevent propagation from expand buttons.

3. **Chart rendering & UX polish**
   1. Add a `charting.js` utility that builds a simple SVG line chart with hover tooltip and axis labels; ensure zero external libraries.
   2. Implement range buttons with active-state styling, caching last response per range, and skeleton loading placeholders while fetching.
   3. Handle error states (no history records for the selected security) by displaying card-level alerts and disabling controls.
   4. Ensure push-update handlers invalidate caches if live price events mention the active `security_uuid`.

4. **Docs & regression coverage**
   1. Document navigation expectations in README-dev.md and update CHANGELOG.
   2. Add frontend unit or integration smoke tests (if harness available) or manual test checklist in `.docs`.
   3. Verify analytics/tracking remains untouched (none expected).

## 7. Performance & Risks

| Risk | Description | Mitigation |
|------|-------------|------------|
| Heavy history payloads | Fetching multi-year history per click could stress SQLite and WebSocket | Paginate by range, cap 5Y queries to existing dataset, cache responses client-side |
| FX conversion accuracy | Snapshot must convert non-EUR prices accurately, aligning with portfolio valuation helpers | Reuse existing normalization + FX logic from `logic/portfolio.py` helpers or shared utility |
| Tab proliferation | Repeated clicks could create many tabs, cluttering navigation | Limit to one active detail tab at a time or reuse same tab per security UUID |
| Chart rendering overhead | Custom SVG chart may impact performance with large datasets | Simplify to lightweight line drawing, throttle DOM updates, reuse path element on range switch |
| Navigation parity gaps | Divergence between overview and detail tab gestures could frustrate users | Reuse shared navigation controller and write UI tests/manual checklist covering arrows and swipe |

## 8. Validation Criteria (Definition of Done)
- Clicking a security row reliably opens a detail tab showing correct holdings, last price, and market value aligned with portfolio totals.
- Each time-range button refetches data, updates the chart, and indicates active selection without full-page reloads.
- When historical data is unavailable, the detail tab shows a friendly empty state and no errors in the console.
- Closing or navigating away from the detail tab returns to the overview with previous expand/collapse and sort states preserved.
- Backend WebSocket handlers return accurate EUR values, including for non-EUR securities, verified via automated tests.
- No regressions in existing overview rendering, lazy position loading, or push-update handlers.

## 9. Planned Minimal Patch

**Backend**
- Add to `db_access.py`:
  ```python
  def get_security_snapshot(db_path: Path, security_uuid: str) -> dict[str, Any]:
      # SELECT name, currency_code, last_price, SUM(current_holdings), SUM(current_value)
      # Convert last_price from 10**-8 and aggregate holdings/current_value → EUR floats.
      return snapshot
  ```
- Register in `websocket.py`:
  ```python
  @websocket_api.websocket_command({"type": "pp_reader/get_security_snapshot", ...})
  async def ws_get_security_snapshot(...):
      snapshot = await hass.async_add_executor_job(get_security_snapshot, db_path, security_uuid)
      connection.send_result(msg["id"], snapshot)
  ```

**Frontend**
- Extend `api.js` with:
  ```js
  export async function fetchSecuritySnapshotWS(hass, panelConfig, securityUuid) { ... }
  export async function fetchSecurityHistoryWS(hass, panelConfig, securityUuid, range) { ... }
  ```
- In `overview.js`, add row listener:
  ```js
  positionsContainer.addEventListener('click', (event) => {
    const row = event.target.closest('tr[data-security]');
    if (!row) return;
    openSecurityDetail(row.dataset.security);
  });
  ```
- New `security_detail.js`:
  ```js
  export async function renderSecurityDetail(root, hass, panelConfig, securityUuid) {
    const snapshot = await fetchSecuritySnapshotWS(...);
    const history = await fetchSecurityHistoryWS(..., '1Y');
    root.innerHTML = buildDetailMarkup(snapshot, history);
    attachRangeHandlers();
  }
  ```
- Update `dashboard.js` to manage `detailTabs` map and call `renderSecurityDetail` when navigation selects a security tab.

**Docs**
- Add `.docs/security_detail_tab.md` (this concept) and append release notes to CHANGELOG about security detail visualization.

## 10. Additional Decisions
- Permanently enable history support by default; remove any UI toggles or backend guards tied to `pp_reader_history` so the detail tab is always available.

## 11. Summary of Decisions
- Introduce a backend snapshot endpoint to supply header metrics for security drilldowns.
- Rework dashboard tab management to support dynamically injected security detail pages triggered from portfolio rows and to replace the legacy Test Tab.
- Render price history charts client-side using persisted historical prices with selectable ranges, fetched on demand via WebSocket, and robust empty-state handling.
- Keep implementation lightweight (no new external charting dependencies) and reuse existing caches and formatters for consistency while ensuring navigation parity with the overview tab.
