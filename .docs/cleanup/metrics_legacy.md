# Legacy Notes – `data/performance.py`

This file acted as a shim after the metrics engine landed, re-exporting
`PerformanceMetrics`, `DayChangeMetrics`, and helper functions from
`custom_components.pp_reader.metrics.common`. All production code now imports the
helpers directly from `metrics.common`, and the dedicated SQLite tables
(`portfolio_metrics`, `account_metrics`, `security_metrics`, `metric_runs`) serve
as the sole source of truth for gain/day-change payloads.

If historical references are required, consult:

- `custom_components/pp_reader/metrics/common.py` for the canonical helper
  implementation.
- `custom_components/pp_reader/metrics/pipeline.py` and
  `custom_components/pp_reader/metrics/storage.py` for orchestration/persistence.
- `tests/test_performance.py` for representative usage and expected rounding
  semantics.
