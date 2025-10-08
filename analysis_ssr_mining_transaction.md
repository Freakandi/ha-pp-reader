# Purchase Transaction Data Samples

The integration database currently contains two reference purchases that illustrate how Portfolio Performance stores security and currency details for cross-currency and single-currency trades.

## SSR Mining Inc. (CAD security purchased from EUR account)

Security UUID `3d5c8979-2dd5-47ec-893c-305114e36351` corresponds to **SSR Mining Inc. Registered Shares o.N.** with security currency `CAD`. The trade used Trade Republic Cash (EUR) and the Trade Republic Depot portfolio.

### `transactions` row
| Field | Value |
| --- | --- |
| uuid | b3002fd2-db71-4ab6-9370-977b76d34497 |
| type | 0 |
| account | 5e0f756c-14a2-4b67-9d87-9e5ddb6a62db (Trade Republic Cash, EUR) |
| portfolio | 8d84468b-7023-45a9-b842-6478811e022c (Trade Republic Depot) |
| other_account | *(null)* |
| other_portfolio | *(null)* |
| other_uuid | ac9de4f0-7309-4e5d-84f2-762157b274d4 |
| other_updated_at | 2024-04-18T20:07:27.318640 |
| date | 2024-04-16T00:00:00 |
| currency_code | EUR |
| amount | 49520 (→ 495.20 EUR gross) |
| shares | 10000000000 (→ 100.00000000 shares) |
| note | *(null)* |
| security | 3d5c8979-2dd5-47ec-893c-305114e36351 |
| source | *(null)* |
| updated_at | 2024-04-18T20:07:27.318640 |

### `transaction_units` rows
| transaction_uuid | type | amount | currency_code | fx_amount | fx_currency_code | fx_rate_to_base |
| --- | --- | --- | --- | --- | --- | --- |
| b3002fd2-db71-4ab6-9370-977b76d34497 | 2 | 100 | EUR | *(null)* | *(null)* | *(null)* |
| b3002fd2-db71-4ab6-9370-977b76d34497 | 0 | 49420 | EUR | 72489 | CAD | 30.6060749311 |

*Interpretation*: The gross debit was 495.20 EUR with 1.00 EUR fees (type `2`). The trade leg (type `0`) carries both the net EUR exposure (494.20 EUR) and the translated CAD amount (724.89 CAD). Dividing 724.89 CAD by 100 shares yields a purchase price of 7.2489 CAD per share, while the EUR per-share cost is 4.9420 EUR.

## Harmonic Drive Systems (JPY security purchased from JPY account)

Security UUID `df1d3f53-85a0-4685-a660-b5a6b0055a24` represents **Harmonic Drive Systems** denominated in `JPY`. The transaction used the IBKR JPY cash account and IBKR Portfolio.

### `transactions` row
| Field | Value |
| --- | --- |
| uuid | ce0a9c37-937d-4678-8900-b07b12f4474c |
| type | 0 |
| account | 7b539b3c-32db-41db-8a2a-b500d1c03d71 (IBKR JPY, JPY) |
| portfolio | f9996e0d-743d-417f-b0f2-150dd68df646 (IBKR Portfolio) |
| other_account | *(null)* |
| other_portfolio | *(null)* |
| other_uuid | b658e2d0-7cee-46ca-bc14-6ac87ce88520 |
| other_updated_at | 2025-09-10T07:28:26.891341 |
| date | 2025-09-09T00:00:00 |
| currency_code | JPY |
| amount | 24899900 (→ 248,999.00 JPY gross) |
| shares | 10000000000 (→ 100.00000000 shares) |
| note | *(null)* |
| security | df1d3f53-85a0-4685-a660-b5a6b0055a24 |
| source | *(null)* |
| updated_at | 2025-09-10T07:28:26.891341 |

### `transaction_units` rows
| transaction_uuid | type | amount | currency_code | fx_amount | fx_currency_code | fx_rate_to_base |
| --- | --- | --- | --- | --- | --- | --- |
| ce0a9c37-937d-4678-8900-b07b12f4474c | 2 | 19900 | JPY | *(null)* | *(null)* | *(null)* |

*Interpretation*: Portfolio Performance records 248,999.00 JPY gross outflow with 199.00 JPY fees (type `2`). The absence of a type `0` FX row indicates the trade was executed in the security currency itself. Net trade consideration is therefore 248,800.00 JPY (2,488.00 JPY per share).

## Plan to display correct FX purchase prices per share

1. **Normalize raw transaction data**
   - Convert `transactions.shares` by dividing by 1e8 to obtain the real share quantity.
   - Convert monetary integers to decimal amounts by dividing by 100 (Portfolio Performance stores two implied decimal places, even for JPY).
   - Split the gross amount into components: `net_trade_account = gross - fees - taxes`, where fees are `transaction_units` with `type = 2` and taxes with `type = 1` (if present).

2. **Derive security-currency trade totals**
   - When a `transaction_units` row with `type = 0` exists, use `fx_amount` / 100 as the trade total in the security currency, and `fx_currency_code` as that currency. This directly yields the FX-adjusted cost basis (e.g., 724.89 CAD for SSR Mining).
   - If the trade lacks a `type = 0` row, fall back to `net_trade_account` and the account currency. Compare the account currency with `securities.currency_code`; if they match (as with the JPY example) the fallback already represents the correct security-currency amount.
   - As a resilience fallback when currencies differ but no FX amount is available, derive the security-currency total via `net_trade_account / fx_rate` if the backend exposes an FX rate, or flag the entry for manual review.

3. **Compute per-share purchase prices**
   - `price_per_share_security = trade_total_security / shares_quantity`.
   - Optionally compute `price_per_share_account = net_trade_account / shares_quantity` for reference when displaying account-currency exposure.

4. **Aggregate by position**
   - Maintain running sums per security: total shares, cumulative security-currency trade totals, and cumulative account-currency totals.
   - Calculate average purchase price in the security currency as `cumulative_security_total / cumulative_shares`.
   - Ensure fees and taxes remain accounted for separately to match Portfolio Performance’s gross vs. net reporting.

5. **Expose the enriched data to the dashboard**
   - Extend the backend API payload to include calculated share counts, per-share prices, and both account- and security-currency totals.
   - Update the frontend to prioritize security-currency prices when rendering cost basis. Display the account-currency equivalent only as supplementary information, ensuring the primary value matches the security currency shown in Portfolio Performance.

6. **Validate with sample transactions**
   - Verify that SSR Mining renders at 7.2489 CAD per share and Harmonic Drive Systems at 2,488.00 JPY per share.
   - Cross-check additional FX trades to confirm `transaction_units.type = 0` is always populated when currencies differ; add logging/tests to flag any anomalies.
