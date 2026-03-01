# Harmonic Drive Systems — Database Snapshot

## Securities table (`securities`)

| column | value |
| --- | --- |
| uuid | df1d3f53-85a0-4685-a660-b5a6b0055a24 |
| name | Harmonic Drive Systems |
| isin | JP3765150002 |
| wkn | 912928 |
| ticker_symbol | 6324.T |
| feed | NULL |
| type | NULL |
| currency_code | JPY |
| retired | NULL |
| updated_at | 0 |
| last_price | 248100000000 |
| last_price_date | 2025-09-10T00:00:00 |
| last_price_source | NULL |
| last_price_fetched_at | NULL |

## Historical prices (`historical_prices`)

| security_uuid | date | close | high | low | volume |
| --- | --- | --- | --- | --- | --- |
| df1d3f53-85a0-4685-a660-b5a6b0055a24 | 20341 | 248100000000 | NULL | NULL | NULL |
| df1d3f53-85a0-4685-a660-b5a6b0055a24 | 20340 | 255800000000 | NULL | NULL | NULL |

## Portfolio holdings (`portfolio_securities`)

| portfolio_uuid | security_uuid | current_holdings | purchase_value | avg_price | current_value |
| --- | --- | --- | --- | --- | --- |
| f9996e0d-743d-417f-b0f2-150dd68df646 | df1d3f53-85a0-4685-a660-b5a6b0055a24 | 100.0 | 144464 | 1444.64 | 142783.0 |

## Transactions (`transactions`)

| uuid | type | account | portfolio | other_account | other_portfolio | other_uuid | other_updated_at | date | currency_code | amount | shares | note | security | source | updated_at |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ce0a9c37-937d-4678-8900-b07b12f4474c | 0 | 7b539b3c-32db-41db-8a2a-b500d1c03d71 | f9996e0d-743d-417f-b0f2-150dd68df646 | NULL | NULL | b658e2d0-7cee-46ca-bc14-6ac87ce88520 | 2025-09-10T07:28:26.891341 | 2025-09-09T00:00:00 | JPY | 24899900 | 10000000000 | NULL | df1d3f53-85a0-4685-a660-b5a6b0055a24 | NULL | 2025-09-10T07:28:26.891341 |

### Transaction units (`transaction_units`)

| transaction_uuid | type | amount | currency_code | fx_amount | fx_currency_code | fx_rate_to_base |
| --- | --- | --- | --- | --- | --- | --- |
| ce0a9c37-937d-4678-8900-b07b12f4474c | 2 | 19900 | JPY | NULL | NULL | NULL |

## FX rates (`fx_rates`)

| date | currency | rate |
| --- | --- | --- |
| 2025-10-04 | JPY | 172.9 |
| 2025-10-01 | JPY | 173.76 |
