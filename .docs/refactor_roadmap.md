# Datamodel Refactor Roadmap

## Overview

The refactor replaces the legacy mixed snapshot/push pipeline with a staged ingestion → normalization → delivery flow anchored in the canonical backend model and frontend dataflows. The new model unifies portfolio accounts, positions, metrics, and histories so that websocket pushes mirror persisted database state without per-client patching, letting the dashboard consume deterministic payloads across accounts, portfolios, and securities.【F:datamodel/backend-datamodel-final.md†L1-L169】【F:datamodel/dataflow_frontend.md†L1-L120】

Key drivers for the change:

- Decouple protobuf ingestion from Home Assistant runtime by streaming Portfolio Performance payloads into explicit parser and persistence layers, ensuring that downstream services operate on normalized SQLite state rather than transient objects.【F:datamodel/dataflow_backend.md†L1-L144】
- Introduce enrichment pipelines (FX, Yahoo history) that hydrate persisted rows before metric computation to eliminate frontend fallbacks and align historical views with live valuations.【F:datamodel/backend-datamodel-final.md†L170-L363】【F:datamodel/dataflow_backend.md†L145-L286】
- Standardize push events and REST/websocket responses around the canonical schemas so the frontend adapters simply map normalized records into stores and views without bespoke adapters per panel.【F:datamodel/dataflow_frontend.md†L121-L238】

## Milestones

Each milestone lists entry prerequisites, exit criteria, impacted components, deliverables, and dependencies. Sequencing assumes cross-functional collaboration between backend (Python integration) and frontend (TypeScript dashboard) teams.

### M1 — Parser & Ingestion Rewrite
- **Entry criteria:** Legacy importer still stages Portfolio Performance protobuf payloads directly into coordinators; enrichment and metrics rely on on-the-fly calculations.
- **Exit criteria:** Streaming parser pipeline converts portfolio archives into typed domain objects, persists them in staging tables, and exposes ingestion metadata through diagnostics and CLI workflows.
- **Impacted areas:** `custom_components/pp_reader/services/parser_pipeline.py`, `custom_components/pp_reader/services/portfolio_file.py`, `custom_components/pp_reader/data/ingestion_writer.py`, `custom_components/pp_reader/data/ingestion_reader.py`, `custom_components/pp_reader/data/sync_from_pclient.py`, staging schema in `custom_components/pp_reader/data/db_schema.py`, CLI entry points under `custom_components/pp_reader/cli/`, coordinator telemetry in `custom_components/pp_reader/data/coordinator.py`.
- **Deliverables:** Typed parser pipeline with progress events, staging schema and writer/reader helpers, legacy sync parity via regression tests, ingestion diagnostics surface, CLI import parity with Home Assistant flow, documentation updates describing ingestion lifecycle.
- **Dependencies:** None upstream; unlocks downstream enrichment because raw entities become consistently persisted and discoverable through diagnostics/CLI tooling.

### M2 — Enrichment Integration (FX & Market Data)
- **Entry criteria:** Parser rewrite landed with staging schema and import flow stabilized; staging data available via coordinators.
- **Exit criteria:** Exchange rate synchronization and Yahoo history ingestion populate enrichment tables with retry/backfill logic and surface metadata required by downstream metrics.
- **Impacted areas:** `custom_components/pp_reader/currencies/fx.py`, `custom_components/pp_reader/prices/price_service.py`, `custom_components/pp_reader/data/sync_from_pclient.py`, scheduler hooks in `custom_components/pp_reader/coordinators/`.
- **Deliverables:** Deterministic enrichment jobs, persisted FX/history datasets with provenance fields, validation scripts under `scripts/` to confirm rate coverage, documentation on external data dependencies.
- **Dependencies:** Requires M1 to ensure imports persist canonical identifiers; feeds data into metric computation (M3) and normalization (M4).

