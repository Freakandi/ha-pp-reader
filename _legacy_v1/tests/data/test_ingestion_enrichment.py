"""Test the ingestion enrichment logic for EUR valuations."""

import sqlite3
from collections.abc import Iterable
from datetime import UTC, datetime
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from custom_components.pp_reader.data.canonical_sync import (
    _sync_ingestion_to_canonical,
)
from custom_components.pp_reader.data.db_schema import (
    ALL_SCHEMAS,
)
from custom_components.pp_reader.data.ingestion_writer import (
    IngestionWriter,
)
from custom_components.pp_reader.models.parsed import (
    ParsedTransaction,
    ParsedTransactionUnit,
)
from custom_components.pp_reader.util.currency import cent_to_eur

TABLE_INGESTION_TRANSACTIONS = "ingestion_transactions"
TABLE_TRANSACTIONS = "transactions"


def _create_schema(conn: sqlite3.Connection, schema: Iterable[str]) -> None:
    """Execute a series of SQL statements to create the database schema."""
    for statement in schema:
        conn.execute(statement)


@pytest.fixture
def mock_db(tmp_path: Path) -> Path:
    """Create a mock database with the required schema."""
    db_path = tmp_path / "test.db"
    conn = sqlite3.connect(db_path)
    _create_schema(conn, ALL_SCHEMAS)
    conn.close()
    return db_path


def _get_transaction(
    conn: sqlite3.Connection, uuid: str, table: str = TABLE_INGESTION_TRANSACTIONS
) -> sqlite3.Row | None:
    """Fetch a transaction from the database by UUID."""
    cursor = conn.execute(f"SELECT * FROM {table} WHERE uuid = ?", (uuid,))
    return cursor.fetchone()


@patch(
    "custom_components.pp_reader.data.ingestion_writer.ensure_exchange_rates_for_dates_sync"
)
@patch("custom_components.pp_reader.data.ingestion_writer.get_best_available_fx_rate")
def test_valuation_buy_usd_implicit_rate(
    mock_get_rate: MagicMock, mock_ensure_rates: MagicMock, mock_db: Path
) -> None:
    """Test valuation of a USD purchase with an implicit (calculated) rate."""
    conn = sqlite3.connect(mock_db)
    conn.row_factory = sqlite3.Row
    mock_get_rate.return_value = 0.8333  # Divisive rate: 1 USD = 0.8333 EUR

    tx = ParsedTransaction(
        uuid="tx_buy_usd",
        type=0,
        date=datetime(2023, 1, 1, 12, 0, 0, tzinfo=UTC),
        account="acc_usd",
        portfolio="port_main",
        currency_code="USD",
        amount=-10000,
        shares=10 * 10**8,
        security="sec_usd",
        other_account=None,
        other_portfolio=None,
        other_uuid=None,
        other_updated_at=None,
        note=None,
        source=None,
        updated_at=None,
    )

    writer = IngestionWriter(conn, db_path=mock_db)
    writer.write_transactions([tx])

    result = _get_transaction(conn, "tx_buy_usd")
    assert result is not None
    assert result["amount_eur_cents"] == -12000
    assert result["fx_rate_used"] == pytest.approx(1 / 0.8333)
    mock_get_rate.assert_called_once()


@patch(
    "custom_components.pp_reader.data.ingestion_writer.ensure_exchange_rates_for_dates_sync"
)
@patch("custom_components.pp_reader.data.ingestion_writer.get_best_available_fx_rate")
def test_valuation_transfer_usd_eur_protocol(
    mock_get_rate: MagicMock, mock_ensure_rates: MagicMock, mock_db: Path
) -> None:
    """Test the Transfer Protocol where the EUR leg dictates the final value."""
    conn = sqlite3.connect(mock_db)
    conn.row_factory = sqlite3.Row
    mock_get_rate.return_value = 1.075  # 1 USD = 1/1.075 EUR

    tx_eur_out = ParsedTransaction(
        uuid="tx_eur_out",
        type=4,
        date=datetime(2023, 1, 2, 12, 0, 0, tzinfo=UTC),
        account="acc_eur",
        portfolio="port_main",
        other_uuid="tx_usd_in",
        currency_code="EUR",
        amount=-10000,
        other_account=None,
        other_portfolio=None,
        other_updated_at=None,
        shares=None,
        note=None,
        security=None,
        source=None,
        updated_at=None,
    )
    tx_usd_in = ParsedTransaction(
        uuid="tx_usd_in",
        type=5,
        date=datetime(2023, 1, 2, 12, 0, 0, tzinfo=UTC),
        account="acc_usd",
        portfolio="port_main",
        other_uuid="tx_eur_out",
        currency_code="USD",
        amount=9250,
        other_account=None,
        other_portfolio=None,
        other_updated_at=None,
        shares=None,
        note=None,
        security=None,
        source=None,
        updated_at=None,
    )

    writer = IngestionWriter(conn, db_path=mock_db)
    writer.write_transactions([tx_eur_out, tx_usd_in])
    conn.commit()
    conn.close()
    _sync_ingestion_to_canonical(mock_db)
    conn = sqlite3.connect(mock_db)
    conn.row_factory = sqlite3.Row

    eur_leg = _get_transaction(conn, "tx_eur_out", table=TABLE_TRANSACTIONS)
    usd_leg = _get_transaction(conn, "tx_usd_in", table=TABLE_TRANSACTIONS)

    assert eur_leg is not None
    assert usd_leg is not None
    assert eur_leg["amount_eur_cents"] == -10000
    assert eur_leg["fx_rate_used"] == 1.0

    # The USD leg's value is forced to be the inverse of the EUR leg.
    assert usd_leg["amount_eur_cents"] == 10000

    # The effective rate is EUR value / native value.
    # 100 EUR / 92.50 USD = 1.081...
    effective_rate = cent_to_eur(10000) / cent_to_eur(9250)
    assert usd_leg["fx_rate_used"] == pytest.approx(effective_rate)


