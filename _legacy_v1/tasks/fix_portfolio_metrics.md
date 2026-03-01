# Task: Fix Purchase Value Aggregation, Total Change Logic, and Last Price Fallback

Status: [x] Complete

## Issue
1. **Purchase Value Discrepancy**: The "Portfolio Aggregate" Purchase Value does not match the sum of individual "Position" purchase values. This is likely because the Position Purchase Value (Cost Basis) is currently calculated as "Net Purchase Price" (stripping fees/taxes), whereas the user requires "Gross Total" (Price * Shares + Fees + Taxes).
2. **Total Change Calculation**: "Total Change" shows discrepancies. It must be consistently calculated as `Current Value - Gross Purchase Value`.
3. **Last Price Visibility**: On non-trading days (e.g., weekends), the "Last Price" column becomes empty instead of falling back to the last known closing price.

## Investigation
- **Purchase Value**:
  - `metrics/securities.py` calculates `purchase_value_cents` using `cost_basis`.
  - `cost_basis` is derived from `active_lots` provided by `PerformanceEngine` (`metrics/calculator.py`).
  - `PerformanceEngine._process_fifo_inbound` calculates `Lot.price_native` by **subtracting** fees and taxes from the transaction amount: `net_amount = abs(amount) - fees - taxes`.
  - This results in a "Net" Cost Basis.
  - The `Lot` dataclass currently only stores `price_native` (Net).
- **Total Change**:
  - `unrealized_gain` is calculated as `current_value - cost_basis`. Since `cost_basis` is currently Net, `unrealized_gain` is effectively `Current - Net Buy`.
  - Requirement is `Current - Gross Buy`.
- **Last Price**:
  - `metrics/securities.py` calls `MarketResolver.get_price(sec_uuid, now_ts)`.
  - `MarketResolver.get_price` works correctly with fallback logic.
  - However, if `MarketResolver` returns `0.0` or `None`, `securities.py` returns `None`.
  - Suspect `MarketResolver` might fail to find the price if data loading is imperfect or `now_ts` alignment is off.

## Implementation Plan

Est. Complexity: Medium
Suggested Mode: Local

### 1. Update `metrics/calculator.py`
- [x] Modify `Lot` dataclass in `metrics/calculator.py` to include `price_gross_native` (float).
- [x] In `PerformanceEngine._process_fifo_inbound`:
  - Calculate `price_gross_native`.
  - For `BUY`: `price_gross_native = (abs(amount) / 100.0) / shares` (where `amount` is raw cents, so divide by 100).
    - Note: `tx_row.amount` is in Cents.
  - For `INBOUND_DELIVERY`: Calculate gross price similarly if amount exists, otherwise fallback to `price_native + (fees + taxes) / shares`.
  - Store it in the new `Lot` field.
- [x] In `PerformanceEngine._process_fifo_outbound`:
  - Update any `Lot()` creation or slicing to preserve `price_gross_native`.

### 2. Update `metrics/securities.py`
- [x] In `_create_security_record`:
  - Update `cost_basis` loop: `cost_basis += lot.shares * lot.price_gross_native / lot.fx_rate ...`
  - Ensure fallback: if `lot.price_gross_native` is not set (e.g. legacy), fallback to `lot.price_native`.
- [x] This ensures `purchase_value_cents` corresponds to "Gross Money Spent".
- [x] Verify `unrealized_gain` logic (it uses `current_value - cost_basis`), so it will now automatically use Gross Cost Basis.

### 3. Verification of Last Price Fallback
- [x] Create a new test file `tests/metrics/test_last_price_fallback.py`.
- [x] Test Case: `test_last_price_fallback_weekend()`:
  - Setup: Security X has price on Friday. Current time is Saturday.
  - Action: Call `MarketResolver.get_price(sec_x, sat_ts)`.
  - Assert: Returns Friday's price.
- [x] Verify `metrics/securities.py` logic around `last_price_native_raw`:
  - Ensure `price is not None` check handles `0.0` correctly if `MarketResolver` returns 0.0 for missing prices.

### 4. Verify Aggregation
- [x] Verify `metrics/portfolio.py` aggregates `purchase_value` from `portfolio_securities` table.
- [x] Run `pytest tests/metrics/test_performance_summation.py` to ensure no regression in core engine math (though we are only adding a field, not changing the engine's internal `price_native` logic).

## Verification
- **Test Suite**: Run `pytest tests/metrics/test_last_price_fallback.py` and `pytest tests/metrics/test_calculator.py`.
- **Manual Check**:
  - Run `npm run dev` and `hass`.
  - Open UI on `http://192.168.5.108:8123/ppreader`.
  - Verify "Position" Purchase Values match "Portfolio" header.
  - Verify "Last Price" is visible for securities (even on weekends).
