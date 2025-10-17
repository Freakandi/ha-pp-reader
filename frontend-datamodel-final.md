# Frontend Canonical Data Model

This document consolidates the future-facing backend payloads required by the Portfolio Performance Reader frontend. Each field listed below must be delivered by the integration API exactly as described so the UI can render without synthesising fallback data or duplicating calculations. Status enums are shared across payloads to avoid divergent interpretations (`complete`, `partial`, `missing`).

**Recommendation:** The six backend data source options below cover the full set of frontend needs; no additional sourcing categories are required.

## Dashboard summary (`pp_reader/get_dashboard_summary` command, `dashboard_summary` push)

| Field | Format | Used in | Description | Data source back end | Source logic confirmed |
| --- | --- | --- | --- | --- | --- |
| `summary.total_wealth_eur` | number (EUR) | Overview header wealth chip | Combined EUR wealth across all accounts and portfolios, pre-aggregated by the backend. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `summary.fx_status` | enum (`complete`, `partial`, `missing`) | Overview header warning banner | FX coverage flag controlling the warning banner across the dashboard. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `summary.calculated_at` | ISO 8601 datetime string | Header metadata + footer fallback | Timestamp when the backend produced the summary payload. Replaces both the previous totals timestamp and summary sync timestamp fields. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |

## Account summaries (`pp_reader/get_accounts` command, `accounts` push)

| Field | Format | Used in | Description | Data source back end | Source logic confirmed |
| --- | --- | --- | --- | --- | --- |
| `accounts` | array of account objects | Overview liquidity tables | Ordered list of all investment and cash accounts displayed in the overview. | 1. passed from portfolio file and stored in database |  |
| `accounts[].account_id` | string (UUID) | Liquidity tables row keys & push update matching | Stable identifier matching the backend `accounts` table primary key. | 1. passed from portfolio file and stored in database |  |
| `accounts[].name` | string | Liquidity tables | Human-readable account name rendered verbatim. | 1. passed from portfolio file and stored in database |  |
| `accounts[].currency_code` | string (ISO 4217) | EUR/FX grouping headers & currency badges | Currency associated with the account. | 1. passed from portfolio file and stored in database |  |
| `accounts[].balance_native` | number (account currency, nullable) | FX account table | Account balance expressed in the original account currency; nullable for EUR-only accounts. | 1. passed from portfolio file and stored in database |  |
| `accounts[].balance_eur` | number (EUR) | EUR account table, totals calculations | Canonical EUR valuation for the account supplied directly by the backend. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `accounts[].fx_rate_updated_at` | ISO 8601 datetime string (nullable) | FX tooltips | Timestamp of the FX rate used to derive `balance_eur`. | 3. Frankfurt, APIFX fetch store and database. |  |
| `accounts[].fx_status` | enum (`complete`, `partial`, `missing`) | Account-level warning badges and banner aggregation | FX health indicator for the specific account, sharing the same backing dataset as the dashboard summary status. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |

## Portfolio summaries (`pp_reader/get_portfolios` command, `portfolio_values` push)

| Field | Format | Used in | Description | Data source back end | Source logic confirmed |
| --- | --- | --- | --- | --- | --- |
| `portfolios` | array of portfolio summary objects | Portfolio overview table | Collection of portfolio aggregates aligned with the frontend ordering. | 1. passed from portfolio file and stored in database |  |
| `portfolios[].portfolio_id` | string (UUID) | Portfolio table row keys & push update matching | Primary key matching the backend `portfolios` table. | 1. passed from portfolio file and stored in database |  |
| `portfolios[].name` | string | Portfolio table first column | Portfolio display name shown in the overview. | 1. passed from portfolio file and stored in database |  |
| `portfolios[].position_count` | integer | “Anzahl Positionen” column | Persisted count of active positions. | 4. Calculate and stored inside the database. |  |
| `portfolios[].current_value_eur` | number (EUR) | “Aktueller Wert” column & totals | Current market value already converted to EUR. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `portfolios[].purchase_value_eur` | number (EUR) | Hidden totals dataset | Total invested capital in EUR used for performance calculations. | 4. Calculate and stored inside the database. |  |
| `portfolios[].performance.gain_eur` | number (EUR) | Gain column (absolute) | Absolute gain supplied directly by backend calculations. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `portfolios[].performance.gain_pct` | number (%) | Gain column (percentage) | Percentage gain derived by backend logic. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `portfolios[].valuation_state.status` | enum (`complete`, `partial`, `missing`) | Warning badge + totals guard | Backend evaluation of valuation completeness (covers FX and missing prices). | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `portfolios[].valuation_state.missing_positions` | integer (optional) | Tooltip / badge copy | Count of holdings lacking valuation data when `status` is `partial` or `missing`. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |

