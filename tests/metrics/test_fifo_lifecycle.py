"""Test the lifecycle FIFO calculation in the PerformanceEngine."""

from __future__ import annotations

import sqlite3
from datetime import UTC, datetime
from typing import TYPE_CHECKING
from unittest.mock import MagicMock

import pytest

from custom_components.pp_reader.const import TransactionType
from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.metrics.calculator import PerformanceEngine

if TYPE_CHECKING:
    from pathlib import Path


# Helper to insert a transaction
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


def test_fifo_lifecycle_calculation(tmp_path: Path) -> None:
    """
    Verify the FIFO logic for a multi-lot buy and a multi-lot sell.

    Scenario:
    1. Buy 10 shares @ 100 USD (FX 1.2)
    2. Buy 10 shares @ 120 USD (FX 1.1)
    3. Sell 15 shares @ 150 USD (FX 1.0)
    """
    db_path = tmp_path / "test.db"
    initialize_database_schema(db_path)
    conn = sqlite3.connect(db_path)

    # --- Setup Data (use date strings without time) ---
    _insert_transaction(
        conn,
        "tx1",
        TransactionType.BUY,
        "2023-01-01",
        "sec-usd",
        10.0,
        1000.0,
    )
    _insert_transaction(
        conn,
        "tx2",
        TransactionType.BUY,
        "2023-02-01",
        "sec-usd",
        10.0,
        1200.0,
    )
    _insert_transaction(
        conn,
        "tx3",
        TransactionType.SELL,
        "2023-03-01",
        "sec-usd",
        15.0,
        2250.0,
    )
    conn.commit()

    # --- Mock Market Data (use normalized datetime keys) ---
    mock_resolver = MagicMock()
    price_map = {
        ("sec-usd", datetime(2023, 1, 1, tzinfo=UTC)): 100.0,
        ("sec-usd", datetime(2023, 2, 1, tzinfo=UTC)): 120.0,
        ("sec-usd", datetime(2023, 3, 1, tzinfo=UTC)): 150.0,
    }
    fx_map = {
        ("USD", datetime(2023, 1, 1, tzinfo=UTC)): 1.2,
        ("USD", datetime(2023, 2, 1, tzinfo=UTC)): 1.1,
        ("USD", datetime(2023, 3, 1, tzinfo=UTC)): 1.0,
    }

    def mock_get_price(sec_uuid: str, dt: datetime) -> float:
        return price_map.get((sec_uuid, dt), 200.0)

    def mock_get_fx(currency: str, dt: datetime) -> float:
        return fx_map.get((currency, dt), 1.0)

    mock_resolver.get_price.side_effect = mock_get_price
    mock_resolver.get_fx.side_effect = mock_get_fx
    mock_resolver.get_security_currency.return_value = "USD"

    # --- Run Engine ---
    engine = PerformanceEngine(conn, mock_resolver)
    trades = engine.calculate_realized_performance()
    conn.close()

    # --- Assertions ---
    assert len(trades) == 2

    # Trade 1: Consumes the first lot of 10 shares
    trade1 = trades[0]
    assert trade1.security_uuid == "sec-usd"
    assert trade1.shares == 10.0
    assert trade1.buy_date == datetime(2023, 1, 1, 0, 0, tzinfo=UTC)
    assert trade1.sell_date == datetime(2023, 3, 1, 0, 0, tzinfo=UTC)

    # Cost = 1000 USD / 1.2 FX = 833.33 EUR
    # Value = 10 shares * (2250 / 15) USD/share / 1.0 FX = 1500.00 EUR
    # Gain = 1500 - 833.33 = 666.67 EUR
    assert trade1.buy_cost_eur == pytest.approx(1000.0 / 1.2, abs=0.01)
    assert trade1.sell_value_eur == pytest.approx(2250.0 * (10 / 15), abs=0.01)
    assert trade1.realized_gain_eur == pytest.approx(666.67, abs=0.01)

    # Opportunity Cost = (Current Price EUR - Sell Price EUR) * shares
    # (200 / 1.0 - 150 / 1.0) * 10 = 50 * 10 = 500 EUR
    assert trade1.opportunity_gain_eur == pytest.approx(500.0, abs=0.01)

    # Trade 2: Consumes 5 shares from the second lot
    trade2 = trades[1]
    assert trade2.security_uuid == "sec-usd"
    assert trade2.shares == 5.0
    assert trade2.buy_date == datetime(2023, 2, 1, 0, 0, tzinfo=UTC)
    assert trade2.sell_date == datetime(2023, 3, 1, 0, 0, tzinfo=UTC)

    # Cost = 1200 USD / 1.1 FX = 1090.91 EUR (for 10 shares) -> 545.45 EUR (for 5)
    # Value = 5 shares * (2250 / 15) USD/share / 1.0 FX = 750.00 EUR
    # Gain = 750 - 545.45 = 204.55 EUR
    assert trade2.buy_cost_eur == pytest.approx((1200.0 / 1.1) / 2, abs=0.01)
    assert trade2.sell_value_eur == pytest.approx(2250.0 * (5 / 15), abs=0.01)
    assert trade2.realized_gain_eur == pytest.approx(204.55, abs=0.01)

    # Opportunity Cost = (200 / 1.0 - 150 / 1.0) * 5 = 50 * 5 = 250 EUR
    assert trade2.opportunity_gain_eur == pytest.approx(250.0, abs=0.01)

    # Total Gain Check
    total_gain = sum(t.realized_gain_eur for t in trades)
    assert total_gain == pytest.approx(871.21, abs=0.01)
