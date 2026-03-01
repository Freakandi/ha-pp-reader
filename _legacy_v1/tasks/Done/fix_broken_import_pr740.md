# Task: Fix Broken Import in Ingestion Writer

Status: [x] Complete

## Issue
An `ImportError` occurs during Home Assistant startup because `custom_components.pp_reader.data.ingestion_writer` attempts to import `ensure_exchange_rates_for_dates_sync` from `custom_components.pp_reader.util.currency`, where it does not exist. This function appears to reside in `custom_components.pp_reader.currencies.fx`.

## Investigation
- Traceback shows: `ImportError: cannot import name 'ensure_exchange_rates_for_dates_sync' from 'custom_components.pp_reader.util.currency'`
- `custom_components/pp_reader/util/currency.py` does not define or export this function. It imports `fx` from `custom_components.pp_reader.currencies`.
- `custom_components/pp_reader/currencies/fx.py` defines `ensure_exchange_rates_for_dates_sync`.
- `custom_components/pp_reader/data/ingestion_writer.py` has the incorrect import.

## Implementation Plan
1.  [x] Modify `custom_components/pp_reader/data/ingestion_writer.py`:
    -   Change the import statement for `ensure_exchange_rates_for_dates_sync`.
    -   It should import from `custom_components.pp_reader.currencies.fx`.

## Verification
-   [x] Run `ruff check .` which should detect if the new import is valid.
-   [x] Run `pytest` to ensure no other regressions.
