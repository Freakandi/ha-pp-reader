# Task: Fix Time Series Tab Not Updating

## Status
- [x] Analyze Input
- [x] Investigate Root Cause
- [x] Fix Event Bridge (Applied)
- [ ] Verify Fix (User to verify)

## Problem
The "Time Series" tab does not update automatically after a `.portfolio` file change. A hard refresh is required.
Threads hang during shutdown.

## Investigation findings
1.  **Frontend Expectation**: `src/dashboard.ts` listens for `panels_updated` event with `data_type: 'daily_wealth'` to trigger `refreshAnalyseData()`.
2.  **Backend Reality**: The backend (`coordinator.py`, `websocket.py`) **never emits** `panels_updated`. It only emits `SIGNAL_METRICS_PROGRESS` etc.
3.  **Missing Link**: There was no bridge between internal coordinator signals and the frontend-facing `panels_updated` event.
4.  **Zombie Threads**: Likely due to long-running SQLite queries (`engine.load_data`) not being interrupted during shutdown. The auto-update fix should reduce the frequency of overlapping requests caused by manual refreshes.

## Solution (Applied)
Modified `config/custom_components/pp_reader/__init__.py`:
-   Imported `SIGNAL_METRICS_PROGRESS` and `async_dispatcher_connect`.
-   Added `_setup_event_bridge` function to `async_setup_entry`.
-   The bridge listens for `SIGNAL_METRICS_PROGRESS` (completed) and fires `panels_updated` with `data_type: 'daily_wealth'`.
-   This ensures `time_series.ts` receives the signal to invalidate cache and re-fetch data.

## Verification
1.  Restart Home Assistant.
2.  Open "Time Series" tab.
3.  Update `.portfolio` file.
4.  Wait for processing (Ingestion -> Normalization).
5.  Observe if the tab updates automatically (via the re-fetch trigger).

## Next Steps
-   Confirm with user that the tab now updates.
-   Monitor "Zombie threads" to see if improved behavior resolves the shutdown delays.
