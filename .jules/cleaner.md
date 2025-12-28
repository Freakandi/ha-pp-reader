# Cleaner's Journal

## 2024-05-22 - [Initialization]
**Learning:** Created the cleaner journal to track critical learnings.
**Action:** Will record any false positives or tricky dependencies found during cleanup.
## 2024-05-23 - [Circular Imports in Data Layer]
**Learning:** Moving FX logic into the `currencies` package triggered a circular dependency because `currencies.fx` needed to persist rates via `data.fx_persistence`, which indirectly imported back into `data`. The fix was to move persistence logic to `currencies/persistence.py`.
**Action:** When centralizing domain logic (like FX), ensure persistence layers are also decoupled from the main data aggregation layer to avoid cycles.
