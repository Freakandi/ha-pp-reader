---
description: Plan to refactor the performance calculation architecture to ensure consistency and eliminate redundant logic.
---

# Refactor Calculations: The Invariant Ledger Architecture

## 1. Architectural Review & Database Strategy

### Current vs. Target State
You currently have two divergent engines (`PerformanceEngine` in `calculator.py` and `BackdatingEngine` in `engine_pandas.py`) calculating values on the fly. The new architecture unifies these by "Enriching" the core data at ingestion time, creating a **Single Source of Truth** for value directly in the standard tables.

### Database Impact
We will modify the existing `transactions` and `transaction_units` tables to store the canonical EUR value.

**1. `transactions` (Enrichment)**
*   **Change:** Add columns `amount_eur` (REAL) and `fx_rate_used` (REAL).
*   **Population:** Calculated ONCE during the `.portfolio` file import/parsing.
*   **Constraint:** `amount_eur` is nullable for non-monetary transactions (though rare), but MUST be populated for any flow impacting wealth.

**2. `transaction_units` (Enrichment)**
*   **Change:** Add columns `amount_eur` (REAL) and `fx_rate_used` (REAL).
*   **Purpose:** Ensures Fees and Taxes attached to a transaction have their own distinct, immutable EUR value.

**3. `daily_wealth` (EXISTING TABLE)**
*   **Status:** **KEEP & EXPAND**.
*   **Current Usage:** Stores daily aggregates (`total_wealth_eur`, `invested_capital_eur`).
*   **Reform:** This table becomes the "Daily State" cache. Used for Graphing.

### Obsolete Components
*   `_augment_transfers` (calculator.py): **DELETE**. Logic moves to Ingestion.
*   `_augment_transactions` (engine_pandas.py): **DELETE**. Logic moves to Ingestion.
*   `metrics/breakdown.py`: **DELETE/REWRITE**.

## 2. Ingestion Logic & Specification

The logic for populating `amount_eur` is the cornerstone of this refactor. It must be robust and deterministic.

### A. FX Rate Selection Hierarchy
When ingesting a transaction, we determine `amount_eur` using the following hierarchy:

1.  **Implicit PP Rate (Authoritative)**:
    *   If a transaction has `currency_code != 'EUR'` AND the Portfolio Performance file provides an Exchange Rate (or explicit target value), USE IT.
    *   *Note:* PP often stores this as "Exchange Rate" field. If available, `amount_eur = amount / rate`.
2.  **Explicit Cross-Currency Pair**:
    *   If a transaction involves two accounts (e.g., Transfer) with different currencies, PP implicitly provides the rate via the pair of values (`amount_source` vs `amount_target`).
    *   See Section C below.
3.  **Market Oracle Fallback**:
    *   If, and ONLY if, no explicit rate is provided in the file (e.g. valid "Pure" FX transaction like Fee in USD on USD Account without rate), consult the `MarketOracle` (your internal DB of FX rates).
    *   `amount_eur = amount / Oracle.get_fx(currency, date)`.

### B. Valuation by Transaction Type

| Type | Valuation Logic |
| :--- | :--- |
| **Buy/Sell** | `amount_eur` derived from `amount` (Transaction Value) using Hierarchy above. |
| **Div/Interest** | `amount_eur` derived from `amount` (Payout). |
| **Fees/Taxes** | Stored in `transaction_units`. `amount_eur` calculated using the **Same Rate** as the parent transaction. |
| **Deposit/Removal** | Simple FX conversion if not EUR. |

### C. The "Transfer" Protocol (Crucial)
Transfers generate two main rows (Outbound, Inbound). To ensure `Net Flow = 0.00` globally and prevent "Invested Capital" drift due to FX noise, we apply the following rules:

