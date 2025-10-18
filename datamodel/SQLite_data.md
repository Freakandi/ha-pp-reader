# SQLite Data Model

This document describes every table stored in `config/pp_reader_data/S-Depot.db`, including column order, data formats, defaults, and indexes.

## accounts

| Field Index | Column Name | Data Format | Null Allowed | Default | Description | Parsed Data Field | Parsed Data Format |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | uuid | string (TEXT) | no (PRIMARY KEY) | — | Unique account identifier. | PAccount.uuid | string |
| 2 | name | string (TEXT) | no | — | Human-readable account name. | PAccount.name | string |
| 3 | account_currency | string (TEXT) | no | — | ISO 4217 currency of the account. | PAccount.currencyCode | string |
| 4 | note | string (TEXT) | yes | — | Optional descriptive note. | PAccount.note | optional string |
| 5 | is_retired | integer (0/1) | yes | — | Retirement flag (treated as boolean). | PAccount.isRetired | bool |
| 6 | updated_at | string (TEXT, ISO 8601) | yes | — | Last update timestamp. | PAccount.updatedAt | google.protobuf.Timestamp via `to_iso8601` (timezone omitted because `Timestamp.ToDatetime()` runs without `tzinfo`). |
| 7 | balance | integer (cents) | yes | 0 | Account balance stored in cents. | db_calc_account_balance(account_uuid, account_transactions, accounts_currency_map, tx_units) | int returned by `db_calc_account_balance` during `_SyncRunner._sync_accounts`. |

**Indexes**

| Index Name | Columns | Type | Notes |
| --- | --- | --- | --- |
| PRIMARY KEY | uuid | unique | Backed by `sqlite_autoindex_accounts_1`. |

## account_attributes

| Field Index | Column Name | Data Format | Null Allowed | Default | Description | Parsed Data Field | Parsed Data Format |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | account_uuid | string (TEXT) | no | — | References `accounts.uuid`. | PAccount.uuid | string |
| 2 | key | string (TEXT) | no | — | Attribute key. | PKeyValue.key | string |
| 3 | value | string (TEXT) | yes | — | Attribute value. | PKeyValue.value | PAnyValue |

**Indexes**

| Index Name | Columns | Type | Notes |
| --- | --- | --- | --- |
| (none) | — | — | No additional indexes beyond table scan. |

## securities

| Field Index | Column Name | Data Format | Null Allowed | Default | Description | Parsed Data Field | Parsed Data Format |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | uuid | string (TEXT) | no (PRIMARY KEY) | — | Unique security identifier. | PSecurity.uuid | string |
| 2 | name | string (TEXT) | no | — | Security name. | PSecurity.name | string |
| 3 | isin | string (TEXT) | yes | — | Optional ISIN code. | PSecurity.isin | optional string |
| 4 | wkn | string (TEXT) | yes | — | Optional German WKN. | PSecurity.wkn | optional string |
| 5 | ticker_symbol | string (TEXT) | yes | — | Optional ticker symbol. | PSecurity.tickerSymbol | optional string |
| 6 | feed | string (TEXT) | yes | — | Price feed source. | PSecurity.feed | optional string |
| 7 | type | string (TEXT) | yes | — | Security type classification. | — | — |
| 8 | security_currency | string (TEXT) | yes | — | Trading currency. | PSecurity.currencyCode | optional string |
| 9 | retired | integer (0/1) | yes | — | Retirement flag. | PSecurity.isRetired | bool |
| 10 | updated_at | string (TEXT, ISO 8601) | yes | — | Last update timestamp. | PSecurity.updatedAt | google.protobuf.Timestamp via `to_iso8601` (timezone omitted because `Timestamp.ToDatetime()` runs without `tzinfo`). |
| 11 | last_price | integer (10⁻⁸ units) | yes | — | Last fetched price scaled by 10⁻⁸. | Live quote from `prices.price_service._apply_price_updates` (YahooQuery provider) with fallback to `PFullHistoricalPrice.close` inside `_SyncRunner._sync_securities` when live data is missing. | int64 |
| 12 | last_price_time | string (TEXT, ISO 8601 with timezone when available) | yes | — | Market time of the last price (prefer Yahoo live data including timezone; fallback uses the ISO date of the latest historical close). | `prices.price_service._apply_price_updates` will persist Yahoo quote timestamps (`Quote.ts`) when extended; `_SyncRunner._sync_securities` substitutes `PFullHistoricalPrice.date` converted through `to_iso8601` otherwise. | string |
| 13 | last_price_source | string (TEXT) | yes | — | Source of last price ("Yahoo" for live quotes, "File" for imported historical data). | `prices.price_service._apply_price_updates` ("Yahoo") or `_SyncRunner._sync_securities` ("File"). | optional string |
| 14 | last_price_fetched_at | string (TEXT, ISO 8601 UTC) | yes | — | Timestamp when price was fetched. | _apply_price_updates(db_path, updates, fetched_at, source) | ISO 8601 string supplied via the `fetched_at` argument (defaults to `_utc_now_iso()`). |

