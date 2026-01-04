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
*   **Change:** Add columns `amount_eur_cents` (INTEGER) and `fx_rate_used` (REAL).
*   **Population:** Calculated ONCE during the `.portfolio` file import/parsing.
*   **Constraint:** `amount_eur_cents` is nullable for non-monetary transactions (though rare), but MUST be populated for any flow impacting wealth.

**2. `transaction_units` (Enrichment)**
*   **Change:** Add columns `amount_eur_cents` (INTEGER) and `fx_rate_used` (REAL).
*   **Purpose:** Ensures Fees and Taxes attached to a transaction have their own distinct, immutable EUR value.

**3. `daily_wealth` (NEW TABLE)**
*   **Status:** **CREATE NEW**.
*   **Purpose:** Stores daily aggregated state (`total_wealth_eur`, `invested_capital_eur`) for fast graphing.
*   **Reform:** Replaces on-the-fly calculation. Includes `scope_type` to allow filtering by Account/Portfolio/Global.

### Obsolete Components
*   `_augment_transfers` (calculator.py): **DELETE**. Logic moves to Ingestion.
*   `_augment_transactions` (engine_pandas.py): **DELETE**. Logic moves to Ingestion.
*   `metrics/breakdown.py`: **DELETE/REWRITE**.

## 2. Ingestion Logic & Specification

The logic for populating `amount_eur` is the cornerstone of this refactor. It must be robust and deterministic.

### A. FX Rate Selection Hierarchy
When ingesting a transaction, we determine `amount_eur_cents` using the following hierarchy:

1.  **Implicit PP Rate (Authoritative)**:
    *   If a transaction has `currency_code != 'EUR'` AND the Portfolio Performance file provides an Exchange Rate (or explicit target value), USE IT.
    *   *Note:* PP often stores this as "Exchange Rate" field. If available, `amount_eur_cents = (amount / rate) * 100` (Use `eur_to_cent` helper).
2.  **Explicit Cross-Currency Pair**:
    *   If a transaction involves two accounts (e.g., Transfer) with different currencies, PP implicitly provides the rate via the pair of values (`amount_source` vs `amount_target`).
    *   See Section C below.
3.  **Market Resolver Fallback**:
    *   If, and ONLY if, no explicit rate is provided in the file (e.g. valid "Pure" FX transaction like Fee in USD on USD Account without rate), consult the `MarketResolver` (your internal DB of FX rates).
    *   `amount_eur_cents = (amount / Resolver.get_fx(currency, date)) * 100`.

### B. Valuation by Transaction Type

| Type | Valuation Logic |
| :--- | :--- |
| **Buy/Sell** | `amount_eur_cents` derived from `amount` (Transaction Value) using Hierarchy above. |
| **Div/Interest** | `amount_eur_cents` derived from `amount` (Payout). |
| **Fees/Taxes** | Stored in `transaction_units`. `amount_eur_cents` calculated using the **Same Rate** as the parent transaction. |
| **Deposit/Removal** | Simple FX conversion if not EUR. |

### C. The "Transfer" Protocol (Crucial)
Transfers generate two main rows (Outbound, Inbound). To ensure `Net Flow = 0.00` globally and prevent "Invested Capital" drift due to FX noise, we apply the following rules:

1.  **Case 1: Transfer involves EUR (e.g. USD -> EUR)**
    *   One leg of the transaction has a definitive, hard EUR value (the amount credited/debited to the EUR account).
    *   **Rule:** Use this EUR amount (converted to cents) as the canonical `amount_eur_cents` for **BOTH** legs of the transfer.
    *   *Rationale:* This anchors the transaction to the actual EUR cash moved. Any discrepancy between the USD value and the EUR received is effectively an FX realization on the USD side, which will be correctly captured by the performance engine as FX gain/loss.

