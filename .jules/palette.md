## 2025-05-18 - [SVG Icon Replacement]
**Learning:** Replacing text-based carets with inline SVGs requires careful handling of CSS dimensions to ensure alignment. Using `display: inline-flex` on the container and explicit `width/height` on the SVG is robust.
**Action:** When replacing text icons with SVGs, always define explicit dimensions and flex alignment in local component styles if global styles are not guaranteed to be compatible.
