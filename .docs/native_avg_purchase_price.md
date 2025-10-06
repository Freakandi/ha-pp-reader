Concept: Native Average Purchase Price Tracking

Goal: persist and expose each portfolio position's weighted average purchase price in the security's native currency so detail views no longer infer the value from EUR totals.

---

## Current State
- `portfolio_securities` stores `current_holdings`, `purchase_value` (EUR cents), generated `avg_price` (EUR cents), and `current_value`; no native-price fields exist (`custom_components/pp_reader/data/db_schema.py`).
- Portfolio sync rebuilds `portfolio_securities` from transactions, deriving purchase value via EUR-normalised FIFO calculations (`custom_components/pp_reader/data/sync_from_pclient.py`, `_sync_portfolio_securities`).
- The FIFO helper `db_calculate_sec_purchase_value` normalises transaction amounts to EUR using exchange rates; the native currency price per share is not preserved (`custom_components/pp_reader/logic/securities.py`).
- `get_security_snapshot` divides EUR purchase totals by share counts yet returns the result as `average_purchase_price_native`, so the frontend applies FX heuristics to reconstruct native prices (`custom_components/pp_reader/data/db_access.py`).
- Websocket serialization simply forwards this misleading field and the UI re-uses it for the chart baseline (`custom_components/pp_reader/data/websocket.py`, `src/tabs/security_detail.ts`).

## Target State
- Database keeps a dedicated `avg_price_native` column per `(portfolio_uuid, security_uuid)` that persists the weighted average price per share in the security's currency.
- Sync pipeline recomputes the native average from transaction data on every refresh, leveraging native-currency transaction units and FIFO share matching.
- Backend snapshot and API responses expose both EUR (`avg_price`) and native (`avg_price_native`) purchase metrics without guesswork or FX post-processing.
- Frontend consumes the explicit native average, removing runtime conversion fallbacks while keeping EUR metrics for comparisons and deltas.
- Historical baseline in the security detail chart aligns with the native price axis in all currencies, independent of temporary FX availability.

## Proposed Data Flow / Architecture
1. Extend `portfolio_securities` schema with a nullable `avg_price_native` REAL column (per-share, native units). Existing rows default to NULL until recomputed.
2. During sync, load transactions plus `transaction_units` FX metadata to resolve native trade amounts for each purchase event.
3. For every `(portfolio_uuid, security_uuid)` pair, maintain FIFO stacks of `(shares, native_price_per_share)` tuples derived from native amounts. Weighted average = `sum(shares * native_price) / total_shares`.
4. Persist both EUR totals (`purchase_value`, `avg_price`) and the native average in a single UPSERT, ensuring updates trigger when either value changes.
5. When reading snapshots or history payloads, surface the stored `avg_price_native`; no further conversion required. Continue returning EUR aggregates for other metrics.
6. Frontend snapshot normalisation reads the new field and charts directly against native data.

## Affected Modules / Functions
| Change | File | Action |
| --- | --- | --- |
| Schema | `custom_components/pp_reader/data/db_schema.py` | Add `avg_price_native` column to `portfolio_securities`; ensure indices remain valid. |
| Runtime migration | `custom_components/pp_reader/data/db_init.py` | Introduce ALTER TABLE guard for the new column so existing installs upgrade in place. |
| Data model | `custom_components/pp_reader/data/db_access.py` | Extend `PortfolioSecurity` dataclass and snapshot queries to read the native average. |
| Sync calculations | `custom_components/pp_reader/data/sync_from_pclient.py` | Capture native per-share data during `_sync_portfolio_securities` and persist `avg_price_native`. |
| FIFO helpers | `custom_components/pp_reader/logic/securities.py` | Enhance purchase aggregation to return both EUR totals and native averages, using `transaction_units` where available. |
| API surface | `custom_components/pp_reader/data/websocket.py` | Include native average in serialized payloads and websocket responses. |
| Frontend snapshot handling | `src/tabs/security_detail.ts` | Consume the authoritative native average without fallback conversion logic. |

