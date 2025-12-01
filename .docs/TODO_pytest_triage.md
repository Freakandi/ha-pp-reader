1. [x] FX range logging – emit missing-day notice for gaps  
   - Pfad: `custom_components/pp_reader/currencies/fx.py` (`fetch_fx_range`)  
   - Ziel: Fehlende Tage zwischen Start/Ende loggen (Text für "FX range for <CURRENCY> missing <date>") damit `tests/currencies/test_fx_range.py` besteht.
2. [x] Dashboard bundle – correct gain formatting and positivity class  
   - Pfad: `custom_components/pp_reader/www/pp_reader_dashboard/js/` bundle (oder Source in `src/` + Rebuild via `npm run build`)  
   - Ziel: Footer Gain soll 50,00 € statt 550,00 € ausgeben und `footerGainHtml` enthält Klasse/Text für positive Werte; Tests `tests/frontend/test_dashboard_smoke.py`, `tests/frontend/test_portfolio_update_gain_abs.py`.
3. [x] Enrichment pipeline events – ensure start stage emitted  
   - Pfad: `custom_components/pp_reader/data/coordinator.py` (`_schedule_enrichment_jobs`)  
   - Ziel: `"start"` Event vor ersten Stubs senden, Reihenfolge `["start","fx_stub","history_stub","completed"]`; Test `tests/integration/test_enrichment_pipeline.py::test_enrichment_pipeline_disabled_still_runs_metrics`.
4. [x] History queue batch size – use limit 15 instead of 45  
   - Pfad: `custom_components/pp_reader/prices/history_queue.py` and/or coordinator caller `_process_history_queue_once`  
   - Ziel: Batch-Limit auf 15 setzen, so Aufruffolge `[15,15,15]`; Test `tests/integration/test_enrichment_pipeline.py::test_history_queue_processing_drains_multiple_batches`.
5. [x] Normalize snapshots – pass `reference_date` into `_load_position_snapshots`  
   - Pfad: `custom_components/pp_reader/data/normalization_pipeline.py` callers of `_load_position_snapshots` and related integration in `tests/integration/test_fx_positions_integration.py`  
   - Ziel: Keyword-Arg `reference_date` verpflichtend setzen; Tests `tests/normalization/test_pipeline.py::test_load_position_snapshots_preserves_purchase_totals`, `tests/integration/test_fx_positions_integration.py`.
6. [x] Day-change aggregation signature – accept `db_path` kwarg  
   - Pfad: `custom_components/pp_reader/data/normalization.py` (`_aggregate_portfolio_day_change`)  
   - Ziel: Signatur anpassen, damit `db_path` akzeptiert wird; Test `tests/test_normalization_day_change.py::test_portfolio_day_change_uses_eur_converted_prices`.
7. [x] Day-change data presence – reconcile metrics vs. normalization payload  
   - Pfade/Funktionen:  
     - `custom_components/pp_reader/data/metric_engine.py` / `async_compute_security_metrics` (ensure day_change_native/eur set when available)  
     - `custom_components/pp_reader/data/metrics_pipeline.py` (persist day-change coverage)  
     - `custom_components/pp_reader/data/normalization_pipeline.py` (suppress day_change in positions when unavailable)  
   - Ziel: `sec-usd` day change populated in metrics (`5.0`, `4.0`, coverage `1.0`) while normalization snapshot hides day_change in positions unless present; Tests `tests/metrics/test_metric_engine.py`, `tests/integration/test_metrics_pipeline.py`, `tests/normalization/test_pipeline.py::test_normalize_snapshot_compiles_multi_portfolio_payload`.
8. [x] Snapshot persistence tables – ensure created in test/utility flows  
   - Pfad: `custom_components/pp_reader/data/db_init.py` and any fast-init helpers in tests/price service  
   - Ziel: Tabellen `account_snapshots`, `portfolio_snapshots`, etc. exist when normalization/prices run; resolves OperationalError in normalization pipeline and price_service tests.
9. [x] FX metadata runtime migration – add missing columns  
   - Pfad: `custom_components/pp_reader/data/db_init.py` migration logic (runtime path)  
   - Ziel: Spalten `fetched_at`, `data_source`, `provider`, `provenance` für `fx_rates` nachziehen; Test `tests/unit/test_db_schema_enrichment.py::test_runtime_migration_adds_enrichment_columns`.
