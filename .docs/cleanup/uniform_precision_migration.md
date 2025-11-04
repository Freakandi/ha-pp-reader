Concept: Uniform 10^-8 Integer Precision

Goal: Define the end-to-end plan that converts every persisted monetary, price, and quantity field to shared 10^-8 integer precision, ensuring consistent math between database, business logic, and UI rendering without supporting legacy mixed-precision data.

---

## 1. Current State
- The SQLite schema mixes integer, REAL, and generated columns: securities and historical prices already store `last_price` and OHLC values as 10^-8 integers, while portfolio aggregates and averages rely on REAL columns (`custom_components/pp_reader/data/db_schema.py`).
- Transaction amounts use INTEGER cents, whereas share counts mix 10^-8 integers and floating conversions, leading to cross-unit adjustments during average-cost derivations in `db_access.get_security_snapshot` and related helpers (`custom_components/pp_reader/data/db_access.py`).
- Portfolio valuation pipelines (e.g., `logic/portfolio.calculate_portfolio_value`, `prices/revaluation.update_security_values`) expect floats and decimals, so they round outputs to align with mixed storage formats.
- Frontend dashboards assume mixed numeric types: REST/websocket payloads serialize floats for averages and totals but integers for last prices, forcing format guards in `src/lib/formatters` and Vue components.
- Existing documentation and tests encode the current precision mix, including fixtures that assert floats for averages (`tests/test_db_access.py`).
- No global utility abstracts currency scaling; multiple modules perform ad-hoc conversions (e.g., dividing by `1e8` for share math or by `100` for euro cents).

## 2. Target State
- All persisted numeric price, value, and quantity fields—totals, averages, holdings, FX rates—store scaled integers representing 10^-8 units, eliminating REAL columns in financial tables.
- Every data access layer returns explicit objects containing both raw integers and formatted strings, centralizing conversion rules before API exposure.
- Calculation helpers and websocket handlers operate exclusively on integer math until the presentation layer, guaranteeing identical rounding between environments.
- Portfolio Performance `.portfolio` importers perform the only format conversion; once the code path is updated, a regenerated database contains exclusively scaled integers for all prices, totals, and share counts.
- Tests, fixtures, and documentation describe the integer scaling contract, and developer tooling surfaces helper utilities for conversions.
- UX remains unchanged: dashboards still display localized decimals, but formatting derives from the new integer payloads.

## 3. Proposed Data Flow / Architecture
1. Introduce shared scaling helpers (`to_scaled_int`, `from_scaled_int`) consuming Decimal for deterministic rounding.
2. Update ingestion pipelines (Portfolio Performance export importers, sync routines) to convert incoming floats/strings into scaled integers at persistence boundaries so freshly generated databases immediately use the new contract.
3. Modify static SQLite schema definitions to declare INTEGER columns for all financial values and share quantities, ensuring table creation utilities use the new types.
4. Adjust computation utilities to accept scaled integers, using integer arithmetic or Decimal intermediates before storing results back as scaled integers.
5. Update backend response builders (REST/websocket) to convert scaled integers into presentation-ready decimals—share counts and prices to four decimal places, aggregate totals to two decimals—before emitting payloads.
6. Keep frontend components focused on rendering the provided decimals without performing arithmetic, updating TypeScript typings to reflect display-only fields where required.
7. Extend tests to operate on scaled integers end-to-end, verifying conversions at each boundary and asserting backend formatting contract.

## 4. Affected Modules / Functions

