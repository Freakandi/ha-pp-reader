# TODO – Backdating documentation

Derived from `.docs/wealth-backdating-plan.md` and related TODOs; focus on docs only.

## Checklist
- [ ] Datamodel docs
  - [ ] Add `daily_wealth` schema (fields, types, indexes, coverage semantics).
  - [ ] Add per-scope slices schema (accounts/portfolios) with scope identifiers and metrics.
  - [ ] Describe performance-neutral movements (if used) and how transfers/FX gaps are handled.
  - [ ] Files: `datamodel/SQLite_data.md`, and a dedicated backdating section/link from `wealth-backdating-plan.md`/`concept.md`.
  - [ ] Pitfalls: align column names/types with actual schema; include examples for coverage flags and date formats.
- [ ] API docs
  - [ ] Document `pp_reader/get_daily_wealth` request/response, range handling, slices, and coverage flags.
  - [ ] Include validation rules (date formats, range limits) and example payloads.
  - [ ] Files: `datamodel/panel_connectors.md` or a new API doc section; ensure examples match backend serialization.
  - [ ] Pitfalls: note `include_slices` default, range limits, and coverage/stale semantics.
- [ ] Frontend user guide
  - [ ] Describe the new Analyse tab: date/range selector, cards, numeric overview, chart, scope filter, and coverage badges.
  - [ ] Note behaviours for missing FX/prices and stale data indicators.
  - [ ] Files: README-dev UI section or a new guide; include screenshots or descriptive states; keep German labels consistent.
- [ ] README / README-dev
  - [ ] Summarize the feature, runtime expectations (recompute on import), and how to access the tab.
  - [ ] Mention any tooling or env expectations (e.g., FX fetch requirements).
  - [ ] Pitfalls: clarify that backdating recomputes on import; list commands/services if needed for local dev (FX fetch).
- [ ] CHANGELOG (if release-bound)
  - [ ] Add entry for the new Analyse/backdating capability and API.
  - [ ] Include note on new websocket command and datamodel additions.
- [ ] Consistency passes
  - [ ] Ensure German/English copy is consistent with UI labels.
  - [ ] Cross-link relevant docs (datamodel, API, frontend) for discoverability.
  - [ ] Pitfalls: avoid duplicate/contradicting descriptions across docs; update navigation/links as needed.
