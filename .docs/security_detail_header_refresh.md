# Concept: Security Detail Header & Range Enhancements

Goal: Align the security detail tab with the revised layout by enriching the header summary, expanding historical range controls, and visualising the average purchase price without altering existing behavioural contracts beyond the minimum required to surface the new information.

---

## 1. Current State
- The security header metadata grid renders currency, holdings, last price, and market value using `buildHeaderMeta` in `src/tabs/security_detail.ts`, duplicating the currency both in the heading and beside the last price (see `src/tabs/security_detail.ts`).
- Day and total gain figures are calculated in `computeGainValues` from the currently selected history range, meaning the information bar reflects range-dependent deltas rather than static day vs. total changes (see `src/tabs/security_detail.ts`).
- The WebSocket snapshot payload assembled by `get_security_snapshot` exposes holdings and market value in EUR but omits purchase cost aggregates, preventing direct access to average purchase price per share (see `custom_components/pp_reader/data/db_access.py`).
- Historical series retrieval relies on the `AVAILABLE_HISTORY_RANGES` constant (`['1M','6M','1Y','5Y']`), so there is no built-in “all” selector despite the database storing full histories (see `src/tabs/security_detail.ts`).
- `renderLineChart`/`updateLineChart` render a single series; no overlay or horizontal guides are available to display reference prices such as the average purchase price (see `src/content/charting.ts`).
- Styling for the header card is constrained to a four-cell grid with identical typography, which lacks affordances for highlighting gain figures or aligning currency/percentage pairs (see `custom_components/pp_reader/www/pp_reader_dashboard/css/cards.css`).

---

## 2. Target State
- The header summary should present: last price with inline currency, day change (absolute EUR and percentage), total change vs. average purchase price (absolute EUR and percentage), holdings, and market value; the currency label row is removed to avoid redundancy.
- Day and total change values remain fixed for the session based on snapshot + latest close data, independent of range selector interactions, ensuring consistent messaging.
- The history range selector offers an `ALL` option that loads the longest available history from the database without affecting the static header metrics.
- The price chart adds a horizontal reference line at the computed average purchase price per share, visually contrasting current price trajectories against the cost basis.
- Styling updates emphasise positive/negative change colouring and use a responsive layout that groups related metrics while preserving accessibility semantics.
- All new logic reuses existing data contracts when possible; backend changes are limited to exposing already persisted aggregates (purchase totals, last close) to support the new calculations.

---

## 3. Proposed Data Flow / Architecture
1. **Snapshot fetch**: `ws_get_security_snapshot` extends the snapshot dict to include `purchase_value_eur`, `average_purchase_price_native`, and `last_close_native` sourced from `portfolio_securities` and `historical_prices` (see `custom_components/pp_reader/data/db_access.py`).
2. **Frontend normalisation**: `renderSecurityDetail` caches the enriched snapshot, deriving:
   - Average purchase price (native + EUR) from `purchase_value_eur / total_holdings`.
   - Day change = `(last_price_native - last_close_native)` converted to EUR via FX helper.
   - Total change = `(last_price_native - average_purchase_price_native)` converted to EUR.
   - Percentages calculated once using guarded divisions, stored outside the range selector state (see `src/tabs/security_detail.ts`).
3. **History bootstrap**: Initial history fetch stays range-aware, but day/total change values are read from the cached snapshot so `updateInfoBarContent` only adjusts period gains while the header remains static.
4. **Range selector extension**: Add `'ALL'` to `AVAILABLE_HISTORY_RANGES` and update `resolveRangeOptions` so the new option omits `start_date`, allowing the backend iterator to return the full series (see `src/tabs/security_detail.ts`).
5. **Chart overlay**: Enhance `renderLineChart`/`updateLineChart` to accept an optional `baseline` parameter, creating a dedicated SVG `<line>` spanning the plotting area at the average purchase price; reuse this when updating the chart on range changes (see `src/content/charting.ts`).
6. **Presentation layer**: Update `buildHeaderMeta` to assemble grouped cells (e.g., “Letzter Preis”, “Tagesänderung”, “Gesamtänderung”, “Bestand”, “Marktwert”) with gain styling classes reused from `formatGain`/`formatGainPct`, and adjust CSS grid rules accordingly (see `src/tabs/security_detail.ts`, `custom_components/pp_reader/www/pp_reader_dashboard/css/cards.css`).

---

## 4. Affected Modules / Functions

| Change | File | Action |
| --- | --- | --- |
| Extend snapshot aggregates (purchase totals, last close) | `custom_components/pp_reader/data/db_access.py` | Add SQL joins/sums for `purchase_value` and fetch previous close; return new keys |
| Propagate new snapshot fields to WS payload | `custom_components/pp_reader/data/websocket.py` | No structural change; ensure returned dict already serialises added keys |
| Update snapshot typing for new fields | `src/tabs/types.ts` | Extend `SecuritySnapshotLike` and related helper types |
| Compute static day/total change + average price | `src/tabs/security_detail.ts` | Introduce helpers, adjust header meta builder, reuse cached values |
| Support `'ALL'` range | `src/tabs/security_detail.ts` | Extend constants, resolver, and button markup |
| Render baseline line | `src/content/charting.ts` | Accept new option, manage SVG `<line>` in render/update pipeline |
| Refresh header grid styling | `custom_components/pp_reader/www/pp_reader_dashboard/css/cards.css` | Adapt layout, add stateful colour tokens for gains |