1.  **Case 1: Transfer involves EUR (e.g. USD -> EUR)**
    *   One leg of the transaction has a definitive, hard EUR value (the amount credited/debited to the EUR account).
    *   **Rule:** Use this EUR amount as the canonical `amount_eur` for **BOTH** legs of the transfer.
    *   *Rationale:* This anchors the transaction to the actual EUR cash moved. Any discrepancy between the USD value and the EUR received is effectively an FX realization on the USD side, which will be correctly captured by the performance engine as FX gain/loss.

2.  **Case 2: Pure Foreign Transfer (e.g. USD -> JPY)**
    *   Neither leg has a hard EUR value.
    *   Calculate `Value_Out_EUR` = `Amount_Out / Rate_Out` (Oracle/PP).
    *   Calculate `Value_In_EUR` = `Amount_In / Rate_In` (Oracle/PP).
    *   **Rule:** Use the average $V_{center} = (Value_{Out} + Value_{In}) / 2$ as the canonical `amount_eur` for **BOTH** legs.
    *   *Rationale:* Without a EUR anchor, averaging distributes the valuation noise/spread equally between the two currencies, ensuring the global Net Flow remains exactly 0.00.

3.  **Write to DB**:
    *   update transactions set `amount_eur` = Result ... where uuid in (Outbound, Inbound).

## 3. The Refactoring Steps

### Phase 1: Database & Ingestion Update
This phase establishes the "Single Source of Truth" by persisting canonical EUR values.

**Architecture: The Role of Staging (`ingestion_*` Tables)**
We explicitly retain the redundant `ingestion_` schema to function as a **Transactional Staging Layer**.
1.  **Raw Dump:** The XML parser dumps data "as is" into Staging (fast, no complex logic).
2.  **SQL Enrichment:** We apply the "Transfer Protocol" (averaging cross-currency legs) via SQL updates on the Staging layer. This avoids complex in-memory buffers in the parser.
3.  **Atomic Promotion:** Only fully enriched/balanced data is copied to the canonical tables within a single `BEGIN...COMMIT` block, ensuring the UI never sees partial states.

1.  **Schema Update (`custom_components/pp_reader/data/db_schema.py`)**:
    *   Modify `TRANSACTION_SCHEMA`:
        *   Add `amount_eur` (INTEGER) -> Stores value in Cent.
        *   Add `fx_rate_used` (REAL) -> Stores the rate applied (Implied, Explicit, or Oracle).
    *   Modify `transaction_units` table definition in `TRANSACTION_SCHEMA`:
        *   Add `amount_eur` (INTEGER).
        *   Add `fx_rate_used` (REAL).
    *   *Note:* `ingestion_transactions` already has `amount_eur_cents`. We will promote this to `transactions`.

2.  **Enrichment Logic Implementation**:
    *   **Single Transactions (`custom_components/pp_reader/data/ingestion_writer.py`)**:
        *   Refactor `_compute_amount_eur_cents` to strictly follow the "FX Rate Selection Hierarchy".
        *   Use `_lookup_fx_rate` only as Level 3 fallback.
        *   Respect explicit rates from PP files (Level 1).
    *   **Transfer Protocol (`custom_components/pp_reader/data/canonical_sync.py`)**:
        *   Implement `_apply_transfer_protocol(conn)` function to run *before* `_sync_transactions`.
        *   **Logic:**
            1.  Select all pairs from `ingestion_transactions` where `other_uuid` is NOT NULL.
            2.  For "Mixed Currency" (EUR involved): Force `amount_eur` = EUR leg value.
            3.  For "Foreign/Foreign" (USD -> JPY): Calculate `avg_eur = (v_out + v_in) / 2` and update `amount_eur_cents` for BOTH rows in `ingestion_transactions`.
    *   **Sync Logic (`custom_components/pp_reader/data/canonical_sync.py`)**:
        *   Update `_sync_transactions` to `SELECT amount_eur_cents` from ingestion and `INSERT` into `transactions(amount_eur)`.

