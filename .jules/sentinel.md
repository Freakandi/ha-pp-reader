## 2025-12-12 - Stored XSS in Portfolio Positions
**Vulnerability:** Found a Stored XSS vulnerability in `renderPositionsTable` where portfolio position names were rendered raw.
**Learning:** `makeTable` and `formatValue` do not escape strings by default. Callers must manually escape user input.
**Prevention:** Use `escapeHtml` for all text fields in data mappers before passing to table renderers.

## 2025-12-12 - Inconsistent HTML Escaping
**Vulnerability:** Identified inconsistent and weak HTML escaping logic scattered across multiple files (`src/tabs/overview.ts`, `src/lib/ui/badges.ts`, `src/tabs/security_detail.ts`), some of which did not escape all critical characters (e.g., `<` and `>`).
**Learning:** Maintaining duplicated escaping logic leads to drift and security gaps.
**Prevention:** Centralized HTML escaping in `src/utils/html.ts`. All frontend code must now import `escapeHtml` or `escapeAttribute` from this utility.

## 2025-12-13 - Stored XSS in Time Series Scope Filters
**Vulnerability:** Found a Stored XSS vulnerability in `renderScopeFilters` (`src/tabs/time_series.ts`) where portfolio/account names (`scope_name`) were injected into `innerHTML` without escaping.
**Learning:** Even simple UI components like checkbox lists can be vectors if they render user-controlled names via template literals.
**Prevention:** Always escape user-controlled text content using `escapeHtml` and attribute values using `escapeAttribute` before interpolation into HTML strings.

## 2025-12-18 - XSS in Security Detail Tooltips
**Vulnerability:** Found XSS vectors in `src/tabs/security_detail.ts` where tooltips (specifically `markerTooltipRenderer` and `tooltipRenderer`) interpolated raw values derived from backend data (transaction type, currency) into HTML strings without escaping.
**Learning:** Charting tooltip renderers are powerful but dangerous if they consume un-sanitized data. Defaults in `charting.ts` were safe, but custom implementations in views bypassed protections.
**Prevention:** Always wrap interpolated variables in `escapeHtml()` within template literals that generate HTML, especially in tooltip renderers.

## 2025-12-23 - XSS in Dashboard Error Handling
**Vulnerability:** Found an XSS vulnerability in `src/dashboard.ts` where error messages were rendered directly into `innerHTML` via `toErrorMessage` without escaping.
**Learning:** Error messages are not inherently safe; exceptions or backend errors can contain malicious payloads. `innerHTML` assignment of error text is a common pitfall.
**Prevention:** Always run error messages through `escapeHtml` before rendering them, even if they come from `Error` objects or JSON serialization.

## 2025-12-30 - XSS Bypass via data: URI
**Vulnerability:** The regex blacklist `DANGEROUS_PATTERN` in `src/content/elements.ts` failed to block `data:` URIs, allowing XSS execution via payloads like `<a href="data:text/html,<script>alert(1)</script>">`.
**Learning:** Regex-based XSS filtering is fragile and blacklist approaches often miss obscure vectors like `data:` URIs which can execute scripts without `javascript:` protocol.
**Prevention:** Include `data:` in XSS filter blacklists alongside `javascript:` and event handlers, or prefer whitelist-based sanitization where feasible.
