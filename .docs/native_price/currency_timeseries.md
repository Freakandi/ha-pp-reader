# FX Time-Series Backfill Plan

Goals:
- Store historical FX rates for each currency from the earliest transaction date through today.
- Ensure normalization, metrics, and UI use nearest-on-or-before rates so purchase totals are correct.
- Keep the workflow resilient (retries, idempotent writes) and observable.

Proposed steps:
1) Identify currency/date coverage needs
- Query ingestion tables for distinct currencies and their earliest transaction dates (by currency) plus latest transaction date.
- Include securities’ native currencies; ensure base “EUR” is skipped.
- Persist a per-currency coverage snapshot (start_date, latest_tx_date, latest_fx_date) for diagnostics.

2) Extend FX client for ranged fetches
- Add a Frankfurter client helper that can fetch rates for a given currency and date range (batch or per-day), respecting API limits.
- Normalize responses into (date, currency, rate, provider, fetched_at, provenance) records.
- Handle gaps (e.g., weekend/holiday) by still inserting the provided dates or skipping with a log note.

3) Persistence and idempotency
- Update FX persistence to upsert multiple dated rows into `fx_rates` (ON CONFLICT REPLACE on (currency, date)).
- Ensure writes are chunked to avoid oversized transactions and are retryable.
- Guard against duplicate imports by hashing (currency, date).

4) Backfill job
- New backfill routine: for each currency, compute missing dates from first_tx_date to today excluding already present `fx_rates` entries.
- Fetch missing dates in batches; log progress and failures; continue other currencies on partial errors.
- Expose a CLI/script entry point (e.g., `scripts/backfill_fx.py` or `python -m custom_components.pp_reader.util.fx_backfill`) that accepts `--db` and optional `--currency`, `--start`, `--end`, `--limit`.

5) Integrate into existing refresh pipeline
- Update the current FX refresh step to:
  - detect missing coverage (using coverage snapshot),
  - trigger backfill before metrics run,
  - still fetch “latest” to keep today’s rate fresh.
- Ensure backfill respects runtime mode (e.g., skip in HA startup if flagged off; allow explicit enable via config/option).

6) Normalization/read-path check
- Confirm `_lookup_fx_rate` keeps using nearest-on-or-before date (already present).
- Add a guard to warn when no rate exists before tx_date even after backfill.
- Ensure metrics/security computations consume the populated series without extra changes.

7) Tests
- Unit: range fetcher returns normalized rows; persistence upserts multiple dates; missing-date detection identifies gaps.
- Integration: seed a temp DB with transactions and sparse FX, run backfill, assert `fx_rates` filled for missing dates and normalization uses correct rate.
- Add a small “holiday/weekend” case to ensure gaps don’t crash the job.

8) Observability and safety
- Add concise logging for per-currency progress (counts, failures, skipped dates).
- Consider a dry-run flag to report missing dates without writing.
- Add a max-days or max-requests safety valve and a clear error when limits hit.

9) Migration/ops notes
- Document how to run the backfill once after deploy to populate historical rates.
- Note expected runtime per currency and potential API throttling guidance.
