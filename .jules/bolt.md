## 2024-03-24 - [Vectorized FX/Price Lookup]
**Learning:** Python loops over pandas DataFrames (via `itertuples`) with scalar lookups (even optimized ones like `searchsorted`) are drastically slower (~20x) than using `pd.merge_asof`.
**Action:** When enriching large DataFrames with time-series data (FX rates, prices), always prefer `merge_asof` over iterative lookup methods, even if it requires sorting inputs first.
