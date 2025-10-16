# Frontend Future Data Model

The tables below describe the canonical payloads the Portfolio Performance Reader frontend expects from the backend after the refactor. Each value is intended to mirror a column or deterministic calculation stored in the integration database so that the UI can render without synthesising fallback data.
The tables below describe the preferred future payloads that let the Portfolio Performance Reader UI render every value directly from backend-provided records. Each section consolidates aliases from the current implementation into a single canonical field name that should map 1:1 to data persisted in the integration's SQLite database.

## Dashboard totals (`pp_reader/get_dashboard_totals` command, `dashboard_totals` push)

| Name | Format | Requested by | Processed in | Displayed in | Description |
| --- | --- | --- | --- | --- | --- |
| `total_wealth_eur` | number (EUR) | `src/tabs/overview.ts` – `renderDashboard()` | `src/data/updateConfigsWS.ts` – `handleDashboardTotals()` (new minimal binder) | Header wealth badge (`#headerMeta`) | Final aggregated EUR wealth shown in the header; replaces client-side summing of accounts and portfolios. |
| `fx_status` | enum (`ok`/`missing_rates`/`stale_rates`) | Same as above | Same as above | Header warning banner | Indicates whether the totals use complete FX rates so the UI can surface or hide the warning block without computing heuristics. |
| `totals_timestamp` | ISO 8601 string | Same as above | Same as above | Header dataset + tooltip | Timestamp when totals were calculated, allowing the UI to expose freshness without deriving it from component updates. |

## Account summaries (`pp_reader/get_accounts` command, `accounts` push)

| Name | Format | Requested by | Processed in | Displayed in | Description |
| --- | --- | --- | --- | --- | --- |
| `accounts` | array of account objects | `src/tabs/overview.ts` – `renderDashboard()` | `src/tabs/overview.ts` – `renderDashboard()` | Account tables | Ordered collection of all investment and cash accounts to display in the overview.
| `accounts[].account_id` | string (stable primary key) | Same as above | `src/data/updateConfigsWS.ts` – `handleAccountUpdate()` | Account tables | Unique identifier matching the SQLite `accounts` table primary key for differential updates.
| `accounts[].display_name` | string | Same as above | `src/tabs/overview.ts` – `renderDashboard()` | EUR and FX account tables | Human-readable account label.
| `accounts[].balance_eur` | decimal number | Same as above | `src/data/updateConfigsWS.ts` – `handleAccountUpdate()`; `updateTotalWealth()` | Account tables, total wealth header | Current account valuation expressed in EUR.
| `accounts[].balance_native` | decimal number | Same as above | `src/data/updateConfigsWS.ts` – `handleAccountUpdate()` | FX account table | Account balance expressed in the original account currency.
| `accounts[].currency_code` | string (ISO 4217) | Same as above | `src/tabs/overview.ts` – `renderDashboard()` | FX table grouping, currency badges | Currency identifier stored in the account record.
| `accounts[].fx_status` | enum (`up_to_date`, `stale`, `missing`) | Same as above | `src/data/updateConfigsWS.ts` – `handleAccountUpdate()` | Warning banner, totals visibility | Backend evaluation of FX completeness for the account, replacing frontend-derived warnings.

## Portfolio summaries (`pp_reader/get_portfolio_data` command, `portfolio_values` push)

