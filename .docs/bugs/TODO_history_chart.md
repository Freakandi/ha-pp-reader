# Price history chart (detail tab) investigation

Goal: explain why the detail chart shows prices after 2025‑10‑17 (up to 2025‑11‑24 plus today’s live price) even though the portfolio file’s history stops earlier, and address recurring Yahoo DNS warnings during history fetches.

Desired history behaviour (must hold after the fix):
- Portfolio file prices are the canonical source and always preferred.
- YahooQuery history fetch should only backfill gaps from the last portfolio candle through the day before the fetch runs (never beyond “yesterday”).
- When a refreshed portfolio file is ingested, its historical prices must overwrite any previously written YahooQuery history for the same dates.

## ToDo
- [ ] Reproduce in the UI (HA + Vite) and capture the `/pp_reader/get_security_history` payload for an affected security; verify the extra candles’ provider/source in the response.
- [ ] Inspect the DB (`historical_prices`) for the same security to confirm which provider (portfolio vs yahoo) writes the post‑2025‑10‑17 rows and whether the queue overlap window is being applied as intended.
- [ ] Trace history scheduling: check `HistoryQueueManager.plan_jobs_for_securities_table` inputs (lookback, overlap, start/end) and the provenance for the queued jobs to see why forward‑dated fetches are requested despite existing file history.
- [ ] Correlate DNS warning timestamps with job batches; determine whether partial fetches or retries are producing the truncated series (ending 2025‑11‑24) and whether the failures stem from the `curl_cffi` session YahooQuery uses.
- [ ] Evaluate a safe guardrail: only enqueue Yahoo history when we genuinely need to advance beyond the latest portfolio-provided candle (or cap the end date to the ingestion coverage) to avoid unintentional enrichment and DNS churn.
- [ ] If DNS is the root cause, switch YahooQuery history to a standard `requests.Session` (supported API) and/or add a retry/disable guard without patching yahooquery internals.
- [ ] Add a focused regression test around job planning and fetched candle ranges to lock the expected behaviour once the fix is chosen.