### M3 — Metric Computation Layer
- **Entry criteria:** Enrichment data available and ingestion persists canonical rows.
- **Exit criteria:** Dedicated computation services generate portfolio/account/security metrics from persisted data, writing normalized aggregates with coverage metadata.
- **Impacted areas:** `custom_components/pp_reader/data/performance.py`, `custom_components/pp_reader/data/aggregations.py`, coordinators under `custom_components/pp_reader/data/db_access.py`, utility math helpers in `custom_components/pp_reader/util/`.
- **Deliverables:** Metric pipeline orchestrations, unit/integration tests covering gain, coverage, and day-change calculations, documentation of computation contracts.
- **Dependencies:** Consumes enriched datasets (M2) and normalized schema from ingestion (M1); produces inputs for normalization (M4) and frontend adapters (M5).

### M4 — Normalization & Event Pipeline
- **Entry criteria:** Metrics persisted and enrichment data stable; canonical schema defined.
- **Exit criteria:** Normalization layer compacts persisted data into canonical snapshot/push payloads, updates websocket handlers, and aligns database contracts with frontend expectations.
- **Impacted areas:** `custom_components/pp_reader/data/event_push.py`, `custom_components/pp_reader/data/websocket.py`, `custom_components/pp_reader/coordinators/`, schema evolution in `custom_components/pp_reader/data/db_schema.py`.
- **Deliverables:** Normalized payload serializers, updated push/snapshot handlers emitting canonical fields, migration scripts for schema adjustments, regression test suite around websocket commands.
- **Dependencies:** Consumes metrics (M3) and enriched historical data (M2); must precede frontend adapter rollout (M5).

### M5 — Frontend Adapter Rollout
- **Entry criteria:** Backend normalization emitting canonical payloads on feature branches with documented contracts.
- **Exit criteria:** Frontend stores, views, and dashboard bindings read new payloads without legacy fallbacks; compatibility layer removed or feature-flagged off.
- **Impacted areas:** `src/lib/api/portfolio/`, `src/lib/store/`, `src/views/portfolio/`, `custom_components/pp_reader/www/pp_reader_dashboard/js/`, associated TypeScript tests under `tests/dashboard/`.
- **Deliverables:** Updated API client bindings, store selectors, view models, and UI components; migration guide for integrators; snapshot/test updates confirming UI parity.
- **Dependencies:** Requires normalized payloads from M4; informs QA and docs (M6) to schedule cross-cutting checks.

### M6 — QA, Documentation, and Release Enablement
- **Entry criteria:** Backend and frontend milestones functionally complete on integration branch.
- **Exit criteria:** End-to-end validation across ingestion through UI passes; documentation and communication artifacts updated; release checklist signed off.
- **Impacted areas:** Test suites under `tests/`, docs (`README.md`, `.docs/`, `README-dev.md`), changelog, release scripts under `scripts/`, Home Assistant packaging (`custom_components/pp_reader/manifest.json`).
- **Deliverables:** Regression and integration test runs with fixture refresh, QA playbook updates, user-facing docs and release notes, legacy cleanup tickets raised for remaining assets.
- **Dependencies:** Relies on feature completion of M1–M5; gates legacy removal strategy execution.

## Sequencing & Dependencies

1. **M1 → M2:** Stable parsing ensures enrichment services attach to canonical entities without reprocessing legacy payloads.
2. **M2 → M3:** Metrics depend on FX and history data to produce accurate EUR conversions and coverage metadata.【F:datamodel/backend-datamodel-final.md†L170-L363】
3. **M3 → M4:** Normalization requires persisted aggregates and coverage flags to reshape push payloads per canonical schemas.【F:datamodel/dataflow_backend.md†L200-L286】
4. **M4 → M5:** Frontend adapters transition only after payloads are canonical to avoid dual contracts; staging branch exposes mock payloads for UI development.【F:datamodel/dataflow_frontend.md†L121-L238】
5. **M5 → M6:** QA/documentation closes once frontend parity is confirmed and telemetry indicates stable pushes.

Cross-cutting coordination includes:

- **Schema governance:** DB migrations introduced during M1–M4 require versioned scripts and rollback guidance to protect existing installations.
- **Fixture alignment:** Backend fixture updates (M1–M3) and frontend snapshots (M5) must align on canonical payload structures to avoid flaky tests.
- **Operational readiness:** Enrichment jobs introduced in M2 need monitoring hooks and rate limit handling before QA closure.

This roadmap should be revisited at the end of each milestone to adjust sequencing, verify dependencies, and schedule legacy cleanup activities under the dedicated strategy document.
