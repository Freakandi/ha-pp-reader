# TODO – Backdating datamodel

Derived from `.docs/wealth-backdating-plan.md` (Datamodel design).

## Checklist
- [ ] Define schema for `daily_wealth` table:
  - [ ] Columns: `date` (TEXT ISO, PK), `total_wealth_eur`, `portfolio_wealth_eur`, `account_wealth_eur`, `dividends_eur`, `interest_eur`, `inbound_transfers_eur`, `outbound_transfers_eur`, `fees_eur`, `taxes_eur`, `fx_coverage_ratio`, `price_coverage_ratio`, `stale_price`, `provenance`, `created_at`, `updated_at`.
  - [ ] Data types: REAL for monetary aggregates, INTEGER (0/1) for `stale_price`, TEXT for provenance/timestamps.
  - [ ] Index: primary key on `date`; supporting index on `date` if needed for range scans.
  - [ ] Location/pattern: follow existing schema blocks in `custom_components/pp_reader/data/db_schema.py` (e.g., `METRIC_RUNS_SCHEMA`); name block `DAILY_WEALTH_SCHEMA`.
  - [ ] Pitfalls: keep DDL idempotent/WAL-safe (see `migrations/snapshot_tables.py`), avoid naming collisions with existing tables, ensure `date` stored as ISO string (not epoch).
- [ ] Define per-scope slices schema (accounts/portfolios):
  - [ ] Columns: `scope_type` (TEXT: account|portfolio), `scope_id` (TEXT UUID), `scope_name` (TEXT), `date` (TEXT ISO), same metric columns as `daily_wealth`, plus `provenance`, `created_at`, `updated_at`.
  - [ ] Constraints: primary key `(scope_type, scope_id, date)`.
  - [ ] Indexes: `(date)`, `(scope_type, scope_id)`, and optionally `(scope_name)` for sorting/search.
  - [ ] Location/pattern: add a companion schema block in `db_schema.py`; mirror column order/types from `daily_wealth` to keep serialization simple.
  - [ ] Pitfalls: ensure scope types constrained via enum-like validation in code (schema can stay TEXT), avoid duplicating rows when scope names change—prefer storing name as best-effort display.
- [ ] Optional bucket: `performance_neutral_movements` (REAL) to store net transfers/adjustments if needed for UI mapping (card 2).
  - [ ] Placement: include in both `daily_wealth` and per-scope slices if used; document semantics (net transfers, cash-neutral adjustments).
- [ ] DDL integration:
  - [ ] Add schema definitions to `custom_components/pp_reader/data/db_schema.py`.
  - [ ] Include migrations if needed for existing DBs (ensure WAL-safe DDL, idempotent creation).
  - [ ] Pattern: extend `ALL_SCHEMAS` aggregation in `db_schema.py`; add a migration helper in `custom_components/pp_reader/data/migrations/` similar to `snapshot_tables.py`, and call it from `db_init.py`.
  - [ ] Pitfalls: preserve existing schema ordering; avoid blocking transactions—use `conn.executescript` with minimal locks; ensure migration is invoked during startup like other migrations.
- [ ] Serialization mapping:
  - [ ] Ensure ORM/dataclass/row mappers exist (e.g., records in `db_access.py`) for reading/writing these tables.
  - [ ] Plan normalization/persistence hooks in the metrics pipeline for populating these tables (even if implemented later).
  - [ ] Pattern: add `@dataclass` records in `data/db_access.py` mirroring schema (see `PortfolioMetricRecord`, `AccountMetricRecord`); add helper functions for insert/upsert/select (align with snapshot/metrics helpers).
  - [ ] Dependencies: serializers needed before API/pipeline can use them; design upsert signature to take full row + provenance.
- [ ] Documentation:
  - [ ] Update datamodel docs to describe columns, types, defaults, indexes, and coverage semantics.
  - [ ] Files: `datamodel/SQLite_data.md`, and optionally a new doc section for backdating; link from `wealth-backdating-concept.md`/`plan.md`.
  - [ ] Include examples for `date` format, coverage flags (`fx_coverage_ratio`, `price_coverage_ratio`, `stale_price`), and per-scope slice keys.
