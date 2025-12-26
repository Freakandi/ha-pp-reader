# Bugfix: Portfolio File Detection and Coordinator Loop

## Issue Description
The user reported that copying a new `.portfolio` file did not trigger an update even after 5 minutes. The coordinator should have detected the change and updated the database, as it is configured to run every minute.

## Problem Analysis
The `PPReaderCoordinator` inherits from `DataUpdateCoordinator`.
- **Coordinator Logic**: `DataUpdateCoordinator` has an internal loop (`_async_refresh` -> `_schedule_refresh`) that *only* reschedules the next update if `self._listeners` is not empty.
- **Project Context**: The integration currently does not have any entities (sensors) subscribed to the coordinator. The dashboard consumes data via separate WebSocket and DB channels.
- **Outcome**: The coordinator runs once on startup (`first_refresh`), finds no listeners, and terminates the update loop.

## Fix
The clean solution is to register a dummy listener on the coordinator. This satisfies the `DataUpdateCoordinator` logic, keeping the periodic polling active.
- **Modified**: `custom_components/pp_reader/data/coordinator.py`
- **Change**: Added `self.async_add_listener(lambda: None)` in `__init__`.
- **Reverted**: Removed the hacky manual refresh scheduling in `async_set_updated_data` (which was fragile as it didn't cover idle polling).

## Verification
1. **Loop Logic**: By adding a listener, `DataUpdateCoordinator`'s native logic (`should_schedule_refresh = bool(self._listeners)`) remains true, ensuring `call_at` is scheduled for the next interval.
2. **Code Cleanliness**:
   - `ruff check .`: Passed.
   - `npm run lint:ts`: Passed.
   - `npm run typecheck`: Passed.
