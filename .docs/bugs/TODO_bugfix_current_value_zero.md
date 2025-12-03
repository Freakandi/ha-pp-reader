# Portfolio positions show zero current value despite last price

Context: In production some positions render with `current_value` = 0 in the overview/detail tabs, leading to -100% total change, while the last price and holdings are present. This does not reproduce locally with the dev dataset.

Suspected root cause
- `portfolio_securities.current_value` ends up `NULL`/0 (e.g., stale rows, FX gaps, missing currency code) and the metrics pipeline trusts that value instead of recomputing from holdings * last_price.
- For securities with currency codes missing/whitespace, `db_calculate_holdings_value` treats them as non-EUR, fails FX lookup, and writes `current_value` = None → 0 after coercion.

Plan
1) Add a regression test for `metrics/securities._build_security_metric_record`: when `current_value` is missing/0 but holdings + last_price are available, the pipeline recomputes `current_value_cents` and gain values (both EUR and native price inputs). Include a case with a blank currency code.
2) Implement fallback in `_build_security_metric_record`: if `current_value_cents` is falsy but holdings>0 and last_price_native/raw exists (and EUR conversion succeeds), derive `current_value_eur` from holdings * last_price_eur and use that for gain/total_change. Keep existing values when they are non-zero.
3) Harden `db_calculate_holdings_value` FX handling: treat empty/None currency codes as `"EUR"` to avoid skipping valuation, and keep warning if a real FX rate is missing.
4) Extend the normalization snapshot test for portfolio positions/security detail so a position with recomputed `current_value` shows the correct market value and gain in the overview table.