**Indexes**

| Index Name | Columns | Type | Notes |
| --- | --- | --- | --- |
| PRIMARY KEY | uuid | unique | Backed by `sqlite_autoindex_securities_1`. |

## historical_prices

| Field Index | Column Name | Data Format | Null Allowed | Default | Description | Parsed Data Field | Parsed Data Format |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | security_uuid | string (TEXT) | no (part of PRIMARY KEY) | — | References `securities.uuid`. | PSecurity.uuid | string |
| 2 | date | integer (epoch day) | no (part of PRIMARY KEY) | — | Trading date stored as Unix epoch day. | YahooQuery historical quotes (`date` field) | int64 |
| 3 | close | integer (10⁻⁸ units) | no | — | Closing price scaled by 10⁻⁸. | YahooQuery historical quotes (`adjclose`/`close` scaled); fallback inserts parsed `PHistoricalPrice.close` only when the date is absent. | int64 |
| 4 | high | integer (10⁻⁸ units) | yes | — | Daily high price scaled by 10⁻⁸. | YahooQuery historical quotes (`high` scaled); fallback uses `PFullHistoricalPrice.high` if the trading day is missing. | int64 |
| 5 | low | integer (10⁻⁸ units) | yes | — | Daily low price scaled by 10⁻⁸. | YahooQuery historical quotes (`low` scaled); fallback uses `PFullHistoricalPrice.low` if the trading day is missing. | int64 |
| 6 | volume | integer | yes | — | Trading volume. | YahooQuery historical quotes (`volume`); fallback inserts `PFullHistoricalPrice.volume` only for absent days. | int64 |

**Indexes**

| Index Name | Columns | Type | Notes |
| --- | --- | --- | --- |
| PRIMARY KEY | security_uuid, date | unique | Backed by `sqlite_autoindex_historical_prices_1`. |
| idx_historical_prices_security_date | security_uuid, date | non-unique | Explicit covering index to speed range queries. |

## portfolios

| Field Index | Column Name | Data Format | Null Allowed | Default | Description | Parsed Data Field | Parsed Data Format |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | uuid | string (TEXT) | no (PRIMARY KEY) | — | Unique portfolio identifier. | PPortfolio.uuid | string |
| 2 | name | string (TEXT) | no | — | Portfolio name. | PPortfolio.name | string |
| 3 | note | string (TEXT) | yes | — | Optional descriptive note. | PPortfolio.note | optional string |
| 4 | reference_account | string (TEXT) | yes | — | Linked reference account UUID. | PPortfolio.referenceAccount | optional string |
| 5 | is_retired | integer (0/1) | yes | — | Retirement flag. | PPortfolio.isRetired | bool |
| 6 | updated_at | string (TEXT, ISO 8601) | yes | — | Last update timestamp. | PPortfolio.updatedAt | google.protobuf.Timestamp via `to_iso8601` (timezone omitted because `Timestamp.ToDatetime()` runs without `tzinfo`). |

**Indexes**

| Index Name | Columns | Type | Notes |
| --- | --- | --- | --- |
| PRIMARY KEY | uuid | unique | Backed by `sqlite_autoindex_portfolios_1`. |

## portfolio_attributes

| Field Index | Column Name | Data Format | Null Allowed | Default | Description | Parsed Data Field | Parsed Data Format |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | portfolio_uuid | string (TEXT) | no | — | References `portfolios.uuid`. | PPortfolio.uuid | string |
| 2 | key | string (TEXT) | no | — | Attribute key. | PKeyValue.key | string |
| 3 | value | string (TEXT) | yes | — | Attribute value. | PKeyValue.value | PAnyValue |