| Change | File | Action |
| --- | --- | --- |
| Redefine schemas to INTEGER precision | `custom_components/pp_reader/data/db_schema.py` | Replace REAL columns, ensure table creation uses INTEGER types |
| Normalize access helpers | `custom_components/pp_reader/data/db_access.py` | Update fetch/store logic to use scaling helpers |
| Adjust calculation utilities | `custom_components/pp_reader/logic/portfolio.py` | Convert to integer math, remove float assumptions |
| Sync ingestion updates | `custom_components/pp_reader/data/sync_from_pclient.py` | Scale inputs before writing |
| Price service updates | `custom_components/pp_reader/prices/price_service.py` | Ensure live prices remain scaled integers |
| Backend serializer updates | `custom_components/pp_reader/api/rest.py`, `custom_components/pp_reader/api/websocket.py` | Emit formatted decimals while retaining internal scaled integers |
| Frontend type updates | `src/lib/formatters.ts`, `src/lib/api-types.ts` | Expect already formatted decimals, remove arithmetic helpers |
| Test fixture revisions | `tests/test_db_access.py`, `tests/frontend/**` | Update expected values, add regression cases |
| Documentation refresh | `ARCHITECTURE.md`, `.docs/native_price/` | Describe integer precision contract |

Supporting notes:
- Reuse existing Decimal utilities (e.g., `round_currency` in `db_access`) as references when designing scaling helpers.
- Leverage current test fixtures that already expose 10^-8 share counts as guidance for new integer expectations.

## 5. Out of Scope
- Changing upstream Portfolio Performance export formats themselves.
- Revisiting FX rate sourcing logic beyond precision adjustments.
- Altering dashboard UX copy or localization behaviour.
- Replacing SQLite with alternative storage engines.

## 6. Incremental Implementation

1. **Phase 0 – Preparation**
   1. Audit existing numeric columns and produce mapping document from current type → scaled integer target.
   2. Introduce shared scaling helper module with unit tests.

### Phase 0 Audit – db_schema.py

| Table | Column | Current SQLite type | Current scaling / units | Target representation |
| --- | --- | --- | --- | --- |
| `accounts` | `balance` | INTEGER | Cents (10^-2) | 10^-8 INTEGER (scaled value) |
| `transactions` | `amount` | INTEGER | Cents (10^-2) | 10^-8 INTEGER (scaled value) |
| `transactions` | `shares` | INTEGER | Shares ×10^-8 | 10^-8 INTEGER (already scaled) |
| `transaction_units` | `amount` | INTEGER | Cents (10^-2) | 10^-8 INTEGER (scaled value) |
| `transaction_units` | `fx_amount` | INTEGER | Cents (10^-2) | 10^-8 INTEGER (scaled value) |
| `transaction_units` | `fx_rate_to_base` | REAL | Float (unscaled) | 10^-8 INTEGER (scaled value) |
| `portfolio_securities` | `current_holdings` | REAL | Float (unscaled) | 10^-8 INTEGER (scaled value) |
| `portfolio_securities` | `purchase_value` | INTEGER | Cents (10^-2) | 10^-8 INTEGER (scaled value) |
| `portfolio_securities` | `avg_price` | REAL (generated) | Float (derived cents) | 10^-8 INTEGER (scaled value) |
| `portfolio_securities` | `avg_price_native` | REAL | Float (native currency) | 10^-8 INTEGER (scaled value) |
| `portfolio_securities` | `security_currency_total` | REAL | Float (unscaled) | 10^-8 INTEGER (scaled value) |
| `portfolio_securities` | `account_currency_total` | REAL | Float (unscaled) | 10^-8 INTEGER (scaled value) |
| `portfolio_securities` | `avg_price_security` | REAL | Float (security currency) | 10^-8 INTEGER (scaled value) |
| `portfolio_securities` | `avg_price_account` | REAL | Float (account currency) | 10^-8 INTEGER (scaled value) |
| `portfolio_securities` | `current_value` | REAL | Float (unscaled) | 10^-8 INTEGER (scaled value) |
| `securities` | `last_price` | INTEGER | Price ×10^-8 | 10^-8 INTEGER (already scaled) |
| `historical_prices` | `close` | INTEGER | Price ×10^-8 | 10^-8 INTEGER (already scaled) |
| `historical_prices` | `high` | INTEGER | Price ×10^-8 | 10^-8 INTEGER (already scaled) |
| `historical_prices` | `low` | INTEGER | Price ×10^-8 | 10^-8 INTEGER (already scaled) |
| `historical_prices` | `volume` | INTEGER | Trade volume (units) | Integer (unit count, unchanged) |
| `plans` | `amount` | REAL | Float (unscaled) | 10^-8 INTEGER (scaled value) |
| `plans` | `fees` | REAL | Float (unscaled) | 10^-8 INTEGER (scaled value) |
| `plans` | `taxes` | REAL | Float (unscaled) | 10^-8 INTEGER (scaled value) |
| `exchange_rates` | `rate` | REAL | Float (unscaled) | 10^-8 INTEGER (scaled value) |
| `fx_rates` | `rate` | REAL | Float (unscaled) | 10^-8 INTEGER (scaled value) |

