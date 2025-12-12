# Portfolio Performance Reader Panel DOM Reference

![Portfolio Dashboard overview](browser:/invocations/uwqyprkg/artifacts/artifacts/ppreader.png)

## 0. Normalized Dashboard Payload Contract

The dashboard UI renders a single canonical payload produced by `NormalizationResult` and serialized via `custom_components.pp_reader.data.normalization_pipeline.serialize_normalization_result`. The shape below mirrors the backend source-of-truth in `datamodel/backend-datamodel-final.md` so contributors can wire adapters without reverse-engineering websocket traffic.

### 0.1 Snapshot wrapper

| Field | Format | Notes |
| --- | --- | --- |
| `generated_at` | ISO 8601 datetime | Timestamp captured when the normalization snapshot is assembled. |
| `metric_run_uuid` | string (UUID or `null`) | Links every snapshot to the metric batch it was derived from to keep stores and diagnostics in sync with backend calculations. |
| `accounts[]` | array of `AccountSnapshot` | Pre-sorted account list containing both EUR and FX accounts; identical to `AccountSnapshot` rows loaded from SQLite metrics. |
| `portfolios[]` | array of `PortfolioSnapshot` | Aggregated portfolio list (optionally with embedded positions) that replaces all bespoke frontend adapters. |
| `diagnostics` | object (optional) | Frontend-visible diagnostics bag, currently populated by `get_missing_fx_diagnostics()` to surface FX gaps. |

### 0.2 Account snapshot

| Field | Format | Notes |
| --- | --- | --- |
| `uuid` | string (UUID) | Primary key shared with the backend `accounts` table. |
| `name` | string | Display label rendered verbatim in the liquidity table. |
| `currency_code` | string (ISO 4217) | Original account currency (uppercased). |
| `orig_balance` | number (account currency) | Native balance, rounded to backend precision. |
| `balance` | number or `null` (EUR) | EUR translation when an FX rate exists; `null` indicates missing coverage. |
| `fx_rate` / `fx_rate_source` | number / enum (optional) | FX rate applied plus the source identifier (Frankfurter, Yahoo, etc.). |
| `fx_rate_timestamp` | ISO 8601 datetime (optional) | When the applied FX quote was captured. |
| `coverage_ratio` | number 0–1 (optional) | Share of required FX inputs present when computing the EUR balance. |
| `provenance` | string (optional) | Free-form provenance marker from the metrics pipeline. |
| `fx_unavailable` | boolean (optional) | Explicit flag when the backend could not provide an EUR balance for a non-EUR account. |

### 0.3 Portfolio snapshot

| Field | Format | Notes |
| --- | --- | --- |
| `uuid` / `name` | string | Identity and display label used by the overview table. |
| `current_value` | number (EUR) | Canonical EUR market value already aggregated by the backend. |
| `purchase_value` | number (EUR) | Total EUR purchase cost backing the gain calculation. |
| `position_count` | integer | Persisted count of active holdings. |
| `missing_value_positions` | integer | Number of holdings lacking current values; drives warning chips. |
| `has_current_value` | boolean | Legacy helper retained until legacy adapters are removed. |
| `performance` | object | Mirrors `metrics/common.compose_performance_payload` (`total.gain_eur`, `total.gain_pct`, `day_change.value_native`, `coverage_ratio`, etc.). |
| `coverage_ratio` / `provenance` | number / string (optional) | Metric coverage share and provenance tag, bubbled up from the metric records. |
| `metric_run_uuid` | string (UUID, optional) | Per-portfolio pointer to the metric batch in case multiple runs coexist. |
| `data_state` | object `{status, message?}` (optional) | Emitted when the backend detected portfolio-specific errors. |
| `positions[]` | array of `PositionSnapshot` (optional) | Present when the snapshot was requested with `include_positions=True`; see section 0.4. |

### 0.4 Position snapshot

