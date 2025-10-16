# Berkshire Hathaway — Database Snapshot

## Securities table (`securities`)

| column | value |
| --- | --- |
| uuid | 610b13cf-2f0b-46dd-8748-a53ece7a1e8a |
| name | BERKSHIRE HATHAWAY INC-CL B |
| isin | US0846707026 |
| wkn | NULL |
| ticker_symbol | BRK-B |
| feed | NULL |
| type | NULL |
| currency_code | USD |
| retired | NULL |
| updated_at | 0 |
| last_price | 49272000000 |
| last_price_date | 2025-09-09T00:00:00 |
| last_price_source | NULL |
| last_price_fetched_at | NULL |

## Historical prices (`historical_prices`)

| security_uuid | date | close | high | low | volume |
| --- | --- | --- | --- | --- | --- |
| 610b13cf-2f0b-46dd-8748-a53ece7a1e8a | 20340 | 49272000000 | NULL | NULL | NULL |
| 610b13cf-2f0b-46dd-8748-a53ece7a1e8a | 20339 | 49378000000 | NULL | NULL | NULL |

## Portfolio holdings (`portfolio_securities`)

| portfolio_uuid | security_uuid | current_holdings | purchase_value | avg_price | current_value |
| --- | --- | --- | --- | --- | --- |
| f9996e0d-743d-417f-b0f2-150dd68df646 | 610b13cf-2f0b-46dd-8748-a53ece7a1e8a | 2.0 | 79731 | 39865.5 | 83932.0 |

## Transactions (`transactions`)

| uuid | type | account | portfolio | other_account | other_portfolio | other_uuid | other_updated_at | date | currency_code | amount | shares | note | security | source | updated_at |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 5e0611b3-5e98-429d-899e-55dab6612e25 | 0 | 1d118e5a-729e-4e78-9f37-9aeb0282fea4 | f9996e0d-743d-417f-b0f2-150dd68df646 | NULL | NULL | 254dc92f-d6ef-4aa9-9b84-83accf4a33c0 | 2025-08-07T11:16:44.482868 | 2025-08-04T00:00:00 | EUR | 79731 | 200000000 | NULL | 610b13cf-2f0b-46dd-8748-a53ece7a1e8a | NULL | 2025-08-07T11:16:44.483844 |

### Transaction units (`transaction_units`)

| transaction_uuid | type | amount | currency_code | fx_amount | fx_currency_code | fx_rate_to_base |
| --- | --- | --- | --- | --- | --- | --- |
| 5e0611b3-5e98-429d-899e-55dab6612e25 | 2 | 86 | EUR | 100 | USD | 40.4496776446 |
| 5e0611b3-5e98-429d-899e-55dab6612e25 | 0 | 79645 | EUR | 92158 | USD | 40.4496776446 |

## FX rates (`fx_rates`)

| date | currency | rate |
| --- | --- | --- |
| 2025-10-04 | USD | 1.1734 |
| 2025-10-01 | USD | 1.1741 |
