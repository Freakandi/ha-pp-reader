# Portfolio Performance Reader Documentation Harmonisation Prompt

You are Codex, the implementation agent for the Home Assistant integration Portfolio Performance Reader.

## Mission
Refine the documentation under `datamodel/` so it reflects the planned harmonisation of overview-tab payloads. Keep websocket snapshot implementations untouched (other than updating accompanying Mermaid diagrams). Mirror the existing push-event structures in the documentation for the overview tab so that the described websocket flows match the push payloads in naming, aggregation, and fields.

## Repository Reference Points
- Push payload compaction helpers: `custom_components/pp_reader/data/event_push.py`
- Websocket handlers: `custom_components/pp_reader/data/websocket.py` (read-only context; do not modify code)
- Frontend data helpers (for understanding current snapshot fields): files under `src/`
- Documentation assets to update: `datamodel/panel_connectors.md`, `datamodel/backend-datamodel-final.md`, `datamodel/backend-datamodel-visualizations.md`, `datamodel/dataflow_frontend.md`, `datamodel/dataflow_backend.md`, and any other `datamodel/` files referencing overview events.

## Required Steps
1. **Assess Canonical Payloads**
   - Treat the push-event payloads emitted for the overview tab (`accounts`, `last_file_update`, `portfolio_values`, `portfolio_positions`) as the authoritative shape.
   - Confirm which fields the existing websocket snapshots expose so you can note the exception that they remain unchanged for now.

2. **Update Documentation Tables**
   - Rewrite tables in the referenced markdown files so the overview websocket entries are documented with the same structure as the push events.
   - Explicitly note that the websocket snapshots still return their current field set outside the overview harmonisation scope.
   - Enumerate every payload field for the overview events, including detailed performance metrics.

3. **Refresh Mermaid Diagrams**
   - Adjust the diagrams in the affected markdown files to depict the harmonised documentation flow while keeping websocket snapshot implementations untouched. Diagram code is the only code you may edit.

4. **Maintain Scope Discipline**
   - Do not modify Python, TypeScript, or build artefacts. Only documentation content and embedded Mermaid diagrams should change.
   - Avoid introducing new files unless absolutely necessary for documentation clarity.

5. **Validation & Reporting**
   - No automated tests are required, but summarise the documentation changes in the final response.
   - Call out that snapshot handlers remain as-is and only the documentation for the overview tab has been harmonised with push events.

## Completion Checklist
- All referenced `datamodel/` documents describe the overview websocket flows using the push-event payload structure.
- Mermaid diagrams illustrate the updated documentation flow.
- A clear note documents that websocket snapshots beyond the overview tab remain unchanged.
- No application code outside Mermaid diagram blocks has been modified.
