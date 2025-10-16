# Frontend Canonical Data Model

This document consolidates the future-facing backend payloads required by the Portfolio Performance Reader frontend. Each field listed below must be delivered by the integration API exactly as described so the UI can render without synthesising fallback data or duplicating calculations. Status enums are shared across payloads to avoid divergent interpretations (`complete`, `partial`, `missing`).

## Dashboard summary (`pp_reader/get_dashboard_summary` command, `dashboard_summary` push)

| Field | Format | Used in | Description |
| --- | --- | --- | --- |
| `summary.total_wealth_eur` | number (EUR) | Overview header wealth chip | Combined EUR wealth across all accounts and portfolios, pre-aggregated by the backend. |
| `summary.fx_status` | enum (`complete`, `partial`, `missing`) | Overview header warning banner | FX coverage flag controlling the warning banner across the dashboard. |
| `summary.calculated_at` | ISO 8601 datetime string | Header metadata + footer fallback | Timestamp when the backend produced the summary payload. Replaces both the previous totals timestamp and summary sync timestamp fields. |

## Account summaries (`pp_reader/get_accounts` command, `accounts` push)

| Field | Format | Used in | Description |
| --- | --- | --- | --- |
| `accounts` | array of account objects | Overview liquidity tables | Ordered list of all investment and cash accounts displayed in the overview. |
| `accounts[].account_id` | string (UUID) | Liquidity tables row keys & push update matching | Stable identifier matching the backend `accounts` table primary key. |
| `accounts[].name` | string | Liquidity tables | Human-readable account name rendered verbatim. |
| `accounts[].currency_code` | string (ISO 4217) | EUR/FX grouping headers & currency badges | Currency associated with the account. |
| `accounts[].balance_native` | number (account currency, nullable) | FX account table | Account balance expressed in the original account currency; nullable for EUR-only accounts. |
| `accounts[].balance_eur` | number (EUR) | EUR account table, totals calculations | Canonical EUR valuation for the account supplied directly by the backend. |
| `accounts[].fx_rate_updated_at` | ISO 8601 datetime string (nullable) | FX tooltips | Timestamp of the FX rate used to derive `balance_eur`. |
| `accounts[].fx_status` | enum (`complete`, `partial`, `missing`) | Account-level warning badges and banner aggregation | FX health indicator for the specific account, sharing the same backing dataset as the dashboard summary status. |

## Portfolio summaries (`pp_reader/get_portfolios` command, `portfolio_values` push)

| Field | Format | Used in | Description |
| --- | --- | --- | --- |
| `portfolios` | array of portfolio summary objects | Portfolio overview table | Collection of portfolio aggregates aligned with the frontend ordering. |
| `portfolios[].portfolio_id` | string (UUID) | Portfolio table row keys & push update matching | Primary key matching the backend `portfolios` table. |
| `portfolios[].name` | string | Portfolio table first column | Portfolio display name shown in the overview. |
| `portfolios[].position_count` | integer | “Anzahl Positionen” column | Persisted count of active positions. |
| `portfolios[].current_value_eur` | number (EUR) | “Aktueller Wert” column & totals | Current market value already converted to EUR. |
| `portfolios[].purchase_value_eur` | number (EUR) | Hidden totals dataset | Total invested capital in EUR used for performance calculations. |
| `portfolios[].performance.gain_eur` | number (EUR) | Gain column (absolute) | Absolute gain supplied directly by backend calculations. |
| `portfolios[].performance.gain_pct` | number (%) | Gain column (percentage) | Percentage gain derived by backend logic. |
| `portfolios[].valuation_state.status` | enum (`complete`, `partial`, `missing`) | Warning badge + totals guard | Backend evaluation of valuation completeness (covers FX and missing prices). |
| `portfolios[].valuation_state.missing_positions` | integer (optional) | Tooltip / badge copy | Count of holdings lacking valuation data when `status` is `partial` or `missing`. |

## Portfolio positions (`pp_reader/get_portfolio_positions` command, `portfolio_positions` push)