3.  **Verification & Tests**:
    *   **New Test File:** `tests/data/test_ingestion_enrichment.py` (Create new).
    *   **Test Cases:**
        *   `test_valuation_buy_usd_implicit_rate`: Verify `amount_eur` uses the PP implicit rate if available.
        *   `test_valuation_transfer_usd_eur`: Verify EUR leg dictates the value.
        *   `test_valuation_transfer_usd_jpy`: Verify averaging logic (Net Flow = 0).
    *   **Existing Tests:** Update `tests/test_canonical_sync.py` to assert `amount_eur` is populated.

4.  **Database Rebuild**:
    *   User deletes `S-Depot.db`.
    *   Restarting HA triggers `async_setup_entry` -> `async_ingestion_session`, repopulating the new schema.

### Phase 2: The Unified Market Resolver
This phase centralizes all "Value at Time T" logic, eliminating redundant SQL queries and inconsistent pivot-table construction.

1.  **Create `metrics/core/market_resolver.py`**:
    *   **Class:** `MarketResolver`
    *   **Responsibilities:**
        *   Load Reference Data (`historical_prices`, `securities` (latest), `fx_rates`, `exchange_rates` (live)) into memory ONCE.
        *   Provide fast O(1) or O(log N) lookups for Price and FX.
    *   **API Signature:**
        ```python
        class MarketResolver:
            def __init__(self, conn: sqlite3.Connection):
                self._prices = pd.Series() # MultiIndex (sec_uuid, date)
                self._rates = pd.Series()  # MultiIndex (currency, date)

            def load_data(self) -> None: ...
                # 1. Load historical_prices (bulk).
                # 2. Load securities(last_price) -> Append to history as "Today".
                # 3. Load fx_rates (bulk).
                # 4. Load exchange_rates(live) -> Append to rates as "Now".
                # 5. Sort indices for fast searchsorted lookups.

            def get_price(self, sec_uuid: str, date: datetime) -> float: ...
                # Logic:
                # 1. Look for price at exactly `date`.
                # 2. If missing, look for `max(t) < date` (Forward Fill).
                # 3. If no history < date, return 0.0 (Log Warning).

            def get_fx(self, currency: str, date: datetime) -> float: ...
                # Logic: Returns rate 'R' such that 1 EUR = R * CurrencyUnits.
                # (e.g. USD=1.05 means 1 EUR gets you 1.05 USD).
                # To convert to EUR: value_eur = value_native / get_fx(curr, date).
                # 1. If currency == 'EUR', return 1.0.
                # 2. Forward Fill lookup (similar to price).
        ```

2.  **Refactor `PerformanceEngine` (`calculator.py`)**:
    *   **Injection:** Modify `__init__` to accept a `MarketResolver` instance.
    *   **Deprecation:** Remove internal `self._df_prices`, `self._df_rates`, `self._df_securities` and their loading logic in `load_data`.
    *   **Replacement:**
        *   Replace `_get_price(uuid, date)` -> `self.market_resolver.get_price(uuid, date)`.
        *   Replace `_get_fx(curr, date)` -> `self.market_resolver.get_fx(curr, date)`.
        *   Delete `_prepare_market_data` (The massive pivot usage).

3.  **Integration with Existing Logic (Data Sources)**:
    *   **FX Source (`currencies/fx.py`)**:
        *   `MarketResolver` reads FROM `fx_rates` (Historical) and `exchange_rates` (Live).
        *   *No Change Needed* to fetching logic (`ensure_exchange_rates_for_dates`). The Resolver is a *Consumer*, not a *Producer*.
    *   **Price Source (`prices/price_service.py`)**:
        *   `MarketResolver` reads FROM `historical_prices` and `securities`.
        *   *No Change Needed* to the `PriceService` or `HistoryQueue`. They continue to fill the DB; the Resolver just reads the result.

