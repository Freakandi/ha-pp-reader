## 2025-12-12 - Stored XSS in Portfolio Positions
**Vulnerability:** Found a Stored XSS vulnerability in `renderPositionsTable` where portfolio position names were rendered raw.
**Learning:** `makeTable` and `formatValue` do not escape strings by default. Callers must manually escape user input.
**Prevention:** Use `escapeHtml` for all text fields in data mappers before passing to table renderers.
