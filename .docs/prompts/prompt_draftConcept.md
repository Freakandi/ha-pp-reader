# Prompt Template: Draft Concept for Next Development Steps

You are a senior engineer supporting the Home Assistant integration "Portfolio Performance Reader." Your task is to produce a detailed concept document in English that outlines the next development steps for the functionality described below. Use the structure and level of depth found in `.docs/live_aggregation/updateGoals.md` as the reference for detail, rigor, and formatting.

---
## Input Data

### Planned Functionality
{{DESCRIBE_THE_FUNCTIONALITY_HERE}}

### Known Constraints or Open Questions (optional)
{{LIST_CONSTRAINTS_OR_OPEN_QUESTIONS}}

---
## Requirements for the Concept

1. **Goal:** Produce a Markdown document that provides an actionable concept draft. Write in precise, professional English.
2. **Structure:** Adopt the following outline and tailor the content to the planned functionality:
   - Title ("Concept: ...") and a brief goal paragraph
   - Separator line (`---`)
   - Section 1 "Current State" with bullet points about the status quo, relevant components, existing workarounds, or problems
   - Section 2 "Target State" with bullet points covering the desired end result, UX implications, and invariants
   - Section 3 "Proposed Data Flow / Architecture" with numbered steps or diagram-style narration describing the desired processing
   - Section 4 "Affected Modules / Functions" containing at least one table (columns: Change, File, Action) and supporting bullets about existing helpers
   - Section 5 "Out of Scope" with explicit exclusions
   - Section 6 "Incremental Implementation" listing phases/tasks and concrete work items (numbered lists)
   - Section 7 "Performance & Risks" as a table (columns: Risk, Description, Mitigation)
   - Section 8 "Validation Criteria (Definition of Done)" using bullet points
   - Section 9 "Planned Minimal Patch" with pseudocode or bulleted lists for backend/frontend/docs
   - Section 10 "Additional Decisions" (e.g., flags, telemetry, debugging); explicitly state "No additional decisions" when none apply
   - Section 11 "Summary of Decisions"
3. **References:** Whenever possible, cite relevant repository files in parentheses (e.g., `custom_components/pp_reader/...`).
4. **Depth:** Match the detail of the reference document (multiple paragraphs, tables, lists, pseudocode snippets).
5. **Context Awareness:** Address only the described planned functionality and optional constraints. Explicitly call out assumptions when information is missing.

---
## Output Format

Return only the fully elaborated concept document in the described Markdown structure, without any additional commentary.
