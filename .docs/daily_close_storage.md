# Concept: Persist daily close prices for active securities

Goal: Provide a storage concept that captures daily Close values for every active security parsed from the Portfolio Performance export so the integration can later power price movement visualisations in Home Assistant dashboards.

---

## 1. Current State
- The SQLite schema already defines a `historical_prices` table keyed by `(security_uuid, date)` with columns for Close, High, Low, and Volume, but no dedicated indexes or helpers exist beyond the primary key.【F:custom_components/pp_reader/data/db_schema.py†L37-L66】
- During file imports the synchronisation routine iterates over `security.prices` entries and performs `INSERT OR REPLACE` into `historical_prices`, yet the data is not filtered to active securities, nor is there any verification that sparse datasets (e.g., missing dates) are backfilled.【F:custom_components/pp_reader/data/sync_from_pclient.py†L520-L594】
- Only the latest price for each security is subsequently written into `securities.last_price` and associated metadata; downstream services such as the price cycle operate exclusively on these last-price fields and do not surface historical series to consumers.【F:custom_components/pp_reader/prices/price_service.py†L40-L176】
- No query helpers, WebSocket endpoints, or coordinators currently expose the `historical_prices` content, leaving dashboard features without structured access to time-series data.【F:custom_components/pp_reader/data/db_access.py†L1-L120】
- Assumption: The Portfolio Performance export continues to deliver daily Close data under `security.prices`. No additional constraints were supplied with the request.

---

## 2. Target State
- Every portfolio import populates `historical_prices` with at least the Close value for all non-retired securities present in the dataset, guaranteeing one row per day in the source file for the security’s active period.【F:custom_components/pp_reader/data/db_schema.py†L37-L66】
- Duplicate or stale rows are prevented via deterministic upserts and pruning logic so the table reflects the most recent Close for each `(security_uuid, date)` pair without gaps introduced by re-imports.【F:custom_components/pp_reader/data/sync_from_pclient.py†L520-L594】
- Retrieval helpers can stream Close values ordered by date, allowing future UX (graphs, statistics) to request a bounded time window with predictable latency.【F:custom_components/pp_reader/data/db_access.py†L1-L120】
- UX invariants: storing Close data must not slow down current dashboard renders, and the schema remains compatible with existing Home Assistant entities (no breaking sensor payload changes yet).
- Active/retired semantics: only securities with `retired = 0` are considered for new inserts; historical rows of retired securities remain for archival queries but are not expanded post-retirement unless reactivated.

---

## 3. Proposed Data Flow / Architecture
1. `sync_from_pclient` parses the Portfolio Performance protobuf and extracts all `security.prices` entries per security.
2. Before persistence, determine whether the security is active (retired flag false). Skip insertion for retired securities unless rows already exist (historical retention step).
3. Normalise each Close value (int scaled by 1e8) and convert the protobuf day counter to an epoch-day integer.
4. Batch insert via `executemany` into `historical_prices` using `INSERT OR REPLACE`, but only after pruning dates that fall outside a retention policy or are duplicates of higher-resolution data.
5. Commit in the same transaction as existing security updates to keep schema-consistent state.
6. Expose a read helper `iter_security_close_prices(security_uuid, start_date, end_date)` inside `db_access` that streams rows ordered by date.
7. Prepare a future-facing WebSocket contract stub (e.g., `pp_reader/get_security_history`) that can call the helper but remain behind a feature flag until dashboard consumption is implemented.

---

## 4. Affected Modules / Functions

| Change | File | Action |
| --- | --- | --- |
| Add retention/index definitions for `historical_prices` | custom_components/pp_reader/data/db_schema.py | Introduce optional index on `(security_uuid, date)` and document retention strategy |
| Tighten Close persistence logic | custom_components/pp_reader/data/sync_from_pclient.py | Filter to active securities, deduplicate per day, batch insert, and prune stale rows |
| Provide query helper(s) | custom_components/pp_reader/data/db_access.py | Implement generators for ordered Close data with optional bounds |
| (Future-ready) expose history endpoint | custom_components/pp_reader/data/websocket.py | Stub handler returning Close sequences when requested |

