## 2025-05-18 - [SVG Icon Replacement]
**Learning:** Replacing text-based carets with inline SVGs requires careful handling of CSS dimensions to ensure alignment. Using `display: inline-flex` on the container and explicit `width/height` on the SVG is robust.
**Action:** When replacing text icons with SVGs, always define explicit dimensions and flex alignment in local component styles if global styles are not guaranteed to be compatible.

## 2025-05-23 - [Keyboard Grid Navigation]
**Learning:** Custom grid components (like calendars) require manual Arrow Key implementation to avoid "Tab Fatigue" (e.g. tabbing 30 times). `role="listbox"` implies arrow key support to screen reader users, but native focus management doesn't provide it automatically.
**Action:** When building custom grids, attach a single `keydown` listener to the container to manage focus via `Arrow` keys, ensuring `document.activeElement` is used to determine the current position.