4.  **Cleanup of Redundancies**:
    *   **Target for Deletion (Post-Refactor)**:
        *   `PerformanceEngine._prepare_market_data`: Redundant pivot logic.
        *   `PerformanceEngine.load_data`: Redundant DataFrame loading (delegated to Resolver).
        *   `BackdatingEngine` (`engine_pandas.py`) internal loading logic (it should eventually use Resolver too, or be replaced by `calculator.py`).
    *   **Constraint:** Do NOT delete `currencies/persistence.py` or `prices/revaluation.py` yet, as they write the data the Resolver reads.

5.  **Verification & Tests**:
    *   **New Test File:** `tests/metrics/core/test_market_resolver.py`.
    *   **Test Cases:**
        *   `test_resolver_forward_fill`: Verify T+5 uses price from T.
        *   `test_resolver_missing_history`: Verify returns 0.0 for T-Infinity.
        *   `test_resolver_live_priority`: Verify "Live" price overrides/appends to history.
    *   **Integration:** Ensure `test_performance.py` passes with the injected Resolver.

### Phase 3: The "Chain" Engine
This phase reimplements the core mathematical verification: `Start Wealth + Flows (+/- Market) = End Wealth`.

1.  **Refactor `PerformanceEngine` (`metrics/calculator.py`)**:
    *   **Goal:** Replace the complex vectorized `_calculate_fx_performance` and `_augment_transfers` methods with explicit, period-aware logic.
    *   **Input:**
        *   `transactions` (Enriched with `amount_eur` from Phase 1).
        *   `transaction_units` (Enriched with `amount_eur` from Phase 1).
        *   `MarketResolver` (for point-in-time state).
    *   **Logic (`calculate_period_performance`):**
        1.  **Snapshot T0 & T1:** Use `MarketResolver` to calculate Portfolio Value at `start_date` (EOD T-1) and `end_date` (EOD T).
        2.  **Flow Aggregation & Analysis:**
            We calculate components based on strict types. The engine MUST return a structured object supporting the following Drill-Downs:

            *   **Unrealized Gains (Market Change):**
                *   *Logic:* `Sum((End_Price - Start_Price_Reset) * Quantity)` for all held securities.
                *   *Breakdown:* By `security_uuid`.
            *   **Realized Gains (Dynamic FIFO):**
                *   *Logic:* `Sum(Tx_Proceeds_EUR - (Lot_Unit_Cost * Lot_Shares))`.
                *   *Breakdown:* By `security_uuid`.
            *   **Income (Earnings) - GROSS:**
                *   **Dividends:**
                    *   *Logic:* `Sum(t.amount_eur + u.taxes + u.fees)` for `type=DIVIDEND`. (Grossing up: Add back negative tax/fee if deducted).
                    *   *Breakdown:* By `security_uuid` (Holding).
                *   **Interest:**
                    *   *Logic:* `Sum(t.amount_eur)` for `type=INTEREST` (Credit) and `INTEREST_CHARGE` (Debit).
                    *   *Breakdown:* By `account_uuid` (Cash Account).
            *   **Costs:**
                *   **Fees:**
                    *   *Logic:* `Sum(u.amount_eur)` (type='FEE') + `Sum(t.amount_eur)` (type='FEES').
                    *   *Breakdown:* By `security_uuid` (if trade/div related) or `account_uuid`.
                *   **Taxes:**
                    *   *Logic:* `Sum(u.amount_eur)` (type='TAX') + `Sum(t.amount_eur)` (type='TAXES').
                    *   *Breakdown:* By `security_uuid` (if trade/div related) or `account_uuid`.
            *   **Cash FX-Changes:**
                *   *Goal:* Isolate the gain/loss due to currency fluctuation on cash balances.
                *   *Algorithm (Per Currency C, where C != EUR):*
                    1.  **State Valuation:**
                        *   `Start_Val = Sum(Account_Balances_Native @ Start) / FX(C, Start)`.
                        *   `End_Val = Sum(Account_Balances_Native @ End) / FX(C, End)`.
                    2.  **Flow Summation (Net_Flow_EUR):**
                        *   Sum `t.amount_eur` from `transactions` where `currency_code` = C (Includes `DEPOSIT`, `REMOVAL`, `BUY` (Neg), `SELL` (Pos)).
                        *   Sum `u.amount_eur` from `transaction_units` where `currency_code` = C (Fees/Taxes are usually negative).
                    3.  **Result:**
                        *   `FX_Gain_EUR = (End_Val - Start_Val) - Net_Flow_EUR`.
                *   *Special Case: Foreign-to-Foreign Transfers (e.g. JPY -> USD):*
                    *   Relies strictly on **Phase 1 Transfer Protocol** (Averaged `amount_eur`).
                    *   The standard algorithm `(End_Val - Start_Val) - Net_Flow_EUR` **automatically** captures any valuation spread (transfer loss) as part of the FX result for the respective currencies. No explicit "Transfer Loss" calculation is needed.
                *   *Breakdown:* By `currency` (e.g. "USD Impact", "JPY Impact"). Requires `frontend` to support this list.
            *   **External Flows (Invested Capital):**
                *   *Logic:* The Net Flow of external cash/assets.
                *   *Breakdown:*
                    *   `Einlagen / Einlieferungen` (Inbound): `Sum(DEPOSIT, DELIVERY_INBOUND)`.
                    *   `Entnahmen / Auslieferungen` (Outbound): `Sum(REMOVAL, DELIVERY_OUTBOUND)`.
            *   **Transfers (Neutral):**
                *   *Logic:* `Sum(TRANSFER_IN)` + `Sum(TRANSFER_OUT)`.
                *   *Invariant:* Global Sum must be 0.00.
                *   *Display:* Hidden from performance chart, but available for audit.

        3.  **Total Performance Delta (The Hierarchy of Truth):**
            *   **Definition:** `Delta` represents the *exact* change in wealth driven by market forces, derived strictly from the Snapshot/Flow Invariant. It serves as the authoritative "Top Level" number.
            *   **Formula:** `Delta = (Wealth_End - Wealth_Start) - Net_External_Flows`
                *   *Note:* `Net_External_Flows` = Deposits - Removals + Inbound - Outbound. (Transfers are neutral).
            *   **Implication for IRR/TWR:**
                *   **TWR / IRR** rely *solely* on `Wealth_Start`, `Wealth_End`, and the `External_Flows` (Dates & Amounts).
                *   They do **NOT** depend on the component breakdown (Realized vs Unrealized).
                *   *Critical Change:* We calculate TWR/IRR using these "Ledger" values (Top-Down), *not* by summing the components (Bottom-Up). This ensures the Return % matches the user's account balance change exactly, distinct from any potential breakdown classification errors.
                *   *Implementation:* These metrics are computed directly from the high-level aggregates in `calculate_period_performance` before looking at granular components.
            *   **Reconciliation (The "Check"):**
                *   Calculate `Sum_Components = Realized + Unrealized + FX_Cash + Divs + Int - Costs`.
                *   Compare `Delta` vs `Sum_Components`.
                *   If `abs(Delta - Sum_Components) > 0.01`:
                    *   **Logic:** Trust `Delta` for the Overview Chart.
                    *   **Warning:** Log "Performance Breakdown Leak: {Diff}".
                    *   **UI:** Display the discrepancy as "Unexplained" or "Rounding Error" in the breakdown to keep the books balanced.

