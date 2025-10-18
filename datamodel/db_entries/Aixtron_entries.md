# Aixtron — Database Snapshot

## Securities table (`securities`)

| column | value |
| --- | --- |
| uuid | 9a9897ce-6f35-4b4a-86e9-457f707a8ac7 |
| name | AIXTRON SE NAMENS-AKTIEN O.N. |
| isin | DE000A0WMPJ6 |
| wkn | A0WMPJ |
| ticker_symbol | AIXA.DE |
| feed | NULL |
| type | NULL |
| currency_code | EUR |
| retired | NULL |
| updated_at | 0 |
| last_price | 1247000000 |
| last_price_date | 2025-09-10T00:00:00 |
| last_price_source | NULL |
| last_price_fetched_at | NULL |

## Historical prices (`historical_prices`)

| security_uuid | date | close | high | low | volume |
| --- | --- | --- | --- | --- | --- |
| 9a9897ce-6f35-4b4a-86e9-457f707a8ac7 | 20341 | 1247000000 | NULL | NULL | NULL |
| 9a9897ce-6f35-4b4a-86e9-457f707a8ac7 | 20340 | 1234500000 | NULL | NULL | NULL |

## Portfolio holdings (`portfolio_securities`)

| portfolio_uuid | security_uuid | current_holdings | purchase_value | avg_price | current_value |
| --- | --- | --- | --- | --- | --- |
| 2cff58d9-ea39-4bb3-a6bb-3b170e4237ff | 9a9897ce-6f35-4b4a-86e9-457f707a8ac7 | 120.0 | 177618 | 1480.15 | 149640.0 |

## Transactions (`transactions`)

| uuid | type | account | portfolio | other_account | other_portfolio | other_uuid | other_updated_at | date | currency_code | amount | shares | note | security | source | updated_at |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 16165b33-2805-44d5-9be3-2af2aa98bed7 | 0 | e4c831f2-ccc4-4689-8a2e-76b1f94c2339 | 2cff58d9-ea39-4bb3-a6bb-3b170e4237ff | NULL | NULL | 4ff8b10b-b19a-4d48-b135-0e55e1ebb965 | 2024-10-23T06:26:27.875688 | 2024-10-22T08:05:27 | EUR | 177618 | 12000000000 | Limit 14,71 EUR | 9a9897ce-6f35-4b4a-86e9-457f707a8ac7 | 20241022_kauf-aixtron-se-namensaktien-on_117958213.pdf | 2024-10-23T06:26:27.875688 |
| bfe816f2-8b6f-4014-b921-3aa80edb5e1b | 8 | e4c831f2-ccc4-4689-8a2e-76b1f94c2339 | NULL | NULL | NULL | NULL | NULL | 2025-05-20T00:00:00 | EUR | 1326 | 12000000000 | NULL | 9a9897ce-6f35-4b4a-86e9-457f707a8ac7 | 20250519_dividendengutschrift-aixtron-se-namensaktien-on_127505275.pdf | 2025-05-20T14:09:28.701994 |

### Transaction units (`transaction_units`)

| transaction_uuid | type | amount | currency_code | fx_amount | fx_currency_code | fx_rate_to_base |
| --- | --- | --- | --- | --- | --- | --- |
| 16165b33-2805-44d5-9be3-2af2aa98bed7 | 2 | 1098 | EUR | NULL | NULL | NULL |
| bfe816f2-8b6f-4014-b921-3aa80edb5e1b | 1 | 450 | EUR | NULL | NULL | NULL |
| bfe816f2-8b6f-4014-b921-3aa80edb5e1b | 1 | 24 | EUR | NULL | NULL | NULL |
