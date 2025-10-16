# Frontend Future Data Model

This document proposes a consolidated backend schema tailored for the Portfolio Performance Reader dashboard. Every value displayed by the frontend should map directly to persisted fields exposed through the integration API, eliminating client-side fallbacks or duplicate derivations.

## Dashboard summary (initial bootstrap payload, `pp_reader/get_dashboard_summary`)

| Name | Format | Requested by | Processed in | Displayed in | Description |
| --- | --- | --- | --- | --- | --- |
| `summary.total_wealth_eur` | number (EUR) | `src/tabs/overview.ts` – `renderDashboard()` | `src/tabs/overview.ts` – `renderDashboard()` | Overview header total wealth chip | Pre-computed combined EUR wealth across accounts and portfolios to avoid client aggregation. |
| `summary.fx_status` | enum (`complete`, `partial`, `missing`) | `src/tabs/overview.ts` – `renderDashboard()` | `src/tabs/overview.ts` – `renderDashboard()` | Overview header warning banner | Overall FX coverage flag driving the warning banner and fallback copy. |
| `summary.last_sync_completed_at` | ISO 8601 datetime string | `src/tabs/overview.ts` – `renderDashboard()` | `src/data/updateConfigsWS.ts` – `handleLastFileUpdate()` | Footer metadata and header fallback | Timestamp of the latest backend sync/import used throughout the dashboard. |

## Account summaries (`pp_reader/get_accounts`)

| Name | Format | Requested by | Processed in | Displayed in | Description |
| --- | --- | --- | --- | --- | --- |
| `accounts[].account_id` | string (UUID) | `src/tabs/overview.ts` – `renderDashboard()` | `src/tabs/overview.ts` – `renderDashboard()` | Liquidity tables row keys | Stable identifier for matching push updates and DOM rows. |
| `accounts[].name` | string | Same as above | Same as above | Liquidity tables | Account display name shown verbatim. |
| `accounts[].currency_code` | string (ISO 4217) | Same as above | Same as above | EUR/FX account grouping headers | Currency that decides EUR vs. FX table and label rendering. |
| `accounts[].balance_native` | number (account currency) | Same as above | Same as above | FX accounts table | Stored balance expressed in the account’s native currency. |
| `accounts[].balance_eur` | number (EUR) | Same as above | Same as above | EUR accounts table and totals | EUR-converted balance supplied directly by backend to avoid client conversion. |
| `accounts[].fx_rate_updated_at` | ISO 8601 datetime string (nullable) | Same as above | Same as above | FX warning tooltip | Timestamp of the FX rate used to derive `balance_eur`, enabling tooltips without guessing. |
| `accounts[].fx_status` | enum (`up_to_date`, `stale`, `unavailable`) | Same as above | Same as above | Warning badges per account | FX coverage quality for the specific account. |

## Portfolio summaries (`pp_reader/get_portfolios`)

| Name | Format | Requested by | Processed in | Displayed in | Description |
| --- | --- | --- | --- | --- | --- |
| `portfolios[].portfolio_id` | string (UUID) | `src/tabs/overview.ts` – `renderDashboard()` | `src/tabs/overview.ts` – `renderDashboard()` | Portfolio summary table row keys | Identifier connecting summary rows, positions, and updates. |
| `portfolios[].name` | string | Same as above | Same as above | Portfolio summary table | Portfolio title shown in the expandable list. |
| `portfolios[].position_count` | integer | Same as above | Same as above | Summary table “Anzahl Positionen” column | Persisted count of active positions. |
| `portfolios[].current_value_eur` | number (EUR) | Same as above | Same as above | Summary table “Aktueller Wert” column & totals | EUR market value provided directly by backend. |
| `portfolios[].purchase_value_eur` | number (EUR) | Same as above | Same as above | Hidden dataset for percentage calculations | Total invested capital in EUR used to compute gains without client aggregation. |
| `portfolios[].missing_positions` | integer | Same as above | Same as above | FX availability badge | Count of holdings lacking valuation data. |
| `portfolios[].fx_status` | enum (`complete`, `partial`, `missing`) | Same as above | Same as above | Summary row warning indicator | FX health indicator for the portfolio row. |
| `portfolios[].performance.gain_eur` | number (EUR) | Same as above | Same as above | Summary table absolute gain column | Total gain provided as a persisted metric. |
| `portfolios[].performance.gain_pct` | number (%) | Same as above | Same as above | Summary table percentage column | Percentage gain sourced from backend calculations. |

