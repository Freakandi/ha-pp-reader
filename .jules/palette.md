## 2025-12-12 - [Added ARIA roles to FX Warning Banner]
**Learning:** This codebase uses `__TEST_ONLY__` exports to test private UI helper functions. This pattern allows for verifying accessibility attributes on internal components without making them public.
**Action:** Use this pattern when testing small UI components that are not exported by default.

## 2024-05-23 - [Improved News Prompt Button Feedback]
**Learning:** The existing `.loading` class only disables interaction without visual feedback (no spinner). Users clicking complex actions (like "Copy & Open") need immediate confirmation.
**Action:** When implementing async buttons, manually update the button text (e.g., "Copied! ✅") to provide immediate feedback before the async operation completes or while it runs.
