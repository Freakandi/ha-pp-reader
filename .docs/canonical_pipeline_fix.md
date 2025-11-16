# TODO – Canonical Pipeline Reactivation

## Context
- The October/November refactor removed `sync_from_pclient` and the protobuf diff-sync tables.
- Parser runs now stop after writing to `ingestion_*`. Because `feature_flags.metrics_pipeline` and `feature_flags.enrichment_pipeline` default to `False`, metrics/normalization never run in HA or during CLI smoke tests.
- The dashboard/websocket contract consumes `account_snapshots`/`portfolio_snapshots`. With those tables empty, Home Assistant constantly shows `data_unavailable`.

## Immediate Tasks
1. **Coordinator**
   - Drop the enrichment/metrics feature flag gating.
   - Ensure `_schedule_metrics_refresh` and `_schedule_normalization_refresh` always execute after each parser run (and emit progress events).
   - Remove the noisy “Manually updated pp_reader data” spam or at least condense logging so HA logs remain usable.

2. **Feature Flags Cleanup**
   - Delete unused flags (`enrichment_pipeline`, `enrichment_fx_refresh`, `enrichment_history_jobs`, `metrics_pipeline`) from `feature_flags.py`, config flow options, and documentation.
   - Update `.docs/refactor_correction.md` + README to reflect that the canonical pipeline is mandatory.

3. **CLI / Smoke Tests**
   - `scripts/enrichment_smoketest.py` needs to run metrics + normalization unconditionally and fail loudly when canonical tables stay empty.
   - `custom_components/pp_reader/cli/import_portfolio.py` is now staging-only; provide (or document) a follow-up command that runs metrics/normalization, or extend the CLI to call those helpers directly.

4. **DB Hygiene**
   - Add regression tests that parse a sample `.portfolio`, run the metrics + normalization helpers, and assert that `metric_runs`, `portfolio_metrics`, `account_snapshots`, etc., contain rows.
   - Confirm the websocket layer loads the newly persisted data without any manual seeding.

## Stretch / Verification
- Re-run `scripts/enrichment_smoketest.py` against a clean DB and capture metrics/normalization output in the log.
- Start HA, trigger a parser refresh via the UI, and take before/after screenshots showing the dashboard populated again (attach evidence under `tests/ui/playwright/`).

## Owners / Notes
- This is assumed to be a single coordinated refactor; breaking it down into smaller PRs is fine, but gating the canonical pipeline behind feature flags is no longer acceptable.