| Field | Format | Used in | Description |
| --- | --- | --- | --- |
| `portfolio_id` | string (UUID) | Expandable table container | Identifies which portfolio the enclosed positions belong to. |
| `positions` | array of position objects | Positions detail tables | Ordered holdings for the selected portfolio. |
| `positions[].position_id` | string (UUID) | Row dataset attributes & diffing | Stable identifier for the position row within the portfolio. |
| `positions[].portfolio_id` | string (UUID) | Push reconciliation | Portfolio identifier repeated for differential updates. |
| `positions[].security_id` | string (UUID) | Row dataset attributes & detail navigation | Security identifier used to open the detail tab. |
| `positions[].name` | string | Positions table first column | Security label rendered verbatim. |
| `positions[].quantity` | number (supports fractional) | “Bestand” column | Persisted holdings amount with backend precision. |
| `positions[].current_value_eur` | number (EUR) | “Aktueller Wert” column & totals | EUR market value supplied directly by the backend. |
| `positions[].purchase_value_eur` | number (EUR) | Hidden dataset & FX tooltip | Aggregate purchase cost per holding for gain and disclosure logic. |
| `positions[].average_cost.primary.value` | number | “Ø Kaufpreis” primary line | Average price per unit in the security currency. Shares the same dataset as the security snapshot average cost. |
| `positions[].average_cost.primary.currency` | string (ISO 4217) | “Ø Kaufpreis” primary line | Currency code for the primary average price. |
| `positions[].average_cost.secondary.value` | number (EUR, optional) | “Ø Kaufpreis” secondary line | Average price converted from the primary value into EUR by applying the backend FX translation. |
| `positions[].average_cost.secondary.currency` | string (`"EUR"`, optional) | “Ø Kaufpreis” secondary line | Always `EUR`; matches the converted secondary average price. |
| `positions[].average_cost.fx_rate_timestamp` | ISO 8601 datetime string (nullable) | Tooltip FX timestamp | Timestamp of the FX rate supporting the converted average price. |
| `positions[].security_currency_code` | string (ISO 4217) | Currency badges | Trading currency for the security, reused in tooltips and formatting. |
| `positions[].performance.gain_eur` | number (EUR) | Gain column (absolute) | Direct gain metric delivered by the backend. |
| `positions[].performance.gain_pct` | number (%) | Gain column (percentage) | Percentage gain supplied without frontend calculations. |
| `positions[].valuation_state.status` | enum (`complete`, `partial`, `missing`) | Warning icons & dataset metadata | Backend evaluation of valuation completeness for the holding. |
| `positions[].valuation_state.reason` | string (optional) | Warning tooltip | Optional explanation for non-`complete` statuses. |
| `positions[].data_state.status` | enum (`ok`, `error`) | Inline error banner | Declares whether the backend detected an error while assembling the positions payload. |
| `positions[].data_state.message` | string (optional) | Inline error banner | Human-readable error message shown when `status` is `error`. |

## Last file update (`pp_reader/get_last_file_update` command, `last_file_update` push)

| Field | Format | Used in | Description |
| --- | --- | --- | --- |
| `last_file_update.ingested_at` | ISO 8601 datetime string | Footer card metadata & header fallback | Timestamp of the most recent portfolio import processed by the backend. Consolidates prior duplicate timestamp fields. |
| `last_file_update.source` | string (e.g. `"portfolio_performance"`) | Footer caption | Identifies the origin of the imported data for user messaging. |

## Security snapshot (`pp_reader/get_security_snapshot` command, `security_snapshot` push)

