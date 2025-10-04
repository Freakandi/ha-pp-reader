# Concept: TypeScript Migration for PP Reader Dashboard

Goal: Establish an end-to-end plan for replacing the Home Assistant dashboard’s JavaScript modules with a TypeScript-based toolchain while preserving the current runtime behaviour, bundling semantics, and Home Assistant delivery model.

---

## 1. Current State
- The dashboard panel is delivered as raw ES modules: `panel.js` registers the custom element, injects static HTML/CSS, and forwards Home Assistant bindings directly to the dashboard controller without a build step.【F:custom_components/pp_reader/www/pp_reader_dashboard/panel.js†L1-L158】
- Cache busting is handled manually via the versioned re-export in `dashboard.module.js`, so every browser request hits `dashboard.js?v=…` directly from the filesystem.【F:custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.module.js†L1-L4】
- `dashboard.js` orchestrates tab registration, swipe navigation, and websocket-driven updates by composing helpers from `interaction/`, `tabs/`, and `data/` submodules, all authored in plain JavaScript.【F:custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.js†L1-L200】
- The websocket client utilities derive `entry_id` through defensive runtime inspection before firing Home Assistant messages, reflecting dynamically typed contracts.【F:custom_components/pp_reader/www/pp_reader_dashboard/js/data/api.js†L1-L162】
- Live update handlers maintain DOM state via window-scoped caches and manual table rendering logic, again relying on runtime checks instead of compile-time typing.【F:custom_components/pp_reader/www/pp_reader_dashboard/js/data/updateConfigsWS.js†L1-L200】
- The repository has no Node-based build tooling beyond a minimal `package.json` (module type set to ESM, only `jsdom` dependency, no scripts for bundling or type checking).【F:package.json†L1-L19】

## 2. Target State
- All dashboard source files under `custom_components/pp_reader/www/pp_reader_dashboard/js/` are authored as `.ts` (and `.tsx` if JSX becomes necessary) with strict compiler settings, replacing ad-hoc runtime checks with static types where possible.
- A lightweight build pipeline (e.g., Vite/Rollup) compiles TypeScript to modern ESM output that preserves the existing module graph (`panel.js` → `dashboard.module.js` → bundled controller) and emits browser-ready assets into the Home Assistant `www` directory.
- Generated JavaScript retains the current public surface: `panel.js` continues to load a single module specifier, events and global hooks keep their names, and no change is visible to Home Assistant clients aside from improved source quality.
- Type definitions describe Home Assistant objects (`hass`, websocket payloads) sufficiently to catch common misuse while tolerating unknown fields through dedicated interfaces.
- Source maps are emitted for debugging, and lint/type-check tasks integrate into the repository’s development workflow alongside existing Python tooling.

## 3. Proposed Data Flow / Architecture
1. Developers author TypeScript modules inside a new `src/` tree mirroring the existing `js/` folder structure (e.g., `src/data/api.ts`).
2. Vite (or Rollup) consumes `src/dashboard.ts` as the entrypoint, compiles TypeScript, inlines shared helpers, and writes versioned output to `custom_components/pp_reader/www/pp_reader_dashboard/js/` (e.g., `dashboard.js` and hashed chunk assets).
3. A build script rewrites `dashboard.module.js` to point at the compiled artifact (updating the query parameter hash automatically) while leaving `panel.js` untouched.
4. Type declaration generation (`tsc --emitDeclarationOnly`) produces `.d.ts` files stored alongside the source or in `types/` for editor support; optional publishing of types happens later.
5. NPM scripts (`npm run build`, `npm run typecheck`, `npm run lint:ts`) orchestrate the pipeline, enabling CI integration and local developer workflows.

## 4. Affected Modules / Functions

| Change | File | Action |
| --- | --- | --- |
| Introduce TypeScript entrypoints mirroring existing JavaScript controllers | `src/dashboard.ts`, `src/panel.ts` (new) | Port logic from current JS files; re-export compiled output |
| Maintain loader that Home Assistant imports | `custom_components/pp_reader/www/pp_reader_dashboard/panel.js` | Keep runtime wrapper but adjust import path if bundler output relocates |
| Replace manual cache-busting shim with generated specifier | `custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.module.js` | Update during build to reference new compiled filename/query |
| Port controller orchestration into TypeScript | `src/dashboard/index.ts` (mirrors `js/dashboard.js`) | Add typing for tabs, factories, websocket handlers |
| Port websocket utilities with typed payloads | `src/data/api.ts` | Define interfaces for message payloads and hass connection |
| Port update handlers and DOM utilities | `src/data/updateConfigsWS.ts`, `src/content/elements.ts` | Adopt typed DOM helpers, narrow `window` augmentation |
| Configure toolchain | `package.json`, `tsconfig.json`, `vite.config.mjs` | Add dependencies, scripts, compiler/bundler configuration |
| Documentation | `.docs/frontend_ts_migration.md` (this document), `README-dev.md` | Describe new workflow |

Supporting helpers:
- DOM composition helpers under `content/` already centralize table generation and sorting; their signatures should become typed utility functions to share across tabs.【F:custom_components/pp_reader/www/pp_reader_dashboard/js/data/updateConfigsWS.js†L1-L200】
- Websocket message factories in `data/api.js` map directly to Home Assistant commands and provide a natural place to define request/response interfaces.【F:custom_components/pp_reader/www/pp_reader_dashboard/js/data/api.js†L1-L162】