| Name | Format | Requested by | Processed in | Displayed in | Description |
| --- | --- | --- | --- | --- | --- |
| `portfolios` | array of portfolio summary objects | `src/tabs/overview.ts` – `renderDashboard()` | `src/tabs/overview.ts` – `renderDashboard()` | Portfolio summary table | Collection of portfolio aggregates aligned with overview ordering.
| `portfolios[].portfolio_id` | string (stable primary key) | Same as above | `src/data/updateConfigsWS.ts` – `handlePortfolioUpdate()` | Summary rows, dataset attributes | Identifier matching the SQLite `portfolios` table primary key.
| `portfolios[].display_name` | string | Same as above | `src/tabs/overview.ts` – `renderDashboard()` | Summary rows | Portfolio title rendered in the overview table.
| `portfolios[].position_count` | integer | Same as above | `src/data/updateConfigsWS.ts` – `handlePortfolioUpdate()` | Summary rows | Number of open positions in the portfolio snapshot.
| `portfolios[].market_value_eur` | decimal number | Same as above | `src/data/updateConfigsWS.ts` – `handlePortfolioUpdate()`; `updateTotalWealth()` | Summary rows, totals footer | Current market value in EUR sourced directly from aggregated holdings.
| `portfolios[].purchase_value_eur` | decimal number | Same as above | `src/data/updateConfigsWS.ts` – `handlePortfolioUpdate()` | Hidden dataset values for totals | Total purchase cost in EUR used for performance calculations.
| `portfolios[].performance_gain_eur` | decimal number | Same as above | `src/content/elements.ts` – `formatValue()` | Gain column | Absolute gain derived and persisted by the backend.
| `portfolios[].performance_gain_pct` | decimal number (% stored as float) | Same as above | `src/content/elements.ts` – `formatValue()` | Gain percentage column | Percentage gain derived by backend logic.
| `portfolios[].valuation_status` | enum (`complete`, `partial`, `missing_fx`) | Same as above | `src/data/updateConfigsWS.ts` – `handlePortfolioUpdate()` | Summary row badges, wealth banner | Backend-evaluated completeness indicator consolidating FX and valuation warnings.
| `account_id` | string (UUID) | `src/tabs/overview.ts` – `renderDashboard()` | `src/data/updateConfigsWS.ts` – `handleAccountUpdate()` | DOM row `data-account` attributes | Stable identifier aligning updates and DOM rows without relying on names. |
| `name` | string | Same as above | Same as above | EUR + FX account tables | Account label rendered directly from backend data. |
| `balance_eur` | number | Same as above | Same as above | EUR + FX account tables, totals data attribute | Canonical EUR balance; the frontend formats this value but no longer has to fall back to other fields. |
| `balance_native` | number or null | Same as above | Same as above | FX account table second column | Native-currency amount stored in the DB; if `null` the UI leaves the FX column blank. |
| `currency_code` | string (ISO 4217) | Same as above | Same as above | Table currency badges | Currency associated with `balance_native`, enabling correct labels without inference. |
| `fx_state` | object `{ status: 'ok' | 'missing' | 'stale', reason?: string }` | Same as above | Same as above | FX warning pill + dataset flag | Structured FX health indicator derived from backend evaluation so the UI can show detailed copy without checking numeric gaps. |

## Portfolio summaries (`pp_reader/get_portfolios` command, `portfolio_values` push)

| Name | Format | Requested by | Processed in | Displayed in | Description |
| --- | --- | --- | --- | --- | --- |
| `portfolio_id` | string (UUID) | `src/tabs/overview.ts` – `renderDashboard()` | `src/data/updateConfigsWS.ts` – `handlePortfolioUpdate()` | Portfolio table row `data-portfolio` | Primary key for matching rows, lazy-loads, and push events. |
| `name` | string | Same as above | Same as above | Portfolio table first column | Portfolio label. |
| `position_count` | number | Same as above | Same as above | Portfolio table count column | Number of holdings provided directly by the backend, eliminating DOM parsing. |
| `current_value_eur` | number | Same as above | Same as above | Portfolio value column + totals footer | Current valuation already converted to EUR. |
| `purchase_value_eur` | number | Same as above | Same as above | Hidden dataset for footer recomputation | Aggregate purchase cost in EUR; backend supplies canonical figure for gain percentage calculations. |
| `performance` | object `{ gain_abs_eur: number, gain_pct: number }` | Same as above | Same as above | Gain columns | Consolidated performance metrics, avoiding alias handling. |
| `valuation_state` | object `{ status: 'complete' | 'partial', missing_positions?: number }` | Same as above | Same as above | Warning badge + totals guard | Signals incomplete valuations and exposes how many positions are missing market data so the UI can show the partial data notice. |

