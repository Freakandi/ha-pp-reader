1. [x] Extend ingestion schema to store per-transaction EUR amounts
   a) [x] Add `amount_eur_cents INTEGER` (or similar) to `ingestion_transactions` in `custom_components/pp_reader/data/db_schema.py`; ensure default NULL and include in indexes if needed.
   b) [x] Provide migration helper to backfill/alter existing DBs (e.g., new DDL/migration step or check in `canonical_sync` bootstrap) with clear guardrails.
   c) [x] Document the new column in any schema comments/README snippets.

2. [x] Compute EUR per transaction at ingestion time
   a) [x] In the ingestion pipeline (where transactions are staged), fetch FX for `currency_code` on `date` using `_lookup_fx_rate` or a ranged helper; skip only if FX is truly unavailable.
   b) [x] Store both native `amount` (existing) and derived `amount_eur_cents` for every applicable row; log warnings when FX is missing.
   c) [x] Ensure EUR is 1:1 when `currency_code` is `EUR` and avoid double-scaling/rounding errors (use `eur_to_cent`).

3. [x] Backfill existing ingestion transactions with dated FX
   a) [x] Add a backfill routine (script or callable) that iterates `ingestion_transactions` where `amount_eur_cents` is NULL, loads FX for `currency_code` on `date`, and writes the EUR cents.
   b) [x] Handle gaps: warn and leave NULL if no rate exists before/at date; support optional dry-run.
   c) [x] Add a small CLI entry point (e.g., `python -m custom_components.pp_reader.data.backfill_fx_tx --db <path> [--currency ...]`) and describe usage.

4. [x] Update aggregation of portfolio_securities to use stored EUR per transaction
   a) [x] In `custom_components/pp_reader/data/canonical_sync.py` `_sync_portfolio_securities`, sum `amount_eur_cents` (per transaction) to populate `purchase_value`/EUR fields instead of deriving from native totals; keep native totals as-is.
   b) [x] Confirm holdings math remains based on shares; ensure mixed-currency portfolios still behave deterministically.
   c) [x] Maintain existing security/account totals for native displays.

5. [x] Propagate accurate purchase totals through metrics and snapshots
   a) [x] In `custom_components/pp_reader/metrics/securities.py`, rely on the precomputed EUR purchase totals and remove downstream derivation hacks; ensure `purchase_value_cents` and `purchase_total_account/security` stay in sync.
   b) [x] In `custom_components/pp_reader/data/normalization_pipeline.py`, ensure `average_cost.eur` and `average_cost.account/security` use stored totals; avoid recomputing EUR from native.
   c) [x] Validate websocket payloads (`data/websocket.py`) send correct EUR purchase values and average_cost blocks to the UI.

6. [x] Tests
   a) [x] Unit: ingestion/backfill writes `amount_eur_cents` using date-correct FX; covers missing-FX warning path.
   b) [x] Unit: `_sync_portfolio_securities` sums per-tx EUR and preserves native totals; multi-transaction/multi-currency fixture.
   c) [x] Unit: metrics/securities consume stored EUR totals without deriving; ensure gain calc matches EUR purchase.
   d) [x] Integration: seed sparse FX, run backfill + aggregation, assert positions (incl. HKD/JPY-style) expose EUR and native averages correctly.
   e) [x] Update/extend existing websocket/overview tests to assert dual-line Kaufpreis for non-EUR holdings and correct gain baseline.

7. [ ] Documentation and ops notes  
   a) [x] Add short how-to for the backfill command and when to run it after deployment.  
   b) [x] Note schema change in release notes/CHANGELOG and any expected runtime impact (FX lookups).  
   c) [x] Mention log signals for missing FX and how to remedy (run FX backfill).

Optional
8. [ ] Optional: add a coverage snapshot for per-currency FX availability to warn early before ingestion.
9. [ ] Optional: add a dry-run/report mode to list currencies/dates lacking FX without writing to DB.
