"""Account balance backdating tests."""

from __future__ import annotations

import sqlite3
from datetime import date

import pytest

from custom_components.pp_reader.backdating.accounts import (
    _compute_daily_account_snapshots_sync,
)
from custom_components.pp_reader.data.db_init import initialize_database_schema


@pytest.mark.asyncio
async def test_account_balances_rollup_with_fx_and_transfer_units(tmp_path):
    """Balances should roll forward daily, respect fx_amount for transfers, and report coverage."""
    db_path = tmp_path / "accounts.db"
    initialize_database_schema(db_path)

    conn = sqlite3.connect(str(db_path))
    try:
        conn.executemany(
            "INSERT INTO accounts (uuid, name, currency_code, is_retired) VALUES (?, ?, ?, ?)",
            [
                ("acct-eur", "EUR Cash", "EUR", 0),
                ("acct-usd", "USD Cash", "USD", 0),
            ],
        )
        conn.executemany(
            """
            INSERT INTO transactions (uuid, type, account, other_account, date, amount)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                ("tx-1", 6, "acct-usd", None, "2024-01-02", 200_00),
                ("tx-2", 6, "acct-eur", None, "2024-01-02", 100_00),
                ("tx-3", 5, "acct-eur", "acct-usd", "2024-01-03", 50_00),
                ("tx-4", 13, "acct-usd", None, "2024-01-04", 10_00),
            ],
        )
        conn.executemany(
            """
            INSERT INTO transaction_units (transaction_uuid, type, fx_amount, fx_currency_code)
            VALUES (?, ?, ?, ?)
            """,
            [
                ("tx-3", 5, 55_00, "USD"),
            ],
        )
        conn.executemany(
            "INSERT INTO fx_rates (date, currency, rate) VALUES (?, ?, ?)",
            [
                ("2024-01-02", "USD", 1.25),
                ("2024-01-03", "USD", 1.20),
            ],
        )
        conn.commit()
    finally:
        conn.close()

    snapshots = _compute_daily_account_snapshots_sync(
        db_path,
        date(2024, 1, 2),
        date(2024, 1, 4),
    )

    day1 = snapshots[0]
    assert day1.date == "2024-01-02"
    assert day1.fx_coverage_ratio == 1.0
    wealth_day1 = {val.account_uuid: val.balance_eur for val in day1.accounts}
    assert wealth_day1["acct-eur"] == 100.0
    assert wealth_day1["acct-usd"] == pytest.approx(160.0)
    assert day1.account_wealth_eur == pytest.approx(260.0)

    day2 = snapshots[1]
    wealth_day2 = {val.account_uuid: val.balance_eur for val in day2.accounts}
    assert wealth_day2["acct-eur"] == 50.0  # 100 - 50 transfer
    assert wealth_day2["acct-usd"] == pytest.approx(212.5)  # (200 + 55) / 1.2
    assert day2.account_wealth_eur == pytest.approx(262.5)
    assert day2.fx_coverage_ratio == 1.0

    day3 = snapshots[2]
    wealth_day3 = {val.account_uuid: val.balance_eur for val in day3.accounts}
    assert wealth_day3["acct-eur"] == 50.0
    # Before the fix, this was None because fallback logic was weaker/different.
    # Now, with last_known_fx_rates fallback, it uses 1.20 from 2024-01-03.
    # (200 + 55 - 10) / 1.2 = 245 / 1.2 = 204.166667
    assert wealth_day3["acct-usd"] == pytest.approx(204.166667)
    assert day3.account_wealth_eur == pytest.approx(254.166667)
    assert day3.fx_coverage_ratio == 1.0