| Field | Format | Notes |
| --- | --- | --- |
| `portfolio_uuid` / `security_uuid` | string (UUID) | Identify the owning portfolio and the security row; both come directly from the Portfolio Performance file. |
| `name` | string | Security label used in the expandable positions table. |
| `currency_code` | string (ISO 4217) | Trading currency badge shown in the UI. |
| `current_holdings` | number | Persisted quantity with the backend’s fractional precision. |
| `purchase_value` / `current_value` | number (EUR) | EUR purchase and market totals driving gain/coverage calculations. |
| `average_cost` | object | Backend-computed structure with `primary` (`value`, `currency`) and optional `secondary` EUR conversions. |
| `performance` | object | Same schema as the portfolio performance block (gain EUR/%, day change, coverage). |
| `aggregation` | object | Backend-side helper that exposes aggregation choices (e.g., FIFO lots) for tooltips. |
| `coverage_ratio` / `provenance` / `metric_run_uuid` | number / string / string (optional) | Optional metadata per holding, mirroring the metric rows that fed the payload. |
| `data_state` | object `{status, message?}` (optional) | Declares backend errors for the specific position. |

### 0.5 Diagnostics payload

`NormalizationResult.diagnostics` currently exposes the FX health snapshot from `get_missing_fx_diagnostics()` so the frontend can render banners or developer overlays:

| Field | Format | Notes |
| --- | --- | --- |
| `rate_lookup_failures[]` | array of `{currency, date, occurrences}` | List of FX pairs/dates that failed during the last metric run. |
| `native_amount_missing[]` | array of `{portfolio_uuid, security_uuid, occurrences}` | Positions where native purchase totals could not be derived, signalling incomplete gain calculations. |

When new diagnostic groups are added to the backend they must be documented here and in `datamodel/backend-datamodel-final.md` before adapters rely on them.

## 1. Host Integration inside Home Assistant
- The custom panel is rendered inside Home Assistant's main drawer layout. The shadow DOM of `pp-reader-panel` is mounted under `home-assistant-main`, allowing the panel to dispatch `hass-toggle-menu` events to open or close the sidebar when the custom menu button is pressed.【F:custom_components/pp_reader/www/pp_reader_dashboard/panel.js†L9-L200】
- The panel shadow imports the dashboard controller bundle and injects the wrapper markup (`.panel-root`, fixed header, scrollable wrapper, and the `<pp-reader-dashboard>` host element) that the rest of the UI relies on.【F:custom_components/pp_reader/www/pp_reader_dashboard/panel.js†L141-L195】

## 2. Panel Shell (`pp-reader-panel`)
- `pp-reader-panel` attaches three scoped stylesheets (`base.css`, `cards.css`, `nav.css`) and watches its own size via a `ResizeObserver` to set `--panel-width`, which keeps the sticky header widths aligned with the container.【F:custom_components/pp_reader/www/pp_reader_dashboard/panel.js†L172-L330】【F:custom_components/pp_reader/www/pp_reader_dashboard/css/base.css†L1-L40】
- `base.css` fixes the header at the top (48 px high), positions the scrollable dashboard beneath it, and constrains horizontal overflow to the dedicated `.scroll-container` wrappers so tables can scroll independently.【F:custom_components/pp_reader/www/pp_reader_dashboard/css/base.css†L20-L45】
- The header exposes a hamburger button and title that inherit Home Assistant theme variables; hovering styles, icon sizing, and typography are defined in the same stylesheet.【F:custom_components/pp_reader/www/pp_reader_dashboard/css/base.css†L47-L99】

