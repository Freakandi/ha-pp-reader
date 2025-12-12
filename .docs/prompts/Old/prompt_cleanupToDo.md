# Prompt Template: Derive Cleanup TODO List from `.docs/legacy_cleanup_strategy.md`

**Goal:**
Generate a detailed, implementation-ready TODO checklist for a *single* section taken from `.docs/legacy_cleanup_strategy.md`. The resulting checklist must describe every code/test/doc change required to complete the chosen cleanup theme and must be saved as a new Markdown file directly under `.docs/` (for example: `.docs/TODO_cleanup_diff_sync.md`).

---

## Input Section (paste here)
```
<insert the exact section from .docs/legacy_cleanup_strategy.md that should be decomposed>
```

---

## Instructions for Codex
1. **Scope only the pasted section.** Do not include tasks from other parts of `legacy_cleanup_strategy.md`; if multiple sections need TODOs, rerun this template once per section.
2. **Extract every requirement** (code deletions, migrations, tests, docs) mentioned in the section, including prerequisites, validation steps, and notes.
3. **Translate requirements into atomic checklist items**:
   - Each item addresses a single change.
   - Reference concrete paths/modules (e.g., `custom_components/pp_reader/data/coordinator.py`).
   - State the goal/result so work can be executed without additional clarification.
4. **Structure**:
   - Use numbered main points with nested sub-points (1., 1.a), etc.).
   - Each entry must follow: `[ ] Description — Paths — Functions/Areas — Expected outcome`.
   - Group prerequisite tasks before removal steps when relevant; include validation/test runs explicitly.
5. **Optional work** (nice-to-haves) should be labelled “Optional” and placed at the end, if any.
6. **Output file requirement**:
   - Save the checklist as a new Markdown file in `.docs/`.
   - Suggested naming: `.docs/TODO_cleanup_<short-section-key>.md`.
   - Ensure the file is self-contained (brief intro referencing the source section).
7. **No migrations or tools inventing:** Follow the legacy cleanup rules—remove legacy assets outright; do not propose new migration tooling or data conversions.

Use this template whenever a fresh TODO checklist is required for a section of `legacy_cleanup_strategy.md`.
