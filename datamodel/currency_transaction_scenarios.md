# Currency Handling Scenarios from Stored Transactions

This note captures example records from `transactions` and their linked `transaction_units` in `config/pp_reader_data/S-Depot.db` to illustrate how currencies are persisted for different flows.

## Scenario 1 – Account transfer, EUR → EUR (Haspa Giro → Trade Republic Cash)
- `transactions.uuid`: `7e349b38-45c6-4181-8047-9f0c956ee7b7`
- Accounts: Haspa Giro (EUR) → Trade Republic Cash (EUR)
- Transaction currency & amount: EUR `2_500_000`
- Linked `transaction_units`: none (`COUNT(*) = 0`), i.e. no additional currency rows stored for same-currency transfers.

## Scenario 2 – Account transfer, EUR → JPY (IBKR → IBKR JPY)
- `transactions.uuid`: `dc76fe64-2ba6-4b2d-aa01-8c864cd83203`
- Accounts: IBKR (EUR) → IBKR JPY (JPY)
- Transaction currency & amount: EUR `144_473`
- Linked `transaction_units` row:
  - `type = 0`, `amount = 144_473` (EUR)
  - `fx_amount = 24_913_248` in JPY
  - `fx_rate_to_base = 0.0534606851`

## Scenario 3 – Account transfer, JPY → EUR
- No matching transaction records found (`COUNT(*) = 0`).

## Scenario 4 – Purchase of EUR security via EUR account (AIXTRON)
- `transactions.uuid`: `16165b33-2805-44d5-9be3-2af2aa98bed7`
- Account & security currencies: Haspa Giro (EUR) buys AIXTRON SE (EUR)
- Transaction currency & amount: EUR `177_618`, shares: `12_000_000_000`
- Linked `transaction_units` row:
  - `type = 2`, `amount = 1_098` (EUR)
  - No FX columns populated.

## Scenario 5 – Purchase of USD security via EUR account (Berkshire Hathaway)
- `transactions.uuid`: `5e0611b3-5e98-429d-899e-55dab6612e25`
- Account & security currencies: IBKR (EUR) buys Berkshire Hathaway Inc. Class B (USD)
- Transaction currency & amount: EUR `79_731`, shares: `200_000_000`
- Linked `transaction_units` rows:
  1. `type = 2`, `amount = 86` (EUR), `fx_amount = 100` (USD), `fx_rate_to_base = 40.4496776446`
  2. `type = 0`, `amount = 79_645` (EUR), `fx_amount = 92_158` (USD), `fx_rate_to_base = 40.4496776446`

## Scenario 6 – Purchase of JPY security via JPY account (Harmonic Drive Systems)
- `transactions.uuid`: `ce0a9c37-937d-4678-8900-b07b12f4474c`
- Account & security currencies: IBKR JPY (JPY) buys Harmonic Drive Systems (JPY)
- Transaction currency & amount: JPY `24_899_900`, shares: `10_000_000_000`
- Linked `transaction_units` row:
  - `type = 2`, `amount = 19_900` (JPY)
  - No FX columns populated.

