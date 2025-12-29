# Task: Optimize Portfolio Expansion Performance

Status: [ ] Open

## Issue
Expanding portfolio tables in the overview tab is slow (15-20 positions cause noticeable lag). This is a regression compared to the previous persistence-based approach. The slowness recurs when navigating back and forth.

## Investigation
Inspection of `normalization_pipeline.py` and `db_access.py` reveals significant inefficiencies in the `async_normalize_snapshot` execution path, specifically in how position data is enriched with "previous close" prices for day-change calculations.

1.  **N+1 Connection Anti-Pattern**:
    For every position in a portfolio, `_derive_day_change_payload` calls `_safe_fetch_previous_close`. This function calls `fetch_previous_close`, which **opens and closes a new SQLite connection for every single call**. For a portfolio with 20 positions, this results in 20 sequential database connection openings/closings inside the normalization loop.

2.  **Inefficient Historical Data Fetching**:
    `fetch_previous_close` executes a `SELECT * FROM historical_prices WHERE security_uuid = ? ORDER BY date DESC` query without a `LIMIT` clause. It fetches the **entire price history** (potentially thousands of rows) into Python memory, only to iterate through them and pick the first valid one. Doing this 20 times means fetching and processing tens of thousands of rows unnecessarily.

Est. Complexity: Medium
Suggested Mode: Local
Execution Mode: Local

## Issue
Expanding portfolio tables in the overview tab is slow (15-20 positions cause noticeable lag). This is a regression compared to the previous persistence-based approach. The slowness recurs when navigating back and forth.

## Investigation
Inspection of `normalization_pipeline.py` and `db_access.py` reveals significant inefficiencies in the `async_normalize_snapshot` execution path:
1.  **N+1 Connection Anti-Pattern**: `fetch_previous_close` opens/closes a DB connection for every position.
2.  **Inefficient Query**: `fetch_previous_close` potentially fetches full price history without a limit.

## Implementation Plan

### 1. Optimize `db_access.py`
- [x] Modify `fetch_previous_close` to prioritize the passed `conn` argument.
- [x] Optimize the query in `fetch_previous_close`:
    - Use `LIMIT 150` (approx. 6 months) for the initial fetch.
    - Implement a fallback to full fetch if the target date is not found in the top 150.

### 2. Refactor `normalization_pipeline.py`
- [x] Update Context Dataclasses:
    - Add `conn: sqlite3.Connection` to `_PositionContext`.
    - Add `conn: sqlite3.Connection` to `_PortfolioComposeContext`.
    - Add `conn: sqlite3.Connection` to `_PositionSnapshotContext`.
    - Add `conn: sqlite3.Connection` to `_DayChangeContext`.
- [x] Update `_normalize_snapshot_sync`:
    - Initialize a shared `sqlite3.Connection` (read-only) at the start.
    - Pass this connection into the context objects.
- [x] Propagate Connection:
    - Update `_load_position_snapshots`, `_build_position_snapshot_entry`, and `_derive_day_change_payload` to blindly pass the connection.
    - Update call to `_safe_fetch_previous_close` to use the shared connection.

### 3. Verification
- [x] **Unit Tests**: Run `pytest tests/normalization/` to ensure no regressions.
- [x] **Manual Verification**:
    - Start HA and Vite.
    - Open Overview tab.
    - Expand a large portfolio.
    - Verify speed and that "Last Close" / "Day Change" are populated.