## Portfolio positions (`pp_reader/get_portfolio_positions`)

| Name | Format | Requested by | Processed in | Displayed in | Description |
| --- | --- | --- | --- | --- | --- |
| `positions[].portfolio_id` | string (UUID) | `src/tabs/overview.ts` – `attachPortfolioToggleHandler()` | `src/data/updateConfigsWS.ts` – `handlePortfolioPositionsUpdate()` | Positions detail tables | Associates positions payload with its parent portfolio. |
| `positions[].security_id` | string (UUID) | Same as above | `src/tabs/overview.ts` – `renderPositionsTable()` | Row dataset attributes & detail navigation | Security identifier used to open the detail tab. |
| `positions[].name` | string | Same as above | Same as above | Positions table first column | Security label rendered verbatim. |
| `positions[].quantity` | number (supports fractional) | Same as above | Same as above | “Bestand” column | Persisted holdings amount with desired precision. |
| `positions[].current_value_eur` | number (EUR) | Same as above | Same as above | “Aktueller Wert” column | EUR market value supplied directly. |
| `positions[].purchase_price.native_value` | number (security currency) | Same as above | `src/tabs/overview.ts` – `renderPositionsTable()` | Purchase price primary line | Average price per unit in the security currency. |
| `positions[].purchase_price.account_value` | number (account/EUR currency) | Same as above | Same as above | Purchase price secondary line | Average price converted to the account currency when different from native. |
| `positions[].purchase_price.account_currency` | string (ISO 4217) | Same as above | Same as above | Purchase price secondary label | Currency code for the secondary purchase price. |
| `positions[].purchase_price.fx_rate_updated_at` | ISO 8601 datetime string (nullable) | Same as above | Same as above | Purchase price tooltip | Timestamp of the FX rate supporting the converted purchase price. |
| `positions[].purchase_price.source` | enum (`lots_weighted`, `portfolio_weighted`, `imported`) | Same as above | Same as above | Tooltip provenance line | Clarifies how the purchase price was computed. |
| `positions[].purchase_price.coverage_ratio` | number (0–1) | Same as above | Same as above | Tooltip coverage meter | Share of the position backed by reliable purchase data. |
| `positions[].performance.gain_eur` | number (EUR) | Same as above | Same as above | Positions table absolute gain | Direct gain metric. |
| `positions[].performance.gain_pct` | number (%) | Same as above | Same as above | Positions table percentage column | Gain percentage for formatting and colour logic. |

## Security snapshot (`pp_reader/get_security_snapshot`)