## Portfolio positions (`pp_reader/get_portfolio_positions` command, `portfolio_positions` push)

| Field | Format | Used in | Description | Data source back end | Source logic confirmed |
| --- | --- | --- | --- | --- | --- |
| `portfolio_id` | string (UUID) | Expandable table container | Identifies which portfolio the enclosed positions belong to. | 1. passed from portfolio file and stored in database |  |
| `positions` | array of position objects | Positions detail tables | Ordered holdings for the selected portfolio. | 1. passed from portfolio file and stored in database | Portfolio transactions carry the `PTransaction.portfolio`/`security` strings, `_sync_transactions` persists them into `transactions.portfolio` and `.security`, `_sync_portfolio_securities` aggregates those records into `portfolio_securities`, and `get_portfolio_positions` returns that table as the `positions` list. |
| `positions[].position_id` | string (UUID) | Row dataset attributes & diffing | Stable identifier for the position row within the portfolio. | 4. Calculate and stored inside the database. |  |
| `positions[].portfolio_id` | string (UUID) | Push reconciliation | Portfolio identifier repeated for differential updates. | 1. passed from portfolio file and stored in database | `PPortfolio.uuid` arrives as a string, `_sync_portfolios` upserts it into `portfolios.uuid`, and both `get_portfolio_positions` and the websocket response filter and emit rows by that stored UUID for each positions payload. |
| `positions[].security_id` | string (UUID) | Row dataset attributes & detail navigation | Security identifier used to open the detail tab. | 1. passed from portfolio file and stored in database | `PSecurity.uuid` is persisted via `_sync_securities` into `securities.uuid`, and `get_portfolio_positions` selects the matching `ps.security_uuid` so each position keeps the proto-provided key. |
| `positions[].name` | string | Positions table first column | Security label rendered verbatim. | 1. passed from portfolio file and stored in database | `PSecurity.name` is written to `securities.name` inside `_sync_securities`, and `get_portfolio_positions` joins that column (`s.name`) to populate the display label. |
| `positions[].quantity` | number (supports fractional) | “Bestand” column | Persisted holdings amount with backend precision. | 4. Calculate and stored inside the database. |  |
| `positions[].current_value_eur` | number (EUR) | “Aktueller Wert” column & totals | EUR market value supplied directly by the backend. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `positions[].purchase_value_eur` | number (EUR) | Hidden dataset & FX tooltip | Aggregate purchase cost per holding for gain and disclosure logic. | 4. Calculate and stored inside the database. |  |
| `positions[].average_cost.primary.value` | number | “Ø Kaufpreis” primary line | Average price per unit in the security currency. Shares the same dataset as the security snapshot average cost. | 4. Calculate and stored inside the database. |  |
| `positions[].average_cost.primary.currency` | string (ISO 4217) | “Ø Kaufpreis” primary line | Currency code for the primary average price. | 1. passed from portfolio file and stored in database | The same `PSecurity.currencyCode` persisted on `securities.currency_code` should label these averages, but `AverageCostSelection`/`get_portfolio_positions` only emit numeric slots with no currency tag today, so we should extend the average_cost payload to include the stored code. |
| `positions[].average_cost.secondary.value` | number (EUR, optional) | “Ø Kaufpreis” secondary line | Average price converted from the primary value into EUR by applying the backend FX translation. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `positions[].average_cost.secondary.currency` | string (`"EUR"`, optional) | “Ø Kaufpreis” secondary line | Always `EUR`; matches the converted secondary average price. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `positions[].average_cost.fx_rate_timestamp` | ISO 8601 datetime string (nullable) | Tooltip FX timestamp | Timestamp of the FX rate supporting the converted average price. | 3. Frankfurt, APIFX fetch store and database. |  |
| `positions[].security_currency_code` | string (ISO 4217) | Currency badges | Trading currency for the security, reused in tooltips and formatting. | 1. passed from portfolio file and stored in database | Portfolio proto exposes `PSecurity.currencyCode` (string) and `_sync_securities` writes it to `securities.currency_code`, but `get_portfolio_positions` never selects or returns that column yet, so we need a follow-up to forward the stored currency with each position. |
| `positions[].performance.gain_eur` | number (EUR) | Gain column (absolute) | Direct gain metric delivered by the backend. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `positions[].performance.gain_pct` | number (%) | Gain column (percentage) | Percentage gain supplied without frontend calculations. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `positions[].valuation_state.status` | enum (`complete`, `partial`, `missing`) | Warning icons & dataset metadata | Backend evaluation of valuation completeness for the holding. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `positions[].valuation_state.reason` | string (optional) | Warning tooltip | Optional explanation for non-`complete` statuses. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `positions[].data_state.status` | enum (`ok`, `error`) | Inline error banner | Declares whether the backend detected an error while assembling the positions payload. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `positions[].data_state.message` | string (optional) | Inline error banner | Human-readable error message shown when `status` is `error`. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |

