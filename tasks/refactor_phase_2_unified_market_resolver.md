# Refactor Phase 2: The Unified Market Resolver

## Goal
Implement the `MarketResolver` as the Single Source of Truth for "Value at Time T" and integrate it into the `PerformanceEngine`, eliminating redundant data loading and pivot table logic.

## Context
- **Master Plan:** [tasks/refactor_calculations.md](tasks/refactor_calculations.md) (Section: "Phase 2: The Unified Market Resolver")
- **Design Decisions:** [tasks/refactor_context.md](tasks/refactor_context.md)
- **Dependency:** Relies on `metrics/core/fx_access.py` (Phase 0) for consistent FX lookups.

## Proposed Changes

### 1. New Component: `MarketResolver`
Create `custom_components/pp_reader/metrics/core/market_resolver.py`.
- **Responsibility:** Load Reference Data (`historical_prices`, `securities`) ONCE. Provide O(1)/O(log N) lookups.
- **Key Methods:**
    - `load_data()`: Bulk load history + live prices.
    - `get_price(sec_uuid, date)`: Forward-fill logic.
    - `get_fx(currency, date)`: Delegate to `metrics.core.fx_access`.
    - `get_security_currency(sec_uuid)`: Return currency code for a security.
    - `get_price_series(sec_uuid, start, end)`: Vectorized series for history charts.
- **Optimization:** Use Pandas for internal storage (`_prices` Series with MultiIndex) but expose scalar accessors.

### 2. Refactor `PerformanceEngine`
Modify `custom_components/pp_reader/metrics/calculator.py`.
- **Injection:** Update `__init__` to accept `market_resolver`.
- **Lifecycle:** Remove internal dataframe loading for prices/rates/securities in `load_data`.
- **Usage:** Update `_get_price` and `_get_fx` to call the Resolver.
- **Cleanup:** Remove `_prepare_market_data` (pivot logic) and internal DF fields (`_df_prices`, `_df_rates`, `_df_securities`).

## Detailed Steps

- [ ] **Step 1: Create Market Resolver Implementation**
    - Create `custom_components/pp_reader/metrics/core/market_resolver.py`.
    - Implement `__init__` and `load_data`:
        - Load `historical_prices` (bulk).
        - Load `securities` table: Fetch `uuid`, `last_price`, AND `currency_code`.
        - Store `currency_code` in a fast dictionary map: `self._sec_curr_map`.
    - Implement `get_price` with forward-fill logic (Latest <= Date).
    - Implement `get_fx` delegated to `metrics.core.fx_access.get_best_available_fx_rate`.
    - Implement `get_security_currency(sec_uuid) -> str`: Return the cached currency code (default to 'EUR' if missing).
    - Implement `get_price_series` (vectorized slice).

- [ ] **Step 2: Test Market Resolver (Unit)**
    - Create `tests/metrics/core/test_market_resolver.py`.
    - Test Case: `test_price_lookup_exact_match`.
    - Test Case: `test_price_lookup_forward_fill` (T+5 uses T).
    - Test Case: `test_price_lookup_missing` (Returns 0.0).
    - Test Case: `test_live_price_priority` (Securities table overrides/appends to history).
    - Test Case: `test_get_security_currency` (Verify metadata lookup).

- [ ] **Step 3: Integrate into PerformanceEngine**
    - Modify `custom_components/pp_reader/metrics/calculator.py`.
    - Update `__init__` to take `market_resolver: MarketResolver`.
    - Remove `_df_prices`, `_df_rates`, `_df_securities` initialization.
    - Rewrite `load_data`:
        - KEEP `_df_txs` and `_df_units` loading (Event Log).
        - LEAVE `_account_currencies` loading (State).
        - **REMOVE** price/rate/securities DF loading sections entirely.
        - **REMOVE** `_sec_curr_map` loading logic.
        - Ensure `market_resolver.load_data()` is called or assumed loaded.
    - Update `_get_price` to return `self.market_resolver.get_price(...)`.
    - Update `_get_fx` to return `self.market_resolver.get_fx(...)`.
    - Update usage of `_sec_curr_map`: Replace `self._sec_curr_map.get(uuid)` with `self.market_resolver.get_security_currency(uuid)`.

- [ ] **Step 4: Cleanup Redundant Engine Logic**
    - Remove `_prepare_market_data` in `calculator.py`.
    - Implement `_augment_txs_with_market_data` rewrite:
        - **Logic:** Use `df.apply()` (or simple iteration) to populate `price` and `fx_rate` columns by calling `self.market_resolver.get_price` and `self.market_resolver.get_fx` for each row.
        - **Removal:** Delete the old logic that relied on merging `_df_prices` / `_df_rates` pivot tables.
        - *Rationale:* Decouples Engine from Resolver internal storage type (Pandas vs SQL vs Dict). Performance impact acceptable for transaction volumes.

- [ ] **Step 5: Review & Regression Testing**
    - Run `pytest tests/metrics/core/test_market_resolver.py`.
    - Run `pytest tests/metrics/test_calculator.py` (Ensure no regression in engine outputs).
    - Check for Linting Errors (`ruff check .`, `ruff format .`, `mypy`).

## Test Plan
- **New Tests:** `tests/metrics/core/test_market_resolver.py` (Coverage for new component).
- **Existing Tests:** `tests/metrics/test_calculator.py` MUST pass without modification to assertions (Logic should be transparent).
- **Manual Verification:** None required for this phase (Pure backend refactor).

## Complexity
- **Rating:** 5/10 (Architectural shift, but logic is "Extraction & Simplification").