## Portfolio positions (`pp_reader/get_portfolio_positions` command, `portfolio_positions` push)

| Name | Format | Requested by | Processed in | Displayed in | Description |
| --- | --- | --- | --- | --- | --- |
| `portfolio_id` | string | `src/tabs/overview.ts` – `attachPortfolioToggleHandler()` | `src/data/updateConfigsWS.ts` – `handlePortfolioPositionsUpdate()` | Toggle detail rows | Identifier of the portfolio whose positions are included.
| `positions` | array of position objects | Same as above | `src/data/updateConfigsWS.ts` – `handlePortfolioPositionsUpdate()` | Expandable positions tables | Ordered holdings for the selected portfolio.
| `positions[].position_id` | string (stable primary key) | Same as above | `src/tabs/overview.ts` – `sanitizePosition()` | Row data attributes | Identifier of the position entry in the SQLite holdings view.
| `positions[].security_id` | string | Same as above | `src/tabs/overview.ts` – `sanitizePosition()` | Row dataset attributes | Security identifier used to open the detail tab.
| `positions[].security_name` | string | Same as above | `src/tabs/overview.ts` – `renderPositionsTable()` | First column text | Display name of the security.
| `positions[].quantity` | decimal number | Same as above | `src/tabs/overview.ts` – `sanitizePosition()` | “Bestand” column | Units held according to the portfolio snapshot.
| `positions[].purchase_price_native` | decimal number | Same as above | `src/tabs/overview.ts` – `buildPurchasePriceDisplay()` | “Ø Kaufpreis” primary value | Average purchase price per unit in the security currency.
| `positions[].purchase_price_eur` | decimal number | Same as above | `src/tabs/overview.ts` – `buildPurchasePriceDisplay()` | “Ø Kaufpreis” secondary value | Average purchase price per unit converted to EUR/account currency.
| `positions[].purchase_price_currency` | string (ISO 4217) | Same as above | `src/tabs/overview.ts` – `buildPurchasePriceDisplay()` | Currency badges | Currency code associated with the purchase price.
| `positions[].market_value_eur` | decimal number | Same as above | `src/tabs/overview.ts` – `renderPositionsTable()` | “Aktueller Wert” column | Current position valuation in EUR.
| `positions[].performance_gain_eur` | decimal number | Same as above | `src/content/elements.ts` – `formatValue()` | Gain column | Absolute performance value supplied by backend.
| `positions[].performance_gain_pct` | decimal number (% stored as float) | Same as above | `src/content/elements.ts` – `formatValue()` | Gain percentage column | Percentage performance provided by backend.
| `positions[].currency_code` | string (ISO 4217) | Same as above | `src/tabs/overview.ts` – `resolveCurrencyFromPosition()` | Currency labels | Security’s trading currency used for formatting.
| `positions[].valuation_status` | enum (`complete`, `partial`, `missing_fx`) | Same as above | `src/tabs/overview.ts` – `sanitizePosition()` | Warning icons, dataset metadata | Backend evaluation describing whether valuation inputs are complete.
| `error` | nullable string | Same as above | `src/data/updateConfigsWS.ts` – `applyPortfolioPositionsToDom()` | Error banner | Optional backend-sent error message for the positions panel.
| `portfolio_id` | string (UUID) | `src/tabs/overview.ts` – `attachPortfolioToggleHandler()` | `src/data/updateConfigsWS.ts` – `handlePortfolioPositionsUpdate()` | Expandable table containers | Associates the positions payload with the correct portfolio. |
| `positions` | array of position objects | Same as above | Same as above | Positions tables | Complete collection of holdings for the requested portfolio. |
| `positions[].position_id` | string (UUID) | Same as above | Same as above | Row `data-security` attributes | Unique identifier for the position row, replacing multiple alias keys (`security_uuid`, etc.). |
| `positions[].name` | string | Same as above | Same as above | Positions table first column | Security display name. |
| `positions[].quantity` | number | Same as above | Same as above | “Bestand” column | Exact holdings figure (in units) read directly from storage. |
| `positions[].current_value_eur` | number | Same as above | Same as above | “Aktueller Wert” column + totals | Current EUR valuation. |
| `positions[].purchase_value_eur` | number | Same as above | Same as above | Hidden dataset + FX tooltip | Aggregate purchase cost for the holding, enabling gain and FX disclosure without recomputation. |
| `positions[].performance` | object `{ gain_abs_eur: number, gain_pct: number }` | Same as above | Same as above | Gain columns and cell colour coding | Canonical performance metrics. |
| `positions[].average_cost` | object `{ primary: { value: number, currency: string }, secondary?: { value: number, currency: string }, source: 'aggregation' | 'totals' | 'eur_total', coverage_ratio?: number, fx_rate_timestamp?: string }` | Same as above | Same as above | “Ø Kaufpreis” column + tooltip | Complete average price payload so the UI can render both lines and tooltips without inspecting aggregation helpers. |
| `positions[].currency_codes` | object `{ security: string, account?: string }` | Same as above | Same as above | Currency labels in purchase price rows | Direct currency hints, merging previous scattered fields. |
| `positions[].data_state` | object `{ status: 'ok' | 'error', message?: string }` | Same as above | Same as above | Inline error banner | Backend-supplied state for the positions request, replacing separate `error` strings and implicit fallbacks. |

