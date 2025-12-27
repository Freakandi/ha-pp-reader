"""Test the realized performance calculation."""

import sqlite3
from pathlib import Path
from unittest.mock import MagicMock, patch

from custom_components.pp_reader.data.db_access import Transaction
from custom_components.pp_reader.logic.securities import (
    calculate_realized_performance,
)


@patch(
    "custom_components.pp_reader.logic.securities.ensure_exchange_rates_for_dates_sync"
)
@patch("custom_components.pp_reader.logic.securities.load_latest_rates_sync")
def test_calculate_realized_performance_fifo(mock_load_rates, mock_ensure_rates):
    """Test FIFO logic for realized performance calculation."""
    mock_load_rates.return_value = {}
    mock_ensure_rates.return_value = None

    # Mock transactions
    transactions = [
        # Buy 10 shares @ 100
        Transaction(
            uuid="t1",
            type=0,
            date="2023-01-01T10:00:00",
            shares=1000000000,
            amount=100000,
            security="sec1",
            portfolio="port1",
            currency_code="EUR",
            account="acc1",
            other_account=None,
            other_portfolio=None,
        ),
        # Buy 10 shares @ 110
        Transaction(
            uuid="t2",
            type=0,
            date="2023-01-02T10:00:00",
            shares=1000000000,
            amount=110000,
            security="sec1",
            portfolio="port1",
            currency_code="EUR",
            account="acc1",
            other_account=None,
            other_portfolio=None,
        ),
        # Sell 5 shares @ 120
        Transaction(
            uuid="t3",
            type=1,
            date="2023-01-03T10:00:00",
            shares=-500000000,
            amount=-60000,
            security="sec1",
            portfolio="port1",
            currency_code="EUR",
            account="acc1",
            other_account=None,
            other_portfolio=None,
        ),
        # Sell 10 shares @ 130
        Transaction(
            uuid="t4",
            type=1,
            date="2023-01-04T10:00:00",
            shares=-1000000000,
            amount=-130000,
            security="sec1",
            portfolio="port1",
            currency_code="EUR",
            account="acc1",
            other_account=None,
            other_portfolio=None,
        ),
    ]

    # Mock DB connection and cursor
    mock_conn = MagicMock(spec=sqlite3.Connection)
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_cursor.fetchall.return_value = [
        {
            "uuid": "sec1",
            "name": "Test Security",
            "ticker_symbol": "TEST",
            "last_price": 13500,
            "currency_code": "EUR",
        }
    ]

    # Mock db_path
    mock_db_path = MagicMock(spec=Path)

    # Execute the function
    results = calculate_realized_performance(
        transactions, mock_db_path, tx_units=None, conn=mock_conn
    )

    # Assertions
    assert len(results) == 1
    sec_result = results[0]
    assert sec_result.security_uuid == "sec1"
    assert sec_result.name == "Test Security"
    assert sec_result.current_holdings == 5.0

    # Check lots
    assert len(sec_result.lots) == 2

    # First sell lot (5 shares)
    lot1 = sec_result.lots[0]
    assert lot1.shares == 5.0
    assert lot1.purchase_value_gross == 500.0  # 5 * 100
    assert lot1.sales_value_net == 600.0
    assert lot1.result_abs == 100.0
    assert round(lot1.result_pct, 2) == 20.0

    # Second sell lot (10 shares)
    lot2 = sec_result.lots[1]
    assert lot2.shares == 10.0
    # Cost basis: 5 from first buy (5*100) + 5 from second buy (5*110)
    assert lot2.purchase_value_gross == 1050.0
    assert lot2.sales_value_net == 1300.0
    assert lot2.result_abs == 250.0
    assert round(lot2.result_pct, 2) == 23.81

    # Check aggregated results
    assert sec_result.purchase_value_gross == 1550.0  # 500 + 1050
    assert sec_result.sales_value_net == 1900.0  # 600 + 1300
    assert sec_result.result_abs == 350.0  # 100 + 250
    assert round(sec_result.result_pct, 2) == 22.58
