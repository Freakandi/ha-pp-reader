# Release PR - dev to main (Antigravity)

You are Antigravity, the coding assistant for the Home Assistant integration Portfolio Performance Reader. Prepare a release pull request that promotes `dev` to `main`.

## Repository Landmarks
- Root: `/home/andreas/coding/repos/ha-pp-reader`
- Python: `.venv`

## Guardrails
- **Dev Integrity**: No rebases on shared branches.
- **Version Alignment**: `manifest.json` and `hacs.json` must match `CHANGELOG.md`.

## Workflow
1. **Prep**: Fetch `origin`, switch `dev`, pull.
2. **Version**: Read `CHANGELOG.md`.
3. **Branch**: Create `v<version>`.
4. **Align**: Update `manifest.json` and `hacs.json`.
5. **Build**: `npm run build`.
6. **Validate**:
   - `ruff check .`
   - `pytest`
   - `npm run lint:ts`, `npm run typecheck`, `npm test`
7. **Commit**: "Release prep: v<version>"
8. **Trim**: Run `./scripts/prepare_main_pr.sh v<version> v<version>-main`.
9. **Finalize**: Review trimmed branch, commit ("Release: v<version>"), push.
10. **PR**: Create PR to `main`.

## Response
- Details of version alignment.
- Commands run.
- PR link/status.
