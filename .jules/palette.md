## 2025-12-12 - [Added ARIA roles to FX Warning Banner]
**Learning:** This codebase uses `__TEST_ONLY__` exports to test private UI helper functions. This pattern allows for verifying accessibility attributes on internal components without making them public.
**Action:** Use this pattern when testing small UI components that are not exported by default.

## 2024-05-23 - [Improved News Prompt Button Feedback]
**Learning:** The existing `.loading` class only disables interaction without visual feedback (no spinner). Users clicking complex actions (like "Copy & Open") need immediate confirmation.
**Action:** When implementing async buttons, manually update the button text (e.g., "Copied! ✅") to provide immediate feedback before the async operation completes or while it runs.
## 2024-05-23 - Accessible Sortable Tables
**Learning:** Native `<th>` elements do not support keyboard activation (Enter/Space) even with `role="button"` and `tabindex="0"`.
**Action:** Always attach a `keydown` listener to sortable headers that checks for `Enter` or `Space` keys and triggers the sort action, mirroring the `click` handler.
