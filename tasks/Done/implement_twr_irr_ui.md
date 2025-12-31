# Task: UI Implementation of TWR/IRR Metrics with Reactivity

Status: [x] Feature Implemented
Est. Complexity: Low
Suggested Mode: Local
Execution Mode: Local

## Goal
Update the "Time Series" tab in the frontend to visualize the newly implemented Time-Weighted Rate of Return (TWR) and Internal Rate of Return (IRR) metrics. Ensure the view is reactive to backend data updates.

## Context
- Backend `ws_get_daily_wealth` now returns `twr` and `irr` in the `metrics` object.
- Frontend interface `PerformanceMetrics` in `src/data/api.ts` needs to be updated.
- Display logic in `src/tabs/time_series.ts` needs to rendering these metrics.
- `src/dashboard.ts` controls global reactivity and needs to trigger "Analyse" tab refreshes on relevant data events.

## Implementation Steps

### Chunk 1: Frontend Implementation
- [x] **Update Data Interfaces**:
    - Modify `src/data/api.ts`: Add `twr` and `irr` (optional numbers) to `PerformanceMetrics` interface.
- [x] **Update Time Series Display**:
    - Modify `src/tabs/time_series.ts`:
        - Update `PerformanceRowKey` type to include `'twr'` and `'irr'`.
        - Update `derivePerformance` function to extract `twr` and `irr` from the backend response metrics.
        - Update `renderMetrics` to include new rows for TWR and IRR.
        - Format values as percentages (fraction * 100 + "%") with 2 decimal places.
        - Apply standard coloring (Green/Red/Grey).
- [x] **Implement Reactivity**:
    - Modify `src/dashboard.ts`:
        - In `_doRender`, ensure that `portfolio_values` and `portfolio_positions` updates (which indicate price or holding changes) also trigger `invalidateDailyWealthCache()` and `refreshAnalyseData()` if the "Analyse" tab is active.
- [x] **Verification**:
    - Verify TypeScript compilation (`npm run typecheck`).
    - Verify build (`npm run build`).
    - Visual verification (via BrowserSubagent) that:
        - TWR/IRR appear in the "Performance Calculation" card.
        - Values are formatted correctly.
        - Values update when a mock event is triggered or on page load.
