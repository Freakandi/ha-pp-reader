# Task: Fix Performance UI Freeze & Crashes

Status: [x] Complete
Est. Complexity: Medium
Suggested Mode: Local
Execution Mode: Local

## Issue
- **Symptoms**:
    - Expanding portfolio positions table is extremely slow.
    - Clicking a position to open detail tab freezes/crashes the integration.
    - Logs show `Watchdog-Schwelle überschritten` warnings, indicating long-running tasks.
- **Root Cause**:
    - `ws_get_portfolio_positions` and `ws_get_security_snapshot` trigger `async_normalize_snapshot(include_positions=True)`, which recalculates the **ENTIRE** snapshot (O(N)) every time.
    - `normalization_pipeline` currently lacks filtering capabilities.

## Investigation
- `normalization_pipeline.py`: `_normalize_snapshot_sync` and `_compose_portfolio_snapshots` iterate all portfolios unconditionally.
- `websocket.py`: Handlers indiscriminately request full normalization.

## Implementation Plan

### Phase 1: Pipeline Optimization (`normalization_pipeline.py`)
- [x] Update `async_normalize_snapshot` signature to accept `portfolio_uids: Collection[str] | None`.
- [x] Update `_normalize_snapshot_sync` signature to accept `portfolio_uids`.
- [x] Pass `portfolio_uids` to `_compose_portfolio_snapshots` and filter the portfolio list *before* heavy processing.
- [x] **CRITICAL**: In `_normalize_snapshot_sync`, prevent calling `persist_normalization_result` if `portfolio_uids` is not None (partial update).

### Phase 2: Websocket Optimization (`websocket.py`)
- [x] Update `ws_get_portfolio_positions`:
    - [x] Pass `portfolio_uids=[portfolio_uuid]` to `async_normalize_snapshot`.
- [x] Update `ws_get_security_snapshot`:
    - [x] Implement helper `_get_portfolios_for_security` (SQL: `SELECT DISTINCT portfolio FROM transactions WHERE security = ?`).
    - [x] Use this list to filter `async_normalize_snapshot`.

### Phase 3: Verification
- [x] **Tests**: Run `pytest tests/test_normalization_pipeline.py` (ensure no regressions).
- [x] **Tests**: Add unit test verifying `async_normalize_snapshot` returns only requested portfolios and does NOT persist.
- [x] **Manual**:
    - Start HA & Vite.
    - Expand Portfolio -> Check speed/logs.
    - Open Position Details -> Check speed/logs/crash.

## Verification
- **Automated**: Run `pytest` and specific new tests.
- **Manual**: Verify UI responsiveness.
