# Prompt Template: Update `CHANGELOG.md` (Antigravity)

**Goal**
Update `CHANGELOG.md` to reflect all changes between the last documented version and the current version in `custom_components/pp_reader/manifest.json`.

**Sources**
- `manfiest.json`: Current version.
- `CHANGELOG.md`: Last version.
- Git History/Diff: Changes since last version.

**Workflow**
1. **Identify Versions**:
   - Current: `manifest.json` (never change the version here)
   - Last: Top entry in `CHANGELOG.md`.
   - If these match, add changes in the "unreleased" section, so they can be added to a specific version upon the next release.
2. **Collect Changes**:
   - Analyze commits/diffs since last released version.
   - Categorize: Added, Changed, Fixed, Removed, Internal.
3. **Update Changelog**:
   - Create/Update block for current version (`## [X.Y.Z] - YYYY-MM-DD`).
   - Add concise bullet points.
4. **Validation**:
   - Check spelling and formatting.
   - Ensure completeness.

**Output**
- Updated `CHANGELOG.md` with structured entry.
