## 2024-05-23 - [Improved Date Range Picker Accessibility]
**Learning:** Toggle buttons in date pickers (like presets) need `aria-pressed` to communicate state to screen readers.
**Action:** Always add `aria-pressed` to mode-switching or preset buttons.

## 2025-05-26 - [Consistent Iconography in Navigation]
**Learning:** Replacing text-based navigation arrows ('‹', '›') with SVGs improves visual consistency but requires careful CSS sizing (`width`, `height`, `fill`) inside flex containers to prevent layout shifts.
**Action:** When replacing text icons with SVGs, explicitly define dimensions and ensure `aria-label` is preserved for accessibility.

## 2025-05-27 - [Semantic Icons for Screen Readers]
**Learning:** Purely visual icons (like lock/status indicators) are invisible to screen readers unless explicitly wrapped in a container with `role='img'` and a descriptive `aria-label`. The internal icon should be hidden (`aria-hidden='true'`) to prevent redundant or confusing announcements.
**Action:** Always wrap semantic status icons in a labelled span and hide the decorative icon element itself.

## 2025-06-05 - [Visual Selection vs ARIA State]
**Learning:** Custom dropdowns often use CSS classes like `.selected` for visual indication, but this is invisible to screen readers. Elements representing a "current selection" in a list or grid (like a calendar or list of months) must use `aria-current="true"` (or `aria-selected` if a listbox) to programmatically communicate the active state.
**Action:** When applying a `.selected` class to an interactive element, always check if a corresponding ARIA attribute (`aria-current`, `aria-selected`, `aria-pressed`) is needed.

## 2025-06-15 - [Preserving Accessible Names in Loading States]
**Learning:** Replacing a button's text content with a spinner (even an accessible SVG) destroys its accessible name if no `aria-label` is present. Screen readers will perceive it as an empty button or skip it entirely.
**Action:** Before replacing button text with a loading spinner, verify if an `aria-label` exists. If not, capture the button's text content and set it as `aria-label` to preserve context during the loading state.
