# Refactor Phase 1: Database & Ingestion Enrichment

## Goal
Establish a **Single Source of Truth** for EUR valuations by persisting canonical `amount_eur_cents` and `fx_rate_used` at ingestion time. This eliminates on-the-fly calculations and ensures consistency across the application.

## Context
- **Master Plan:** `tasks/refactor_calculations.md` (Phase 1)
- **Design Decisions:** `tasks/refactor_context.md`
- **Pre-requisite:** Phase 0 (Data Access Extraction) is complete (`metrics/core/fx_access.py` exists).

## Proposed Changes

### 1. Database Schema (`custom_components/pp_reader/data/db_schema.py`)
- **`TRANSACTION_SCHEMA`:** Add `amount_eur_cents` (INTEGER) and `fx_rate_used` (REAL).
- **`transaction_units` (inside `TRANSACTION_SCHEMA`):** Add `amount_eur_cents` (INTEGER) and `fx_rate_used` (REAL).

### 2. Ingestion Writer (`custom_components/pp_reader/data/ingestion_writer.py`)
- **Feed-Forward Context:** Implement `latest_rates` dictionary to capture explicit rates during parsing for immediate reuse (bootstrapping new currencies).
- **`_compute_amount_eur_cents`:** Refactor to implement the "FX Rate Selection Hierarchy" (Implicit > Explicit > Resolver > Feed-Forward).
- **Unit Enrichment:** Calculate and persist `amount_eur_cents` and `fx_rate_used` for `transaction_units` (Fees/Taxes).

### 3. Canonical Sync (`custom_components/pp_reader/data/canonical_sync.py`)
- **Transfer Protocol:** Implement `_apply_transfer_protocol` to enforce the "Zero-Sum" invariant (Average Magnitude) for cross-currency transfers.
- **Sync Logic:** Update `_sync_transactions` to copy the new columns from Ingestion to Canonical tables.

### 4. Tests
- **New:** `tests/data/test_ingestion_enrichment.py` (Verification of valuation logic).
- **Update:** `tests/test_canonical_sync.py` (Verify schema syncing).

## Detailed Steps

- [x] **Step 1: Update Database Schema**
    - Modify `custom_components/pp_reader/data/db_schema.py` to add `amount_eur_cents` and `fx_rate_used` to `transactions` and `transaction_units` tables.
    - *Note:* `ingestion_transactions` already has `amount_eur_cents`. We are adding it to the canonical table and enhancing `transaction_units`.

- [x] **Step 2: Implement Ingestion Enrichment Logic**
    - Modify `custom_components/pp_reader/data/ingestion_writer.py`.
    - Update `write_transactions` to:
        - Maintain `latest_rates = {}`.
        - Update `latest_rates` when a transaction has an explicit rate.
        - Pass `latest_rates` to `_compute_amount_eur_cents`.
        - Enrich `transaction_units` using the parent's rate (if same currency) or independent lookup.
    - Refactor `_compute_amount_eur_cents`:
        1. Check Level 1 (Implicit PP Rate) - passed from parser? *Review `ParsedTransaction` model if needed, otherwise rely on logic.*
        2. Check Level 3 (Resolver) via `get_best_available_fx_rate`.
        3. Check Level 4 (Feed-Forward) via `latest_rates`.
    - *Constraint:* Ensure `fx_rate_used` is returned and persisted.

- [ ] **Step 3: Implement Transfer Protocol**
    - Modify `custom_components/pp_reader/data/canonical_sync.py`.
    - Add `_apply_transfer_protocol(conn)`:
        - Select pairs linked by `other_uuid`.
        - **Case 1 (Mixed with EUR):** Force `amount_eur_cents` to match the EUR leg.
        - **Case 2 (Foreign/Foreign):** Calculate average magnitude `(|v_out| + |v_in|) / 2`. Updates both legs.
    - Call `_apply_transfer_protocol(conn)` inside `async_sync_ingestion_to_canonical` (or `_sync_ingestion_to_canonical`), *before* the final sync to canonical.

- [ ] **Step 4: Update Sync Logic**
    - Modify `_sync_transactions` in `custom_components/pp_reader/data/canonical_sync.py`.
    - Update the `INSERT ... SELECT` statement to include `amount_eur_cents` and `fx_rate_used`.
    - Update `transaction_units` sync similarly.

- [ ] **Step 5: Verification & Testing**
    - Create `tests/data/test_ingestion_enrichment.py`.
    - Test cases:
        - `test_valuation_buy_usd_implicit_rate`
        - `test_valuation_transfer_usd_eur` (EUR leg wins)
        - `test_valuation_transfer_usd_jpy` (Averaging)
    - Run `pytest tests/data/test_ingestion_enrichment.py`.
    - Update `tests/test_canonical_sync.py` to assert new columns are populated.

## Complexity
- **Rating:** Medium
- **Risk:** High (Data Integrity). The Transfer Protocol logic must be robust against orphans.
