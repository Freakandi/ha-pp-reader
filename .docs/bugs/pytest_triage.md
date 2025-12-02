# Pytest triage – full suite

- Command: `pytest`
- Result: 21 failed, 177 passed, 2 warnings (HA http DeprecationWarning, unawaited coroutine in ingestion writer teardown)

## Failure clusters (what broke)
- FX + frontend outputs: missing log for gaps in `fetch_fx_range`; bundled dashboard gains are off (`550,00 €` vs `50,00 €`, missing “positive” class).
- Pipeline orchestration: enrichment stages do not emit `"start"` and history queue uses limit 45 vs expected 15.
- Normalization/metrics surface: `_load_position_snapshots` requires `reference_date` (breaking normalization + FX positions integration); day-change aggregation signature mismatch (`db_path` kw) and day-change data missing/over-present (metric engine + metrics pipeline expect values, normalization snapshot expects none).
- DB schema/migrations: runtime migration left out FX metadata columns; snapshot/persist tables (`account_snapshots`, etc.) missing in test DB setups, causing price/normalization persistence to crash.
- Price service behavior: price cycles report zero changes/quotes, batching meta is 0, holdings persisted as raw ints (3.0 → 300000000), chunk failure updates wrong security/price, error counter never resets; FakeHass stubs lack `async_create_task`, causing AttributeErrors during `_schedule_metrics_after_price_change`; revaluation payload lacks positions.
- Data access: `get_security_snapshot` returns `last_close_native=None` despite seeded historical price.

## Unknowns / questions
- What schema bootstrap is expected for price service helpers that now assume snapshot tables? Do helpers need graceful fallback?
- Should day-change data be suppressed for metrics-origin positions, or always included when available?
- Are batch size constants meant to be 15 or 45 after recent changes? Is multiplication intentional (e.g., concurrency)?
- Is dashboard bundle outdated vs. helpers (rebuild required) or logic/regression in helpers?

## Plan (staged execution)
1) **FX + frontend gains**: Inspect `custom_components/pp_reader/currencies/fx.py` logging path for missing-day logs; check bundled dashboard helpers/fixtures for gain calculations and “positive” class. Tests: `tests/currencies/test_fx_range.py`, `tests/frontend/test_dashboard_smoke.py`, `tests/frontend/test_portfolio_update_gain_abs.py`.
2) **Normalization + FX positions + day change**: Align `_load_position_snapshots` callers with new `reference_date`; reconcile day-change aggregation signature (`_aggregate_portfolio_day_change`) and expectations (when to emit day_change vs None). Verify metrics produce day-change numbers (metric engine/pipeline) while normalization payload hides them when unavailable. Tests: `tests/integration/test_fx_positions_integration.py`, `tests/normalization/test_pipeline.py::*`, `tests/test_normalization_day_change.py`, `tests/metrics/test_metric_engine.py`, `tests/integration/test_metrics_pipeline.py`.
3) **Schema/migrations**: Ensure runtime migration adds FX metadata columns and snapshot tables are created/seeded in helper paths used by price service/normalization. Tests: `tests/unit/test_db_schema_enrichment.py`, rerun normalization + price_service subsets once schema utilities updated.
4) **Price service orchestration/meta**: Add/adjust hass stubs (`async_create_task`) and handling when snapshots/portfolio tables missing so cycles do not crash; fix batching meta (`meta["batches"]`, `meta["quotes_returned"]`, `changed`), holdings scaling persistence, chunk-failure updated set (`sec10` vs `sec30`), error counter reset on success, and fetch timeout meta. Tests: `tests/test_price_service.py::*`, `tests/test_batch_size_regression.py`, `tests/test_revaluation_live_aggregation.py`.
5) **Enrichment pipeline events + history queue**: Emit `"start"` stage before jobs, confirm history queue limit uses intended batch size (15). Tests: `tests/integration/test_enrichment_pipeline.py::*`.
6) **Data access**: Investigate `fetch_previous_close` path returning None despite seeded history and adjust as needed. Test: `tests/test_db_access.py::test_get_security_snapshot_zero_holdings_preserves_purchase_sum`.

Re-run: full pytest after fixes; spot-check warnings (ensure coroutine awaited).
