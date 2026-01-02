# Refine FX Conversion Logic

## Objective
Achieve 100% accuracy in foreign exchange (FX) conversions across the application, specifically for cross-currency transfers and cash FX changes.

## Investigation
1.  **Overview Tab Accuracy**: Verified that the Overview tab's accuracy stems from the ingestion pipeline correctly storing explicit FX values (amount, currencycode) in `transaction_units` table, derived from the imported Portfolio Performance data.
2.  **Performance Engine Gap**: Identified that `PerformanceEngine` (calculator.py) was ignoring these explicit FX unit values and purely relying on Market Rates (daily FX rates) for conversions. This caused discrepancies when the actual transfer rate differed from the daily market rate.
3.  **Missing Data**: Confirmed `load_data` was not fetching `fx_amount` and `fx_currency_code` columns.

## Implementation
1.  **Data Loading**: Updated `PerformanceEngine.load_data` to fetch `fx_amount` and `fx_currency_code` from `transaction_units` table.
2.  **Conversion Logic**: Refactored `_augment_transfers` in `calculator.py` to:
    *   Check for corresponding explicit FX entries in `transaction_units`.
    *   Prioritize these explicit values for the target side of the transfer.
    *   Fallback to Market Rate conversion only when explicit values are missing.
3.  **Unified FX Performance**: Refactored `_calculate_fx_performance` to utilize the enhanced `_augment_transfers` logic instead of its own inline ad-hoc calculation. This ensures that Cash FX Gain calculations now honor the specific rates used in transfers.

## Verification
*   **Unit Tests**: Added `test_augment_transfers_explicit_fx` and `test_calculate_fx_performance_with_override` to `tests/metrics/test_calculator.py`. Both tests passed, confirming that explicit FX values are correctly prioritized and affect the final gain/loss calculation.
*   **Linting**: Passed `ruff check .`.

## Outcome
The application now accurately reflects the specific FX rates used in user transactions, eliminating "phantom" discrepancies between the Overview balances and Time Series performance metrics.
