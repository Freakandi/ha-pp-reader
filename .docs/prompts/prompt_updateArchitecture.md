# Prompt Template: Refresh `ARCHITECTURE.md`

**Goal**
- Verify that every existing section in [`ARCHITECTURE.md`](ARCHITECTURE.md) accurately reflects the current codebase.
- Expand or adjust the documentation to cover all relevant components, data flows, and external dependencies that exist today.

**Preparation**
- Scan the repository for recent changes that might affect the architecture (new modules, refactors, removed features).
- Pay special attention to the integration code under `custom_components/pp_reader/`, shared utilities, backend services, and frontend assets.
- Identify any architectural decisions or diagrams that require updates.

**Execution Steps**
1. Review the current contents of `ARCHITECTURE.md` and list its sections.
2. For each section:
   - Confirm whether the described behavior, data flow, and responsibilities still match the implementation.
   - Update outdated descriptions, terminology, or file references.
   - Add missing details for new components or changes introduced since the last revision.
3. If key architecture topics are undocumented (e.g., dependency management, caching strategy, data synchronization, background jobs), add new sections that explain them succinctly.
4. Ensure the documentation distinguishes clearly between Home Assistant platform concepts, integration-specific components, and external systems (e.g., Portfolio Performance data sources).
5. Cross-reference related documentation files (README, CHANGELOG, `.docs/*`) where helpful, keeping links relative.
6. Proofread the updated document for clarity, consistency, and formatting.

**Output Requirements**
- Commit all necessary edits directly to `ARCHITECTURE.md`.
- Summarize the key updates in the eventual PR description.
- Include notes about any assumptions or open questions that surfaced during verification.

**Tone & Formatting**
- Use concise, technical language suitable for developers onboarding to the project.
- Maintain Markdown structure with clear headings, subheadings, and bullet lists where appropriate.
- Prefer present tense and active voice when describing current behavior.