### Phase 0 Audit – db_init.py

| Table | Column | Introduced via | Current SQLite type | Current default / behaviour | Target representation |
| --- | --- | --- | --- | --- | --- |
| `portfolio_securities` | `avg_price_native` | `_ensure_portfolio_securities_native_column` | REAL | Added without default, populated as floats when runtime migration runs | 10^-8 INTEGER (scaled value) |
| `portfolio_securities` | `security_currency_total` | `_ensure_portfolio_purchase_extensions` | REAL | Added with `DEFAULT 0`, backfilled to 0.0 when NULL | 10^-8 INTEGER (scaled value) |
| `portfolio_securities` | `account_currency_total` | `_ensure_portfolio_purchase_extensions` | REAL | Added with `DEFAULT 0`, backfilled to 0.0 when NULL | 10^-8 INTEGER (scaled value) |
| `portfolio_securities` | `avg_price_security` | `_ensure_portfolio_purchase_extensions` | REAL | Added without default, left NULL when no average | 10^-8 INTEGER (scaled value) |
| `portfolio_securities` | `avg_price_account` | `_ensure_portfolio_purchase_extensions` | REAL | Added without default, left NULL when no average | 10^-8 INTEGER (scaled value) |

### Phase 0 Audit – db_access.py

| Element | Current float usage | Target representation |
| --- | --- | --- |
| `PortfolioSecurity.current_holdings` | Loaded as Python `float` from the `REAL` column and forwarded unchanged to aggregations and payloads. | Store and expose holdings as 10^-8 scaled integers; only convert to Decimal for display. |
| `PortfolioSecurity.avg_price` | Generated column delivers float cents derived from `purchase_value / current_holdings`. | Represent per-share price as 10^-8 scaled integer derived from integer math. |
| `PortfolioSecurity.avg_price_native` | Runtime migration populates native average prices as floats. | Persist native averages as 10^-8 scaled integers with helper-based conversion. |
| `PortfolioSecurity.avg_price_account` | Helper `_resolve_average_cost_totals` treats the field as float EUR per share. | Promote to 10^-8 scaled integer (account currency) and expose formatted strings separately. |
| `PortfolioSecurity.current_value` | Fetched as float (EUR cents) and fed into performance calculations. | Keep raw portfolio values as 10^-8 scaled integers, derive decimals when needed. |
| `_resolve_average_cost_totals` | Accepts float overrides and returns floats for purchase totals (`purchase_value_eur`, `security_total`, `account_total`). | Consume and return scaled integers (10^-8) so downstream payloads can rely on integer math. |
| `iter_security_close_prices` / `fetch_previous_close` | Yield floats for normalized close prices beside the raw integer column. | Return scaled integers for the normalized price field; only convert when presentation code requires decimals. |
| `get_security_snapshot` | Builds dictionaries containing floats for holdings, totals, average costs, FX rates, and performance payloads. | Emit payloads backed by scaled integers and add derived display decimals during formatting. |
| `get_portfolio_positions` | Returns floats for `current_holdings`, `purchase_value`, `current_value`, and nested average-cost totals. | Provide scaled integer fields for holdings and monetary values; attach formatted strings for UI use. |
| `_normalize_portfolio_row` / `fetch_live_portfolios` | Convert cent integers to floats when composing the live portfolio list. | Preserve scaled integers in the aggregation response and defer conversion to later serialization layers. |

