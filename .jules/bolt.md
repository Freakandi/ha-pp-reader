# Bolt's Journal

## 2024-05-22 - [Journal Start]
**Learning:** Initialized Bolt's journal.
**Action:** Always check this file for past learnings before starting.

## 2024-05-22 - [Optimized Account Balance Sync]
**Learning:** `_compute_account_balances` was iterating all transactions for every account, causing O(AxT) complexity. Pre-grouping transactions by account reduced this to O(T).
**Action:** Look for nested loops where the inner loop iterates over a large dataset that can be pre-indexed or grouped.

## 2024-05-23 - [Optimized Price Lookup]
**Learning:** `_resolve_price_for_date` used a linear scan `O(N)` on a sorted list of price history. For daily backdating loops over long history, this becomes `O(D * N)`.
**Action:** Replaced linear scan with `bisect_right` for `O(log N)` lookup. Python's `bisect` module supports a `key` argument since 3.10, making it easy to binary search list of tuples.

## 2024-05-24 - [Optimized Price Cache Loading]
**Learning:** `_load_price_cache` was redundant sorting already sorted data from SQL, and repeatedly parsing the same date strings for every security.
**Action:** Trust SQL `ORDER BY` when possible to avoid O(N) sort overhead. Memoize expensive parsing functions (like `_parse_date_value`) when processing denormalized data with high repetition.
