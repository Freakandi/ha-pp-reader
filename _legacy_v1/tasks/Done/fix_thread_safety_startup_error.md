# Task: Fix Thread Safety Startup Error in Event Bridge

- [x] Complete

## Estimation
- **Est. Complexity**: Low
- **Suggested Mode**: Local
- **Files Touched**: 1 (`config/custom_components/pp_reader/__init__.py`)

## Implementation Plan
- [x] **Modify `config/custom_components/pp_reader/__init__.py`**:
    - Update `_handle_metrics_progress` to use `hass.loop.call_soon_threadsafe(hass.bus.async_fire, ...)` instead of calling it directly.


## Verification
1.  **Restart Home Assistant**.
2.  **Monitor Logs**: Confirm the `RuntimeError` no longer appears during startup or after data processing.
3.  **Check Functionality**: Verify that the Time Series tab still updates (which implies the event was successfully fired).
