# QA, Documentation, and Communication Tracks for the Datamodel Refactor

This concept document outlines how testing, documentation, and stakeholder communication activities will accompany the canonical ingestion → normalization → delivery rollout. It draws on fixture inventories in [`datamodel/yq_datasets/`](../datamodel/yq_datasets/), end-to-end flows in [`datamodel/mermaid_frontend_flow.mmd`](../datamodel/mermaid_frontend_flow.mmd), and the sequencing captured in [`refactor_roadmap.md`](./refactor_roadmap.md).

## Quality Assurance Strategy
- **Automated regression coverage.**
  - Backend: Extend pytest suites under `tests/integration/` and `tests/unit/` to exercise the streaming parser (`tests/services/test_parser_pipeline.py`), staging writer/reader (`tests/integration/test_ingestion_writer.py`), and the staging-backed legacy sync regression (`tests/integration/test_sync_from_staging.py`) alongside enrichment, normalization, and metrics using canonical fixtures in `datamodel/db_entries/`. Canonical snapshot suites (`tests/normalization/test_pipeline.py`, `tests/integration/test_normalization_smoketest.py`) must assert that `portfolio_snapshots` and `account_snapshots` rows (plus the serialized `NormalizationResult`) stay aligned with websocket/event payloads.
  - Metrics: Keep the dedicated suites (`tests/metrics/test_metric_engine.py`, `tests/integration/test_metrics_pipeline.py`, `tests/util/test_diagnostics_metrics.py`) green to validate FX conversions, coverage summaries, and the persisted `metric_runs` entries produced by the pipeline.
  - Frontend: Refresh dashboard tests in `tests/dashboard/` (component snapshots, Zustand store behaviours) to assert normalized payloads (`accounts`, `portfolio_positions`, `portfolio_values`, histories) render consistently.
  - Contract checks: Maintain schema assertions in `tests/schema/test_payload_contracts.py` (to be added) and TypeScript contract tests under `src/lib/api/portfolio/__tests__/` so backend/frontend payloads stay aligned after refactors.
- **Fixture & dataset management.**
  - Leverage `scripts/generate_fixtures.py` (new helper) to transform Portfolio Performance exports plus Yahoo/Frankfurter datasets from `datamodel/yq_datasets/` into reproducible Home Assistant fixture bundles consumed by both pytest and dashboard tests.
  - Version fixtures alongside roadmap milestones, tagging releases under `datamodel/db_entries/` for quick rollback during QA sign-off.
- **Manual verification.**
  - Execute Home Assistant smoke scenarios (fresh import via coordinator, CLI import with `python -m custom_components.pp_reader.cli`, enrichment replay, metrics pipeline run, dashboard navigation) at the end of each milestone, recording observations in `.docs/live_aggregation/qa_runs.md` and attaching database snapshots, including excerpts from `portfolio_snapshots` / `account_snapshots` or `scripts/diagnostics_dump.py --normalized` output for traceability.
  - Capture diagnostics (`custom_components/pp_reader/util/diagnostics.py`) during manual runs to confirm staging counters, enrichment metadata, and `metrics.latest_run` details (status, processed entities, coverage summaries) match expectations.
  - Maintain a regression matrix covering critical panels (portfolio overview, accounts, history charts) with expected telemetry fields and parity checks against the canonical specs.
- **Tooling & observability.**
  - Enhance `scripts/diagnostics_dump.py` (or extend new CLI tooling) to capture ingestion metadata, normalization telemetry, enrichment provenance, metric run summaries, and websocket payload samples, feeding artefacts into QA reports. Always include the `normalized_payload` block from `custom_components/pp_reader/util/diagnostics.py` to document which snapshot version powered a run before comparing against frontend captures.
  - Leverage `custom_components/pp_reader/cli/import_portfolio.py` for scripted parser→staging import validation; use `scripts/enrichment_smoketest.py` when coordinated parser→enrichment→metrics replays (with CLI progress output) are required.
- **Enrichment test matrix.**
  - Document Frankfurter FX stub scenarios (healthy responses, delayed data, unavailable base currency) and Yahoo history replay cases (single symbol, batch fetch, backfill retry) with expected outcomes for `fx_rates` and `ingestion_historical_prices`.
  - Track telemetry checkpoints per scenario, including dispatcher signals (`enrichment_fx_progress`, `enrichment_price_progress`) and diagnostics entries from `custom_components/pp_reader/util/diagnostics.py` so QA can assert matching timestamps, provenance tags, and pending queue counts.
  - Capture prerequisites and tooling hooks for each path (CLI replay commands, scheduler feature flags, database fixture seeds) to keep smoke and regression runs reproducible across contributors.
  - Map manual and automated coverage for the matrix into `.docs/live_aggregation/qa_runs.md`, noting gaps that require follow-up tests or observability enhancements.
