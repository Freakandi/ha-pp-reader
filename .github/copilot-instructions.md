## AI Coding Agent Instructions (ha-pp-reader)
Goal: Enable immediate productive edits to the Home Assistant integration `pp_reader` (Portfolio Performance Reader) while preserving sensor/frontend contracts.

Architecture (server → client):
1. Config entry (`config_flow.py`) provides `file_path`, `db_path`.
2. `async_setup_entry` (`__init__.py`): ensure schema (`data/db_init.py` using `ALL_SCHEMAS` in `data/db_schema.py`), create `PPReaderCoordinator` (1‑min interval), forward sensors, register panel + websocket + event push.
3. Change detection: `PPReaderCoordinator` compares minute‑truncated mtime vs stored `last_file_update`; if changed → parse (`data/reader.py`) → sync (`data/sync_from_pclient.py`) diff (upsert + hard delete) → compute metrics (`logic/*.py`) → populate `coordinator.data` → `_push_update` emits `EVENT_PANELS_UPDATED` per data type.
4. Frontend: custom panel (`www/pp_reader_dashboard/panel.js`) mounts `<pp-reader-panel>` → Shadow DOM → `<pp-reader-dashboard>` which subscribes to `EVENT_PANELS_UPDATED` and incrementally patches DOM via handlers in `js/data/updateConfigsWS.js`.

Coordinator data contract (DO NOT mutate existing shapes):
{
  accounts: { uuid: { name, balance (EUR float), is_retired } },
  portfolios: { uuid: { name, value (EUR float), count, purchase_sum } },
  transactions: [...],
  last_update: ISO8601 minute string
}
Add new top-level keys only; sensors & panel rely on current ones.

Units & FX:
- Raw protobuf shares/prices scaled 1e‑8; internal DB often integer cents; convert & round (2 decimals) only at sensor/event boundary.
- Always preload FX (`currencies/fx.py`) before cross‑currency metrics; balances for non‑EUR accounts keep `orig_balance` + converted EUR.

Frontend DOM patterns (overview tab):
- Portfolio table: `<table class="expandable-portfolio-table">` rows: `.portfolio-row[data-portfolio=UUID]` + adjacent `.portfolio-details` (positions container). Update handlers patch cells (no full re-render). Positions lazy/pushed into `.positions-container`.
- Event payload types: `accounts`, `last_file_update`, `portfolio_values`, `portfolio_positions` (positions may arrive before details row → pending cache logic in `handlePortfolioPositionsUpdate`).
- Sticky header: `.header-card` toggled with `IntersectionObserver` anchored by injected `#anchor` element.
- Navigation & swipe: `dashboard.js` manages `currentPage` (array `tabs`). Add new tabs by pushing `{title, render}`.

Sensor pattern (`sensors/*.py`): subclass `CoordinatorEntity, SensorEntity`; `_attr_should_poll = False` unless dependent (e.g. gain sensors). Unique ID: slug of underlying UUID + semantic suffix. Keep 2‑decimal rounding & error logging style.

Schema & Sync rules:
- Add table/column → extend creation SQL + include in `ALL_SCHEMAS` else never created.
- Diff: `sync_from_pclient` hard deletes missing entities (`delete_missing_entries`). Changing to soft delete requires updating diff + consumer logic.

Websocket/Event integration:
- Register commands in `__init__.py`; push incremental updates via `_push_update(hass, entry_id, data_type, data)` emitting HA event `EVENT_PANELS_UPDATED`. Frontend filters by `entry_id` (see `getEntryId` in `js/data/api.js`).

Dev workflow:
./scripts/setup_container → source .venv/bin/activate → ./scripts/codex_develop (or ./scripts/develop) → ./scripts/lint (Ruff). Panel assets cache-busted via version query param in `panel.js` import.

Release: Work on `dev`; merge to `main` keeping file history; bump version in `manifest.json` when behavior changes.

Common pitfalls:
- Forgetting FX preload → incorrect EUR metrics.
- Mutating existing coordinator key shapes → sensor/panel breakage.
- Adding schema w/o updating `ALL_SCHEMAS` → silent absence.
- Replacing full table render instead of patching → flicker + lost scroll/state.

Extend safely checklist:
1 Schema update (+ALL_SCHEMAS) 2 Sync population 3 Add coordinator key / event type 4 Sensor(s) or frontend handler 5 FX handling if multi-currency 6 Preserve existing DOM classes & data attributes.

Key files: `__init__.py`, `const.py`, `data/{coordinator,reader,sync_from_pclient,db_schema,db_init,websocket}.py`, `logic/*.py`, `sensors/*.py`, `currencies/fx.py`, `www/pp_reader_dashboard/js/*.js`.

Feedback: Request more detail if you need protobuf field mapping, FX rate source strategy, or adding a new websocket command pattern.
