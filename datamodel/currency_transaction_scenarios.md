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

## Scenario 3 – Account transfer, JPY → EUR (IBKR JPY → IBKR)
- `transactions.uuid`: `19945d41-525b-40d9-881c-d60322872348`
- Accounts: IBKR JPY (JPY) → IBKR (EUR)
- Transaction currency & amount: JPY `13_348`
- Linked `transaction_units` row:
  - `type = 0`, `amount = 13_348` (JPY)
  - `fx_amount = 78` in EUR
  - `fx_rate_to_base = 9_314.6489851393`

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

## Scenario 7 – Delivery of EUR security directly into portfolio (DEKA DAX ETF)
- `transactions.uuid`: `84c9b74a-840e-48ac-b505-062acb901668`
- Portfolio-only booking: S-Broker receives DEKA DAX UCITS ETF INHABER-ANTEILE (EUR); no account is referenced (`account = NULL`).
- Transaction currency & amount: EUR `5_000`, shares: `29_540_000`
- Linked `transaction_units`: none (`COUNT(*) = 0`), matching the portfolio-only delivery without FX data.

## Scenario 8 – Delivery of non-EUR security directly into portfolio (BARRY CALLEBAUT)
- `transactions.uuid`: `5a5daa04-bb2c-468b-86df-c54c2cb0b7fd`
- Portfolio-only booking: S-Broker receives BARRY CALLEBAUT AG NAMENSAKTIEN SF 0,02 (CHF); no account is referenced (`account = NULL`).
- Transaction currency & amount: EUR `81_847`, shares: `100_000_000`
- Linked `transaction_units` rows:
  1. `type = 2`, `amount = 997` (EUR); no FX columns populated.
  2. `type = 0`, `amount = 80_850` (EUR), `fx_amount = 76_161` (CHF), `fx_rate_to_base = 9.4065555458`

## Scenario 9 – Dividend of non-EUR security to EUR account (Roche Holding AG)
- `transactions.uuid`: `08afd779-d838-41fb-81f5-aaa99096a158`
- Account & security currencies: Haspa Giro (EUR) receives dividend from Roche Holding AG (CHF)
- Transaction currency & amount: EUR `3_305`, shares: `600_000_000`
- Linked `transaction_units` rows:
  1. `type = 0`, `amount = 6_070` (EUR), `fx_amount = 5_820` (CHF), `fx_rate_to_base = 50.1012262146`
  2. `type = 1`, `amount = 607` (EUR); no FX columns populated.
  3. `type = 1`, `amount = 33` (EUR); no FX columns populated.
  4. `type = 1`, `amount = 2_125` (EUR); no FX columns populated.

## Scenario 10 – Dividend of EUR security to EUR account (RWE AG)
- `transactions.uuid`: `5ac977d1-a381-4bf6-8cff-666af138ca59`
- Account & security currencies: Haspa Giro (EUR) receives dividend from RWE AG (EUR)
- Transaction currency & amount: EUR `3_644`, shares: `4_500_000_000`
- Linked `transaction_units` rows:
  1. `type = 1`, `amount = 1_238` (EUR); no FX columns populated.
  2. `type = 1`, `amount = 68` (EUR); no FX columns populated.

