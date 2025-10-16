# Frontend Future Data Model

The tables below describe the canonical payloads the Portfolio Performance Reader frontend expects from the backend after the refactor. Each value is intended to mirror a column or deterministic calculation stored in the integration database so that the UI can render without synthesising fallback data.

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

## Last file update (`pp_reader/get_last_file_update` command, `last_file_update` push)

| Name | Format | Requested by | Processed in | Displayed in | Description |
| --- | --- | --- | --- | --- | --- |
| `last_file_update` | ISO 8601 timestamp string | `src/tabs/overview.ts` – `renderDashboard()` | `src/data/updateConfigsWS.ts` – `handleLastFileUpdate()` | Footer card metadata and header fallback | Timestamp of the most recent portfolio import stored alongside the processed file.

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

## Security history (`pp_reader/get_security_history` command)

| Name | Format | Requested by | Processed in | Displayed in | Description |
| --- | --- | --- | --- | --- | --- |
| `security_id` | string | `src/tabs/security_detail.ts` – `renderSecurityDetail()` | `src/tabs/security_detail.ts` – `normaliseHistorySeries()` | History chart context | Identifier tying the history series to the selected security.
| `prices` | array of price points ordered by date | Same as above | `src/tabs/security_detail.ts` – `normaliseHistorySeries()` | History chart | Time-series data for plotting.
| `prices[].date` | ISO 8601 date string | Same as above | `src/tabs/security_detail.ts` – `normaliseHistorySeries()` | History chart | Trading day for the price point.
| `prices[].close_native` | decimal number | Same as above | `src/tabs/security_detail.ts` – `normaliseHistorySeries()` | Chart series | Closing price in the security currency.
| `prices[].close_eur` | decimal number | Same as above | `src/tabs/security_detail.ts` – `normaliseHistorySeries()` | Chart series | Closing price converted to EUR for mixed-currency displays.

## Push infrastructure (`panels_updated` bus)

| Name | Format | Requested by | Processed in | Displayed in | Description |
| --- | --- | --- | --- | --- | --- |
| `data_type` | enum (`accounts`, `portfolio_values`, `portfolio_positions`, `last_file_update`) | `src/dashboard.ts` – event handler | `src/dashboard.ts` – `normalizeDashboardUpdate()`; `_doRender()` | Delegated handlers | Discriminator instructing the dashboard which dataset was updated.

