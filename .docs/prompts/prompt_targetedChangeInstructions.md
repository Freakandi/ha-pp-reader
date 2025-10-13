# Targeted redundancy retirement workflow

You are assisting with the Portfolio Performance Reader repository. Follow this checklist every time you run this prompt to retire one legacy redundancy entry:

1. Open `.docs/further_redundancies_2.md` and pick a single unchecked item from the numbered backlog. Prefer the highest-priority entry if priorities are noted; otherwise choose the first unchecked item.
2. Investigate the codebase to map out every endpoint, module, and helper involved in both the legacy implementation and its modern replacement for the chosen item. Capture all relevant file paths and symbols.
3. Append a new, detailed todo entry to `.docs/TODO_further_redundancies_2.md` that:
   - Summarises the cleanup objective.
   - Lists each legacy endpoint to touch, grouped by backend/frontend as appropriate.
   - Lists the modern replacement endpoints or utilities that should remain.
   - Notes dependencies, blockers, required migrations, and validation steps.
4. Update `.docs/further_redundancies_2.md` by ticking the checkbox for the processed backlog item while preserving its numbering and citation details.
5. Repeat the workflow on subsequent runs by selecting another unchecked item; never overwrite or remove existing todo entries, only append new ones.