2.  **Case 2: Pure Foreign Transfer (e.g. USD -> JPY)**
    *   Neither leg has a hard EUR value.
    *   Calculate `Value_Out_EUR` = `Amount_Out / Rate_Out` (Resolver/PP). Note: `Value_Out` is likely negative.
    *   Calculate `Value_In_EUR` = `Amount_In / Rate_In` (Resolver/PP). Note: `Value_In` is positive.
    *   **Rule:** Calculate the average *magnitude*: $V_{abs} = (|Value_{Out}| + |Value_{In}|) / 2$.
    *   Apply to legs:
        *   **Outbound:** `amount_eur_cents` = `-1 * round(V_{abs} * 100)`
        *   **Inbound:** `amount_eur_cents` = `+1 * round(V_{abs} * 100)`
    *   *Rationale:* This distributes the valuation noise equally while preserving the strict sign requirement for the global Net Flow to remain exactly 0.00.

3.  **Write to DB**:
    *   update transactions set `amount_eur_cents` = Result ... where uuid in (Outbound, Inbound).

## 3. The Refactoring Steps

### Phase 0: Data Access Extraction (Pre-Requisite)
**Goal:** Isolate the "FX Rate Lookup" core logic into a stateless utility module. This resolves the circular dependency where Ingestion needs "Smart Logic" before the `MarketResolver` object is built.

1.  **Create `metrics/core/fx_access.py`**:
    *   **Function:** `get_best_available_fx_rate(conn, currency, date) -> float | None`
    *   **Implementation:** Move the code from `custom_components/pp_reader/data/canonical_sync.py:_lookup_fx_rate`.
    *   **Enhancement:** Ensure it strictly follows the "Latest Rate <= Date" logic (Backfill) and supports "First Rate > Date" warning fallback if needed (though Ingestion handles the "New Currency" case via feed-forward).
    *   **Deprecation:** Remove `_lookup_fx_rate` from `custom_components/pp_reader/data/canonical_sync.py` and replace its usage there with the new import (or leave it as a wrapper calling the new lib during refactor).

2.  **Refactor `metrics/core/__init__.py`**:
    *   Ensure the package is valid.

### Phase 1: Database & Ingestion Update
This phase establishes the "Single Source of Truth" by persisting canonical EUR values.

**Architecture: The Role of Staging (`ingestion_*` Tables)**
*   We explicitly retain the redundant `ingestion_` schema to function as a **Transactional Staging Layer**.
1.  **Raw Dump:** The XML parser dumps data "as is" into Staging (fast, no complex logic).
2.  **Enrichment Pre-Sort:** We MUST sort `ingestion_transactions` by `date ASC` before processing enrichment to ensure the "Feed-Forward" context (latest_rates) works correctly for new currencies.
3.  **SQL Enrichment:** We apply the "Transfer Protocol" (averaging cross-currency legs) via SQL updates on the Staging layer.
4.  **Atomic Promotion:** Only fully enriched/balanced data is copied to the canonical tables.

1.  **Schema Update (`custom_components/pp_reader/data/db_schema.py`)**:
    *   Modify `TRANSACTION_SCHEMA`:
        *   Add `amount_eur_cents` (INTEGER) -> Stores value in Cent.
        *   Add `fx_rate_used` (REAL) -> Stores the rate applied (Implied, Explicit, or Resolver).
    *   Modify `transaction_units` table definition in `TRANSACTION_SCHEMA`:
        *   Add `amount_eur_cents` (INTEGER).
        *   Add `fx_rate_used` (REAL).
    *   *Note:* `ingestion_transactions` already has `amount_eur_cents`. We will promote this to `transactions`.