- **Frontend adapter rollout checklist.**
  1. **Automated gates (run on every PR + release branch cut):**
     - `npm run lint:ts`, `npm test` → ensures TypeScript contract suites plus dashboard-specific fixtures (`tests/dashboard/fixtures/`) stay aligned with backend payloads.
     - `source .venv/bin/activate && pytest tests/frontend/test_dashboard_smoke.py` → validates bundled dashboard helpers against the normalization smoketest snapshot and diagnostics summary.
     - Optional but recommended before main promotion: `pytest tests/integration/test_normalization_smoketest.py --maxfail=1` to refresh the canonical fixtures referenced by the frontend suites.
  2. **Manual Home Assistant checks (owners: frontend + QA pairing):**
     - Launch `./scripts/develop`, import a portfolio with the normalized adapter enabled, and record screenshots of the Overview, Accounts, and Security Detail tabs showing coverage/provenance badges.
     - Use browser devtools to capture one websocket payload per `data_type` (`portfolio_values`, `portfolio_positions`, `security_snapshot`) and compare fields against `pp_reader_dom_reference.md`.
     - Trigger the CLI smoketest (`python -m scripts.enrichment_smoketest --output fixtures`) and store the resulting normalized snapshot under `tests/dashboard/fixtures/` when discrepancies are found; document diffs in `.docs/live_aggregation/qa_runs.md`.
  3. **Sign-off + communications:**
     - Update `.docs/live_aggregation/qa_runs.md` with run ID, HA build, adapter version, and links to collected diagnostics.
     - Post status in `.docs/communications/status_updates.md`, tagging the frontend adapter owners and noting whether the toggle can move to default-on.

## Documentation Plan
- **Architecture refresh.** Update `README-dev.md`, `.docs/ARCHITECTURE.md`, and `.docs/live_aggregation/` notes with diagrams referencing the canonical pipeline, replacing legacy flow explanations.
- **User-facing guidance.** Revise `README.md` setup instructions, Home Assistant configuration steps in `config/README.md`, and troubleshooting guides to reflect new migration behaviours, WAL toggles, and diagnostics.
- **Developer onboarding.** Create or refresh `.docs/developer_checklist.md` covering parser pipelines, normalized schemas, and fixture tooling so contributors can spin up representative environments.
- **Versioned change logs.** Ensure `CHANGELOG.md` and `.docs/release_notes/` track datamodel milestones, highlighting breaking changes, migration scripts, and legacy deprecations linked to the cleanup tracker.
- **Documentation workflow.** Pair every roadmap milestone exit with a documentation review checklist stored in `.docs/refactor_doc_reviews.md`, recording owners, affected files, and completion evidence.

## Communication Tracks
- **Release messaging.** Draft milestone-aligned release notes under `.docs/communications/release_notes/`, summarizing new capabilities, migration guidance, and any operator actions (fixture refresh, config updates).
- **Contributor updates.** Maintain fortnightly status briefs in `.docs/communications/status_updates.md`, linking to QA reports, cleanup tracker entries, and upcoming milestones to keep backend/frontend partners synchronized.
- **Change management.** Coordinate announcements on Home Assistant community channels and internal chats using templates in `.docs/communications/templates/`, ensuring user-facing communications go out before toggling defaults or removing legacy assets.
- **Stakeholder reviews.** Schedule review checkpoints with maintainers and documentation owners per milestone, capturing decisions and open risks in `.docs/communications/review_log.md`.

## Scheduling & Coordination
- Align QA sprints with roadmap milestones: parser modernization (M1), enrichment services (M2), metrics/normalization (M3–M4), frontend alignment (M5), and cleanup/documentation closure (M6).
- Gate milestone completion on: automated test suites passing, manual regression matrix signed off, documentation updates merged, and communication artefacts published.
- Track dependencies and deadlines in a shared timeline table appended to [`refactor_roadmap.md`](./refactor_roadmap.md#timeline), mirroring QA/doc/comms status via linked checklists and reports.

This plan should be revisited at each milestone review to adjust scope, datasets, and communication sequencing based on implementation feedback.
