# TODO – Backdating datamodel

Derived from `.docs/wealth-backdating-plan.md` (Datamodel design).

## Checklist
- [ ] Define schema for `daily_wealth` table:
  - [ ] Columns: `date` (TEXT ISO, PK), `total_wealth_eur`, `portfolio_wealth_eur`, `account_wealth_eur`, `dividends_eur`, `interest_eur`, `inbound_transfers_eur`, `outbound_transfers_eur`, `fees_eur`, `taxes_eur`, `fx_coverage_ratio`, `price_coverage_ratio`, `stale_price`, `provenance`, `created_at`, `updated_at`.
  - [ ] Data types: REAL for monetary aggregates, INTEGER (0/1) for `stale_price`, TEXT for provenance/timestamps.
  - [ ] Index: primary key on `date`; supporting index on `date` if needed for range scans.
- [ ] Define per-scope slices schema (accounts/portfolios):
  - [ ] Columns: `scope_type` (TEXT: account|portfolio), `scope_id` (TEXT UUID), `scope_name` (TEXT), `date` (TEXT ISO), same metric columns as `daily_wealth`, plus `provenance`, `created_at`, `updated_at`.
  - [ ] Constraints: primary key `(scope_type, scope_id, date)`.
  - [ ] Indexes: `(date)`, `(scope_type, scope_id)`, and optionally `(scope_name)` for sorting/search.
- [ ] Optional bucket: `performance_neutral_movements` (REAL) to store net transfers/adjustments if needed for UI mapping (card 2).
- [ ] DDL integration:
  - [ ] Add schema definitions to `custom_components/pp_reader/data/db_schema.py`.
  - [ ] Include migrations if needed for existing DBs (ensure WAL-safe DDL, idempotent creation).
- [ ] Serialization mapping:
  - [ ] Ensure ORM/dataclass/row mappers exist (e.g., records in `db_access.py`) for reading/writing these tables.
  - [ ] Plan normalization/persistence hooks in the metrics pipeline for populating these tables (even if implemented later).
- [ ] Documentation:
  - [ ] Update datamodel docs to describe columns, types, defaults, indexes, and coverage semantics.
