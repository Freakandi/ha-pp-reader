# SQLite Data Model

This document describes every table stored in `config/pp_reader_data/S-Depot.db`, including column order, data formats, defaults, and indexes.

## accounts

| Field Index | Column Name | Data Format | Null Allowed | Default | Description | Parsed Data Field | Parsed Data Format |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | uuid | string (TEXT) | no (PRIMARY KEY) | — | Unique account identifier. | PAccount.uuid | string |
| 2 | name | string (TEXT) | no | — | Human-readable account name. | PAccount.name | string |
| 3 | currency_code | string (TEXT) | no | — | ISO 4217 currency of the account. | PAccount.currencyCode | string |
| 4 | note | string (TEXT) | yes | — | Optional descriptive note. | PAccount.note | optional string |
| 5 | is_retired | integer (0/1) | yes | — | Retirement flag (treated as boolean). | PAccount.isRetired | bool |
| 6 | updated_at | string (TEXT, ISO 8601) | yes | — | Last update timestamp. | PAccount.updatedAt | google.protobuf.Timestamp |
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
| 8 | currency_code | string (TEXT) | yes | — | Trading currency. | PSecurity.currencyCode | optional string |
| 9 | retired | integer (0/1) | yes | — | Retirement flag. | PSecurity.isRetired | bool |
| 10 | updated_at | string (TEXT, ISO 8601) | yes | — | Last update timestamp. | PSecurity.updatedAt | google.protobuf.Timestamp |
| 11 | last_price | integer (10⁻⁸ units) | yes | — | Last fetched price scaled by 10⁻⁸. | PFullHistoricalPrice.close | int64 |
| 12 | last_price_date | integer (Unix timestamp) | yes | — | Epoch seconds of last price date. | PFullHistoricalPrice.date | int64 |
| 13 | last_price_source | string (TEXT) | yes | — | Source of last price (e.g., 'yahoo'). | PSecurity.latestFeed | optional string |
| 14 | last_price_fetched_at | string (TEXT, ISO 8601 UTC) | yes | — | Timestamp when price was fetched. | _apply_price_updates(db_path, updates, fetched_at, source) | ISO 8601 string supplied via the `fetched_at` argument (defaults to `_utc_now_iso()`). |

**Indexes**

| Index Name | Columns | Type | Notes |
| --- | --- | --- | --- |
| PRIMARY KEY | uuid | unique | Backed by `sqlite_autoindex_securities_1`. |

## historical_prices

| Field Index | Column Name | Data Format | Null Allowed | Default | Description | Parsed Data Field | Parsed Data Format |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | security_uuid | string (TEXT) | no (part of PRIMARY KEY) | — | References `securities.uuid`. | PSecurity.uuid | string |
| 2 | date | integer (epoch day) | no (part of PRIMARY KEY) | — | Trading date stored as Unix epoch day. | PHistoricalPrice.date | int64 |
| 3 | close | integer (10⁻⁸ units) | no | — | Closing price scaled by 10⁻⁸. | PHistoricalPrice.close | int64 |
| 4 | high | integer (10⁻⁸ units) | yes | — | Daily high price scaled by 10⁻⁸. | PFullHistoricalPrice.high | int64 |
| 5 | low | integer (10⁻⁸ units) | yes | — | Daily low price scaled by 10⁻⁸. | PFullHistoricalPrice.low | int64 |
| 6 | volume | integer | yes | — | Trading volume. | PFullHistoricalPrice.volume | int64 |

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
| 6 | updated_at | string (TEXT, ISO 8601) | yes | — | Last update timestamp. | PPortfolio.updatedAt | google.protobuf.Timestamp |

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
| 3 | current_holdings | real | yes | 0.0 | Current share quantity in portfolio. | db_calculate_current_holdings(transactions) | float share total from `db_calculate_current_holdings` in `_SyncRunner._sync_portfolio_securities`. |
| 4 | purchase_value | integer (cents) | yes | 0 | Total purchase cost in cents. | db_calculate_sec_purchase_value(transactions, db_path, tx_units) → eur_to_cent(round_currency(purchase_value_eur)) | int cents converted from the EUR total returned by `db_calculate_sec_purchase_value`. |
| 5 | current_value | real (cents) | yes | 0.0 | Current market value in cents. | db_calculate_holdings_value(db_path, conn, current_hold_pur) → eur_to_cent(round_currency(current_value_eur)) | int cents derived from `db_calculate_holdings_value` for each (portfolio, security). |
| 6 | avg_price | real (computed cents) | generated | — | Stored generated column: `purchase_value / current_holdings` when holdings > 0. | SQLite expression using `purchase_value` and `current_holdings`. |

**Indexes**

| Index Name | Columns | Type | Notes |
| --- | --- | --- | --- |
| PRIMARY KEY | portfolio_uuid, security_uuid | unique | Backed by `sqlite_autoindex_portfolio_securities_1`. |
| idx_portfolio_securities_portfolio | portfolio_uuid | non-unique | Speeds portfolio lookups. |

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
| 8 | other_updated_at | string (TEXT, ISO 8601) | yes | — | Timestamp for external reference. | PTransaction.otherUpdatedAt | google.protobuf.Timestamp |
| 9 | date | string (TEXT, ISO 8601) | no | — | Transaction date in ISO 8601. | PTransaction.date | google.protobuf.Timestamp |
| 10 | currency_code | string (TEXT) | yes | — | Currency involved in transaction. | PTransaction.currencyCode | string |
| 11 | amount | integer (cents) | yes | — | Monetary amount stored in cents. | PTransaction.amount | int64 |
| 12 | shares | integer (scaled by 10⁸) | yes | — | Share quantity scaled for precision. | PTransaction.shares | optional int64 |
| 13 | note | string (TEXT) | yes | — | Optional note. | PTransaction.note | optional string |
| 14 | security | string (TEXT) | yes | — | Security UUID involved. | PTransaction.security | optional string |
| 15 | source | string (TEXT) | yes | — | Origin of the transaction record. | PTransaction.source | optional string |
| 16 | updated_at | string (TEXT, ISO 8601) | yes | — | Last update timestamp. | PTransaction.updatedAt | google.protobuf.Timestamp |

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
| 3 | amount | integer (cents) | yes | — | Amount stored in cents. | PTransactionUnit.amount | int64 |
| 4 | currency_code | string (TEXT) | yes | — | Currency code for amount. | PTransactionUnit.currencyCode | string |
| 5 | fx_amount | integer (cents) | yes | — | Foreign currency amount in cents. | PTransactionUnit.fxAmount | optional int64 |
| 6 | fx_currency_code | string (TEXT) | yes | — | Foreign currency code. | PTransactionUnit.fxCurrencyCode | optional string |
| 7 | fx_rate_to_base | real | yes | — | Conversion rate to base currency. | PTransactionUnit.fxRateToBase | optional PDecimalValue |

**Indexes**

| Index Name | Columns | Type | Notes |
| --- | --- | --- | --- |
| idx_transaction_units_currency | fx_currency_code | non-unique | Facilitates FX lookups. |

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
