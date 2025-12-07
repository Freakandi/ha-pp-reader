# TODO – Backdating documentation

Derived from `.docs/wealth-backdating-plan.md` and related TODOs; focus on docs only.

## Checklist
- [ ] Datamodel docs
  - [ ] Add `daily_wealth` schema (fields, types, indexes, coverage semantics).
  - [ ] Add per-scope slices schema (accounts/portfolios) with scope identifiers and metrics.
  - [ ] Describe performance-neutral movements (if used) and how transfers/FX gaps are handled.
- [ ] API docs
  - [ ] Document `pp_reader/get_daily_wealth` request/response, range handling, slices, and coverage flags.
  - [ ] Include validation rules (date formats, range limits) and example payloads.
- [ ] Frontend user guide
  - [ ] Describe the new Analyse tab: date/range selector, cards, numeric overview, chart, scope filter, and coverage badges.
  - [ ] Note behaviours for missing FX/prices and stale data indicators.
- [ ] README / README-dev
  - [ ] Summarize the feature, runtime expectations (recompute on import), and how to access the tab.
  - [ ] Mention any tooling or env expectations (e.g., FX fetch requirements).
- [ ] CHANGELOG (if release-bound)
  - [ ] Add entry for the new Analyse/backdating capability and API.
- [ ] Consistency passes
  - [ ] Ensure German/English copy is consistent with UI labels.
  - [ ] Cross-link relevant docs (datamodel, API, frontend) for discoverability.
