from __future__ import annotations

import sqlite3
from typing import TYPE_CHECKING

from custom_components.pp_reader.metrics.core.fx_access import (
    get_best_available_fx_rate,
)

if TYPE_CHECKING:
    from pathlib import Path


def setup_db(db_path: Path) -> sqlite3.Connection:
    """Create a temporary database with the fx_rates table."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
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
    return conn


def test_rate_lookup_exact_match(tmp_path: Path) -> None:
    """Return the correct rate when an exact date match is found."""
    db_path = tmp_path / "fx.db"
    conn = setup_db(db_path)
    try:
        conn.execute(
            "INSERT INTO fx_rates (date, currency, rate) VALUES ('2023-01-15', 'USD', 1.08)"
        )
        conn.commit()
        rate = get_best_available_fx_rate(conn, "USD", "2023-01-15")
        assert rate == 1.08
    finally:
        conn.close()


def test_rate_lookup_fallback_backward(tmp_path: Path) -> None:
    """Return the latest available rate on or before the requested date."""
    db_path = tmp_path / "fx.db"
    conn = setup_db(db_path)
    try:
        conn.executemany(
            "INSERT INTO fx_rates (date, currency, rate) VALUES (?, ?, ?)",
            [
                ("2023-01-10", "USD", 1.05),
                ("2023-01-14", "USD", 1.07),
                ("2023-01-20", "USD", 1.09),
            ],
        )
        conn.commit()
        rate = get_best_available_fx_rate(conn, "USD", "2023-01-15")
        assert rate == 1.07
    finally:
        conn.close()


def test_rate_lookup_fallback_forward(tmp_path: Path) -> None:
    """Return the earliest available rate if no preceding rate exists."""
    db_path = tmp_path / "fx.db"
    conn = setup_db(db_path)
    try:
        conn.executemany(
            "INSERT INTO fx_rates (date, currency, rate) VALUES (?, ?, ?)",
            [
                ("2023-02-01", "JPY", 140.0),
                ("2023-02-05", "JPY", 142.5),
            ],
        )
        conn.commit()
        rate = get_best_available_fx_rate(conn, "JPY", "2023-01-20")
        assert rate == 140.0
    finally:
        conn.close()


def test_rate_lookup_eur(tmp_path: Path) -> None:
    """Always return 1.0 for EUR without querying the database."""
    db_path = tmp_path / "fx.db"
    conn = setup_db(db_path)
    try:
        rate = get_best_available_fx_rate(conn, "EUR", "2023-01-15")
        assert rate == 1.0
    finally:
        conn.close()


def test_rate_lookup_none(tmp_path: Path) -> None:
    """Return None if no rate is available for the currency."""
    db_path = tmp_path / "fx.db"
    conn = setup_db(db_path)
    try:
        rate = get_best_available_fx_rate(conn, "CAD", "2023-01-15")
        assert rate is None
    finally:
        conn.close()
