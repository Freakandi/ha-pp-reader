# Portfolio Performance Reader Frontend Bundle Rebuild Prompt

You are Codex, the release engineer responsible for regenerating the production dashboard bundle for the Home Assistant integration **Portfolio Performance Reader**.

## Mission
Rebuild the entire frontend JavaScript bundle so that the assets under `custom_components/pp_reader/www/pp_reader_dashboard/` match the current TypeScript implementation in `src/`. Ship the freshly compiled bundle, source maps, updated module re-export, and regenerated type declarations in a pull request.

## Repository Landmarks
- Repository root: `/workspace/ha-pp-reader`
- TypeScript sources: `src/` (entry points `dashboard.ts` and `panel.ts`)
- Bundled assets delivered with the integration: `custom_components/pp_reader/www/pp_reader_dashboard/js/`
- Dashboard loader shipped with Home Assistant: `custom_components/pp_reader/www/pp_reader_dashboard/panel.js`
- Build tooling and scripts: `package.json`, `vite.config.mjs`, `scripts/update_dashboard_module.mjs`
- Frontend smoke / artifact tests: `tests/frontend/`

## Preflight Checklist
1. Ensure Node.js **18.18+** with npm **10+** is available (see repo-wide instructions).
2. Run `npm install` if dependencies have not been installed in this workspace session.
3. Review the recent changes under `src/`, `custom_components/pp_reader/www/pp_reader_dashboard/panel.js`, and related TypeScript helpers so you understand what must be reflected in the rebuilt bundle.
4. Activate the project Python virtual environment (`source .venv/bin/activate`) if you intend to run pytest-based frontend integrity checks.

## Build Procedure
1. From the repository root, execute `npm run lint:ts` and `npm run typecheck` to confirm the TypeScript sources compile cleanly.
2. Run the production build: `npm run build`.
   - This invokes Vite to emit hashed bundles (and chunk files) into `custom_components/pp_reader/www/pp_reader_dashboard/js/` with source maps.
   - It also runs `scripts/update_dashboard_module.mjs` to rewrite `dashboard.module.js` so Home Assistant loads the newest hashed bundle and prunes stale bundles/maps.
   - Finally, `npm run build` triggers `npm run build:types` to refresh the declaration files under `types/` (ignored by git but helpful for IDE tooling).
3. If you need bundle analysis, rerun the build with `PP_READER_ANALYZE_BUNDLE=1 npm run build` to refresh `.docs/bundle-analysis.*` (only include these outputs in the PR when intentionally updating bundle reports).

## Post-build Verification
1. Inspect `custom_components/pp_reader/www/pp_reader_dashboard/js/`:
   - Confirm a single `dashboard.<hash>.js` bundle and matching `.map` exist alongside the updated `dashboard.module.js`.
   - Stage any new or changed chunk files under `custom_components/pp_reader/www/pp_reader_dashboard/js/chunks/` and assets under `.../js/assets/` if Vite emitted them.
   - Ensure stale bundles/maps were removed (only the latest hashed variant should remain).
2. Run the frontend artifact test to verify the module export resolves to the new bundle:
   - `pytest tests/frontend/test_build_artifacts.py`
3. Run the Node-based smoke test against the bundled dashboard helpers:
   - `pytest tests/frontend/test_dashboard_smoke.py`
4. If dashboard behaviour changed in ways that affect rendered HTML snippets, update the expectations inside `tests/frontend/dashboard_smoke.mjs` or related fixtures before rerunning the tests.

## Deliverables
- Commit the rebuilt bundle (`dashboard.<hash>.js` + source map) and the updated `dashboard.module.js`.
- Include any new or modified chunk/asset files emitted by Vite.
- Leave the generated `types/` directory out of the commit (it is ignored on purpose).
- Update `.docs/bundle-analysis.html` and `.docs/bundle-analysis.json` only if you purposely refreshed the bundle analysis.
- Document all commands executed (`npm run build`, pytest invocations, etc.) in the final PR message.

## Exit Criteria
You are done once the repository contains only the freshly built frontend artifacts, all automated checks above pass, and your PR description clearly lists the rebuild steps and verification commands.