| Field | Format | Used in | Description |
| --- | --- | --- | --- |
| `security_id` | string (UUID) | Detail tab routing & shared dataset keys | Canonical identifier tying the snapshot to the selected security. |
| `snapshot_timestamp` | ISO 8601 datetime string | Header metadata | Timestamp representing when the snapshot values were recorded. |
| `name` | string | Detail header title | Security display name shown in the detail view. |
| `currency_code` | string (ISO 4217) | Header metadata & chart legend | Trading currency for all price figures. |
| `account_currency_code` | string (ISO 4217, optional) | FX tooltip | Account currency associated with the position when different from the security currency. |
| `holdings.total_units` | number | Header “Bestand” block | Total units owned according to the latest snapshot. |
| `holdings.precise_units` | number (optional) | Header “Bestand” block tooltip | High-precision units when available. |
| `last_price.native_value` | number | “Letzter Preis” block & chart stitching | Latest trade price delivered already scaled in the security currency. |
| `last_price.account_value` | number (optional) | “Letzter Preis” secondary display | Converted last price supplied when available (EUR/account currency). |
| `last_price.fetched_at` | ISO 8601 datetime string | Price freshness tooltip | Timestamp of the latest market price. |
| `market_value_eur` | number (EUR) | “Marktwert (EUR)” block | Market value expressed in EUR. |
| `purchase_value_eur` | number (EUR) | FX tooltip context | Total purchase value in EUR used for gain calculations. |
| `average_cost.primary.value` | number | Average purchase card primary line | Shares the same backend dataset as `positions[].average_cost.primary.value`. |
| `average_cost.primary.currency` | string (ISO 4217) | Average purchase card primary line | Currency code for the primary average purchase price. |
| `average_cost.secondary.value` | number (EUR, optional) | Average purchase card secondary line | Average price converted from the primary value into EUR by applying the backend FX translation. |
| `average_cost.secondary.currency` | string (`"EUR"`, optional) | Average purchase card secondary line | Always `EUR`; matches the converted secondary average price. |
| `average_cost.fx_rate_timestamp` | ISO 8601 datetime string (nullable) | Tooltip FX timestamp | Timestamp of the FX rate supporting the converted average price. |
| `performance.total.gain_eur` | number (EUR) | Total gain tile | Total gain provided by backend calculations. |
| `performance.total.gain_pct` | number (%) | Total gain tile | Total gain percentage delivered by the backend. |
| `performance.day_change.value_native` | number | “Tagesänderung” block | Day price change in the security currency. |
| `performance.day_change.value_eur` | number (optional) | “Tagesänderung” block | Day price change converted to EUR. |
| `performance.day_change.pct` | number (%) | “Tagesänderung” block | Day percentage change persisted by backend. |
| `performance.day_change.coverage_ratio` | number (0–1, optional) | Tooltip | Coverage of the day change data when incomplete. |
| `performance.day_change.source` | enum (`market`, `estimated`, `cached`) | Tooltip | Provenance of the day change values. |
| `purchase_totals.security_currency` | number | FX tooltip | Aggregate purchase value in the security currency. |
| `purchase_totals.account_currency` | number (EUR, optional) | FX tooltip | Aggregate purchase value converted to EUR by the backend, regardless of the account currency used at purchase time. |
| `purchase_fx.rate` | number | FX tooltip | Exchange rate used for conversions in the purchase context. |
| `purchase_fx.currency_pair` | string | FX tooltip | Currency pair used for the exchange rate. |
| `purchase_fx.as_of` | ISO 8601 datetime string | FX tooltip “Stand” line | Timestamp associated with `purchase_fx.rate`. |
| `data_source` | enum (`live`, `cache`, `historic`) | Cached data notice | Indicates whether the snapshot originates from live or cached data. |
| `last_transaction_at` | ISO 8601 datetime string (nullable) | Meta section optional row | Timestamp for the most recent trade involving the security. |

## Security history (`pp_reader/get_security_history` command, `security_history` push)

| Field | Format | Used in | Description |
| --- | --- | --- | --- |
| `security_id` | string (UUID) | History chart container | Identifies which security the series belongs to. |
| `range` | string (`1M`, `3M`, `1Y`, `5Y`, `ALL`, etc.) | Range selector dataset | Confirms which pre-computed window the backend returned. |
| `series_source` | enum (`portfolio_performance`, `market_data`) | Chart legend | States where the price series originated. |
| `prices` | array of price points ordered by date | History chart | Time-series data for plotting. |
| `prices[].date` | ISO 8601 date string | Chart axis | Daily timestamp of the price point. |
| `prices[].close_native` | number | Chart series | Closing price in the security currency. |
| `prices[].close_eur` | number (optional) | EUR overlay & tooltips | Closing price converted to EUR when supplied. |

## Live update envelope (`panels_updated` bus)

| Field | Format | Used in | Description |
| --- | --- | --- | --- |
| `data_type` | enum (`dashboard_summary`, `accounts`, `portfolio_values`, `portfolio_positions`, `last_file_update`, `security_snapshot`, `security_history`) | `src/dashboard.ts` event handler | Discriminator instructing the dashboard which handler should process the payload. |
| `payload` | object matching the schemas above | Delegated modules | Dataset delivered to the relevant handler without additional guards. |
| `synced_at` | ISO 8601 datetime string (optional) | Debug overlay / logs | Timestamp indicating when the backend emitted the event. |