**Indexes**

| Index Name | Columns | Type | Notes |
| --- | --- | --- | --- |
| (none) | — | — | No additional indexes beyond table scan. |

## portfolio_securities

| Field Index | Column Name | Data Format | Null Allowed | Default | Description | Parsed Data Field | Parsed Data Format |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | portfolio_uuid | string (TEXT) | no (part of PRIMARY KEY) | — | References `portfolios.uuid`. | PPortfolio.uuid | string |
| 2 | security_uuid | string (TEXT) | no (part of PRIMARY KEY) | — | References `securities.uuid`. | PSecurity.uuid | string |
| 3 | share_count | real | yes | 0.0 | Current share quantity in portfolio. | db_calculate_current_holdings(transactions) | Float share total from `db_calculate_current_holdings` in `_SyncRunner._sync_portfolio_securities`. |
| 4 | purchase_value_native | integer (10⁻⁸ units) | yes | 0 | Total purchase cost in the security's native currency. | db_calculate_sec_purchase_value(transactions, db_path, tx_units).security_currency_total (requires persistence update to store the native total). | int scaled representation of `security_currency_total` produced by `db_calculate_sec_purchase_value`. |
| 5 | current_value_native | integer (10⁻⁸ units) | yes | 0 | Current market value in the security's native currency. | (New helper required; existing `db_calculate_holdings_value` only returns EUR totals.) | int scaled native-market valuation computed by the planned helper. |
| 6 | avg_price_native | real (10⁻⁸ units) | yes | — | Average purchase price per share in the security's native currency. | db_calculate_sec_purchase_value(transactions, db_path, tx_units).avg_price_security | float derived from `avg_price_security` returned by `db_calculate_sec_purchase_value`. |
| 7 | purchase_value_eur | integer (cents) | yes | 0 | Purchase value in EUR (only stored when native currency ≠ EUR; otherwise mirrors native). | db_calculate_sec_purchase_value(transactions, db_path, tx_units) → eur_to_cent(round_currency(purchase_value_eur)). | int cents converted from the EUR total returned by `db_calculate_sec_purchase_value`. |
| 8 | current_value_eur | integer (cents) | yes | 0 | Current market value in EUR (only stored when native currency ≠ EUR). | db_calculate_holdings_value(db_path, conn, current_hold_pur) → eur_to_cent(round_currency(current_value_eur)). | int cents derived from `db_calculate_holdings_value` for each (portfolio, security). |
| 9 | avg_price_eur | real (computed cents) | generated | — | Average purchase price per share in EUR (`purchase_value_eur / share_count`). | SQLite expression using `purchase_value_eur` and `share_count`. |

**Indexes**

| Index Name | Columns | Type | Notes |
| --- | --- | --- | --- |
| PRIMARY KEY | portfolio_uuid, security_uuid | unique | Backed by `sqlite_autoindex_portfolio_securities_1`. |
| idx_portfolio_securities_portfolio | portfolio_uuid | non-unique | Speeds portfolio lookups. |

### portfolio_securities → portfolio_securities_performance (subtable)

| Field Index | Column Name | Data Format | Null Allowed | Default | Description | Parsed Data Field | Parsed Data Format |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | portfolio_uuid | string (TEXT) | no (part of PRIMARY KEY) | — | References `portfolios.uuid`. | PPortfolio.uuid | string |
| 2 | security_uuid | string (TEXT) | no (part of PRIMARY KEY) | — | References `securities.uuid`. | PSecurity.uuid | string |
| 3 | date | integer (epoch day) | no (part of PRIMARY KEY) | — | Trading date of the snapshot. | YahooQuery historical quotes (`date` field) | int64 |
| 4 | share_count | real | yes | 0.0 | Shares held on the snapshot day. | db_calculate_current_holdings(transactions) as of `date` | float |
| 5 | close_price_native | integer (10⁻⁸ units) | yes | 0 | Closing price in the security's native currency for the snapshot day. | YahooQuery historical quotes (`adjclose`/`close` scaled) | int64 |
| 6 | value_native | integer (10⁻⁸ units) | yes | 0 | Native-currency position value (`share_count` × `close_price_native`). | Calculated during snapshot rebuild | int64 |
| 7 | value_eur | integer (cents) | yes | 0 | EUR-converted position value using the Frankfurter FX rate for the snapshot day. | Calculated during snapshot rebuild | int |