`Transaction`, `Portfolio`, and `Account` dataclasses in this module already restrict numeric values to integers (cents or scaled shares) and therefore require no precision migration beyond adopting shared helpers.
2. **Phase 1 – Schema Definition Update**
   1. Update `db_schema.py` so all table creation statements emit INTEGER columns for financial values.
   2. Adjust schema-related fixtures and documentation to reflect the new contract.
3. **Phase 2 – Backend Logic Updates**
   1. Update data access, portfolio logic, and sync routines to use scaling helpers for all calculations and persistence.
   2. Ensure `.portfolio` parsing paths convert upstream floats or decimals into scaled integers before insert.
4. **Phase 3 – Frontend Adaptation**
   1. Ensure backend serializers output display-ready decimals (share counts and per-share prices with four decimals, other financial figures with two) so the frontend consumes normalized values.
   2. Simplify TypeScript models/interfaces to treat numeric fields as presentation decimals and remove any residual client-side math helpers.
5. **Phase 4 – Validation & Cleanup**
   1. Refresh integration tests, adjust fixtures, and add regression tests for rounding.
   2. Update documentation and release notes describing the reinitialisation requirement.

## 7. Performance & Risks

| Risk | Description | Mitigation |
| --- | --- | --- |
| Import conversion errors | Incorrect scaling during `.portfolio` parsing could seed bad data | Add unit tests for importer conversions and verify sample portfolios end-to-end |
| Precision regression | Incorrect scaling may alter historical totals | Write conversion tests comparing importer outputs to reference Decimal calculations |
| Frontend incompatibility | UI might misinterpret presentation decimals | Align TypeScript contracts and adjust components to treat incoming numbers as already formatted |
| Third-party automation impact | Existing automations reading floats may break | Communicate contract change and, if necessary, offer transitional duplicated fields in API responses |

## 8. Validation Criteria (Definition of Done)
- All financial numeric columns in SQLite store 10^-8 scaled integers verified via schema inspection.
- Backend unit tests confirm that computed averages and totals remain numerically equal (within rounding tolerance) to pre-migration values.
- Websocket/API responses include deterministic values with no floating drift compared to legacy baseline snapshots and respect the 4/4/2 decimal formatting contract.
- Frontend renders identical currency/price formatting before and after migration in manual QA scenarios.
- Documentation explicitly states the 10^-8 integer contract and references helper utilities.
- `.portfolio` regeneration produces identical portfolio totals (within rounding tolerance) when comparing Decimal-normalised exports to scaled-integer persisted values.

## 9. Planned Minimal Patch
- **Backend**
  - Add `scaling.py` with helpers:
    ```python
    SCALE = Decimal("1e8")

    def to_scaled_int(value: Decimal | str | float) -> int:
        return int((Decimal(value) * SCALE).to_integral_value(rounding=ROUND_HALF_EVEN))

    def from_scaled_int(value: int) -> Decimal:
        return Decimal(value) / SCALE
    ```
  - Update schema definitions so newly created databases allocate INTEGER columns for `portfolio_securities.avg_price_native`, share counts, and similar fields.
  - Adjust `db_access.get_security_snapshot` and related serializers to operate on integers internally and emit decimals with the mandated precision.
- **Frontend**
  - Update type definitions for positions/holdings to accept pre-formatted decimals and remove conversion utilities that previously divided by scaling factors.
- **Docs**
  - Document the integer precision contract, importer conversion rules, and the requirement to regenerate the database from `.portfolio` exports in `ARCHITECTURE.md` and release notes.

## 10. Summary of Decisions
- Counterargument: REAL columns allow quick ad-hoc SQL analysis without scaling. Decision: proceed with integer standardization and rely on regenerated databases rather than transitional schemas; analysts can run ad-hoc queries by manually dividing integer fields when necessary.
- Adopt a single 10^-8 integer precision standard across all financial data.
- Update schemas, helpers, and UI to operate solely on scaled integers, assuming fresh database generation from updated code.
- Provide mitigations for importer conversion issues and communicate the precision change to downstream consumers.