Supporting notes:
- Transaction FX metadata is already cached in `transaction_units` during sync; we can map security currency codes to native amounts to avoid extra RPC calls (`custom_components/pp_reader/data/sync_from_pclient.py`).
- `logic/securities.py` can expose a companion helper such as `db_calculate_native_purchase_metrics` to minimise duplicate FIFO traversal.

## Out of Scope
- Rewriting historical backfill logic or recalculating past purchase history beyond the average price per share.
- UI redesigns of the security detail tab beyond data wiring.
- Changes to reporting or export endpoints unrelated to purchase price metrics.

## Incremental Implementation
1. **Schema & Models**
   1. Update schema definition and runtime migration for `avg_price_native`.
   2. Expand dataclasses and loading helpers to include the new column with unit tests for backward compatibility.
2. **Calculation Pipeline**
   1. Extend `db_calculate_sec_purchase_value` (or a new helper) to compute EUR totals and native weighted averages simultaneously.
   2. Adjust `_sync_portfolio_securities` to persist `avg_price_native` when holdings are positive; clear it when holdings drop to zero.
3. **API Surface**
   1. Update snapshot fetch to read the native column and remove EUR-to-native derivation logic.
   2. Ensure websocket payloads and REST endpoints expose the new value and remain tolerant of NULLs.
4. **Frontend Integration**
   1. Simplify `ensureSnapshotMetrics` to trust `average_purchase_price_native` and drop FX fallback conversions.
   2. Verify chart baseline and metric tiles render correctly for EUR and non-EUR securities.
5. **Verification**
   1. Add regression tests (Python + TS) covering native average scenarios, including FX gaps.
   2. Run migration against a sample DB to confirm ALTER TABLE executes safely.

## Performance & Risks
| Risk | Description | Mitigation |
| --- | --- | --- |
| Migration overhead | ALTER TABLE on large `portfolio_securities` may lock DB briefly. | Perform change once during startup, log progress, and keep column nullable to avoid data rewrites. |
| Missing native amounts | Some transactions might lack FX metadata, leading to NULL native averages. | Fallback to EUR-derived price but flag via logs; ensure FIFO helper guards against division by zero. |
| Inconsistent holdings sync | Divergent EUR and native aggregates could surface if FIFO stacks diverge. | Unit-test FIFO calculations for mixed buy/sell flows; keep calculations within a single helper to avoid drift. |
| Frontend cache mismatch | Cached snapshots without the new field may persist across reloads. | Default undefined values to NULL and invalidate caches on schema version change if necessary. |

## Validation Criteria (Definition of Done)
- Schema migration runs without errors on existing installations and exposes `avg_price_native` in `PRAGMA table_info` output.
- Sync logs show native averages populated for non-EUR securities when transactions include FX data.
- `get_security_snapshot` returns matching native averages for positions with active holdings; EUR fallback only occurs when native data is unavailable.
- Frontend security detail chart baseline aligns with the native price axis for sample USD/CHF positions.
- Automated test suite covers FIFO averaging in both EUR and foreign-currency cases.

## Planned Minimal Patch
- **Backend**
  - Add `avg_price_native` column definition and runtime migration.
  - Modify FIFO aggregation helper to return `(purchase_value_eur, avg_price_native)` tuples.
  - Update `_sync_portfolio_securities` UPSERT to include the native average.
  - Adjust snapshot serialization to use stored native average without re-computation.
- **Frontend**
  - Remove FX tolerance conversion in `ensureSnapshotMetrics`; rely on provided native average.
  - Update metric renderers/tests to expect nullable native averages directly from the API.
- **Docs & Tests**
  - Document schema change in `ARCHITECTURE.md`/`CHANGELOG.md`.
  - Add Python tests for FIFO native averages and TypeScript tests for baseline selection.

## Additional Decisions
No additional decisions.

## Summary of Decisions
- Introduce a dedicated `avg_price_native` column in `portfolio_securities` populated via FIFO-based native currency calculations.
- Reuse existing transaction FX metadata to derive native purchase prices without runtime conversions in the frontend.
- Simplify frontend logic to consume backend-provided native averages, eliminating heuristic FX adjustments.
