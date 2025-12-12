# Bolt's Journal

## 2024-05-22 - [Journal Start]
**Learning:** Initialized Bolt's journal.
**Action:** Always check this file for past learnings before starting.

## 2024-05-22 - [Optimized Account Balance Sync]
**Learning:** `_compute_account_balances` was iterating all transactions for every account, causing O(AxT) complexity. Pre-grouping transactions by account reduced this to O(T).
**Action:** Look for nested loops where the inner loop iterates over a large dataset that can be pre-indexed or grouped.
