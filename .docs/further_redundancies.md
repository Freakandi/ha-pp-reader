# Further Redundancies Identified

The following table lists legacy fields and helpers that remain in the codebase for backwards compatibility even though newer structures exist, based on the completed currency and performance refactors.

| Legacy item | Remaining usage | Replacement |
| --- | --- | --- |
| `average_purchase_price_native` field on portfolio and snapshot payloads | Backend serializers still populate the field for portfolio positions and security snapshots, and the dashboard continues to fall back to it when normalising average cost payloads. | `average_cost.native` emitted by the new aggregation helpers and consumed by the frontend normalisers. |
| `avg_price_security` field on portfolio and snapshot payloads | Portfolio queries and snapshot responses continue to include the legacy security-currency average, while dashboard average-cost helpers still read it as a fallback. | `average_cost.security` within the structured average cost payload. |
| `avg_price_account` field on portfolio and snapshot payloads | Portfolio aggregation keeps emitting the account-currency average and the frontend normalisers reuse it when structured averages are missing. | `average_cost.account` inside the aggregated average cost payload. |
| Flat `gain_abs` metric on portfolio items | Portfolio position builders copy the absolute gain out of the new performance payload, and the dashboard re-injects it to match legacy table renderers. | `performance.gain_abs` provided by `PerformanceMetricsPayload`. |
| Flat `gain_pct` metric on portfolio items | Backend responses still expose the percentage gain alongside the nested payload, and the frontend retains it when normalising positions for existing formatters. | `performance.gain_pct` within the structured performance payload. |
| `day_price_change_native` snapshot field | Security snapshot responses continue to surface the native day change and the dashboard fallbacks rely on it if the structured payload is missing. | `performance.day_change.price_change_native` from the performance metrics helper. |
| `day_price_change_eur` snapshot field | Backend snapshots still add the EUR-denominated day delta, which the frontend uses as a fallback when normalising metrics. | `performance.day_change.price_change_eur` nested in the performance payload. |
| `day_change_pct` snapshot field | Snapshot serializers populate the legacy percentage change while the UI normalisation code treats it as a fallback. | `performance.day_change.change_pct` contained in the new performance payload. |