2.  **Deprecations (The cleanup)**:
    *   **Logic to DELETE (Redundant due to Ingestion/Enrichment vs. On-Demand Calc):**
        *   `PerformanceEngine._prepare_market_data`: Pivot tables are no longer needed (Memory heavy).
        *   `PerformanceEngine._augment_transactions`: `amount_eur` is now pre-calculated in DB.
        *   `PerformanceEngine._augment_txs_with_market_data`: `amount_eur` is now pre-calculated in DB.
        *   `PerformanceEngine._augment_transfers`: Transfer logic (Averaging/Pairing) moves to Ingestion/Sync.
        *   `PerformanceEngine._calculate_gross_neutral_flows`: Replaced by simple `SUM(amount_eur)` where `type` in NeutralSet.
        *   `PerformanceEngine._calculate_cash_accumulators`: Replaced by simple `SUM(amount_eur)` for Divs/Int/Fees/Taxes.
    *   **Logic to REWRITE (Simplify):**
        *   `PerformanceEngine.get_daily_wealth`: Must be rewritten to aggregate the *Enriched* stream (DB columns) rather than computing flows on the fly.
        *   `PerformanceEngine._calculate_security_wealth`: Use `MarketResolver` + Enriched Flows.
        *   `PerformanceEngine._calculate_cash_wealth`: Use `MarketResolver` + Enriched Flows.
    *   **Files to DELETE:**
        *   `metrics/breakdown.py`: **OBSOLETE**. The `PerformanceEngine` now returns a structured object containing the granular breakdown (Realized/Unrealized by Security) directly. No separate pass is needed.