2.  **Enrichment Logic Implementation**:
    *   **Single Transactions (`custom_components/pp_reader/data/ingestion_writer.py`)**:
        *   **Context Mechanism (The "Feed-Forward" Fix):**
            *   Maintain a local `latest_rates: Dict[str, float]` within the ingestion loop.
            *   **Update:** Whenever a transaction provides an **Explicit Rate** (Level 1), update `latest_rates[currency] = rate`.
            *   **Fallback:** If Level 3 (Resolver) fails (returns None/0.0), check `latest_rates[currency]`.
            *   *Rationale:* This ensures that for a "New Currency" (Fresh DB), the very first transaction (which User guarantees has a rate) provides the bootstrapping rate for itself and subsequent ops, without waiting for a DB commit.
        *   Refactor `_compute_amount_eur_cents` to strictly follow the "FX Rate Selection Hierarchy".
        *   Refactor `_compute_amount_eur_cents` to strictly follow the "FX Rate Selection Hierarchy".
        *   **Level 3 (Database):** call `metrics.core.fx_access.get_best_available_fx_rate`.
        *   **Important:** This call serves as the "System of Record" check. If it returns `None`, proceed to the "Feed-Forward" fallback (checking `latest_rates`).
        *   Respect explicit rates from PP files (Level 1).
        *   **Units (Fees/Taxes):**
            *   Iterate `transaction_units` for the transaction.
            *   If `unit.currency_code == transaction.currency_code`: Use `transaction.fx_rate_used`.
            *   Else: Recalculate using Standard Hierarchy (Level 1-3) for the unit.
            *   Persist `amount_eur_cents` and `fx_rate_used` to `transaction_units` table.
    *   **Transfer Protocol (`custom_components/pp_reader/data/canonical_sync.py`)**:
        *   Implement `_apply_transfer_protocol(conn)` function. Call it inside the `async_ingest` transaction block, strictly *before* `_sync_transactions`.
        *   **Logic:**
            1.  Select all pairs from `ingestion_transactions` where `other_uuid` is NOT NULL.
            2.  For "Mixed Currency" (EUR involved): Force `amount_eur_cents` = EUR leg value.
            3.  **Orphan Check:** If a transaction is supposed to be a transfer (has `other_uuid`) but the partner row is missing/deleted, DO NOT attempt averaging. Fallback to Standard Logic (Level 2).
            4.  For "Foreign/Foreign" (USD -> JPY): Calculate `avg_eur = (v_out + v_in) / 2` and update `amount_eur_cents` for BOTH rows in `ingestion_transactions`.
    *   **Sync Logic (`custom_components/pp_reader/data/canonical_sync.py`)**:
        *   Update `_sync_transactions` to `SELECT amount_eur_cents` from ingestion and `INSERT` into `transactions(amount_eur_cents)`.

3.  **Verification & Tests**:
    *   **New Test File:** `tests/data/test_ingestion_enrichment.py` (Create new).
    *   **Test Cases:**
        *   `test_valuation_buy_usd_implicit_rate`: Verify `amount_eur_cents` uses the PP implicit rate if available.
        *   `test_valuation_transfer_usd_eur`: Verify EUR leg dictates the value.
        *   `test_valuation_transfer_usd_jpy`: Verify averaging logic (Net Flow = 0).
    *   **Existing Tests:** Update `tests/test_canonical_sync.py` to assert `amount_eur_cents` is populated.

4.  **Database Rebuild**:
    *   User deletes `S-Depot.db`.
    *   Restarting HA triggers `async_setup_entry` -> `async_ingestion_session`, repopulating the new schema.

### Phase 2: The Unified Market Resolver
This phase centralizes all "Value at Time T" logic, eliminating redundant SQL queries and inconsistent pivot-table construction.