## 3. Dashboard Host (`pp-reader-dashboard`)
- The dashboard custom element wraps its content in a light DOM `<div class="pp-reader-dashboard">` so that Home Assistant's global typography and theme variables apply while retaining scroll state per tab.【F:src/dashboard.ts†L738-L830】
- It tracks Home Assistant references (`hass`, `panel`, `route`, `narrow`), remembers scroll positions by tab, subscribes to `panels_updated` WebSocket events, and queues incremental updates for later reapplication if the DOM is rebuilt.【F:src/dashboard.ts†L738-L1040】
- Rendering is delegated to `renderTab`, which injects the HTML returned by the current tab descriptor, builds the sticky header anchor, wires navigation buttons, and adds swipe gestures to the header card.【F:src/dashboard.ts†L520-L720】
- Sticky behavior is driven by an `IntersectionObserver` watching `#pp-reader-sticky-anchor`, toggling `.header-card.sticky` when the scroll position passes the anchor.【F:src/dashboard.ts†L600-L700】
- Left/right navigation buttons are enabled or disabled depending on the active tab index; the right arrow only reactivates when another detail tab can be reopened.【F:src/dashboard.ts†L700-L760】

## 4. Overview Tab Layout
### 4.1 Header Card
- `createHeaderCard` produces a card with navigation arrows, `<h1 id="headerTitle">`, and a `.meta` container for supplemental information. Sticky mode shrinks the typography and collapses the meta section via CSS transitions.【F:src/content/elements.ts†L130-L210】【F:custom_components/pp_reader/www/pp_reader_dashboard/css/cards.css†L41-L124】【F:custom_components/pp_reader/www/pp_reader_dashboard/css/nav.css†L1-L34】
- `renderDashboard` injects the header card and fills `.header-meta-row` with the aggregated portfolio + account total wealth figure.【F:src/tabs/overview.ts†L760-L860】

### 4.2 Investment Card and Portfolio Table
- The overview tab creates an `Investment` card containing `.scroll-container.portfolio-table` and a `<table class="expandable-portfolio-table">` with a `tr.portfolio-row` per depot and paired `tr.portfolio-details` rows for detail content.【F:src/tabs/overview.ts†L260-L360】
- Each summary row carries numeric dataset attributes (`data-position-count`, `data-current-value`, etc.) for later updates, while the toggle button maintains `aria-expanded`, `aria-controls`, and a caret glyph for accessibility cues.【F:src/tabs/overview.ts†L300-L420】
- Detail rows host a `.positions-container` placeholder. When a portfolio is expanded, the container is populated with either a loading indicator, an error with `.retry-pos`, or a lazy-rendered `table.sortable-positions` generated by `renderPositionsTable` depending on cache state.【F:src/tabs/overview.ts†L360-L720】
- Card styling keeps the section self-contained: sticky section headers, alternating row backgrounds, hover highlighting, and the `.flash-update` animation for live price pushes.【F:custom_components/pp_reader/www/pp_reader_dashboard/css/cards.css†L1-L216】

### 4.3 Liquidity and FX Cards
- `renderDashboard` builds a `Liquidität` card backed by `makeTable`, formatting account balances as right-aligned currency columns, and optionally adds a `Fremdwährungen` card that shows original currency amounts alongside their EUR conversion.【F:src/tabs/overview.ts†L860-L940】【F:src/content/elements.ts†L40-L130】

### 4.4 Footer Meta Card
- A `.card.footer-card` at the end of the layout surfaces the last Portfolio Performance export timestamp so users can verify data freshness.【F:src/tabs/overview.ts†L940-L980】

## 5. Portfolio Detail Behaviour
- Module-level state stores a `portfolioPositionsCache` map and `expandedPortfolios` set so that lazy-loaded detail tables persist across rerenders and push updates.【F:src/tabs/overview.ts†L100-L220】
- `attachPortfolioToggleHandler` binds delegated clicks inside `.portfolio-table` to open/close detail rows, update `aria-expanded`, swap the caret glyph (`▶`/`▼`), and remember expansion state. When a row opens, it flushes any pending WebSocket updates, shows a loading placeholder, fetches positions, and renders/sorts the table; closing resets classes and removes the portfolio from the expanded set.【F:src/tabs/overview.ts†L620-L780】
- Sorting for position tables is attached once per portfolio via `attachPortfolioPositionsSorting`, which toggles `.sort-active` indicators on header cells and persists the selected sort column/direction in `dataset` attributes.【F:src/tabs/overview.ts†L440-L600】
- Users can request a fresh fetch with the retry button, which calls `reloadPortfolioPositions` to re-render the table and rebind sorting and security navigation listeners.【F:src/tabs/overview.ts†L600-L660】
- `schedulePostRenderSetup` runs after every overview render to rebuild missing buttons, reattach listeners, restore expanded rows, recompute the footer, and flush any pending updates that arrived while the table was not mounted.【F:src/tabs/overview.ts†L860-L980】
- A fallback listener on `.expandable-portfolio-table` retriggers the main handler if the outer container was not yet bound, avoiding dead controls after asynchronous renders.【F:src/tabs/overview.ts†L780-L820】