## Last file update (`pp_reader/get_last_file_update` command, `last_file_update` push)

| Field | Format | Used in | Description | Data source back end | Source logic confirmed |
| --- | --- | --- | --- | --- | --- |
| `last_file_update.ingested_at` | ISO 8601 datetime string | Footer card metadata & header fallback | Timestamp of the most recent portfolio import processed by the backend. Consolidates prior duplicate timestamp fields. | 4. Calculate and stored inside the database. |  |
| `last_file_update.source` | string (e.g. `"portfolio_performance"`) | Footer caption | Identifies the origin of the imported data for user messaging. | 1. passed from portfolio file and stored in database | Metadata sync today only upserts the ISO timestamp into the two-column `metadata` table and the websocket handler formats that string, so we still need to extend the schema/command pipeline to persist and emit the source flag alongside it. |

## Security snapshot (`pp_reader/get_security_snapshot` command, `security_snapshot` push)

| Field | Format | Used in | Description | Data source back end | Source logic confirmed |
| --- | --- | --- | --- | --- | --- |
| `security_id` | string (UUID) | Detail tab routing & shared dataset keys | Canonical identifier tying the snapshot to the selected security. | 1. passed from portfolio file and stored in database | Portfolio file passes `PSecurity.uuid`, `_sync_securities` writes it into `securities.uuid`, and the snapshot lookup queries by that UUID. |
| `snapshot_timestamp` | ISO 8601 datetime string | Header metadata | Timestamp representing when the snapshot values were recorded. | 4. Calculate and stored inside the database. |  |
| `name` | string | Detail header title | Security display name shown in the detail view. | 1. passed from portfolio file and stored in database | `PSecurity.name` persists into `securities.name` via `_sync_securities`, and `get_security_snapshot` surfaces the stored value. |
| `currency_code` | string (ISO 4217) | Header metadata & chart legend | Trading currency for all price figures. | 1. passed from portfolio file and stored in database | `PSecurity.currencyCode` flows into `securities.currency_code` through `_sync_securities`, which `get_security_snapshot` reads for the snapshot currency. |
| `account_currency_code` | string (ISO 4217, optional) | FX tooltip | Account currency associated with the position when different from the security currency. | 1. passed from portfolio file and stored in database | Portfolio proto supplies `PPortfolio.referenceAccount` and the linked `PAccount.currencyCode` strings, which `_sync_portfolios` and `_sync_accounts` persist into `portfolios.reference_account` and `accounts.currency_code` so the snapshot can read the holder’s account currency. |
| `holdings.total_units` | number | Header “Bestand” block | Total units owned according to the latest snapshot. | 4. Calculate and stored inside the database. |  |
| `holdings.precise_units` | number (optional) | Header “Bestand” block tooltip | High-precision units when available. | 4. Calculate and stored inside the database. |  |
| `last_price.native_value` | number | “Letzter Preis” block & chart stitching | Latest trade price delivered already scaled in the security currency. | 2. Yahoo query life fetch store in database. |  |
| `last_price.account_value` | number (optional) | “Letzter Preis” secondary display | Converted last price supplied when available (EUR/account currency). | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `last_price.fetched_at` | ISO 8601 datetime string | Price freshness tooltip | Timestamp of the latest market price. | 2. Yahoo query life fetch store in database. |  |
| `market_value_eur` | number (EUR) | “Marktwert (EUR)” block | Market value expressed in EUR. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `purchase_value_eur` | number (EUR) | FX tooltip context | Total purchase value in EUR used for gain calculations. | 4. Calculate and stored inside the database. |  |
| `average_cost.primary.value` | number | Average purchase card primary line | Shares the same backend dataset as `positions[].average_cost.primary.value`. | 4. Calculate and stored inside the database. |  |
| `average_cost.primary.currency` | string (ISO 4217) | Average purchase card primary line | Currency code for the primary average purchase price. | 1. passed from portfolio file and stored in database | The portfolio file exposes `PSecurity.currencyCode` (string), and `_sync_securities` writes it into `securities.currency_code`, which `get_security_snapshot` selects for the primary average-cost currency. |
| `average_cost.secondary.value` | number (EUR, optional) | Average purchase card secondary line | Average price converted from the primary value into EUR by applying the backend FX translation. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `average_cost.secondary.currency` | string (`"EUR"`, optional) | Average purchase card secondary line | Always `EUR`; matches the converted secondary average price. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `average_cost.fx_rate_timestamp` | ISO 8601 datetime string (nullable) | Tooltip FX timestamp | Timestamp of the FX rate supporting the converted average price. | 3. Frankfurt, APIFX fetch store and database. |  |
| `performance.total.gain_eur` | number (EUR) | Total gain tile | Total gain provided by backend calculations. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `performance.total.gain_pct` | number (%) | Total gain tile | Total gain percentage delivered by the backend. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `performance.day_change.value_native` | number | “Tagesänderung” block | Day price change in the security currency. | 2. Yahoo query life fetch store in database. |  |
| `performance.day_change.value_eur` | number (optional) | “Tagesänderung” block | Day price change converted to EUR. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `performance.day_change.pct` | number (%) | “Tagesänderung” block | Day percentage change persisted by backend. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `performance.day_change.coverage_ratio` | number (0–1, optional) | Tooltip | Coverage of the day change data when incomplete. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `performance.day_change.source` | enum (`market`, `estimated`, `cached`) | Tooltip | Provenance of the day change values. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `purchase_totals.security_currency` | number | FX tooltip | Aggregate purchase value in the security currency. | 4. Calculate and stored inside the database. |  |
| `purchase_totals.account_currency` | number (EUR, optional) | FX tooltip | Aggregate purchase value converted to EUR by the backend, regardless of the account currency used at purchase time. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `purchase_fx.rate` | number | FX tooltip | Exchange rate used for conversions in the purchase context. | 3. Frankfurt, APIFX fetch store and database. |  |
| `purchase_fx.currency_pair` | string | FX tooltip | Currency pair used for the exchange rate. | 3. Frankfurt, APIFX fetch store and database. |  |
| `purchase_fx.as_of` | ISO 8601 datetime string | FX tooltip “Stand” line | Timestamp associated with `purchase_fx.rate`. | 3. Frankfurt, APIFX fetch store and database. |  |
| `data_source` | enum (`live`, `cache`, `historic`) | Cached data notice | Indicates whether the snapshot originates from live or cached data. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `last_transaction_at` | ISO 8601 datetime string (nullable) | Meta section optional row | Timestamp for the most recent trade involving the security. | 4. Calculate and stored inside the database. |  |

