# Task: Use Unified Fetch for Price Push Events

## Status: [x] Closed

## Metadata
- **Est. Complexity**: Low
- **Suggested Mode**: Local
- **Execution Mode**: Local

## Issue
- "Push" events for prices were inconsistent with the API "Pull" events.
- Portfolio Aggregates (sum of all assets) often differed from the "sum of parts" visible in the UI because they were calculated/fetched at slightly different times or via different code paths.
- "Last Price" was disappearing on push updates, likely due to context/cache differences in the ad-hoc `load_portfolio_position_snapshots` helper.

## Solution: Unified Fetch
Instead of triggering disparate fetch logic for Aggregates and Positions, we will use the canonical `async_normalize_snapshot(include_positions=True)` pipeline.

This function:
1. Reloads the latest Metric Run.
2. Builds `PortfolioSnapshot` objects (aggregates).
3. If `include_positions=True`, builds nested `PositionSnapshot` objects (positions) using the *same context* (dates, prices, securities).
4. Persists the result to the "snapshot tables" (for the API).
5. Returns the fully hydrated `NormalizationResult`.

We will then simply slice this result into the two payloads (`portfolio_values`, `portfolio_positions`) and push them.

## Implementation Steps

### 1. Modify `custom_components/pp_reader/prices/price_service.py`
- [x] Locate `_run_metrics_refresh`.
- [x] Remove `fetch_live_portfolios` import and usage.
- [x] Remove `load_portfolio_position_snapshots` import and usage.
- [x] Change `async_normalize_snapshot` call to use `include_positions=True`.
- [x] Capture the return value (`normalization_result`).
- [x] Construct `portfolio_payload` using `serialize_portfolio_snapshot` (but excluding positions key to match `portfolio_values` expectation, or trusting `_push_update` to handle it? The `portfolio_values` event expects a list of portfolio objects).
- [x] Construct `positions_payload` by iterating over `normalization_result.portfolios`, extracting the `positions` list, and using `serialize_position_snapshot`.
- [x] Push the events.
- [x] Ensure imports are correct (need `serialize_portfolio_snapshot` from `normalization_pipeline`).

### Verification
- [x] Run `pytest tests/metrics/test_performance_summation.py` (ensure no regressions).
- [ ] Visually verify that "Last Price" persists after an update.
- [ ] Verify that sums are consistent (or at least derived from the same snapshot).

## Note on "Legacy" Payload Format
- The `portfolio_values` event expects: `list[dict]` where dict is portfolio aggregate.
- The `portfolio_positions` event expects: `list[dict]` where dict is `{ "portfolio_uuid": ..., "positions": [list of position dicts] }`.
- We must manually ensure this structure is respected when mapping from `NormalizationResult`.