**Indexes**

| Index Name | Columns | Type | Notes |
| --- | --- | --- | --- |
| PRIMARY KEY | portfolio_uuid, security_uuid, date | unique | Backed by `sqlite_autoindex_portfolio_securities_performance_1`. |
| idx_portfolio_securities_perf_portfolio_date | portfolio_uuid, date | non-unique | Optimises per-portfolio time-series scans. |
| idx_portfolio_securities_perf_security_date | security_uuid, date | non-unique | Optimises per-security time-series scans. |

## portfolio_securities_transactions

| Field Index | Column Name | Data Format | Null Allowed | Default | Description | Parsed Data Field | Parsed Data Format |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | portfolio_uuid | string (TEXT) | no (part of PRIMARY KEY) | — | References `portfolios.uuid`. | PPortfolio.uuid | string |
| 2 | security_uuid | string (TEXT) | no (part of PRIMARY KEY) | — | References `securities.uuid`. | PSecurity.uuid | string |
| 3 | transaction_uuid | string (TEXT) | no (part of PRIMARY KEY) | — | References `transactions.uuid` so rollups can be deleted when a canonical row disappears. | PTransaction.uuid | string |
| 4 | transaction_type | integer (enum) | no | — | Transaction classification (purchase/sale/dividend/fees/taxes) stored as `PTransaction.Type`. | PTransaction.type | enum value persisted alongside `transaction_type_name` for readability. |
| 5 | transaction_type_name | string (TEXT) | no | — | Human-readable label for `transaction_type` (e.g., "purchase"). | Derived from `PTransaction.Type.Name`. | string |
| 6 | transaction_share_count | real | yes | 0.0 | Shares involved in the transaction (native precision). | Aggregated share total derived from the persisted `transactions` rows during the rollup rebuild. | float |
| 7 | transaction_value_native | integer (10⁻⁸ units) | yes | 0 | Transaction amount in the security's native currency. | Captured by the rollup helper that groups stored `transactions` (and their FX legs) after `_sync_transactions` completes. | int |
| 8 | transaction_value_eur | integer (cents) | yes | 0 | Transaction amount converted to EUR at execution time. | Derived from the canonical `transactions` persistence plus FX normalization when rebuilding the rollup. | int |
| 9 | transaction_date | string (TEXT, ISO 8601) | no | — | Execution timestamp. | PTransaction.date | google.protobuf.Timestamp via `to_iso8601` (timezone omitted because `Timestamp.ToDatetime()` runs without `tzinfo`). |

**Indexes**

| Index Name | Columns | Type | Notes |
| --- | --- | --- | --- |
| PRIMARY KEY | portfolio_uuid, security_uuid, transaction_uuid | unique | Ensures each canonical transaction only creates one rollup row, enabling direct deletes. |
| idx_portfolio_securities_tx_portfolio | portfolio_uuid | non-unique | Speeds per-portfolio transaction lookups. |

## transactions

| Field Index | Column Name | Data Format | Null Allowed | Default | Description | Parsed Data Field | Parsed Data Format |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | uuid | string (TEXT) | no (PRIMARY KEY) | — | Unique transaction identifier. | PTransaction.uuid | string |
| 2 | type | integer | no | — | Enumerated transaction type. | PTransaction.type | PTransaction.Type |
| 3 | account | string (TEXT) | yes | — | Linked account UUID. | PTransaction.account | optional string |
| 4 | portfolio | string (TEXT) | yes | — | Linked portfolio UUID. | PTransaction.portfolio | optional string |
| 5 | other_account | string (TEXT) | yes | — | Counterparty account UUID. | PTransaction.otherAccount | optional string |
| 6 | other_portfolio | string (TEXT) | yes | — | Counterparty portfolio UUID. | PTransaction.otherPortfolio | optional string |
| 7 | other_uuid | string (TEXT) | yes | — | External reference UUID. | PTransaction.otherUuid | optional string |
| 8 | other_updated_at | string (TEXT, ISO 8601) | yes | — | Timestamp for external reference. | PTransaction.otherUpdatedAt | google.protobuf.Timestamp via `to_iso8601` (timezone omitted because `Timestamp.ToDatetime()` runs without `tzinfo`). |
| 9 | transaction_date | string (TEXT, ISO 8601) | no | — | Transaction date in ISO 8601. | PTransaction.date | google.protobuf.Timestamp via `to_iso8601` (timezone omitted because `Timestamp.ToDatetime()` runs without `tzinfo`). |
| 10 | transaction_currency | string (TEXT) | yes | — | Currency involved in transaction. | PTransaction.currencyCode | string |
| 11 | transaction_amount | integer (cents) | yes | — | Monetary amount stored in cents. | PTransaction.amount | int64 |
| 12 | transaction_shares | integer (scaled by 10⁸) | yes | — | Share quantity scaled for precision. | PTransaction.shares | optional int64 |
| 13 | note | string (TEXT) | yes | — | Optional note. | PTransaction.note | optional string |
| 14 | security | string (TEXT) | yes | — | Security UUID involved. | PTransaction.security | optional string |
| 15 | updated_at | string (TEXT, ISO 8601) | yes | — | Last update timestamp. | PTransaction.updatedAt | google.protobuf.Timestamp via `to_iso8601` (timezone omitted because `Timestamp.ToDatetime()` runs without `tzinfo`). |

