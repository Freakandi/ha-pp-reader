# QA, Documentation, and Communication Tracks for the Datamodel Refactor

This concept document outlines how testing, documentation, and stakeholder communication activities will accompany the canonical ingestion → normalization → delivery rollout. It draws on fixture inventories in [`datamodel/yq_datasets/`](../datamodel/yq_datasets/), end-to-end flows in [`datamodel/mermaid_frontend_flow.mmd`](../datamodel/mermaid_frontend_flow.mmd), and the sequencing captured in [`refactor_roadmap.md`](./refactor_roadmap.md).

## Quality Assurance Strategy
- **Automated regression coverage.**
  - Backend: Extend pytest suites under `tests/integration/` and `tests/unit/` to exercise the streaming parser, enrichment jobs, normalization pipeline, and metric emitters using canonical fixtures in `datamodel/db_entries/`.
  - Frontend: Refresh dashboard tests in `tests/dashboard/` (component snapshots, Zustand store behaviours) to assert normalized payloads (`accounts`, `portfolio_positions`, `portfolio_values`, histories) render consistently.
  - Contract checks: Maintain schema assertions in `tests/schema/test_payload_contracts.py` (to be added) and TypeScript contract tests under `src/lib/api/portfolio/__tests__/` so backend/frontend payloads stay aligned after refactors.
- **Fixture & dataset management.**
  - Leverage `scripts/generate_fixtures.py` (new helper) to transform Portfolio Performance exports plus Yahoo/Frankfurter datasets from `datamodel/yq_datasets/` into reproducible Home Assistant fixture bundles consumed by both pytest and dashboard tests.
  - Version fixtures alongside roadmap milestones, tagging releases under `datamodel/db_entries/` for quick rollback during QA sign-off.
- **Manual verification.**
  - Execute Home Assistant smoke scenarios (fresh import, enrichment replay, dashboard navigation) at the end of each milestone, recording observations in `.docs/live_aggregation/qa_runs.md` and attaching database snapshots.
  - Maintain a regression matrix covering critical panels (portfolio overview, accounts, history charts) with expected telemetry fields and parity checks against the canonical specs.
- **Tooling & observability.**
  - Enhance `scripts/diagnostics_dump.py` to capture normalization telemetry, enrichment provenance, and websocket payload samples, feeding artefacts into QA reports.
  - Introduce lightweight CLI under `custom_components/pp_reader/cli/qa.py` to trigger coordinated parser→enrichment→metrics replays for repeatable manual validation.

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