@patch(
    "custom_components.pp_reader.data.ingestion_writer.ensure_exchange_rates_for_dates_sync"
)
@patch("custom_components.pp_reader.data.ingestion_writer.get_best_available_fx_rate")
def test_valuation_transfer_usd_jpy_protocol(
    mock_get_rate: MagicMock, mock_ensure_rates: MagicMock, mock_db: Path
) -> None:
    """Test the Transfer Protocol averaging for a Foreign/Foreign transfer."""
    conn = sqlite3.connect(mock_db)
    conn.row_factory = sqlite3.Row

    def mock_rate_selector(conn, from_currency, for_date):
        if from_currency == "USD":
            return 1.1111
        if from_currency == "JPY":
            return 166.6667
        return 1.0

    mock_get_rate.side_effect = mock_rate_selector

    tx_usd_out = ParsedTransaction(
        uuid="tx_usd_out",
        type=4,
        date=datetime(2023, 1, 3, 12, 0, 0, tzinfo=UTC),
        account="acc_usd",
        portfolio="port_main",
        other_uuid="tx_jpy_in",
        currency_code="USD",
        amount=-10000,
        other_account=None,
        other_portfolio=None,
        other_updated_at=None,
        shares=None,
        note=None,
        security=None,
        source=None,
        updated_at=None,
    )
    tx_jpy_in = ParsedTransaction(
        uuid="tx_jpy_in",
        type=5,
        date=datetime(2023, 1, 3, 12, 0, 0, tzinfo=UTC),
        account="acc_jpy",
        portfolio="port_main",
        other_uuid="tx_usd_out",
        currency_code="JPY",
        amount=1400000,
        other_account=None,
        other_portfolio=None,
        other_updated_at=None,
        shares=None,
        note=None,
        security=None,
        source=None,
        updated_at=None,
    )

    writer = IngestionWriter(conn, db_path=mock_db)
    writer.write_transactions([tx_usd_out, tx_jpy_in])
    conn.commit()
    conn.close()
    _sync_ingestion_to_canonical(mock_db)
    conn = sqlite3.connect(mock_db)
    conn.row_factory = sqlite3.Row

    usd_leg = _get_transaction(conn, "tx_usd_out", table=TABLE_TRANSACTIONS)
    jpy_leg = _get_transaction(conn, "tx_jpy_in", table=TABLE_TRANSACTIONS)

    assert usd_leg is not None
    assert jpy_leg is not None

    avg_magnitude = 8700
    assert usd_leg["amount_eur_cents"] == -avg_magnitude
    assert jpy_leg["amount_eur_cents"] == avg_magnitude

    # Assert effective rates based on the final averaged EUR value.
    effective_rate_usd = cent_to_eur(avg_magnitude) / cent_to_eur(10000)
    effective_rate_jpy = cent_to_eur(avg_magnitude) / cent_to_eur(1400000)
    assert usd_leg["fx_rate_used"] == pytest.approx(effective_rate_usd)
    assert jpy_leg["fx_rate_used"] == pytest.approx(effective_rate_jpy)


@patch(
    "custom_components.pp_reader.data.ingestion_writer.ensure_exchange_rates_for_dates_sync"
)
@patch("custom_components.pp_reader.data.ingestion_writer.get_best_available_fx_rate")
def test_enrichment_of_transaction_units(
    mock_get_rate: MagicMock, mock_ensure_rates: MagicMock, mock_db: Path
) -> None:
    """Ensure fees/taxes in transaction_units are also enriched."""
    conn = sqlite3.connect(mock_db)
    conn.row_factory = sqlite3.Row
    mock_get_rate.return_value = 0.8333

    tx = ParsedTransaction(
        uuid="tx_with_fees",
        type=0,
        date=datetime(2023, 1, 4, 12, 0, 0, tzinfo=UTC),
        account="acc_usd",
        portfolio="port_main",
        currency_code="USD",
        amount=-10200,
        shares=10 * 10**8,
        security="sec_usd",
        other_account=None,
        other_portfolio=None,
        other_uuid=None,
        other_updated_at=None,
        note=None,
        source=None,
        updated_at=None,
        units=[
            ParsedTransactionUnit(
                type="FEE", amount=-200, currency_code="USD", fx_rate_to_base=None
            )
        ],
    )

    writer = IngestionWriter(conn, db_path=mock_db)
    writer.write_transactions([tx])
    conn.commit()
    conn.close()
    _sync_ingestion_to_canonical(mock_db)
    conn = sqlite3.connect(mock_db)
    conn.row_factory = sqlite3.Row

    cursor = conn.execute(
        "SELECT * FROM transaction_units WHERE transaction_uuid = ?",
        ("tx_with_fees",),
    )
    unit = cursor.fetchone()

    assert unit is not None
    assert unit["amount_eur_cents"] == -240
    assert unit["fx_rate_used"] == pytest.approx(1 / 0.8333)
