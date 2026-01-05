"""Test transfer neutrality in the PerformanceEngine."""

from __future__ import annotations

import sqlite3
from datetime import UTC, date, datetime
from typing import TYPE_CHECKING, Any
from unittest.mock import MagicMock

from custom_components.pp_reader.const import TransactionType
from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.metrics.calculator import PerformanceEngine

if TYPE_CHECKING:
    from pathlib import Path


def _insert_account(conn: sqlite3.Connection, uuid: str, currency: str) -> None:
    conn.execute(
        "INSERT INTO accounts (uuid, name, currency_code) VALUES (?, ?, ?)",
        (uuid, f"Account {currency}", currency),
    )


def _insert_transaction(
    conn: sqlite3.Connection,
    uuid: str,
    tx_type: TransactionType,
    date_str: str,
    account: str,
    amount: float,
    currency: str,
    other_account: str | None = None,
) -> None:
    conn.execute(
        """
        INSERT INTO transactions (uuid, type, date, account, other_account, amount, currency_code)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            uuid,
            tx_type,
            date_str,
            account,
            other_account,
            int(amount * 100),
            currency,
        ),
    )


def _insert_transfer_unit(
    conn: sqlite3.Connection, tx_uuid: str, fx_amount: float, fx_currency: str
) -> None:
    conn.execute(
        """
        INSERT INTO transaction_units (transaction_uuid, type, amount, currency_code, fx_amount, fx_currency_code)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (tx_uuid, 20, 0, "EUR", int(fx_amount * 100), fx_currency),
    )


def test_transfer_neutrality_and_fx_loss(tmp_path: Path) -> None:
    """
    Verify that a chain of transfers is capital-neutral and FX losses are performance-based.

    Scenario:
    1. Deposit 1000 EUR.
    2. Transfer 1000 EUR -> 1100 USD.
    3. Transfer 1100 USD -> 150000 JPY.
    4. Transfer 150000 JPY -> 950 EUR (a 50 EUR round-trip loss).
    """
    db_path = tmp_path / "test.db"
    initialize_database_schema(db_path)
    conn = sqlite3.connect(db_path)

    # --- Setup Data ---
    _insert_account(conn, "acct-eur", "EUR")
    _insert_account(conn, "acct-usd", "USD")
    _insert_account(conn, "acct-jpy", "JPY")

    _insert_transaction(
        conn, "tx1", TransactionType.DEPOSIT, "2023-01-01", "acct-eur", 1000.0, "EUR"
    )
    _insert_transaction(
        conn,
        "tx2",
        TransactionType.CASH_TRANSFER,
        "2023-01-02",
        "acct-eur",
        1000.0,
        "EUR",
        "acct-usd",
    )
    _insert_transfer_unit(conn, "tx2", 1100.0, "USD")

    _insert_transaction(
        conn,
        "tx3",
        TransactionType.CASH_TRANSFER,
        "2023-01-03",
        "acct-usd",
        1100.0,
        "USD",
        "acct-jpy",
    )
    _insert_transfer_unit(conn, "tx3", 150000.0, "JPY")

    _insert_transaction(
        conn,
        "tx4",
        TransactionType.CASH_TRANSFER,
        "2023-01-04",
        "acct-jpy",
        150000.0,
        "JPY",
        "acct-eur",
    )
    _insert_transfer_unit(conn, "tx4", 950.0, "EUR")
    conn.commit()

    # --- Mock Market Data ---
    mock_resolver = MagicMock()
    fx_map = {
        ("USD", datetime(2023, 1, 2, tzinfo=UTC)): 0.90909,  # 1000 EUR = 1100 USD
        ("JPY", datetime(2023, 1, 3, tzinfo=UTC)): 136.3636,  # 1100 USD = 150000 JPY
        ("JPY", datetime(2023, 1, 4, tzinfo=UTC)): 157.8947,  # 950 EUR = 150000 JPY
    }

    def mock_get_fx(currency: str, dt: datetime) -> float:
        # Default for EUR is 1.0
        return fx_map.get((currency, dt), 1.0)

    mock_resolver.get_fx.side_effect = mock_get_fx

    # --- Run Engine ---
    engine = PerformanceEngine(conn, mock_resolver)
    engine.load_data()  # Manually load data for period calculation
    metrics = engine.calculate_period_performance(
        start_date=date(2023, 1, 1), end_date=date(2023, 1, 5)
    )

    # --- Assertions ---
    # Net External Flow should ONLY be the initial 1000 EUR deposit.
    # The transfers are internal and should not affect invested capital.
    start_state = engine.get_snapshot(date(2022, 12, 31))
    end_state = engine.get_snapshot(date(2023, 1, 5))

    conn.close()

    assert start_state["total_wealth"] == 0.0
    assert end_state["total_wealth"] == 950.0
    # The total invested capital should only reflect the initial deposit.
    assert end_state["invested_capital"] == 1000.0

    # Absolute Performance = End Wealth - Start Wealth - Net Flows
    #                      = 950 - 0 - 1000 = -50
    assert metrics.absolute_performance == -50.0
