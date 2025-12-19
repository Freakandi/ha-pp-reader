## 2024-05-23 - [Improved Icon-Only Buttons]
**Learning:** Icon-only buttons (like navigation arrows) need both `aria-label` for screen readers and `title` for mouse users. The internal SVG should be `aria-hidden="true"` to prevent duplicate or confusing announcements.
**Action:** Always add `title` to icon-only buttons and hide the decorative SVG.