## 6. Data Flow and Live Updates
- WebSocket helpers derive the integration `entry_id` from multiple sources and expose typed commands for accounts, portfolio aggregates, positions, file metadata, security snapshots, and history ranges. All dashboard fetches and live updates run through these endpoints.【F:src/data/api.ts†L1-L160】
- `updateConfigsWS.ts` keeps maps of pending position payloads so WebSocket deltas can be applied once detail rows become visible. It also restores sort state after rerenders by reusing the global sorting helper.【F:src/data/updateConfigsWS.ts†L1-L260】
- `handleAccountUpdate` and `handlePortfolioUpdate` patch existing table rows in place, update dataset attributes for future recalculations, trigger the `.flash-update` feedback, and recompute the footer and total-wealth banner based on the latest DOM state.【F:src/data/updateConfigsWS.ts†L260-L520】

## 7. Navigation and Tab Management
- The dashboard module maintains a registry of detail tabs keyed by `security:` identifiers. Helper functions add or remove tabs, reopen the previously viewed security when paging forward, and constrain navigation indices.【F:src/dashboard.ts†L90-L360】
- `addSwipeEvents` (used by `setupSwipeOnHeaderCard`) listens for both touch and mouse drags to provide gesture navigation on the header card, matching the button-based navigation.【F:src/interaction/tab_control.ts†L1-L120】【F:src/dashboard.ts†L630-L710】
- Scroll state for each tab is remembered via `rememberScrollPosition`, allowing the dashboard to restore the user's position when switching back to the overview or a reopened detail tab.【F:src/dashboard.ts†L820-L1000】

## 8. Styling and Visual Feedback Summary
- Card-level styling (rounded corners, sticky headers, controlled scrollbars) and positive/negative highlighting for gains are centralized in `cards.css`, ensuring consistent semantics across aggregated and detailed tables.【F:custom_components/pp_reader/www/pp_reader_dashboard/css/cards.css†L1-L216】
- Navigation arrows share theming with Home Assistant through `nav.css`, including disabled states that also suppress pointer events so navigation cannot be triggered while unavailable.【F:custom_components/pp_reader/www/pp_reader_dashboard/css/nav.css†L1-L34】
- The scroll anchor (`#pp-reader-sticky-anchor`) sits just above the header card and is invisible but participates in intersection checks that drive sticky mode transitions.【F:custom_components/pp_reader/www/pp_reader_dashboard/css/nav.css†L36-L67】

## 9. Edge Cases and Observed States
- When fetches fail, `.positions-container` renders an error block with a retry button; the same container shows `Lade…`/`Neu laden…` placeholders while awaiting network responses.【F:src/tabs/overview.ts†L660-L760】
- Pending WebSocket updates for collapsed portfolios are cached in the module-scoped `pendingPortfolioUpdates` map and replayed once the row expands, preventing stale data when the dashboard receives background updates without relying on window globals.【F:src/data/updateConfigsWS.ts†L40-L220】
- Footer totals rely on dataset values added to each portfolio row, allowing `updatePortfolioFooterFromDom` to recalculate sums even after manual DOM edits or partial live updates.【F:src/tabs/overview.ts†L360-L440】

This reference should equip future contributors with a reliable map of the Portfolio Performance Reader panel's DOM, the components that manage it, and the data flows that keep it up to date.
