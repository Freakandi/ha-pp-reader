1. [ ] QA & Regression Validation
   a) [ ] Run full backend regression (`pytest -q` plus `pytest --cov=custom_components/pp_reader --cov-report=term-missing`) inside the project venv to confirm ingestion → enrichment → normalization passes with the normalized dashboard adapter enabled.
      - Ziel: Catch parser/db/schema regressions before release packaging and capture failing modules for remediation.
   b) [ ] Execute enrichment + websocket smoke matrix (`pytest tests/test_event_push.py tests/test_ws_portfolios_live.py tests/test_ws_portfolio_positions.py tests/prices/test_history_queue.py tests/currencies/test_fx_async.py`) to ensure live updates stay aligned with the canonical payload contract.
      - Ziel: Validate the event bridge and FX/history helpers now that the frontend no longer tolerates legacy payloads.
   c) [ ] Rebuild frontend assets (`npm run lint:ts`, `npm run typecheck`, `npm test`, `npm run build`) after clearing `node_modules/.vite` to prove the normalized adapter builds cleanly for release bundles.
      - Ziel: Ship reproducible dashboard artefacts without stale cache files.

2. [ ] Fixture & Snapshot Refresh
   a) [ ] Refresh backend fixtures referenced by `tests/integration/test_normalization_smoketest.py` and align them with the latest `datamodel/backend-datamodel-final.md`.
      - Ziel: Prevent drift between persisted snapshots and documentation before release.
   b) [ ] Update frontend snapshot/DOM references (`tests/dashboard/`, `tests/frontend/`) after rebuilding assets, regenerating expected JSON where necessary.
      - Ziel: Keep frontend regression tests deterministic under the normalized adapter.

3. [ ] Documentation & QA Playbook
   a) [ ] Extend `.docs/qa_docs_comms.md` with an M6 QA checklist covering backend regression runs, frontend smoke tests, and manual dashboard verification steps (including feature-flag expectations and operator rebuild instructions).
      - Ziel: Give QA/ops teams a single runbook for sign-off.
   b) [ ] Update `README.md`, `README-dev.md`, and `ARCHITECTURE.md` with final rollout instructions (feature flag defaults, asset rebuild guidance, note about removal of legacy adapters).
      - Ziel: Ensure external contributors understand the stabilized contract without referencing TODO files.

4. [ ] Release Packaging
   a) [ ] Bump the integration version in `custom_components/pp_reader/manifest.json` and capture changes in `CHANGELOG.md` under a dated release entry.
      - Ziel: Prepare HACS packaging with a clear semantic version for the normalized adapter GA.
   b) [ ] Run `npm run build` followed by `scripts/update_dashboard_module.mjs` / `scripts/prepare_main_pr.sh dev main` to refresh bundled assets and ensure release branches stay in sync.
      - Ziel: Prevent mismatched dashboard bundles when promoting to `main`.
   c) [ ] Tag telemetry/diagnostics defaults (e.g., enable `normalized_pipeline` and `normalized_dashboard_adapter` by default) and describe any config-entry migration steps.
      - Ziel: Minimize operator intervention during rollout.

5. [ ] Legacy Cleanup Enablement
   a) [ ] Open follow-up issues (or tracker entries) tied to `.docs/legacy_cleanup_strategy.md` for removing `_normalize_portfolio_row`, coordinator portfolio caches, and legacy TS overrides, referencing the evidence gathered during QA.
      - Ziel: Transition from adapter rollout to actual code removal with traceable acceptance criteria.
   b) [ ] Document in `.docs/cleanup/normalization_followups.md` which components can now be deleted post-release (include owners, blocking tests).
      - Ziel: Keep cleanup sequencing transparent for future sprints.

6. [ ] Communications & Release Notes
   a) [ ] Draft the release announcement (internal + HACS) summarizing the normalized adapter GA, breaking changes, and expected operator actions (asset rebuild, feature flag defaults).
      - Ziel: Align maintainers and community members on rollout expectations.
   b) [ ] Update `CHANGELOG.md` to move the normalized adapter entry from “Unreleased” to the tagged version once QA passes, including explicit references to rebuilt assets and removed fallbacks.
      - Ziel: Keep the changelog authoritative for the final release package.
