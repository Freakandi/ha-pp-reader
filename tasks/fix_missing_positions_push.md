# Task: Fix Missing Push Events for Portfolio Positions

## Status: [ ] Open

## Issue
The user reports that while "portfolio_values" (aggregates) are correctly pushed after a price update, the "portfolio_positions" (individual line items) are NOT being pushed. This leads to stale data in the expandable rows of the dashboard until a manual refresh or reload occurs.

## Investigation
- **File**: `custom_components/pp_reader/prices/price_service.py`
- **Function**: `_schedule_metrics_after_price_change` -> `_run_metrics_refresh`
- **Findings**:
  - The code explicitly calls `fetch_live_portfolios` and pushes the result as `portfolio_values`.
  - There is NO corresponding call to fetch and push `portfolio_positions`.
  - The `fetch_live_portfolios` function in `db_access.py` only returns portfolio-level aggregates, not the nested positions.
  - `custom_components/pp_reader/prices/revaluation.py` has logic for partial updates that includes positions, but `price_service.py` performs a full refresh and does not use `revaluation.py` for the final push.

## Implementation Plan
1.  **Modify `custom_components/pp_reader/prices/price_service.py`**:
    -   Import `load_portfolio_position_snapshots` and `serialize_position_snapshot` from `custom_components/pp_reader/data/normalization_pipeline.py`.
    -   Update `_run_metrics_refresh` inner function:
        -   After successfully fetching `portfolio_payload` (aggregates), extract all `portfolio_uuid`s.
        -   Call `await async_run_executor_job(hass, load_portfolio_position_snapshots, Path(db_path), portfolio_ids)`.
        -   Serialize the returned `PositionSnapshot` objects using `serialize_position_snapshot`.
        -   Push the serialized data using `_push_update` with `data_type="portfolio_positions"`.
    -   Ensure exception handling matches the existing pattern (log errors but don't crash).

## Verification
1.  **Manual Verification** (Implicit):
    -   Since I cannot run the UI, I will rely on the code correctness and existing tests passing.
    -   The user will verify via UI.
2.  **Automated Tests**:
    -   Run `pytest tests/metrics/test_performance_summation.py` and `pytest tests/prices/test_price_service.py` (if exists) to ensure no regression.
    -   (Optional) If a test for `price_service.py` mocks `_push_update`, I could check if it's called twice.

## Todos
- [ ] Implement changes in `price_service.py`
- [ ] Run linting (`ruff check .`, `ruff format .`)
- [ ] Run tests