**Indexes**

| Index Name | Columns | Type | Notes |
| --- | --- | --- | --- |
| PRIMARY KEY | uuid | unique | Backed by `sqlite_autoindex_transactions_1`. |
| idx_transactions_security | security | non-unique | Accelerates filtering by security UUID. |

## transaction_units

| Field Index | Column Name | Data Format | Null Allowed | Default | Description | Parsed Data Field | Parsed Data Format |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | transaction_uuid | string (TEXT) | no | — | References `transactions.uuid`. | PTransaction.uuid | string |
| 2 | type | integer | no | — | Enumerated unit type. | PTransactionUnit.type | PTransactionUnit.Type |
| 3 | transaction_amount | integer (cents) | yes | — | Amount stored in cents. | PTransactionUnit.amount | int64 |
| 4 | transaction_currency | string (TEXT) | yes | — | Currency code for amount. | PTransactionUnit.currencyCode | string |
| 5 | transaction_fx_amount | integer (cents) | yes | — | Foreign currency amount in cents. | PTransactionUnit.fxAmount | optional int64 |
| 6 | transaction_fx_currency | string (TEXT) | yes | — | Foreign currency code. | PTransactionUnit.fxCurrencyCode | optional string |
| 7 | transaction_fx_rate | real | yes | — | Conversion rate to base currency. | PTransactionUnit.fxRateToBase | optional PDecimalValue |

**Indexes**

| Index Name | Columns | Type | Notes |
| --- | --- | --- | --- |
| idx_transaction_units_currency | transaction_fx_currency | non-unique | Facilitates FX lookups. |

## fx_rates

| Field Index | Column Name | Data Format | Null Allowed | Default | Description | Parsed Data Field | Parsed Data Format |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | date | string (TEXT, ISO 8601) | no (part of PRIMARY KEY) | — | Exchange rate date. | PExchangeRate.date | int64 |
| 2 | currency | string (TEXT) | no (part of PRIMARY KEY) | — | Currency code. | PExchangeRateTimeSeries.termCurrency | string |
| 3 | rate | real | no | — | Exchange rate relative to base currency. | PExchangeRate.value | PDecimalValue |

**Indexes**

| Index Name | Columns | Type | Notes |
| --- | --- | --- | --- |
| PRIMARY KEY | date, currency | unique | Backed by `sqlite_autoindex_fx_rates_1`. |

## metadata

| Field Index | Column Name | Data Format | Null Allowed | Default | Description | Parsed Data Field | Parsed Data Format |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | key | string (TEXT) | no (PRIMARY KEY) | — | Metadata key. | _SyncRunner._store_last_file_update(last_file_update) | Literal `'last_file_update'` inserted alongside the provided timestamp. |
| 2 | date | string (TEXT, ISO 8601) | no | — | Associated timestamp. | _SyncRunner._store_last_file_update(last_file_update) | ISO 8601 string passed as `last_file_update`. |

**Indexes**

| Index Name | Columns | Type | Notes |
| --- | --- | --- | --- |
| PRIMARY KEY | key | unique | Backed by `sqlite_autoindex_metadata_1`. |
