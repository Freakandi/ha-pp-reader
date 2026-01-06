"""Test FIFO methods in the PerformanceEngine."""

from __future__ import annotations

import sqlite3
from datetime import UTC, datetime
from typing import TYPE_CHECKING
from unittest.mock import MagicMock

import pytest

from custom_components.pp_reader.const import TransactionType
from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.metrics.calculator import Lot, PerformanceEngine

if TYPE_CHECKING:
    from pathlib import Path


# Helper to insert a transaction (copied from test_fifo_lifecycle.py)
def _insert_transaction(
    conn: sqlite3.Connection,
    uuid: str,
    tx_type: TransactionType,
    date: str,
    sec_uuid: str,
    shares: float,
    amount: float,
    portfolio_uuid: str = "p1",
    account_uuid: str = "a1",
    currency: str = "USD",
) -> None:
    conn.execute(
        """
        INSERT INTO transactions (uuid, type, date, security, shares, amount, currency_code, portfolio, account)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            uuid,
            tx_type,
            date,
            sec_uuid,
            int(shares * 1e8),
            int(amount * 100),
            currency,
            portfolio_uuid,
            account_uuid,
        ),
    )


def test_get_fifo_active_lots(tmp_path: Path) -> None:
    """
    Verify the active lots are correctly calculated after a partial sale.

    Scenario:
    1. Buy 10 shares @ 100 USD (FX 1.2)
    2. Buy 10 shares @ 120 USD (FX 1.1)
    3. Sell 15 shares @ 150 USD (FX 1.0)
    Expected Result: 5 shares remaining from the second lot.
    """
    db_path = tmp_path / "test.db"
    initialize_database_schema(db_path)
    conn = sqlite3.connect(db_path)

    # --- Setup Data ---
    _insert_transaction(
        conn, "tx1", TransactionType.BUY, "2023-01-01", "sec-usd", 10.0, 1000.0
    )
    _insert_transaction(
        conn, "tx2", TransactionType.BUY, "2023-02-01", "sec-usd", 10.0, 1200.0
    )
    _insert_transaction(
        conn, "tx3", TransactionType.SELL, "2023-03-01", "sec-usd", 15.0, 2250.0
    )
    conn.commit()

    # --- Mock Market Data ---
    mock_resolver = MagicMock()
    fx_map = {
        ("USD", datetime(2023, 1, 1, tzinfo=UTC)): 1.2,
        ("USD", datetime(2023, 2, 1, tzinfo=UTC)): 1.1,
        ("USD", datetime(2023, 3, 1, tzinfo=UTC)): 1.0,
    }
    mock_resolver.get_price.return_value = 100.0  # Not critical for this test
    mock_resolver.get_fx.side_effect = lambda cur, dt: fx_map.get((cur, dt), 1.0)
    mock_resolver.get_security_currency.return_value = "USD"

    # --- Run Engine ---
    engine = PerformanceEngine(conn, mock_resolver)
    active_lots = engine.get_fifo_active_lots()
    conn.close()

    # --- Assertions ---
    assert "sec-usd" in active_lots
    assert len(active_lots["sec-usd"]) == 1

    remaining_lot = active_lots["sec-usd"][0]
    assert isinstance(remaining_lot, Lot)

    # 5 shares should be left from the second purchase
    assert remaining_lot.shares == pytest.approx(5.0)
    assert remaining_lot.date == datetime(2023, 2, 1, 0, 0, tzinfo=UTC)

    # Price should be the net price per share of the second buy
    # 1200 USD / 10 shares = 120 USD per share
    assert remaining_lot.price_native == pytest.approx(120.0)
    assert remaining_lot.fx_rate == 1.1