3.  **Verification & Tests**:
    *   **Primary Target:** `tests/metrics/test_performance_summation.py` (Expand this existing file).
    *   **New Test Cases:**
        *   `test_delta_invariant`: Verify `Delta == (End - Start) - Net_Flows`.
        *   `test_top_down_performance`: Verify `AbsPerf` matches `Delta` exactly (or strictly captures leakage).
        *   `test_transfer_neutrality`: Create a chain of transfers (EUR -> USD -> JPY -> EUR). Assert Global Net Flow = 0.00.
        *   `test_twr_irr_independence`: Verify TWR/IRR remain constant even if we artificially toggle a Gain from "Realized" to "Unrealized" (proving they depend only on Wealth/Flows, not Breakdown).
        *   `test_flow_enrichment_consistency`: Verify `sum(amount_eur)` in `transactions` equals the runtime aggregation of the old engine (minus the fixes).
    *   **Regression:** Ensure `tests/metrics/test_calculator.py` passes with the decimated engine.

### Phase 4: UI Data Cleanup & Consistency
This phase ensures the Frontend receives data solely from the *invariant* backend machinery, guaranteeing that "What you see in the Graph" matches "What you see in the Breakdown".

1.  **Overview Tab (Dashboard)**
    *   **Goal:** Preserve the *exact* current display (Lifetime Performance, Day Change) but ensure the numbers match the `PerformanceEngine`'s "History".
    *   **Constraint:** The JSON structure (`SnapshotBundle`) and the aggregation logic (Sum of Securities) MUST remain unchanged.
    *   **Refactor `metrics/securities.py`:**
        *   Currently, it uses ad-hoc `normalize_price_to_eur_sync` and direct SQL queries.
        *   **Change:** Inject/Use the `MarketResolver` (Phase 2) inside `_compute_security_metrics_sync`.
        *   **Action:** Replace `fetch_previous_close` and `normalize_price_to_eur_sync` with `MarketResolver.get_price(...)` and `MarketResolver.get_fx(...)`.
    *   **Result:** The "Live" view uses the exact same Price/FX data as the "History" view, eliminating "Why is the chart different from the number?" bugs, without altering the UI code.

