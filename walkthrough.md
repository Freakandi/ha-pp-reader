
# Walkthrough - New Feature: Dashboard Navigation (Refined)

## Logical Flow
1. **Tabs Order**: `[DetailTab (max 1), Dashboard, Analyze, Trades]`
2. **Opening a Detail**:
   - Opens at **Index 0** (Leftmost).
   - Automatically **closes** any other open Detail tab (Enforced Single Instance).
3. **Closing a Detail**:
   - Explicit toggle or navigating from Detail -> Dashboard.
   - Saves the closed UUID for "Reopen" logic.
4. **Navigation Arrows**:
   - **Left Arrow**:
     - Disabled at Dashboard (Index 0) *unless* there is a closed detail to reopen.
     - Clicking Left at Dashboard -> Reopens Last Detail (Index 0).
   - **Right Arrow**:
     - Navigates Right.
     - At the end (Trades), it is **Disabled**. (Previously looped to Detail, which was confusing).

## Changes
- **Single Instance**: `registerDetailTab` now aggressively unregisters other security tabs.
- **Left Reopen**: `navigateToPage` triggers reopen on left-overflow; `updateNavigationState` enables left button if reopen is possible.
- **Right Safety**: Removed right-overflow reopen logic to prevent unexpected looping.

## Verification
- **Build**: `npm run build` passed.
- **Lint**: `npm run lint:ts` passed.
- **Behavior Check**:
  - Open Auric -> [Auric, Dashboard...]. Nav Right -> Dashboard. Auric closes? No, stays until dismissed or navigated past? Use "Close on Navigate" logic if configured, but default behavior is to keep it in registry until explicitly closed or replaced. Wait, `navigateToPage` logic closes it if *target is OVERVIEW*.
  - So: Detail (0) -> Right -> Overview (1). Logic closes Detail. Array shrinks to `[Dashboard...]`. Dashboard becomes 0.
  - User sees: Dashboard.
  - Nav Left from Dashboard (0)? `lastClosedSecurityUuid` is set. Left enabled. Click Left -> Reopens Auric.
  - This matches the "Return with one click" and "Re-open with one click" flow perfectly.