## Last file update (`pp_reader/get_last_file_update` command, `last_file_update` push)

| Name | Format | Requested by | Processed in | Displayed in | Description |
| --- | --- | --- | --- | --- | --- |
| `last_file_update` | ISO 8601 timestamp string | `src/tabs/overview.ts` – `renderDashboard()` | `src/data/updateConfigsWS.ts` – `handleLastFileUpdate()` | Footer card metadata and header fallback | Timestamp of the most recent portfolio import stored alongside the processed file.
| `last_ingest_at` | ISO 8601 string | `src/tabs/overview.ts` – `renderDashboard()` | `src/data/updateConfigsWS.ts` – `handleLastFileUpdate()` | Footer card + header fallback text | Timestamp of the latest portfolio file import as persisted in the backend. |
| `source` | string (`"portfolio_performance"`, etc.) | Same as above | Same as above | Footer caption | Identifies where the data originated so the UI can mention whether it was synced or manually imported. |

## Security snapshot (`pp_reader/get_security_snapshot` command)

| Name | Format | Requested by | Processed in | Displayed in | Description |
| --- | --- | --- | --- | --- | --- |
| `security_id` | string | `src/tabs/security_detail.ts` – `renderSecurityDetail()` | `src/tabs/security_detail.ts` – `renderSecurityDetail()` | Detail header context | Identifier of the security whose snapshot is returned.
| `snapshot_timestamp` | ISO 8601 timestamp string | Same as above | `src/tabs/security_detail.ts` – `buildHeaderMeta()` | Header meta | Timestamp representing when the snapshot values were recorded.
| `display_name` | string | Same as above | `src/tabs/security_detail.ts` – `renderSecurityDetail()` | Header title | Human-readable security title.
| `currency_code` | string (ISO 4217) | Same as above | `src/tabs/security_detail.ts` – pricing helpers | Header meta, info bar, FX tooltip | Trading currency for pricing values.
| `total_holdings` | decimal number | Same as above | `src/tabs/security_detail.ts` – `buildHeaderMeta()` | Header “Bestand” value | Units held from the latest snapshot row.
| `last_price_native` | decimal number | Same as above | `src/tabs/security_detail.ts` – `extractSnapshotLastPriceNative()` | “Letzter Preis” value, chart stitching | Latest traded price in the security currency.
| `last_price_eur` | decimal number | Same as above | `src/tabs/security_detail.ts` – `extractSnapshotLastPriceNative()` | Price fallback | Price converted to EUR, persisted in the database.
| `market_value_eur` | decimal number | Same as above | `src/tabs/security_detail.ts` – `buildHeaderMeta()` | “Marktwert (EUR)” block | Snapshot market valuation in EUR.
| `average_purchase_native` | decimal number | Same as above | `src/tabs/security_detail.ts` – `extractAverageCostPayload()` | Average purchase price primary value | Stored average purchase price in the security currency.
| `average_purchase_eur` | decimal number | Same as above | `src/tabs/security_detail.ts` – `extractAverageCostPayload()`; `composeAveragePurchaseTooltip()` | Secondary purchase price & tooltip | Average purchase price converted to EUR/account currency.
| `average_purchase_currency` | string (ISO 4217) | Same as above | `src/tabs/security_detail.ts` – `composeAveragePurchaseTooltip()` | Tooltip currency labels | Currency associated with the average purchase values.
| `average_purchase_coverage_ratio` | decimal number (0–1) | Same as above | `src/tabs/security_detail.ts` – `composeAveragePurchaseTooltip()` | FX tooltip | Portion of holdings covered by the average price calculation.
| `performance_total_gain_eur` | decimal number | Same as above | `src/utils/performance.ts` – `normalizePerformancePayload()` | Total gain card | Total gain in EUR at the snapshot time.
| `performance_total_gain_pct` | decimal number (% stored as float) | Same as above | `src/utils/performance.ts` – `normalizePerformancePayload()` | Total gain card | Total gain percentage supplied by backend.
| `performance_day_change_native` | decimal number | Same as above | `src/utils/performance.ts` – `normalizePerformancePayload()` | “Tagesänderung” block | Day price change in native currency.
| `performance_day_change_eur` | decimal number | Same as above | `src/utils/performance.ts` – `normalizePerformancePayload()` | “Tagesänderung” block | Day price change converted to EUR.
| `performance_day_change_pct` | decimal number (% stored as float) | Same as above | `src/utils/performance.ts` – `normalizePerformancePayload()` | “Tagesänderung” block | Day percentage change persisted by backend.
| `performance_source` | enum (`market`, `estimated`, `cached`) | Same as above | `src/utils/performance.ts` – `normalizePerformancePayload()` | Tooltips | Provenance of performance data for tooltip messaging.
| `snapshot_source` | enum (`live`, `cache`) | Same as above | `src/tabs/security_detail.ts` – `buildCachedSnapshotNotice()` | Cached-data warning card | Indicates whether the snapshot originates from cached data.
| `purchase_fx_rate_timestamp` | ISO 8601 timestamp string | Same as above | `src/tabs/security_detail.ts` – `resolvePurchaseFxTimestamp()` | FX tooltip “Stand” date | Timestamp associated with the FX rate used for average purchase conversion.
| `account_currency_code` | string (ISO 4217) | Same as above | `src/tabs/security_detail.ts` – `resolveAccountCurrencyCode()` | FX tooltip | Account currency associated with the position.
| `security_id` | string (UUID) | `src/tabs/security_detail.ts` – `renderSecurityDetail()` | Same module – direct binding | Detail view root dataset | Canonical identifier tying history, snapshot, and DOM state together. |
| `name` | string | Same as above | Same as above | Detail header title | Security label. |
| `currency_code` | string | Same as above | Same as above | Header currency badges + chart axis | Security currency reference. |
| `holdings` | object `{ total_units: number, precise_units?: number }` | Same as above | Same as above | Header “Bestand” block | Total units owned; `precise_units` used when available. |
| `last_price` | object `{ value_native: number, value_eur?: number, fetched_at: string }` | Same as above | Same as above | Header “Letzter Preis” block + chart stitching | Latest market price info, including timestamp and EUR conversion if supplied. |
| `market_value_eur` | number | Same as above | Same as above | Header “Marktwert (EUR)” block | Current valuation in EUR. |
| `average_cost` | object mirroring the positions schema | Same as above | Same as above | Average purchase card + tooltip | Shares the same structure as `positions[].average_cost` so tooling can be reused. |
| `performance` | object `{ total: { gain_abs_eur: number, gain_pct: number }, day_change: { value_native: number, value_eur?: number, pct: number, coverage_ratio?: number, source?: string } }` | Same as above | Same as above | Performance tiles | Consolidated gain metrics without normalisation helpers. |
| `purchase_totals` | object `{ security_currency: number, account_currency?: number }` | Same as above | Same as above | FX tooltip context | Aggregated purchase values surfaced directly for tooltip ratios. |
| `purchase_fx` | object `{ rate: number, currency_pair: string, as_of: string }` | Same as above | Same as above | FX tooltip “Stand” line | Explicit FX rate metadata replacing timestamp inference logic. |
| `data_source` | enum (`live`/`cache`/`historic`) | Same as above | Same as above | Cached data notice | Declares whether the snapshot is cached so the UI can render the warning card. |
| `last_transaction_at` | ISO 8601 string or null | Same as above | Same as above | Meta section optional row | Backend-provided timestamp for the most recent trade involving the security. |

