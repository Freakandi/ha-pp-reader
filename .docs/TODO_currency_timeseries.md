1. [ ] Coverage detection for FX needs (extract earliest tx dates per currency)
   a) [x] Add helper in `custom_components/pp_reader/data/` (e.g., `fx_backfill.py`) to query ingestion transactions/units for distinct `currency_code` and earliest/latest transaction dates per currency (skip EUR).
      - Functions/sections: new helper function `collect_currency_coverage(db_path)`
      - Ziel: return mapping `{currency: {first_tx_date, latest_tx_date}}` plus currencies from securities’ native codes.
   b) [x] Persist coverage diagnostics to a structured payload/log message for later inspection.
      - Path: same helper file or logging in backfill entrypoint
      - Ziel: observable coverage snapshot per currency.

2. [ ] Range-capable Frankfurter client
   a) [x] Implement a range fetcher (daily or batched) in `custom_components/pp_reader/util/fx.py` to request rates for a currency between start/end dates.
      - Functions: new `fetch_fx_range(currency, start_date, end_date, *, provider="frankfurter")`
      - Ziel: yield normalized records `(date, currency, rate, provider, fetched_at, provenance)`.
   b) [x] Handle weekend/holiday gaps gracefully (log skip, no crash).
      - Ziel: robustness on missing-day responses.

3. [ ] FX persistence for time series
   a) [x] Extend FX persistence to upsert multiple dated rows with `ON CONFLICT (currency, date) DO UPDATE`.
      - Path: `custom_components/pp_reader/util/fx.py` or dedicated persistence module.
      - Ziel: idempotent inserts for historical series.
   b) [x] Chunk writes to avoid oversized transactions and make retries possible.
      - Ziel: stable persistence under large ranges.

4. [ ] Backfill job implementation
   a) [x] Add backfill routine in `custom_components/pp_reader/data/fx_backfill.py` (new file).
      - Functions: `backfill_fx(db_path, currencies=None, start=None, end=None, limit_days=None)`
      - Ziel: compute missing dates per currency (first_tx_date→today minus existing `fx_rates`), fetch via range client, persist.
   b) [x] CLI/script entry point (e.g., `scripts/backfill_fx.py` or module `python -m custom_components.pp_reader.data.fx_backfill`).
      - Ziel: runnable command with args `--db`, `--currency`, `--start`, `--end`, `--limit`, `--dry-run`.
   c) [x] Logging: per-currency progress (fetched/inserted/skipped), failures, and final summary.
      - Ziel: observable and debuggable runs.

5. [ ] Integrate backfill into existing FX refresh pipeline
   a) [x] Update current FX refresh entry point (e.g., `custom_components/pp_reader/prices/price_service.py` or equivalent) to call backfill before metrics/normalization.
      - Ziel: ensure missing historical rates are populated prior to metric runs.
   b) [x] Keep “latest” fetch to refresh today’s rate after backfill.
      - Ziel: up-to-date rates without losing current behavior.

6. [ ] Normalization safeguards  
   a) [x] Keep `_lookup_fx_rate` (in `custom_components/pp_reader/data/canonical_sync.py`) using nearest-on-or-before; add warning when no rate exists even after backfill.  
      - Ziel: surface gaps instead of silent zero totals.  
   b) [x] Ensure metrics/security computations consume populated series without further changes (verify call sites).  
      - Path: `custom_components/pp_reader/metrics/securities.py`, `.../metrics/portfolio.py`.

7. [ ] Tests  
   a) [x] Unit: range fetcher normalization and gap handling (`tests/test_fx_range.py`).  
      - Ziel: correct parsing and resilience to missing days.  
   b) [x] Unit: persistence upsert for multiple dates (`tests/test_fx_persistence.py`).  
      - Ziel: idempotent inserts with conflict handling.  
   c) [x] Integration: seed temp DB with sparse FX + transactions; run backfill; assert `fx_rates` filled for missing dates and normalization uses correct nearest-on-or-before rate (`tests/integration/test_fx_backfill.py`).  
      - Ziel: end-to-end coverage.  
   d) [x] Holiday/weekend case to confirm non-fatal gaps.  
      - Ziel: robustness scenario covered.

8. [ ] Observability and safety valves  
   a) [x] Implement `--dry-run` to report missing dates without writing.  
      - Path: backfill CLI  
      - Ziel: safe inspection before changes.  
   b) [x] Add max-days or max-requests guard with clear error/log when limits hit.  
      - Ziel: prevent runaway jobs.

9. [ ] Documentation
   a) [x] Document backfill usage and expectations in `README-dev.md` (new section “FX backfill/time series”).
      - Ziel: explain how to run the script, runtime expectations, throttling notes.
   b) [x] Note operational guidance: run once after deploy; expected duration per currency; API throttling considerations.
      - Ziel: ops clarity.

Optional (after core work):
10. [ ] Optional: add metrics/telemetry counters (per-currency fetched/failed) for HA logs or diagnostics panel.
    - Path: backfill routine / diagnostics module
    - Ziel: easier monitoring of FX backfill health.
11. [ ] Optional: add caching of fetched ranges to avoid re-requesting the same days across runs.
    - Path: FX client or persistence layer
    - Ziel: reduce API calls on repeated backfills.
