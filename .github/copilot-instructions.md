# AI Coding Agent Instructions (ha-pp-reader)

Goal: High‑quality, incremental implementation for the Home Assistant integration `pp_reader` while preserving all existing runtime contracts (sensors, frontend event payloads, DB schema invariants).
Primary workflow now: 1) Draft concepts, 2) Derive explicit To‑Do checklist, 3) Implement exactly one open checklist item per turn (unless in focused bugfix/test assistance mode).

---

## 0. Core Invariants (DO NOT BREAK)

Coordinator data contract (append new top-level keys only):
```json
{
  "accounts": { "<uuid>": { "name": str, "balance": float(EUR), "is_retired": bool } },
  "portfolios": { "<uuid>": { "name": str, "value": float(EUR), "count": int, "purchase_sum": float(EUR) } },
  "transactions": [ ... ],
  "last_update": "YYYY-MM-DDTHH:MM:SSZ"
}
```
Rules:
- No mutation of shapes / key names.
- Rounding to 2 decimals only at sensor & event boundary.
- Prices/shares internally scaled (1e-8). Integer cents may exist in DB; never emit mixed precision.
- FX preload (see `currencies/fx.py`) required before cross‑currency aggregation. Non‑EUR accounts: keep original + converted.

Event types (fixed set for dashboard incremental patching):
- `accounts`
- `last_file_update`
- `portfolio_values`
- `portfolio_positions`
Order on price updates or file-driven portfolio changes:
1. `portfolio_values`
2. each affected portfolio `portfolio_positions`

DOM contract (overview tab):
- Table: `<table class="expandable-portfolio-table">`
- Portfolio row selector: `.portfolio-row[data-portfolio=UUID]`
- Adjacent details container: `.portfolio-details` → `.positions-container`
- No full re-render; patch only existing nodes.

Schema change protocol:
1. Extend creation SQL in `data/db_schema.py`
2. Add to `ALL_SCHEMAS` (`data/db_init.py`)
3. (If altering existing tables) Add safe `ALTER` guarded logic (idempotent)
4. Update `ARCHITECTURE.md` (SQLite Schema & Migrations)
5. Add CHANGELOG entry (Added / Changed)
6. Consider tests (persistence + migration)
7. Never silently add a table/column without ALL_SCHEMAS.

---

## 1. Standard Workflow (Concept → Checklist → Implementation)

1. Concept Draft
   - Create / update a document under `.docs/` (e.g. `updateGoals.md` or a new focused concept) describing rationale, scope, constraints, contracts unchanged, and potential risks.
   - Reference existing architecture sections instead of duplicating unless a refinement is introduced.

2. Checklist Derivation
   - Produce a numbered To‑Do list file (e.g. `.docs/TODO_<topic>.md`) containing atomic items:
     - Each item: `[ ]` one change (file path, function/section, goal/result).
     - Mark optional / deferred optimizations explicitly.
     - Include test & documentation update items (ARCHITECTURE.md, TESTING.md, CHANGELOG.md).
   - Items must be order-aware (dependencies first).

3. Incremental Implementation Cycle (default mode)
   - Pick exactly ONE open checklist item (highest priority / dependency satisfied).
   - Response sections (mirrors process prompt style):
     A. Item summary & reason for selection
     B. Planned changes (bullets)
     C. Code patch (only real modifications; use required fenced block format)
     D. Checklist update (mark item complete with `[x]` or progress note)
     E. Risk / follow-up suggestions
   - No batching of multiple checklist items in a single turn.
   - If ambiguity/blocker: do NOT code—list decisions required + alternative next items.

4. Exceptions (Bugfix / Test Assistance Mode)
   - When user explicitly asks for a quick fix, test addition, or investigation, you may bypass the single-item rule (state that you are in exception mode).
   - Keep patches minimal & localized.

5. Completion
   - After final item: prompt for validation steps (manual + tests) before merging.
   - Ensure CHANGELOG & `manifest.json` version bump align with semantic change.

---

## 2. Patch Formatting Rules

- Use 4 backticks fenced code blocks with language (e.g. `markdown`, `python`, `javascript`).
- First line: `// filepath: <relative path>`
- Show only changed/new files. For modified large files, you may replace full content if simpler—avoid placeholder code.
- Use `...existing code...` markers only if showing a partial context; otherwise deliver full updated file for clarity.
- No broad refactors unless explicitly requested or required by the item.

---

## 3. Referencing & Cross-File Consistency