## Security history (`pp_reader/get_security_history` command)

| Name | Format | Requested by | Processed in | Displayed in | Description |
| --- | --- | --- | --- | --- | --- |
| `security_id` | string | `src/tabs/security_detail.ts` – `renderSecurityDetail()` | `src/tabs/security_detail.ts` – `normaliseHistorySeries()` | History chart context | Identifier tying the history series to the selected security.
| `prices` | array of price points ordered by date | Same as above | `src/tabs/security_detail.ts` – `normaliseHistorySeries()` | History chart | Time-series data for plotting.
| `prices[].date` | ISO 8601 date string | Same as above | `src/tabs/security_detail.ts` – `normaliseHistorySeries()` | History chart | Trading day for the price point.
| `prices[].close_native` | decimal number | Same as above | `src/tabs/security_detail.ts` – `normaliseHistorySeries()` | Chart series | Closing price in the security currency.
| `prices[].close_eur` | decimal number | Same as above | `src/tabs/security_detail.ts` – `normaliseHistorySeries()` | Chart series | Closing price converted to EUR for mixed-currency displays.
| `security_id` | string (UUID) | `src/tabs/security_detail.ts` – `renderSecurityDetail()` + range handlers | `src/tabs/security_detail.ts` – `applyHistorySeries()` | History chart container | Identifies which security the series belongs to and aligns lazy updates. |
| `range` | string (`1M`, `3M`, `1Y`, `ALL`, etc.) | Same as above | Same as above | Range selector dataset | Confirms which precomputed window the backend returned so the UI can avoid recomputation. |
| `prices[]` | array of `{ date: string (ISO 8601), close_native: number, close_eur?: number }` | Same as above | Same as above | Line chart + placeholders | Unified history entries with canonical fields, allowing the frontend to plot either native or EUR prices without scaling fallbacks. |
| `series_source` | enum (`portfolio_performance`/`market_data`) | Same as above | Same as above | Chart legend | States where the price series originated for user context. |

## Push infrastructure (`panels_updated` bus)

| Name | Format | Requested by | Processed in | Displayed in | Description |
| --- | --- | --- | --- | --- | --- |
| `data_type` | enum (`accounts`, `portfolio_values`, `portfolio_positions`, `last_file_update`) | `src/dashboard.ts` – event handler | `src/dashboard.ts` – `normalizeDashboardUpdate()`; `_doRender()` | Delegated handlers | Discriminator instructing the dashboard which dataset was updated.
| `data_type` | enum (`dashboard_totals`/`accounts`/`portfolio_values`/`portfolio_positions`/`last_file_update`) | `src/dashboard.ts` – event handler | `src/dashboard.ts` – `normalizeDashboardUpdate()` | Delegated modules above | Discriminator controlling which handler executes. |
| `payload` | typed object per section above | Same as above | Same as above | Downstream components | Carries the canonical data structures without requiring module-specific guards. |
| `synced_at` | ISO 8601 string | Same as above | Same as above | Debug overlay / logs | Timestamp indicating when the backend emitted the event, supporting debugging without client heuristics. |

