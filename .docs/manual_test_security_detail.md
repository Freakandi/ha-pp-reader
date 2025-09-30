# Manual Test Plan: Security Detail Tab

## Preconditions
- Home Assistant core is running with the `pp_reader` integration configured and a synced Portfolio Performance database that contains:
  - At least one portfolio with multiple securities.
  - Historical price series for the selected securities spanning 1M, 6M, 1Y, and 5Y ranges.
- The dashboard panel is accessible via the Home Assistant frontend (e.g., `http://homeassistant.local:8123/pp-reader`).
- A user account with permission to access the dashboard is available.

## Test Matrix
| Scenario | Description | Expected Outcome |
|----------|-------------|------------------|
| Open detail tab from overview | Expand a portfolio, click a security row (excluding expand icons). | A new tab titled with the security name opens; header cards show holdings, currency, last price (native & EUR), and market value consistent with overview. |
| Navigate between tabs | Use arrow buttons or swipe gestures to return to the overview and re-enter the security tab. | Navigation updates the active tab correctly; overview retains expanded rows and scroll position. |
| Range switching | In the detail tab, select 1M, 6M, 1Y, and 5Y buttons sequentially. | Chart updates without errors, active button styling follows selection, and data is cached (subsequent clicks are instantaneous). |
| Empty history state | Choose a security known to lack history (or temporarily remove history rows). | Detail tab shows a friendly empty-state message; chart placeholder and range buttons disable as designed. |
| Live price update | Trigger a price update for the active security (e.g., via HA service call or waiting for polling). | Header values refresh, and the chart invalidates and refetches the current range after the update. |
| Close detail tab | Use the close control on the tab strip. | Security tab is removed, overview becomes active, and no console errors occur. |

## Step-by-step Instructions
1. Navigate to the PP Reader dashboard and ensure the Overview tab is active.
2. Expand a portfolio section and verify position rows display `data-security` attributes via browser dev tools if needed.
3. Click on a position row (avoiding expand toggles) to open the security detail tab.
4. Confirm that header cards display expected values matching the Portfolio Performance dataset.
5. Observe the chart render with the default range (1Y). Hover to confirm tooltip accuracy for dates and prices.
6. Use the tab-strip arrow buttons to navigate back to the overview and forward to the detail tab again. Verify that the active tab indicator follows each navigation step and that swipe gestures on touch devices mirror the arrow-button behaviour.
7. Click each range button (1M, 6M, 1Y, 5Y) and verify active state styling and chart refresh behaviour.
8. If historical data is absent, ensure the empty-state banner appears and no chart is drawn.
9. Trigger or wait for a live price update, then verify that header and chart data refresh automatically.
10. Close the tab using the provided control and confirm the overview remains in its prior state.
11. Review the browser console for warnings or errors; none should be present.

## Pass/Fail Criteria
- All scenarios in the matrix complete without UI or console errors.
- Chart interactions remain responsive (< 500 ms perceived latency) after initial fetch per range.
- Header metrics reconcile with backend data within formatting tolerances.
- Navigation between overview and detail tabs preserves user context.

## Follow-up Actions
- Capture screenshots of unexpected states and attach them to the issue tracker.
- File defects for discrepancies between header values and backend data, or for range buttons failing to fetch data.
- If performance issues are observed with large datasets, consider enabling chart tooltip throttling (see checklist item 12.a).