## Security history (`pp_reader/get_security_history` command, `security_history` push)

| Field | Format | Used in | Description | Data source back end | Source logic confirmed |
| --- | --- | --- | --- | --- | --- |
| `security_id` | string (UUID) | History chart container | Identifies which security the series belongs to. | 1. passed from portfolio file and stored in database | Security UUIDs arrive via `PSecurity.uuid`, `_sync_securities` stores them in `securities.uuid`, and the same key is used when persisting `historical_prices.security_uuid` for history queries. |
| `range` | string (`1M`, `3M`, `1Y`, `5Y`, `ALL`, etc.) | Range selector dataset | Confirms which pre-computed window the backend returned. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `series_source` | enum (`portfolio_performance`, `market_data`) | Chart legend | States where the price series originated. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `prices` | array of price points ordered by date | History chart | Time-series data for plotting. | 2. Yahoo query life fetch store in database. |  |
| `prices[].date` | ISO 8601 date string | Chart axis | Daily timestamp of the price point. | 2. Yahoo query life fetch store in database. |  |
| `prices[].close_native` | number | Chart series | Closing price in the security currency. | 2. Yahoo query life fetch store in database. |  |
| `prices[].close_eur` | number (optional) | EUR overlay & tooltips | Closing price converted to EUR when supplied. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |

## Live update envelope (`panels_updated` bus)

| Field | Format | Used in | Description | Data source back end | Source logic confirmed |
| --- | --- | --- | --- | --- | --- |
| `data_type` | enum (`dashboard_summary`, `accounts`, `portfolio_values`, `portfolio_positions`, `last_file_update`, `security_snapshot`, `security_history`) | `src/dashboard.ts` event handler | Discriminator instructing the dashboard which handler should process the payload. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `payload` | object matching the schemas above | Delegated modules | Dataset delivered to the relevant handler without additional guards. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |
| `synced_at` | ISO 8601 datetime string (optional) | Debug overlay / logs | Timestamp indicating when the backend emitted the event. | 6. Calculate it from database values in a function or method and hand it over directly to the front end. |  |

