# Task: Fix Missing Push Events for Portfolio Positions

## Status: [x] Complete

## Metadata
- **Est. Complexity**: Low
- **Suggested Mode**: Local
- **Execution Mode**: Local

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

### Chunk 1: Update Price Service
- [x] **File**: `custom_components/pp_reader/prices/price_service.py`
  - **Action**: Add Imports
    - `load_portfolio_position_snapshots` from `custom_components.pp_reader.data.normalization_pipeline`
    - `serialize_position_snapshot` from `custom_components.pp_reader.data.normalization_pipeline`
  - **Action**: Modify `_run_metrics_refresh`
    - In the `else` block of `fetch_live_portfolios` (when successful):
    - Extract `portfolio_ids` from `portfolio_payload` (e.g. `[p["uuid"] for p in portfolio_payload if p.get("uuid")]`).
    - Call `raw_positions = await async_run_executor_job(hass, load_portfolio_position_snapshots, Path(db_path), portfolio_ids)`.
    - Iterate over `raw_positions` and serialize:
      ```python
      positions_payload = []
      for pid, snapshots in raw_positions.items():
          if not snapshots:
              continue
          positions_payload.append({
              "portfolio_uuid": pid,
              "positions": [serialize_position_snapshot(s) for s in snapshots],
          })
      ```
    - Call `_push_update(hass, entry_id, "portfolio_positions", positions_payload)`.

### Chunk 2: Fix Data Quality (Unified Fetch)
- [x] **File**: `tasks/fix_push_data_quality.md`
  - **Issue**: "Last Price" disappeared and sums were inconsistent because of potentially divergent fetch logic.
  - **Fix**: Replaced separate `fetch_live_portfolios` and `load_portfolio_position_snapshots` with a single `async_normalize_snapshot(include_positions=True)` call.
  - **Status**: Implemented and verified by unit tests.

## Verification
1.  **Manual Verification** (Implicit):
    -   User will verify via UI if positions update after price change.
2.  **Automated Tests**:
    -   Run `pytest tests/metrics/test_performance_summation.py` to ensure core metrics are fine.
    -   Run `ruff check .` to ensure no import errors.