Always cross-check and (when needed) update:
- `ARCHITECTURE.md`: data flow, schema, contracts, lifecycle, invariants.
- `CHANGELOG.md`: Added / Changed / Fixed / Internal sections (Keep a Changelog style).
- `TESTING.md`: any new test strategy, fixtures, or commands.
- `README.md`: user-visible behavior changes only.
- `manifest.json`: version bump when behavior, schema, or user-visible configuration changes.

Linking (in explanations):
- Use relative links: `[ARCHITECTURE.md](../ARCHITECTURE.md)`, `[coordinator.py](../custom_components/pp_reader/data/coordinator.py)` etc.

---

## 4. Sensors & Entities

Pattern:
- Subclass `CoordinatorEntity` & `SensorEntity`.
- `_attr_should_poll = False` (unless explicitly dependent on real-time dynamic that is not covered by coordinator updates).
- Unique IDs: slugified base UUID + descriptive suffix.
- Round values at emission (2 decimals, standard `round()`).

---

## 5. WebSocket & Events

- All commands declared & registered in `__init__.py` via HA `websocket_api`.
- Use `_push_update(hass, entry_id, data_type, data)` to emit `EVENT_PANELS_UPDATED`.
- Do not rename existing `data_type` values.
- Add new event types only with explicit checklist item + frontend handler + documentation update.

---

## 6. Price / Revaluation Path

- Live price cycle: orchestrated in `prices/price_service.py` (batch fetch, change detection).
- Partials: `revaluation.revalue_after_price_updates` returns `portfolio_values` + affected `portfolio_positions`.
- Maintain documented event order (see invariants section).
- Drift warnings & error counter logic must remain idempotent and deduplicated per design.

---

## 7. Testing & Quality Integration

When implementing items:
- Add / adapt tests under `tests/` only if the item implies new logic or regression risk.
- Follow `TESTING.md` quick commands (`pytest -q`, coverage invocation).
- Avoid test flakiness (no real network).
- For schema changes: add test ensuring new columns exist & are populated.

---

## 8. Performance & Integrity

- Avoid unnecessary full-table scans—reuse existing aggregation helpers (e.g. `logic/accounting.py`, `logic/portfolio.py`).
- Consider FX preload before any cross-currency loop.
- If an optimization is speculative, defer & mark in checklist as optional with rationale.

---

## 9. Logging

- Namespaces:
  - `custom_components.pp_reader`
  - `custom_components.pp_reader.prices.*`
- Emit WARN/INFO only per established patterns (deduplicated warnings).
- Do not introduce verbose DEBUG floods without checklist justification.

---

## 10. Backup & Reliability

- Ensure any schema change remains compatible with existing backup/restore (`data/backup_db.py`).
- Do not break idempotent schema initialization (create-if-not-exists pattern remains).

---

## 11. Security & Stability Guardrails

- No execution of untrusted input.
- WebSocket handlers: validate `entry_id`.
- No exposure of raw file paths in events beyond existing design.

---

## 12. Checklist Enforcement Helper (Internal Guidance)

Before coding:
- Is there a checklist item? If no → ask user to add / confirm.
After patch:
- Did we update all impacted docs?
- Are contracts unchanged?
- Is CHANGELOG updated if user-visible?
- Are tests needed (logic / schema)? If deferred, note explicitly in section E.

---

## 13. When Unsure

Respond with:
- Clarifying assumptions
- Alternative approaches (pros/cons)
- Suggested minimal next step itemization

Never guess protobuf mappings or schema fields—ask if not already defined in existing repository context.

---

## 14. Quick Reference (Do / Don’t)

Do:
- Preserve contracts
- Implement one checklist item per turn
- Keep patches minimal & isolated
- Cross-update docs & changelog

Don’t:
- Batch unrelated changes
- Introduce silent schema elements
- Rename event types or coordinator keys
- Add rounding earlier than emission layer

---

## 15. Key Files (Reference)

- Core: `__init__.py`, `const.py`
- Data Layer: `data/{coordinator,db_schema,db_init,websocket,normalized_store,snapshot_writer}.py`
- Aggregation: `logic/*.py`
- Prices: `prices/{price_service,revaluation,provider_base,yahooquery_provider}.py`
- FX: `currencies/fx.py`
- Frontend: `www/pp_reader_dashboard/js/*`
- Docs: `ARCHITECTURE.md`, `CHANGELOG.md`, `.docs/*.md`
- Testing: `tests/`

---

## 16. Example Implementation Turn (Template)

A. Item: 3.b `websocket.py` adapt `ws_get_portfolio_data` to use live aggregation
B. Changes: call `fetch_live_portfolios`, remove legacy snapshot use, doc update
C. Code: (patch)
D. Checklist: mark 3.b done
E. Risks: performance regression (monitor), next: update related test

---

End of updated instructions.