Supporting utilities already available:
- `formatGain`/`formatGainPct` supply semantic colouring for positive/negative values (see `src/content/elements.ts`).
- `computeGainValues` pattern illustrates how to isolate range-dependent info bar updates, informing the static header computation strategy (see `src/tabs/security_detail.ts`).

---

## 5. Out of Scope
- Modifying WebSocket command schemas beyond augmenting the snapshot payload.
- Introducing new database tables or migrations; all data derives from existing `portfolio_securities` and `historical_prices` content.
- Reworking the info bar period/daily gain logic or altering range-dependent gain calculations.
- Changing localisation, translation strings, or adding new i18n resources.
- Building additional analytics (e.g., volume overlays, moving averages) beyond the average purchase price reference line.

---

## 6. Incremental Implementation

1. **Phase 1 – Backend data enrichment**
   1. Aggregate total purchase value and average price in `get_security_snapshot`; include `purchase_value_eur` and `average_purchase_price_native`/`_eur`.
   2. Query `historical_prices` for the most recent close prior to `last_price` and expose `last_close_native` (and EUR equivalent via FX helper).
   3. Add unit tests (or extend existing ones) around `get_security_snapshot` to cover missing holdings, zero purchase value, and absent history edge cases.

2. **Phase 2 – Frontend computation layer**
   1. Update `SecuritySnapshotDetail` typing and parsing to accept the new fields and provide defaults.
   2. Implement pure helpers in `src/tabs/security_detail.ts` to compute static change metrics (absolute/percentage) with FX conversion fallback.
   3. Persist computed values in module-level maps (parallel to range state) so they survive re-renders without range coupling.

3. **Phase 3 – UI & interaction updates**
   1. Refactor `buildHeaderMeta` to render the new grid layout, reuse formatting helpers, and drop the separate currency row.
   2. Extend the range selector builder to include the `'ALL'` button and update button labelling/ARIA attributes.
   3. Enhance chart rendering options to draw/update the baseline line, ensuring proper cleanup when no holdings or purchase value exist.
   4. Adjust CSS classes for the header grid and baseline legend styling; add responsive tweaks for narrow viewports.

4. **Phase 4 – Validation & polish**
   1. Smoke-test the dashboard with securities lacking purchase history to verify graceful fallbacks (e.g., baseline hidden, gains show `—`).
   2. Confirm range switching leaves header gains static and only the info bar/plot update.
   3. Update documentation (`.docs/security_detail_header_refresh.md` and changelog entry if required) to describe the new UI semantics.

---

## 7. Performance & Risks

| Risk | Description | Mitigation |
| --- | --- | --- |
| Larger history payload for `ALL` | Fetching the full series could be heavy for long-lived securities. | Lazily request only on user action; reuse cache to prevent repeat fetches; consider pagination later if metrics show pressure. |
| Missing purchase data | Securities without holdings/purchase history yield divide-by-zero scenarios. | Guard computations (return null) and hide baseline when holdings ≤ 0 or purchase sum == 0. |
| FX conversion accuracy | Static gains rely on snapshot FX rates which may differ from historical conversion. | Reuse `deriveFxRate` logic and fall back to EUR-native values; document assumption in code comments. |
| Chart overlay clutter | Adding a baseline may impact readability on small screens. | Provide subtle styling (dashed line) and ensure responsive CSS reduces overlap (e.g., lighten line colour). |

---

## 8. Validation Criteria (Definition of Done)
- Header shows last price, day change (EUR/%), total change (EUR/%), holdings, and market value with correct positive/negative styling.
- Day/total change values remain constant when toggling between history ranges, including the new `ALL` option.
- Average purchase price baseline line renders when holdings and purchase value exist; it disappears otherwise.
- Range selector includes `ALL` and successfully loads the longest history without runtime errors.
- Snapshot payloads contain purchase and last-close data; API consumers remain backward compatible (no schema breaking changes).
- Frontend lint/tests pass and no regressions in existing security detail interactions are observed.

---

## 9. Planned Minimal Patch

- **Backend**
  ```python
  # custom_components/pp_reader/data/db_access.py
  cursor = conn.execute("SELECT COALESCE(SUM(purchase_value), 0), COALESCE(SUM(current_holdings), 0) ...")
  purchase_sum_cents, holding_sum = cursor.fetchone()
  avg_purchase_native = (purchase_sum_cents / 100) / holding_sum if holding_sum else None
  last_close_native = fetch_previous_close(conn, security_uuid)
  snapshot.update({
      "purchase_value_eur": round(purchase_sum_cents / 100, 2),
      "average_purchase_price_native": avg_purchase_native,
      "last_close_native": last_close_native,
  })
  ```

- **Frontend**
  ```ts
  // src/tabs/security_detail.ts
  const staticMetrics = ensureSnapshotMetrics(securityUuid, snapshot);
  const headerCard = createHeaderCard(headerTitle, buildHeaderMeta({ snapshot, metrics: staticMetrics }));
  const chartOptions = {
    ...getHistoryChartOptions(host, series, { currency }),
    baseline: staticMetrics.averagePurchaseNative,
  };
  renderLineChart(host, chartOptions);
  ```

- **Docs**
  - Add this concept file and note UI adjustments in `CHANGELOG.md` once implemented.

---

## 10. Additional Decisions
No additional decisions.

---

## 11. Summary of Decisions
- Enrich `get_security_snapshot` with purchase and last-close aggregates to support the new header metrics.
- Compute day/total change once per snapshot and decouple these values from the history range selector.
- Extend chart utilities and CSS to visualise the average purchase price baseline alongside the expanded header layout.
- Introduce an `ALL` history range option while caching responses to minimise repeated full-history downloads.

---