- Existing helpers for symbol discovery and price updates (`prices/price_service.py`) already determine active securities and can be leveraged for consistency checks when comparing live last-price updates to stored Close values.【F:custom_components/pp_reader/prices/price_service.py†L95-L151】
- Exchange-rate utilities and portfolio valuation helpers (`logic/securities.py`, `logic/portfolio.py`) remain unchanged but will benefit from reliable historical data if expanded later.

---

## 5. Out of Scope
- Rendering dashboard graphs or modifying frontend assets; only storage and backend access patterns are covered.
- Extending the price fetcher to request historical data from external APIs (Yahoo, etc.); the concept relies solely on imported file contents.
- Introducing retention pruning beyond simple duplicate removal—advanced archival strategies (e.g., monthly aggregates) are deferred.
- Sensor/state updates that consume the new historical data.

---

## 6. Incremental Implementation

1. **Schema & Retention Foundations**
   1. Add SQL migration ensuring an index on `historical_prices(security_uuid, date)` exists (no-op if already covered by PK).
   2. Document retention assumptions in `db_schema.py` comments.

2. **Importer Enhancements**
   1. Extend `sync_from_pclient` to identify active securities before writing Close rows.
   2. Replace per-row inserts with batched operations and ensure duplicates per day are collapsed.
   3. Implement optional cleanup for rows whose date exceeds the provided data (e.g., remove future-dated entries).

3. **Data Access Layer**
   1. Add `iter_security_close_prices` (generator) and `get_security_close_prices` (materialised list) helpers to `db_access` with parameter validation.
   2. Unit tests covering empty ranges, bounded ranges, and ordering.

4. **API Surface Preparation**
   1. Introduce an internal WebSocket handler returning Close sequences (behind `feature_flags.get("pp_reader_history")`).
   2. Provide docs snippet describing how to enable the feature for early adopters.

---

## 7. Performance & Risks

| Risk | Description | Mitigation |
| --- | --- | --- |
| Import latency increase | Writing many historical rows could slow down sync for large portfolios. | Use batched executemany, reuse existing transactions, and defer heavy clean-up to background tasks if needed. |
| Database bloat | Storing every Close without pruning may grow the SQLite file quickly. | Monitor table size, add optional retention window (e.g., N years) configurable later. |
| Data gaps in source file | Missing days would break continuous graphs. | Log warnings for detected gaps and consider backfilling via interpolation in future work; store data as-is but flag via stats counters. |
| Retired security handling | Removing active filter might delete needed history. | Keep existing historical rows, only skip new inserts once retired and clearly document behaviour. |

---

## 8. Validation Criteria (Definition of Done)
- Importing a portfolio with historical Close data produces rows in `historical_prices` for every active security across all dates present in the file.
- Re-importing the same file does not create duplicate rows and does not regress import performance noticeably (≤5% additional time on test dataset).
- Query helper returns correctly ordered Close values and respects `start_date`/`end_date` boundaries in unit tests.
- Feature flag can guard the new WebSocket handler; disabled state preserves existing behaviour.
- Database schema migrations run idempotently on existing installations.

---

## 9. Planned Minimal Patch
- **Backend**
  - `sync_from_pclient` (pseudocode):
    ```python
    if not security.retired:
        rows = [(security.uuid, price.date, price.close, high, low, volume) for price in dedupe(prices)]
        self.cursor.executemany(INSERT_OR_REPLACE_HISTORICAL, rows)
    ```
  - `db_access`: add
    ```python
    def iter_security_close_prices(db_path, security_uuid, start=None, end=None):
        sql = "SELECT date, close FROM historical_prices WHERE security_uuid = ?"
        # append range filters, ORDER BY date ASC
        yield from conn.execute(sql, params)
    ```
  - `websocket`: stub handler
    ```python
    if feature_flags.history_enabled(hass):
        prices = list(iter_security_close_prices(...))
        connection.send_result(msg["id"], {"security_uuid": uuid, "closes": prices})
    else:
        connection.send_error(...)
    ```
- **Frontend**: No changes (future graphs out of scope).
- **Docs**: Update `ARCHITECTURE.md` with short paragraph on daily Close persistence once implemented.

---

## 10. Additional Decisions
No additional decisions.

---

## 11. Summary of Decisions
- Reinforce `historical_prices` persistence for active securities via enhanced importer logic and batching.
- Provide read helpers and a guarded API endpoint to unlock future dashboard use of Close series.
- Maintain compatibility with existing sensors and defer frontend visualisation to subsequent work.