10. [x] Price service – provide `async_create_task` in FakeHass/Hass test stubs  
    - Pfade: test stubs in `tests/test_price_service.py`, `tests/test_batch_size_regression.py` (FakeHass), possibly helper classes  
    - Ziel: `_schedule_metrics_after_price_change` nicht mehr mit AttributeError scheitert.
11. [x] Price cycle meta counts – ensure batches/quotes/changed reflect activity  
   - Pfad: `custom_components/pp_reader/prices/price_service.py` (`_run_price_cycle`, meta assembly)  
   - Ziel: `meta["batches"]==2` for `CHUNK_SIZE+3`, `quotes_returned` and `changed` >0 when quotes fetched; Tests `tests/test_batch_size_regression.py`, `tests/test_price_service.py::{test_change_triggers_events,test_price_cycle_adds_normalized_payload,test_fetch_uses_configured_timeout}`.
12. [x] Holdings scaling persistence – store floats not raw fixed-int where expected  
   - Pfad: `custom_components/pp_reader/prices/price_service.py` (`_refresh_impacted_portfolio_securities`)  
   - Ziel: `current_holdings` persisted as 3.0 not 300000000; Test `tests/test_price_service.py::test_refresh_impacted_portfolio_securities_uses_currency_helpers`.
13. [x] Chunk failure update set – ensure correct security persisted on retry  
   - Pfad: `custom_components/pp_reader/prices/price_service.py` (chunk processing/retry)  
   - Ziel: Updated set uses actual symbol (`sec10`), price stored equals 999.99*1e8; Test `tests/test_price_service.py::test_chunk_failure_partial`.
14. [ ] Error counter reset after success  
    - Pfad: `custom_components/pp_reader/prices/price_service.py` (`_run_price_cycle` / error counter handling)  
    - Ziel: `price_error_counter` resets to 0 after successful fetch; Test `tests/test_price_service.py::test_error_counter_increment_and_reset`.
15. [ ] Revaluation payload includes positions  
    - Pfad: `custom_components/pp_reader/prices/revaluation.py` (`revalue_after_price_updates`)  
    - Ziel: Return `portfolio_positions` for live aggregation; Tests `tests/test_revaluation_live_aggregation.py`, `tests/test_price_service.py` (change triggers).
16. [ ] `fetch_previous_close` returns last close for seeded history  
    - Pfad: `custom_components/pp_reader/data/db_access.py` (`fetch_previous_close`, `get_security_snapshot`)  
    - Ziel: `last_close_native` set to 175.5 for seeded date; Test `tests/test_db_access.py::test_get_security_snapshot_zero_holdings_preserves_purchase_sum`.
17. [ ] History/normalization persistence – avoid crashes when tables missing (optional if covered by #8)  
    - Pfad: `custom_components/pp_reader/data/snapshot_writer.py` and price service normalization hooks  
    - Ziel: Graceful no-op or init tables before writes; covers OperationalErrors seen in normalization snapshot test. Mark optional if resolved by schema init.
18. [ ] Frontend bundle rebuild after fixes (optional)  
    - Pfad: run `npm run build`; ensure artifacts in `custom_components/pp_reader/www/pp_reader_dashboard/js/` updated; rerun frontend smoke tests.
19. [ ] Warnings cleanup (optional)  
    - Pfad: `tests/integration/test_ingestion_writer.py` teardown or helper where coroutine left unawaited  
    - Ziel: Await `ensure_exchange_rates_for_dates` or adjust fixture to silence RuntimeWarning.
20. [ ] Tests to run after changes  
    - [ ] `pytest` full suite  
    - [ ] Fast subsets during work:  
      - FX/front: `tests/currencies/test_fx_range.py`, `tests/frontend/test_dashboard_smoke.py`, `tests/frontend/test_portfolio_update_gain_abs.py`  
      - Normalization/metrics: `tests/normalization/test_pipeline.py::*`, `tests/integration/test_metrics_pipeline.py`, `tests/metrics/test_metric_engine.py`, `tests/test_normalization_day_change.py`, `tests/integration/test_fx_positions_integration.py`  
      - Price service: `tests/test_price_service.py::*`, `tests/test_batch_size_regression.py`, `tests/test_revaluation_live_aggregation.py`  
      - Schema/data access: `tests/unit/test_db_schema_enrichment.py`, `tests/test_db_access.py::test_get_security_snapshot_zero_holdings_preserves_purchase_sum`.
