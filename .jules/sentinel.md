## 2025-12-12 - Stored XSS in Portfolio Positions
**Vulnerability:** Found a Stored XSS vulnerability in `renderPositionsTable` where portfolio position names were rendered raw.
**Learning:** `makeTable` and `formatValue` do not escape strings by default. Callers must manually escape user input.
**Prevention:** Use `escapeHtml` for all text fields in data mappers before passing to table renderers.

## 2025-12-12 - Inconsistent HTML Escaping
**Vulnerability:** Identified inconsistent and weak HTML escaping logic scattered across multiple files (`src/tabs/overview.ts`, `src/lib/ui/badges.ts`, `src/tabs/security_detail.ts`), some of which did not escape all critical characters (e.g., `<` and `>`).
**Learning:** Maintaining duplicated escaping logic leads to drift and security gaps.
**Prevention:** Centralized HTML escaping in `src/utils/html.ts`. All frontend code must now import `escapeHtml` or `escapeAttribute` from this utility.
