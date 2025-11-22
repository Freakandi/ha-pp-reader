from __future__ import annotations

import sqlite3
from pathlib import Path

from custom_components.pp_reader.data.canonical_sync import _lookup_fx_rate


def test_lookup_fx_rate_falls_back_to_available_future_rate(tmp_path: Path) -> None:
    """Return the earliest available FX rate when no historical match exists."""
    db_path = tmp_path / "fx.db"
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            CREATE TABLE fx_rates (
                date TEXT,
                currency TEXT,
                rate REAL,
                fetched_at TEXT,
                data_source TEXT,
                provider TEXT,
                provenance TEXT
            )
            """
        )
        conn.execute(
            """
            INSERT INTO fx_rates (date, currency, rate)
            VALUES ('2025-11-22', 'JPY', 180.56)
            """
        )
        conn.commit()

        rate = _lookup_fx_rate(conn, "JPY", "2025-09-09T00:00:00+00:00")
        assert rate == 180.56
    finally:
        conn.close()
