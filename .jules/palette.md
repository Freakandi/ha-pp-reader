## 2024-05-23 - [Improved Date Range Picker Accessibility]
**Learning:** Toggle buttons in date pickers (like presets) need `aria-pressed` to communicate state to screen readers.
**Action:** Always add `aria-pressed` to mode-switching or preset buttons.

## 2025-05-26 - [Consistent Iconography in Navigation]
**Learning:** Replacing text-based navigation arrows ('‹', '›') with SVGs improves visual consistency but requires careful CSS sizing (`width`, `height`, `fill`) inside flex containers to prevent layout shifts.
**Action:** When replacing text icons with SVGs, explicitly define dimensions and ensure `aria-label` is preserved for accessibility.
