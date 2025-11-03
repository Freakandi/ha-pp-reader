# Datamodel Refactor Implementation Plan

This document enumerates the five preparation tasks required to execute the new end-to-end datamodel refactor for the Portfolio Performance Reader integration. Each task expands on the earlier high-level guidance and includes a ready-to-use prompt for generating a granular concept document in a subsequent step. The concept document produced from each prompt should then be decomposed into an actionable todo list.

## 1. Draft phased implementation roadmap

**Purpose.** Create a cross-functional roadmap that sequences the refactor from ingestion through frontend delivery, highlighting milestones, dependencies, and outcomes.

**Scope & Expectations.**
- Summarize the new datamodel and the rationale for replacing legacy flows.
- Define major milestones such as parser rewrite, enrichment integration, metric computation layer, normalization pipeline, frontend adapter rollout, and quality assurance/documentation closure.
- For each milestone, record entry and exit criteria, affected code areas (e.g., `custom_components/pp_reader/services/*`, `src/lib/`), and deliverables.
- Describe sequencing logic and inter-milestone dependencies, including prerequisite infrastructure or data contracts.

**Artifacts.** A new roadmap document under `.docs/roadmap/README.md` (or equivalent) capturing milestones, dependencies, and timeline rationale.

**Suggested prompt for concept document.**
```
Draft a detailed concept document for the "phased implementation roadmap" of the datamodel refactor. Anchor the overview in the artifacts inside `datamodel/backend-datamodel-final.md`, `datamodel/dataflow_backend.md`, and `datamodel/dataflow_frontend.md`, summarizing how the redesigned ingestion→normalization→frontend pipeline should unfold. For each milestone (parser rewrite, enrichment sync, metric engine, normalization layer, frontend adapter, QA/docs), cite the concrete modules or directories involved (e.g., `custom_components/pp_reader/services/parser.py`, `custom_components/pp_reader/metrics/`, `src/lib/api/portfolio`, `src/views/portfolio/*`) and describe the deliverables, dependencies, and exit criteria.
```

## 2. Detail backend workstreams

**Purpose.** Break down backend responsibilities across parsing, enrichment, metric computation, normalization, and persistence to guide implementation threads and legacy decommissioning.

**Scope & Expectations.**
- Produce subsections per backend domain (Parser, Enrichment, Metrics, Normalization, Storage/Persistence).
- Identify files, modules, or services to be created or rewritten and their interactions.
- Specify required behaviour changes (async execution, caching, validation) and integration with external data sources.
- List legacy modules slated for removal, the conditions that permit removal, and the verification steps needed beforehand.
- Cross-link to existing documentation under `.docs/` or other repositories for quick reference.

**Artifacts.** Backend workstream section within the roadmap or a dedicated companion document that can be iteratively updated as implementation decisions are made.

**Suggested prompt for concept document.**
```
Prepare a concept document that details backend workstreams for the datamodel refactor. Use `datamodel/backend-datamodel-final.md`, `datamodel/parsed_pp_data.md`, and the Mermaid flow in `datamodel/mermaid_backend_flow.mmd` to outline required behaviour per domain (Parser, Enrichment, Metrics, Normalization, Storage). For each domain, map the target flow to specific integration modules (e.g., `custom_components/pp_reader/services/portfolio_file.py`, `custom_components/pp_reader/coordinators/`, `custom_components/pp_reader/models/metrics.py`), identify supporting utilities under `custom_components/pp_reader/utils/`, and list the legacy modules slated for removal with their gating tests or verification scripts.
```

## 3. Plan frontend alignment

**Purpose.** Ensure the frontend architecture evolves alongside the new compacted dataset, covering contract updates, component migrations, and state management changes.

**Scope & Expectations.**
- Document the new data contracts exposed to the frontend (`src/lib/api`, `src/views/*`, state stores).
- Define migration steps for components, selectors, and view models to consume normalized data.
- Identify legacy UI assets slated for removal and the conditions to retire them.
- Outline coordination points with backend milestones (e.g., sequencing feature flag removal, staging data contract updates in development environments).
- Highlight testing considerations specific to the frontend (snapshot updates, integration tests with Home Assistant dashboards).

**Artifacts.** Frontend alignment plan embedded within the roadmap or as a separate design note linked from the roadmap.

**Suggested prompt for concept document.**
```
Compose a concept document that plans frontend alignment for the datamodel refactor. Base the plan on the normalized datasets described in `datamodel/backend-datamodel-visualizations.md` and `datamodel/dataflow_frontend.md`, explaining how they translate into view models. Detail updates to `src/lib/api/portfolio`, `src/lib/store/*`, `src/views/portfolio/` components, and any dashboard bindings under `custom_components/pp_reader/www/pp_reader_dashboard/js/`. Enumerate required component migrations, selector/state changes, integration tests under `tests/dashboard/`, and the criteria for deleting legacy UI assets.
```

## 4. Define legacy cleanup strategy

**Purpose.** Establish a deliberate, traceable approach for decommissioning obsolete assets while avoiding regressions or orphaned resources.

**Scope & Expectations.**
- Build a cleanup checklist spanning services, schemas, configuration, documentation, and tests.
- Reference precise paths (e.g., `custom_components/pp_reader/legacy_*`, `.docs/*`, fixture directories) for each removal candidate.
- Set explicit gating rules for deletions (e.g., after smoke tests pass, after documentation is updated).
- Describe validation steps such as schema diffs, integration tests, or manual verification required before removal.
- Incorporate a tracking mechanism (e.g., status table) to monitor cleanup progress.

**Artifacts.** Legacy cleanup plan appended to the roadmap or as a dedicated checklist document referenced by implementation tickets.

**Suggested prompt for concept document.**
```
Generate a concept document that defines the legacy cleanup strategy for the datamodel refactor. Inventory obsolete assets by referencing `datamodel/panel_connectors.md`, the existing `datamodel/db_entries/` samples, and the `custom_components/pp_reader/legacy_*` modules. For each item, specify the tests (`tests/integration/*`, `tests/dashboard/*`), docs (`README.md`, `.docs/`), and configuration files (`config/pp_reader/*`) that must be updated or validated before deletion, along with tracking tables or checklists to govern removal.
```

## 5. Outline QA, documentation, and communication tracks

**Purpose.** Align quality assurance, documentation, and stakeholder communication activities with the technical refactor.

**Scope & Expectations.**
- Enumerate required automated and manual tests, including datasets and fixtures needed to validate the new pipeline end-to-end.
- Plan documentation updates (README, integration setup guides, developer docs) and describe how they will reflect the new architecture.
- Identify communication deliverables such as release notes, internal updates, or onboarding materials for contributors.
- Note supporting tooling or scripts required to maintain fixtures, regenerate dashboards, or monitor runtime behaviour.
- Integrate scheduling considerations so QA and documentation milestones track with development progress.

**Artifacts.** QA/docs/comms playbook integrated into the roadmap or maintained as a linked checklist.

**Suggested prompt for concept document.**
```
Write a concept document outlining QA, documentation, and communication tracks for the datamodel refactor. Ground the testing strategy in datasets from `datamodel/yq_datasets/` and the end-to-end flow diagrams in `datamodel/mermaid_frontend_flow.mmd`. Enumerate automated coverage required in `tests/` (Python coordinators, dashboard components, snapshot tests) and the tooling/scripts under `scripts/` or `custom_components/pp_reader/cli/` needed to generate fixtures. Detail documentation updates across `.docs/`, `README-dev.md`, and `CHANGELOG.md`, plus communication artifacts (release notes, onboarding guides) tied to each roadmap milestone.
```
