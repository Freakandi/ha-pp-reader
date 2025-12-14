
# Goal: Align Daily Wealth Calculations with Portfolio Performance

The objective is to fix discrepancies between `ha-pp-reader` metrics and Portfolio Performance (PP) regarding Taxes, Fees, and Realized Gains. The system is currently stable (ingestion works), but the *calculation logic* differs from PP's conventions.

## References
- **Detailed Analysis**: [.docs/fix_daily_wealth.md](.docs/fix_daily_wealth.md) (Contains specific root causes for Taxes/Fees).
- **Core Logic**: `custom_components/pp_reader/backdating/holdings.py`

## Requirements

1.  **Fix Realized Gains**:
    - Current State: `daily_wealth.realized_gains_eur` is consistently `0.00`.
    - Task: Debug `_apply_transaction_update` in `holdings.py`. Ensure Cost Basis is correctly tracked (requires full history loading) and `realized_gain` is non-zero for Sells.
    - Note: PP "Realized Gains" are usually Net (After Tax). Ensure our calculation aligns or we display Gross + Tax separately.

2.  **Align Taxes**:
    - Current State: We show Total Taxes (-816€). PP shows subset (-198€).
    - Task: Implement logic to exclude "Taxes on Gains" from the general "Taxes" metric if we want to match PP (which likely nets them). OR, exclude taxes occurring on the "Start Date" if PP treats Start Date as post-transaction.
    - Validate against the specific mismatch identified in `.docs/fix_daily_wealth.md` (593€ Tax on 13.05).

3.  **Align Fees**:
    - Current State: We show -74€. PP shows -39€.
    - Task: Determine which fees PP excludes (likely Cost Adjustments on Buys) and align our filtering logic.

## Verification
- Run `trigger_backdating.py` (or restart HA) to rebuild data.
- Use `debug_db_state.py` or `debug_units.py` to verify `daily_wealth` values.
- Compare against user-provided screenshots (in previous session archives) or ask for new validation.
