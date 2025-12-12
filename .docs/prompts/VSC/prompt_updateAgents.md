# Prompt Template: Refresh `AGENTS.md`

**Objective:**
Ensure the repository guidance in `AGENTS.md` accurately reflects the current development practices, tooling, and project structure.

**Scope:**
- Entire repository instructions contained in `AGENTS.md`.
- Confirm whether additional nested instruction files are required (e.g., for new directories) and create them if needed.

**Preparation:**
1. Inspect the repository tree for any existing `AGENTS.md` files and note their scope.
2. Review recent changes (commits, docs, scripts) that may affect contributor instructions.
3. Gather information on current development workflows (setup scripts, testing commands, linting, release process, etc.).

**Execution Steps:**
1. Open `AGENTS.md` and evaluate each section for accuracy against the present repository state.
2. Update outdated steps, command names, or directory references to match the latest tooling and scripts.
3. Add new guidance if additional workflows, automation, or conventions have emerged since the last update.
4. Remove instructions that no longer apply.
5. If new subdirectories now need their own contributor guidance, add scoped `AGENTS.md` files with appropriate content.

**Documentation Requirements:**
- Keep instructions concise but explicit (include exact commands or paths where helpful).
- Maintain markdown formatting consistency with existing style.
- Clearly separate development setup, day-to-day workflows, and release processes.

**Validation:**
- Double-check all referenced scripts or commands exist and function in the repo.
- Confirm no conflicting or redundant instructions remain.

**Deliverable:**
- Updated `AGENTS.md` (and any newly required scoped files) committed with a summary of the changes.
