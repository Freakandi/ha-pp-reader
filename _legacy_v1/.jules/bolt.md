## 2024-05-24 - [Optimized History Ingestion]
**Learning:** `_normalize_history_dataframe` was iterating over DataFrame rows using `itertuples` and repeated `getattr` calls, which is O(N) Python-side iteration.
**Action:** Replaced row-by-row iteration with `zip` on columns (vectorized-like access). This avoids creating row objects and repeated attribute lookups, significantly speeding up large data imports.

## 2024-05-28 - [Optimized Transaction Grouping]
**Learning:** `setdefault` in a loop over sorted data introduces unnecessary hash lookups and method calls (O(1) amortized, but constant factor matters in tight loops).
**Action:** Replaced `grouped.setdefault(date, []).append(tx)` with a linear scan tracking `current_date`. Since transactions are pre-sorted by date, this avoids hash lookups for every item, resulting in ~65% faster grouping in benchmarks.

## 2024-12-21 - [Optimized Transaction Object Usage]
**Learning:** `Transaction` objects are instantiated and accessed millions of times during backdating. Using a standard dataclass (without `slots=True`) and defensive `getattr(tx, "attr", default)` calls adds significant overhead in tight loops.
**Action:** Added `slots=True` to the `Transaction` dataclass (reducing memory and instantiation time by ~24%) and replaced `getattr` with direct attribute access (reducing access time by ~30%). Benchmarks showed total time for object creation + access dropped significantly.

## 2024-12-21 - [Optimized Cashflow Loops]
**Learning:** `cent_to_eur` helper function calls (including `is_finite` checks and try-except blocks) inside tight transaction loops add significant overhead when inputs are guaranteed integers.
**Action:** Replaced `cent_to_eur(val)` with direct `val / 100.0` division and reused calculated absolute fee/tax values instead of recalculating them. Benchmarks showed a ~49% speedup in `_process_transaction`. Also fixed a bug where missing FX rates caused foreign fees to be added as-is (1:1) to EUR buckets.

## 2025-02-18 - [Optimized Holdings Transaction Values]
**Learning:** Similar to cashflows, `holdings.py` was using `cent_to_eur` inside `_calculate_transaction_amounts` and `_calculate_cost_in_eur`, adding overhead in tight loops.
**Action:** Replaced `cent_to_eur(val)` with direct `val / 100.0` division. This mirrors the earlier optimization in `cashflows.py` and avoids unnecessary function calls and validation for values guaranteed to be integers.

## 2025-03-04 - [Vectorized FX Lookups in Loops]
**Learning:** `PerformanceEngine` was using iterative `searchsorted` (via `_get_fx`) inside transaction loops to find exchange rates. This is O(N log M) or worse.
**Action:** Implemented `pd.merge_asof` (O(N + M)) to pre-calculate and attach FX rates to all transactions before looping. This reduced execution time by ~50x (11.8s -> 0.23s) in benchmarks for 50k transactions. Critical details: explicit string casting for join keys and handling `direction='backward'`.

## 2025-03-05 - [Vectorized Invested Capital Calculation]
**Learning:** `_calculate_daily_invested_capital` was using `iterrows()` to loop over transactions, which is very slow due to row boxing and Python overhead.
**Action:** Replaced the loop with vectorized `pd.merge` and `np.where` operations. Pivoted price/FX data was melted and merged back into the transaction DataFrame, allowing all calculations to happen in compiled C code.