2.  **Time Series Tab (History)**
    *   **Goal:** Graph "Historical Wealth" (Value over Time) using a persisted `daily_wealth` table.
    *   **Constraint:** The graph displays **Wealth Only** (not Performance, not Flows).
    *   **Schema Creation (`daily_wealth`):**
        *   *Status:* **NEW TABLE** (Simplified).
        *   *Columns:* `date` (PK), `scope_uuid` (PK), `scope_type` (PK: 'portfolio'/'account'/'global'), `total_wealth_eur` (State @ EOD).
        *   *Rationale:* Stores the static "Snapshot Value" for every day. Lowest common denominator for graphing.
    *   **New Module `metrics/history.py`:**
        *   **Function:** `rebuild_daily_wealth(start_date: date, scopes: list[str])`
        *   **Logic:**
            1.  Iterate `d` from `start_date` to `Today`.
            2.  **State:** Call `engine.get_portfolio_state_at(d)`. (Wealth @ EOD).
            3.  **Persist:** Insert into `daily_wealth`.
    *   **Usage (Graph Generation):**
        *   **Simple Aggregation:** To graph Wealth for a set of accounts:
            1.  Query `daily_wealth` for the selected `scope_uuids`.
            2.  Sum `total_wealth_eur` by `date`.
            3.  **Render.**
    *   **Future-Proofing:** Enables sub-setting the graph (e.g. "Show only Retirement Portfolio") instantly.
    *   **Deprecation:**
        *   `backdating/engine_pandas.py`: **DELETE**.
        *   `PerformanceEngine.get_daily_wealth`: **DELETE**. (The engine no longer loops; the *history module* loops and calls the engine for points).

3.  **Trades Tab (Realized Performance)**
    *   **Goal:** Restore the "Trades" tab functionality to show closed/partially closed positions with their realized performance (Gains/Losses).
    *   **Context:** This was previously working but lost during the migration to `PerformanceEngine`. It relies on calculating the difference between Sell Value and Buy Value (FIFO) for closed lots.
    *   **Backend Support (`custom_components/pp_reader/data/websocket.py`):**
        *   **Current state:** `ws_get_trades` returns a dummy "Total Realized Gains".
        *   **Requirement:** It must return a list of *closed security positions* with:
            *   `security_uuid`, `name`, `currency_code`
            *   `realized_gain_abs` (Total Profit/Loss in EUR)
            *   `realized_gain_pct` (Internal Rate of Return or simple ROI for the trade)
            *   `exit_date` (Last sell date)
    *   **Refactor `metrics/calculator.py`:**
        *   Ensure `_calculate_capital_gains` (or a similar method) exposes the *detailed* list of realized gain events per security, not just the sum.
        *   The `PerformanceEngine` must return identifying info (Lot ID or Security ID) alongside the calculated Gain amount.
    *   **UI Impact:** The Frontend receives a JSON list of trades. No changes needed if the JSON structure matches the previous contract (Security Name, P/L, Date).

4.  **Integration Tests**
    *   **New Test:** `tests/metrics/test_history_consistency.py`.
        *   `test_history_vs_engine`: Pick a random past date. Assert `daily_wealth[date] == PerformanceEngine.calculate(date)`.
    *   **New Test:** `tests/data/test_websocket_enrichment.py`.
        *   `test_transaction_extra_fields`: Verify websocket payload contains `amount_eur`.

## 3. Risks & Considerations

1.  **"Today's" Data:** The `ledger` is a database table. What about a trade I just entered 1 second ago?
    *   *Solution:* The Ingestion Pipeline (when you save a trade) must immediately trigger `ledger.insert()`.
    *   *Fallback:* `PerformanceEngine` can have an "In-Memory Overlay" for dirty/uncommitted transactions, running the `normalize_transaction` logic on the fly for them.

2.  **Reviewing History:**
    *   If you change an FX rate for 2023, you must trigger a `rebuild_ledger_values(2023-01-01 -> Now)` job. This might take 5-10 seconds. The UI needs to handle this "Revalidating..." state.

3.  **Zero-Sum Transfers:**
    *   The Ledger must enforce that a Transfer (Out + In) sums to exactly 0.00 EUR (or the difference is explicitly booked as a Fee).
    *   Current Logic: "Average the two EUR values".
    *   New Logic: Calculate `Val = Average`. Write `Out = -Val`, `In = +Val` to Ledger.

## 4. Next Actions
1.  Approve this architectural shift.
2.  Execute `tasks/init_ledger_schema.py`.
3.  Write the `normalize_transaction` logic (The hardest part, effectively porting `_augment_transfers` to a standalone function).
