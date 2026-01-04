# Refactor Phase 0: Foundation & FX Extraction

## Goal
Extract the critical FX Rate Lookup logic from the "Ingestion/Sync" layer into a shared, stateless utility kernel (`metrics.core.fx_access`). This resolves the circular dependency for Phase 1 and 2, allowing both the Ingestion Writer and the future `MarketResolver` to share the same "System of Record" logic for FX.

## Context
See [Refactor Calculations](tasks/refactor_calculations.md) Phase 0.
See [Refactor Context](tasks/refactor_context.md).

## Proposed Changes
### 1. New Core Module: `metrics/core/fx_access.py`
- Create module with function `get_best_available_fx_rate(conn, currency, date)`.
- Port logic from `canonical_sync.py:_lookup_fx_rate` exactly.
- Ensure strict adherence to "Latest Rate <= Date" with fallback (as currently implemented).

### 2. Refactor Existing Dependent Modules
- **`custom_components/pp_reader/data/canonical_sync.py`**: Remove `_lookup_fx_rate`.
- **`custom_components/pp_reader/data/backfill_fx_tx.py`**: Switch to `metrics.core.fx_access`.
- **`custom_components/pp_reader/data/ingestion_writer.py`**: Switch to `metrics.core.fx_access`.

### 3. Test Migration
- **Remove** `test_lookup_fx_rate_falls_back_to_available_future_rate` from `tests/test_canonical_sync.py`.
- **Create** `tests/metrics/core/test_fx_access.py` with the migrated test cases to verify the new module directly.

## Detailed Steps
1.  Create `metrics/core/` directory and `__init__.py`.
2.  Create `metrics/core/fx_access.py` implementing `get_best_available_fx_rate` (copy-paste of `_lookup_fx_rate` with type hints and logging).
3.  Modify `custom_components/pp_reader/data/canonical_sync.py`: Delete `_lookup_fx_rate`.
4.  Modify `custom_components/pp_reader/data/backfill_fx_tx.py`: Import and use `get_best_available_fx_rate`.
5.  Modify `custom_components/pp_reader/data/ingestion_writer.py`: Import and use `get_best_available_fx_rate`.
6.  Create `tests/metrics/core/test_fx_access.py` containing the test case removed from `test_canonical_sync.py`.
7.  Modify `tests/test_canonical_sync.py`: Remove the now-irrelevant test case.
8.  Run `pytest tests/metrics/core/test_fx_access.py` to verify the extraction.
9.  Run `pytest tests/integration/test_backfill_fx_tx.py tests/integration/test_ingestion_writer.py` to ensure regression safety.

## Test Plan
- **Primary:** `tests/metrics/core/test_fx_access.py`
    - `test_rate_lookup_exact_match`
    - `test_rate_lookup_fallback_backward` (Latest <= Date)
    - `test_rate_lookup_fallback_forward` (First > Date - warning case)
    - `test_rate_lookup_eur` (Returns 1.0)
    - `test_rate_lookup_none`
- **Obsolete Tests:** `tests/test_canonical_sync.py::test_lookup_fx_rate_falls_back_to_available_future_rate` (Move to new file).

## Complexity
- **Rating:** 2/10 (Simple extraction).
