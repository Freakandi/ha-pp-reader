"""Tests for the ingestion enrichment logic."""

import sqlite3
from datetime import UTC, datetime

import pytest

from custom_components.pp_reader.data.db_schema import FX_SCHEMA, INGESTION_SCHEMA
from custom_components.pp_reader.data.ingestion_writer import IngestionWriter


# A mock object to simulate the structure of parsed_models
class MockParsedTransaction:
    def __init__(self, **kwargs):
        self.uuid = kwargs.get("uuid")
        self.type = kwargs.get("type")
        self.date = kwargs.get("date")
        self.amount = kwargs.get("amount")
        self.currency_code = kwargs.get("currency_code")
        self.units = kwargs.get("units", [])
        # Add other fields as needed for tests
        self.account = kwargs.get("account")
        self.portfolio = kwargs.get("portfolio")
        self.other_account = kwargs.get("other_account")
        self.other_portfolio = kwargs.get("other_portfolio")
        self.other_uuid = kwargs.get("other_uuid")
        self.other_updated_at = kwargs.get("other_updated_at")
        self.shares = kwargs.get("shares")
        self.note = kwargs.get("note")
        self.security = kwargs.get("security")
        self.source = kwargs.get("source")
        self.updated_at = kwargs.get("updated_at")

class MockParsedTransactionUnit:
    def __init__(self, **kwargs):
        self.type = kwargs.get("type")
        self.amount = kwargs.get("amount")
        self.currency_code = kwargs.get("currency_code")
        self.fx_amount = kwargs.get("fx_amount")
        self.fx_currency_code = kwargs.get("fx_currency_code")
        self.fx_rate_to_base = kwargs.get("fx_rate_to_base")


@pytest.fixture
def conn():
    """Fixture for an in-memory SQLite database connection."""
    db_conn = sqlite3.connect(":memory:")
    # The writer expects the ingestion tables to exist.
    for schema in INGESTION_SCHEMA + FX_SCHEMA:
        db_conn.execute(schema)
    yield db_conn
    db_conn.close()


def test_valuation_buy_usd_implicit_rate(conn):
    """Test valuation of a USD transaction with an implicit FX rate in its units."""
    # Arrange
    writer = IngestionWriter(conn)
    tx_date = datetime(2023, 1, 15, tzinfo=UTC)

    # Mock transaction with a fee unit that contains an implicit FX rate
    transactions = [
        MockParsedTransaction(
            uuid="tx1",
            type=1, # Buy
            date=tx_date,
            amount=-10000,  # -100.00 USD
            currency_code="USD",
            units=[
                MockParsedTransactionUnit(
                    type=10,  # Fee
                    amount=-100,  # -1.00 USD
                    currency_code="USD",
                        fx_amount=-93,  # This implies a rate of 0.9276
                    fx_currency_code="EUR",
                        fx_rate_to_base=0.9276,
                )
            ],
        )
    ]

    # Act
    writer.write_transactions(transactions)

    # Assert
    cursor = conn.cursor()
    cursor.execute("SELECT amount_eur_cents, fx_rate_used FROM ingestion_transactions WHERE uuid='tx1'")
    row = cursor.fetchone()

    assert row is not None
    # The amount is -100.00 USD. With a rate of 0.9276, this should be -92.76 EUR, or -9276 cents.
    assert row[0] == -9276
    assert row[1] == pytest.approx(0.9276)

    cursor.execute("SELECT amount_eur_cents, fx_rate_used FROM ingestion_transaction_units WHERE transaction_uuid='tx1'")
    unit_row = cursor.fetchone()
    assert unit_row is not None
    # The unit amount is -1.00 USD. With a rate of 0.9276, this should be -0.9276 EUR, or -93 cents (rounded).
    assert unit_row[0] == -93
    assert unit_row[1] == pytest.approx(0.9276)