## 5. Out of Scope
- Changes to Home Assistant backend websocket handlers or payload schemas.
- Redesign of dashboard UX, layout, or CSS assets.
- Migration of unrelated Python automation or sensor code.
- Publishing TypeScript type packages to NPM (can be considered later).

## 6. Incremental Implementation

1. **Phase 1 – Toolchain Bootstrap**
   1. Add TypeScript, Vite/Rollup, ESLint (with TypeScript plugin) to `package.json`; create `tsconfig.json` tuned for modern browsers served by Home Assistant.
   2. Copy existing `js/` tree into `src/` while preserving structure; convert files to `.ts` extensions without changing runtime logic yet.
   3. Configure Vite entry (`src/dashboard.ts`) that exports the same symbols as `dashboard.js`; ensure output writes into the Home Assistant `www` path.
   4. Establish `npm run build`, `npm run dev` (watch mode writing to `www`), and `npm run typecheck` scripts.

2. **Phase 2 – Type Annotation & Refactor**
   1. Introduce ambient typings for Home Assistant (`hass`), panel config, and websocket connection; prefer dedicated `types/home-assistant.d.ts` file.
   2. Gradually replace `any` with structural interfaces per module (e.g., `PortfolioUpdateMessage`, `DashboardState`).
   3. Replace `window.__ppReader…` augmentations with a typed `Window` interface extension, ensuring bundler preserves necessary globals.
   4. Resolve implicit `this` usage and dynamic imports that conflict with TypeScript’s strict mode.

3. **Phase 3 – Build Output Alignment**
   1. Adjust `dashboard.module.js` template to inject the latest hash produced by the bundler (via plugin or post-build script).
   2. Validate that compiled assets remain ESM and do not break `panel.js`; update import paths if bundler nests assets in subdirectories.
   3. Remove legacy JavaScript files once TypeScript output passes regression tests and linting.
   4. Update documentation (`README-dev.md`) with build instructions and prerequisites.

4. **Phase 4 – Quality Gates**
   1. Add CI step (GitHub Actions or similar) running `npm ci`, `npm run build`, and `npm run typecheck`.
   2. Write smoke tests (Playwright or jsdom-based) against compiled output to assert key DOM helpers still produce expected markup.
   3. Monitor bundle size; if growth is significant, apply tree-shaking and ensure no unused polyfills slip into the build.

## 7. Performance & Risks

| Risk | Description | Mitigation |
| --- | --- | --- |
| Bundle footprint growth | TypeScript build plus bundler wrappers may inflate asset size, affecting HA load time | Enable tree-shaking, analyze bundles, and configure terser/minify options; set budget alerts in CI |
| Build output path drift | Misaligned output could break Home Assistant static serving expectations | Lock bundler output directory to existing `www` path and add tests that verify file presence |
| Typing gaps for Home Assistant APIs | Lacking upstream typings may force widespread `any` usage, reducing benefit | Create local declaration files and progressively refine as APIs are encountered |
| Developer workflow complexity | Additional Node tooling may deter contributors focused on Python | Document workflows, provide npm scripts, and consider pre-building assets in releases |
| Runtime regressions from refactor | Type conversions or strict null checks could change behaviour | Port logic incrementally with parity tests (jsdom-based snapshot tests, manual HA panel smoke runs) |

## 8. Validation Criteria (Definition of Done)
- `npm run build` produces compiled ESM files that replace the previous JavaScript without runtime errors in Home Assistant.
- `npm run typecheck` passes with strict (or near-strict) compiler options and no unresolved `any` outside deliberate escape hatches.
- Dashboard functionality (tab navigation, websocket updates, DOM rendering) operates identically to the current JavaScript when exercised in Home Assistant.
- Source maps allow debugging compiled code within browser devtools.
- Documentation (`README-dev.md`) describes the new TypeScript workflow for developers.

## 9. Planned Minimal Patch
- **Backend:** No code changes required; websocket contracts remain untouched.
- **Frontend:**
  - Add `tsconfig.json` and `vite.config.mjs`.
  - Introduce `src/dashboard.ts` that re-exports logic from converted modules.
  - Update `dashboard.module.js` during build to reference the compiled artifact (e.g., `export * from './dashboard.js?v=${hash}'`).
- **Docs:** Extend `README-dev.md` with TypeScript setup instructions and add this concept document to `.docs/`.

## 10. Additional Decisions
- Introduce `npm run build`, `npm run dev`, and `npm run typecheck` scripts as the canonical workflow for frontend assets.
- Adopt ESLint with the TypeScript plugin for consistent linting alongside the existing Python tooling.

## 11. Summary of Decisions
- TypeScript source will live under a new `src/` tree compiled into the existing `www` asset structure.
- Vite (or an equivalent bundler) will manage compilation, hash generation, and source maps.
- Home Assistant-facing module specifiers (`panel.js`, `dashboard.module.js`) remain stable, with only query parameters managed automatically.
- Local type declarations will capture Home Assistant-specific contracts to unlock TypeScript’s benefits.
- Documentation and CI will be updated to enforce the new build and type-check steps.