| Name | Format | Requested by | Processed in | Displayed in | Description |
| --- | --- | --- | --- | --- | --- |
| `snapshot.security_id` | string (UUID) | `src/tabs/security_detail.ts` – `renderSecurityDetail()` | `src/tabs/security_detail.ts` – `renderSecurityDetail()` | Detail tab routing | Primary key matching the selected security. |
| `snapshot.name` | string | Same as above | Same as above | Detail header title | Security display name. |
| `snapshot.currency_code` | string (ISO 4217) | Same as above | `src/tabs/security_detail.ts` – pricing helpers | Header metadata and chart legend | Base currency for all price figures. |
| `snapshot.holdings` | number | Same as above | `src/tabs/security_detail.ts` – `buildHeaderMeta()` | Header “Bestand” block | Quantity of units held, persisted precisely. |
| `snapshot.last_price.native_value` | number (security currency) | Same as above | `src/tabs/security_detail.ts` – `buildHeaderMeta()` | “Letzter Preis” block & chart stitching | Latest trade price delivered already scaled. |
| `snapshot.last_price.account_value` | number (EUR/account currency) | Same as above | Same as above | Price fallback display | Converted last price supplied when available. |
| `snapshot.last_price.fetched_at` | ISO 8601 datetime string | Same as above | Same as above | Price freshness tooltip | Timestamp of the latest market price. |
| `snapshot.market_value_eur` | number (EUR) | Same as above | Same as above | “Marktwert (EUR)” block | Market value expressed in EUR. |
| `snapshot.purchase_value_eur` | number (EUR) | Same as above | Same as above | FX inference logic | Persisted purchase total in EUR for tooltips. |
| `snapshot.purchase_price.native_value` | number (security currency) | Same as above | Same as above | Average purchase price primary line | Backend-provided average price. |
| `snapshot.purchase_price.account_value` | number (account currency) | Same as above | Same as above | Average purchase price secondary line | Converted average price supplied directly. |
| `snapshot.purchase_price.account_currency` | string (ISO 4217) | Same as above | Same as above | Secondary line label | Currency used for the account-level price. |
| `snapshot.purchase_price.fx_rate_updated_at` | ISO 8601 datetime string (nullable) | Same as above | Same as above | Tooltip FX timestamp | Timestamp used for tooltip copy. |
| `snapshot.purchase_price.source` | enum (`lots_weighted`, `portfolio_weighted`, `imported`) | Same as above | Same as above | Tooltip provenance | Identifies how the purchase price was calculated. |
| `snapshot.purchase_price.coverage_ratio` | number (0–1) | Same as above | Same as above | Tooltip coverage meter | Indicates completeness of purchase data. |
| `snapshot.performance.total.gain_eur` | number (EUR) | Same as above | `src/utils/performance.ts` – `normalizePerformancePayload()` | Total gain card | Persisted cumulative gain. |
| `snapshot.performance.total.gain_pct` | number (%) | Same as above | Same as above | Total gain card | Percentage representation of total gain. |
| `snapshot.performance.day.gain_eur` | number (EUR) | Same as above | Same as above | Day change card | Day-over-day change expressed in EUR. |
| `snapshot.performance.day.gain_pct` | number (%) | Same as above | Same as above | Day change card | Day-over-day change percentage. |
| `snapshot.performance.day.source` | enum (`market_close`, `intraday`, `estimate`) | Same as above | Same as above | Tooltip provenance | Explains the basis of the day change. |
| `snapshot.performance.day.coverage_ratio` | number (0–1) | Same as above | Same as above | Tooltip coverage meter | Reliability indicator for day performance. |
| `snapshot.data_source` | enum (`live`, `cache`, `stale`) | Same as above | `src/tabs/security_detail.ts` – `buildCachedSnapshotNotice()` | Cached data warning | Indicates if the snapshot originates from cache. |

## Security history (`pp_reader/get_security_history`)

| Name | Format | Requested by | Processed in | Displayed in | Description |
| --- | --- | --- | --- | --- | --- |
| `history[].date` | ISO 8601 date string | `src/tabs/security_detail.ts` – `renderSecurityDetail()` | `src/tabs/security_detail.ts` – `normaliseHistorySeries()` | History chart axis | Daily timestamp of the price point. |
| `history[].close_native` | number (security currency) | Same as above | Same as above | History chart series | Close price per day already normalised by backend. |
| `history[].close_eur` | number (EUR) | Same as above | Same as above | EUR overlay & tooltips | Optional EUR-denominated close price for overlays without client conversion. |

## Live update envelope (`panels_updated` event bus)

| Name | Format | Requested by | Processed in | Displayed in | Description |
| --- | --- | --- | --- | --- | --- |
| `update.data_type` | enum (`accounts`, `portfolios`, `portfolio_positions`, `dashboard_summary`, `security_snapshot`, `security_history`) | `src/dashboard.ts` – event handler | `src/dashboard.ts` – `normalizeDashboardUpdate()` | Delegates to context-specific renderers | Discriminator telling the frontend which handler to run. |
| `update.payload` | object (matching schemas above) | Same as above | Same as above | Same as above | Body containing the dataset shaped exactly like the primary query responses. |