1.  **Create `metrics/core/market_resolver.py`**:
    *   **Class:** `MarketResolver`
    *   **Responsibilities:**
        *   Load Reference Data (`historical_prices`, `securities` (latest)) into memory ONCE.
        *   Provide fast O(1) or O(log N) lookups for Price and FX.
    *   **API Signature:**
        ```python
        class MarketResolver:
            def __init__(self, conn: sqlite3.Connection):
                self._prices = pd.Series() # MultiIndex (sec_uuid, date)

            def load_data(self) -> None: ...
                # 1. Load historical_prices (bulk).
                # 2. Load securities(last_price) -> Append to history as "Today".
                # 3. Sort indices for fast searchsorted lookups.

            def get_price(self, sec_uuid: str, date: datetime) -> float: ...
                # Logic:
                # 1. Look for price at exactly `date`.
                # 2. If missing, look for `max(t) < date` (Forward Fill).
                # 3. If no history < date, return 0.0 (Log Warning).

            def get_fx(self, currency: str, date: datetime) -> float | None: ...
                # Logic: Delegate to `metrics.core.fx_access.get_best_available_fx_rate(self.conn, currency, date)`.
                # Rationale: Ensures identical "Latest <= Date" logic is used for both Ingestion (Phase 1) and Valuation (Phase 2),
                # preventing logic drift between the two engines.

            def get_price_series(self, sec_uuid: str, start_date: datetime, end_date: datetime) -> pd.Series: ...
                # Logic: Returns a daily series of prices for the interval [start_date, end_date].
                # Usage: Efficiently powers the "History Chart" (Section 4.1).
                # Implementation: Vectorized slice of `self._prices` with reindexing/ffill as needed.
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
        *   `MarketResolver` delegates to `metrics.core.fx_access` which reads from `fx_rates`.
        *   *No Change Needed* to fetching logic. The Resolver is a *Consumer*, not a *Producer*.
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
        *   `transactions` (Enriched with `amount_eur_cents` from Phase 1).
        *   `transaction_units` (Enriched with `amount_eur_cents` from Phase 1).
        *   `MarketResolver` (for point-in-time state).
    *   **Logic (`calculate_period_performance`):**
        1.  **Snapshot T0 & T1:**
            *   **Inventory (Q):** Calculate strict `Shares_Held` and `Cash_Balance` at `start_date` and `end_date` by summing all rows in the `transactions` table (Event Log) up to that point.
            *   **Valuation (V):** Apply `MarketResolver` prices/FX to this inventory to determine Total Wealth.
            *   **Invested Capital:** Calculate `total_invested_cents` by summing all External Flows (Deposit/Removal/Delivery) where `date <= T`.
        2.  **Flow Aggregation & Analysis (Period Attribution):**
            We calculate components specifically to explain the `Delta` over this period. This is strictly **Period-Based (Mark-to-Market)** logic, NOT Lifetime FIFO.

            *   **Normalization Step (Invariant Constraint):**
                *   All `amount_eur_cents` values must be converted to **Float (EUR)** at the start of aggregation.
                *   Use `custom_components.pp_reader.util.currency.cent_to_eur` (reuses existing logic).
                *   *Reasoning:* Prices and FX rates are Floats. Mixing Integer Cents with Float Prices leads to scale errors.
                *   `flow_eur = cent_to_eur(row.amount_eur_cents)`

            *   **Security Valuation Changes (Unrealized & Period-Realized):**
                *   *Goal:* Capture the total market movement of securities during this period.
                *   *Definition:* `Start_Price_Reset` is defined as:
                    *   `Price(T-1 @ 23:59:59)` if held at Start(T-1).
                    *   `Buy_Price` (Implied from `amount_eur_cents` / `shares`) if bought inside period.
                *   *Logic:*
                    *   Held (Start -> End): `Qty * (Price(T) - Price(T-1))`
                    *   Buy (Buy -> End): `Qty * (Price(T) - Buy_Price)`
                    *   Sell (Start -> Sell): `Qty * (Sell_Price - Price(T-1))`
                    *   Day Trade (Buy -> Sell): `Qty * (Sell_Price - Buy_Price)`
                *   *Aggregated:* `Sum(Valuation_Change_EUR)` by `security_uuid`.

            *   **Income (Earnings) - GROSS:**
                *   **Dividends:**
                    *   *Logic:* `Sum(cent_to_eur(t.amount_eur_cents) + cent_to_eur(u.taxes) + cent_to_eur(u.fees))` for `type=DIVIDEND`. (Grossing up: Add back negative tax/fee if deducted).
                    *   *Breakdown:* By `security_uuid` (Holding).
                *   **Interest:**
                    *   *Logic:* `Sum(cent_to_eur(t.amount_eur_cents))` for `type=INTEREST / INTEREST_CHARGE`.
                    *   *Breakdown:* By `account_uuid`.

            *   **Costs:**
                *   **Fees:**
                    *   *Logic:* `Sum(cent_to_eur(u.amount_eur_cents))` (where `u.type='FEE'`) + `Sum(cent_to_eur(t.amount_eur_cents))` (where `t.type='FEES'`).
                    *   *Breakdown:* By `security_uuid` (if trade/div related) or `account_uuid`.
                *   **Taxes:**
                    *   *Logic:* `Sum(cent_to_eur(u.amount_eur_cents))` (where `u.type='TAX'`) + `Sum(cent_to_eur(t.amount_eur_cents))` (where `t.type='TAXES'`).
                    *   *Breakdown:* By `security_uuid` (if trade/div related) or `account_uuid`.
            *   **Cash FX-Changes:**
                *   *Goal:* Isolate the gain/loss due to currency fluctuation on cash balances.
                *   *Algorithm (Per Currency C, where C != EUR):*
                    1.  **State Valuation:**
                        *   `Start_Val = Sum(Account_Balances_Native @ T-1_EOD) / FX(C, T-1 @ 23:59:59)`.
                        *   `End_Val = Sum(Account_Balances_Native @ T_EOD) / FX(C, T @ 23:59:59)`.
                    2.  **Flow Summation (Net_Flow_EUR):**
                        *   Sum `cent_to_eur(t.amount_eur_cents)` from `transactions` where `currency_code` = C (Includes `DEPOSIT`, `REMOVAL`, `BUY` (Neg), `SELL` (Pos)).
                        *   Sum `cent_to_eur(u.amount_eur_cents)` from `transaction_units` where `currency_code` = C (Fees/Taxes are usually negative).
                    3.  **Result:**
                        *   `FX_Gain_EUR = (End_Val - Start_Val) - Net_Flow_EUR`.
                *   *Special Case: Foreign-to-Foreign Transfers (e.g. JPY -> USD):*
                    *   Relies strictly on **Phase 1 Transfer Protocol** (Averaged `amount_eur_cents`).
                    *   The standard algorithm `(End_Val - Start_Val) - Net_Flow_EUR` **automatically** captures any valuation spread (transfer loss) as part of the FX result for the respective currencies. No explicit "Transfer Loss" calculation is needed.
                *   *Breakdown:* By `currency` (e.g. "USD Impact", "JPY Impact"). Requires `frontend` to support this list.
            *   **External Flows (Invested Capital):**
                *   *Logic:* The Net Flow of external cash/assets.
                *   *Breakdown:*
                    *   `Einlagen / Einlieferungen` (Inbound): `Sum(DEPOSIT, DELIVERY_INBOUND)`.
                    *   `Entnahmen / Auslieferungen` (Outbound): `Sum(REMOVAL, DELIVERY_OUTBOUND)`.
                    *   `Sum(cent_to_eur(amount_eur_cents))` for DEPOSIT/REMOVAL/DELIVERY.
            *   **Transfers (Neutral):**
                *   *Logic:* `Sum(TRANSFER_IN)` + `Sum(TRANSFER_OUT)`.
                *   *Invariant:* Global Sum must be 0.00.
                *   *Display:* Hidden from performance chart, but available for audit.
                *   `Sum(cent_to_eur(amount_eur_cents))` for TRANSFER_IN/OUT. Must equal 0.00.

        3.  **Total Performance Delta (The Hierarchy of Truth):**
            *   **Definition:** `Delta` represents the *exact* change in wealth driven by market forces, derived strictly from the Snapshot/Flow Invariant. It serves as the authoritative "Top Level" number.
            *   **Formula:** `Delta = (Wealth_End - Wealth_Start) - Net_External_Flows`
                *   *Note:* `Net_External_Flows` = `(Sum(Deposits) + Sum(Deliveries_In)) - (Sum(Removals) + Sum(Deliveries_Out))`.
                *   *Transfers:* Are neutral (Sum = 0) and do not affect the Delta formula.
            *   **Implication for IRR/TWR:**
                *   **TWR / IRR** rely *solely* on `Wealth_Start`, `Wealth_End`, and the `External_Flows` (Dates & Amounts).
                *   They do **NOT** depend on the component breakdown (Realized vs Unrealized).
                *   *Critical Change:* We calculate TWR/IRR using these "Ledger" values (Top-Down), *not* by summing the components (Bottom-Up). This ensures the Return % matches the user's account balance change exactly, distinct from any potential breakdown classification errors.
                *   *Implementation:* These metrics are computed directly from the high-level aggregates in `calculate_period_performance` before looking at granular components.
            *   **Reconciliation (The "Check"):**
                *   Calculate `Sum_Components = Valuation_Changes + FX_Cash + Divs + Int - Costs`.
                *   Compare `Delta` vs `Sum_Components`.
                *   If `abs(Delta - Sum_Components) > 0.01`:
                    *   **Logic:** Trust `Delta` for the Overview Chart.
                    *   **Warning:** Log "Performance Breakdown Leak: {Diff}".
                    *   **UI:** Display the discrepancy as "Unexplained" or "Rounding Error" in the breakdown to keep the books balanced.

### Phase 3.1: Lifetime Realized Performance (FIFO)
This engine is distinct from the "Period Attribution" above. It does not calculate strict Wealth Delta for a specific timeframe, but rather the **Realized Performance** of closed positions over their *entire lifetime* (Buy Date to Sell Date). This powers the **Trades Tab**.

1.  **Refactor `PerformanceEngine.calculate_realized_performance`**:
    *   **Logic:** Standard FIFO (First-In, First-Out) Matching.
    *   **Input:** All `transactions` (Enriched) for a specific Scope, sorted by `date ASC`.
    *   **State:** Maintain a `TaxLot` queue for each security: `[{date, shares, cost_basis_eur, ...}]`.
    *   **Process:**
        *   **BUY/DELIVERY_IN:** Push new lot to queue.
        *   **SELL/DELIVERY_OUT:** Pop from queue (FIFO).
            *   `Realized_Gain_EUR` = `(Sell_Price_EUR - Buy_Price_EUR) * Shares_Sold`.
            *   `Hold_Time` = `Sell_Date - Buy_Date`.
        *   **Output:** List of `RealizedTrade` objects.
    *   **Enrichment (Ghost Positions):**
        *   For the "Trades Tab", we often want to know: "What if I had held it?"
        *   For each closed trade, query `MarketResolver.get_price(Today)` for the security.
        *   Calculate `Opportunity_Delta = (Current_Price - Sell_Price) * Shares`.
    *   **Verification:**
        *   Ensure `Realized_Gain` matches exactly what is stored/displayed in PP (if feasible) or simply consistent with the enriched inputs.

2.  **Deprecations (The cleanup)**:
    *   **Logic to DELETE (Redundant due to Ingestion/Enrichment vs. On-Demand Calc):**
        *   `PerformanceEngine._prepare_market_data`: Pivot tables are no longer needed (Memory heavy).
        *   `PerformanceEngine._augment_transactions`: `amount_eur_cents` is now pre-calculated in DB.
        *   `PerformanceEngine._augment_txs_with_market_data`: `amount_eur_cents` is now pre-calculated in DB.
        *   `PerformanceEngine._augment_transfers`: Transfer logic (Averaging/Pairing) moves to Ingestion/Sync.
        *   `PerformanceEngine._calculate_gross_neutral_flows`: Replaced by simple `SUM` logic using `cent_to_eur`.
        *   `PerformanceEngine._calculate_cash_accumulators`: Replaced by simple `SUM` logic using `cent_to_eur` for Divs/Int/Fees/Taxes.
    *   **Logic to REWRITE (Simplify):**
        *   `PerformanceEngine.get_snapshot` (Retires `get_daily_wealth`): Calculates strict inventory & valuation for a *single date*. The old looping logic is removed from the Engine.
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
        *   `test_enrichment_logic_verification`:
            *   **Self-Consistency:** Verify `Sum(Transfer_In) + Sum(Transfer_Out) == 0` across the entire database.
            *   **Gold Standard:** Verify `amount_eur_cents` matches exactly for transactions where the PP XML provided an explicit Exchange Rate (Level 1 Hierarchy). Do NOT compare against the legacy engine.
        *   **Regression:** Ensure `tests/metrics/test_calculator.py` passes with the decimated engine.

### Phase 4: UI Data Cleanup & Consistency
This phase ensures the Frontend receives data solely from the *invariant* backend machinery, guaranteeing that "What you see in the Graph" matches "What you see in the Breakdown".

1.  **Overview Tab & Security Detail (Active Holdings)**
    *   **Goal:** Preserve the *exact* current display:
        *   **Overview:** List of active positions with Day Change, Gain/Loss, and Values.
        *   **Security Detail:** Deep dive into a single position including "History Chart", "Purchase/Sell Markers", and "News Prompt".
    *   **Refactor `metrics/securities.py`:**
        *   **Current:** Ad-hoc linear SQL queries and `normalize_price_to_eur_sync`.
        *   **New:** Inject/Use `MarketResolver` (Phase 2).
    *   **Endpoints:**
        *   `get_portfolio_positions`:
            *   Use `PerformanceEngine.get_snapshot(Today)` for quantities and cost basis.
            *   Use `MarketResolver.get_price(Today)` for current valuations.
        *   `get_security_snapshot`:
            *   Detailed view. Requires `MarketResolver` for full price history.
            *   Detailed view. Requires `MarketResolver` for full price history.
            *   History Chart: `MarketResolver.get_price_series(uuid, start, end)`.
            *   Transactions: Query `transactions` (Enriched) for markers.

2.  **Time Series Tab (History)**
    *   **Goal:** Graph "Historical Wealth" (Value over Time) using a persisted `daily_wealth` table.
    *   **Constraint:** The graph displays **Wealth Only** (not Performance, not Flows).
    *   **Schema Creation (`daily_wealth`):**
        *   **Action:** Add `DAILY_WEALTH_SCHEMA` to `custom_components/pp_reader/data/db_schema.py`.
        *   **Definition:**
            ```python
            DAILY_WEALTH_SCHEMA = [
                """
                CREATE TABLE IF NOT EXISTS daily_wealth (
                    date TEXT NOT NULL,           -- ISO8601 (YYYY-MM-DD)
                    scope_uuid TEXT NOT NULL,     -- UUID of Portfolio/Account or 'GLOBAL'
                    scope_type TEXT NOT NULL,     -- 'portfolio', 'account', 'global'
                    total_wealth_cents INTEGER NOT NULL, -- Wealth in Cents
                    total_invested_cents INTEGER NOT NULL, -- Invested Capital in Cents
                    updated_at TEXT,
                    PRIMARY KEY (date, scope_uuid, scope_type)
                );
                """
            ]
            ```
        *   **Note:** We use `_cents` suffix and INTEGER type for precision, consistent with `amount_eur_cents` in transactions.
    *   **New Module `metrics/history.py`:**
        *   **Function:** `rebuild_daily_wealth(start_date: date, scopes: list[str])`
        *   **Logic:**
            1.  Iterate `d` from `start_date` to `Today`.
            2.  **State:** Call `engine.get_snapshot(d)`. (Wealth @ EOD).
            3.  **Persist:** Insert into `daily_wealth`.
        *   **Algorithm Optimization (Vectorization):**
            *   Instead of looping `get_snapshot(d)`, implement a **Vectorized Rebuild** in `metrics/history.py`.
            *   1. Load ALL transactions (enriched) into a Pandas DataFrame.
            *   2. **Grouping:**
                *   For Securities: `df.groupby(['date', 'security_uuid']).sum().cumsum()`.
                *   For Cash: `df.groupby(['date', 'account_uuid', 'currency_code']).sum().cumsum()`.
            *   3. **Resample:** Resample to Daily frequency (ffill) *per group* to obtain continuous daily inventory.
            *   3. Resample to Daily frequency (ffill).
            *   4. Iterate the *result* (much smaller loop) to apply `MarketResolver` prices for Valuation.
            *   *Rationale:* Reduces Complexity from O(T*N) to O(N + T).
    *   **Usage (Graph Generation):**
        *   **Simple Aggregation:** To graph Wealth for a set of accounts:
            1.  Query `daily_wealth` for the selected `scope_uuids`.
            2.  Sum `total_wealth_eur` by `date`.
            3.  **Render.**
    *   **Future-Proofing:** Enables sub-setting the graph (e.g. "Show only Retirement Portfolio") instantly.
    *   **Deprecation:**
        *   `backdating/engine_pandas.py`: **DELETE**.
        *   `PerformanceEngine.get_daily_wealth`: **DELETE**. (The engine no longer loops; the *history module* loops and calls the engine for points).

3.  **Trades Tab & Trade Detail (Realized & Prior Holdings)**
    *   **Goal:** Restore the "Trades" tab functionality to show closed/partially closed positions with their realized performance (Gains/Losses), plus the "Trade Detail" view for deep analysis.
    *   **Context:** This was previously working but lost duplication/divergence. It relies on calculating the difference between Sell Value and Buy Value (FIFO) for closed lots.
    *   **Trade Detail View (Prior Holdings):**
        *   Accessible via clicking a Realized Trade.
        *   **Key Feature:** "Performance Since Sell" (Opportunity Cost). comparing `Sell_Price` vs `Current_Market_Price`.
    *   **Backend Refactor (`metrics/calculator.py` & `data/websocket.py`):**
        *   **`ws_get_trades` Endpoint:**
            *   Must return a detailed list of *closed security lots*.
            *   **Enrichment:**
                *   `realized_gain_abs` (Total Profit/Loss in EUR) -> From `PerformanceEngine` FIFO logic (Lifetime).
                *   `realized_gain_pct` (ROI/IRR for the trade).
                *   `current_price` -> From `MarketResolver` (Even if user holds 0, we need the price).
                *   `since_sell_abs` -> `(Current_Price - Sell_Price) * Shares`.
            *   **Risk Mitigation:** The `MarketResolver` MUST fetch prices for these closed securities ("Ghost Positions") to support the "Since Sell" metric.
        *   **`PerformanceEngine`:**
            *   Must expose `calculate_realized_performance()` which processes the "Enriched Transactions" stream to build the FIFO matchings (Lifetime metrics, NOT Period Attribution).
    *   **UI Impact:** The Frontend `trade_detail.ts` expects `RealizedTrade` objects. Ensure the backend JSON structure matches precisely.

4.  **Integration Tests**
    *   **New Test:** `tests/metrics/test_history_consistency.py`.
        *   `test_history_vs_engine`: Pick a random past date. Assert `daily_wealth[date] == PerformanceEngine.calculate(date)`.
    *   **New Test:** `tests/data/test_websocket_enrichment.py`.
        *   `test_transaction_extra_fields`: Verify websocket payload contains `amount_eur_cents`.

## 3. Risks & Considerations

1.  **Ingestion/Enrichment Latency:**
    *   **Risk:** Calculating `amount_eur_cents` for every transaction during XML parsing (specifically the Transfer Protocol averaging) adds overhead to the ingestion process.
    *   **Mitigation:** The logic is linear O(N). For < 10k transactions, it should remain under 1s. If needed, we can optimize `_apply_transfer_protocol` to use bulk SQL updates on the staging table.

2.  **Stale Enrichment Data:**
    *   **Risk:** If `amount_eur_cents` is derived using the "Market Resolver Fallback" (Level 3), and we subsequently update the Resolver's FX rates for that date, the persisted `amount_eur_cents` remains "old" unless we re-ingest.
    *   **Acceptance:** This is "Working as Designed". The Database is the Source of Truth. If the user wants to update the valuation, they should trigger a "Re-Process" or simply re-save the PP file.
    *   **Constraint:** The `PerformanceEngine` must *always* trust the `amount_eur_cents` in the DB, even if it looks wrong compared to a fresh Resolver lookup. This guarantees consistency between Granular Breakdown and Top-Level Delta.

3.  **Transfer Protocol & Orphans:**
    *   **Risk:** A "Transfer" usually consists of two transactions. If one is missing (orphaned) or they are not correctly linked by `pp_xml` parser, the "Averaging" logic fails.
    *   **Mitigation:** The `_apply_transfer_protocol` must be robust. If a partner is missing, it should fall back to "Level 2" (Standard standard FX conversion) for the single leg, rather than crashing or zeroing out the value.

## 4. Next Actions
1.  **Approve** this architectural shift.
2.  **Phase 1 (Data):** Modify `db_schema.py` and implement `ingestion_writer.py` enrichment logic.
3.  **Phase 2 (Core):** Implement `metrics/core/market_resolver.py`.
4.  **Phase 3 (Calculation):** Rewrite `calculate_period_performance` in `calculator.py`.
5.  **Phase 4 (UI Consistency):** Wire `securities.py` and `trade_detail.ts` to the new engines.
