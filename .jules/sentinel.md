## 2024-05-23 - [XSS] Vulnerability in `stack` helper function
**Vulnerability:** The `stack` helper function in `src/content/elements.ts` was injecting its formatted arguments (`topFmt`, `botFmt`) directly into `innerHTML` without sanitization. While typical usage involved `formatCurrency` (safe) or `renderTrend` (controlled span), the function itself blindly trusted inputs, making it a potential vector for XSS if misused with user-controlled data.
**Learning:** Helper functions that build HTML strings must verify their inputs, even if "current usage" seems safe. Relying on caller correctness is fragile. "Defense in Depth" (checking inputs at the point of injection) is crucial.
**Prevention:**
1. Identified a robust sanitization pattern in `formatValue` (allowlist of safe tags, blocklist of dangerous attributes).
2. Extracted this logic into a reusable `sanitizeMarkup` function.
3. Applied `sanitizeMarkup` to `stack` inputs and refactored `formatValue` to use it.
