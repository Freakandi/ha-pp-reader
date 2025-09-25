"""
Test: Keine Persistenz zusätzlicher Quote-Felder.

Verifiziert, dass _apply_price_updates ausschließlich:
  - last_price
  - last_price_source
  - last_price_fetched_at
setzt und dass keine zusätzlichen Spalten (volume, market_cap, 52W, dividend_yield ...)
existieren / beschrieben werden.

Dieser Test adressiert das QA-Item:
"Keine Persistenz zusätzlicher Quote-Felder (nur last_price/source/fetched_at)"
"""
import sqlite3
from pathlib import Path
import uuid

from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.prices.price_service import _apply_price_updates  # type: ignore


def _create_security(db_path: Path, *, symbol: str, currency: str = "EUR") -> str:
    sec_uuid = str(uuid.uuid4())
    with sqlite3.connect(str(db_path)) as conn:
        conn.execute(
            """
            INSERT INTO securities (uuid, name, isin, wkn, ticker_symbol, currency_code, type)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (sec_uuid, f"Sec {symbol}", None, None, symbol, currency, "STOCK"),
        )
        conn.commit()
    return sec_uuid


def test_only_allowed_price_columns_persisted(tmp_path):
    db_path = tmp_path / "pp.db"
    initialize_database_schema(db_path)

    sec_uuid = _create_security(db_path, symbol="ABC")

    scaled_price = int(round(12.34 * 1e8))
    fetched_at = "2024-01-01T12:00:00Z"
    updated_rows = _apply_price_updates(
        db_path,
        {sec_uuid: scaled_price},
        fetched_at=fetched_at,
        source="yahoo",
    )
    assert updated_rows == 1, "Genau eine Zeile sollte aktualisiert werden"

    with sqlite3.connect(str(db_path)) as conn:
        # Prüfe Spaltenliste – unerlaubte Persistenzfelder dürfen nicht existieren
        cur = conn.execute("PRAGMA table_info(securities)")
        cols = {row[1] for row in cur.fetchall()}
        forbidden = {
            "volume",
            "market_cap",
            "high_52w",
            "low_52w",
            "dividend_yield",
            "previous_close",
        }
        assert forbidden.isdisjoint(cols), f"Unerwartete persistierte Felder: {forbidden & cols}"

        row = conn.execute(
            "SELECT last_price, last_price_source, last_price_fetched_at FROM securities WHERE uuid=?",
            (sec_uuid,),
        ).fetchone()
        assert row is not None, "Security sollte vorhanden sein"
        last_price, last_price_source, last_price_fetched_at = row
        assert last_price == scaled_price
        assert last_price_source == "yahoo"
        assert last_price_fetched_at == fetched_at