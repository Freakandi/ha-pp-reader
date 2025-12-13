## 2025-12-12 - [Added ARIA roles to FX Warning Banner]
**Learning:** This codebase uses `__TEST_ONLY__` exports to test private UI helper functions. This pattern allows for verifying accessibility attributes on internal components without making them public.
**Action:** Use this pattern when testing small UI components that are not exported by default.

## 2025-10-26 - [Dynamic Sort Accessibility]
**Learning:** In Vanilla JS/DOM environments, purely visual state changes (like adding/removing CSS classes for sorting) are invisible to screen readers unless explicitly accompanied by `aria-sort` updates.
**Action:** Always couple `classList.add('sort-active')` logic with `setAttribute('aria-sort', 'ascending'|'descending')` to ensure state is communicated.
