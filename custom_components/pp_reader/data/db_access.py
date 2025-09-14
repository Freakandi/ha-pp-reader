"""
Provide database access functions and data models.

Handle transactions, securities, accounts, portfolios,
and related data in a SQLite database.
"""

import logging
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any, List

_LOGGER = logging.getLogger(__name__)


@dataclass
class MetaData:
    """Metadaten der DB."""

    key: str
    date: str


@dataclass
class Transaction:
    """Repräsentiert eine Transaktion in der Datenbank."""

    uuid: str
    type: int
    account: str | None
    portfolio: str | None
    other_account: str | None
    other_portfolio: str | None
    date: str  # ISO8601 Format
    currency_code: str
    amount: int  # Cent-Betrag
    shares: int | None  # *10^8 für Genauigkeit
    security: str | None  # Security UUID


@dataclass
class Security:
    """Repräsentiert ein Wertpapier in der Datenbank."""

    uuid: str
    name: str
    currency_code: str
    note: str | None = None
    isin: str | None = None
    wkn: str | None = None
    ticker_symbol: str | None = None
    retired: bool = False
    updated_at: str | None = None
    last_price: int | None = None  # Preis in 10^-8 Einheiten
    last_price_date: int | None = None  # Unix Timestamp aus Protobuf


@dataclass
class Account:
    """Repräsentiert ein Konto in der Datenbank."""

    uuid: str
    name: str
    currency_code: str
    note: str | None = None
    is_retired: bool = False
    balance: int = 0  # Cent-Betrag


@dataclass
class Portfolio:
    """Repräsentiert ein Portfolio in der Datenbank."""

    uuid: str
    name: str
    note: str | None = None
    reference_account: str | None = None
    is_retired: bool = False


@dataclass
class PortfolioSecurity:
    """Repräsentiert die Zuordnung eines Wertpapiers zu einem Depot."""

    portfolio_uuid: str
    security_uuid: str
    current_holdings: float  # Aktueller Bestand des Wertpapiers im Depot
    purchase_value: int  # Gesamter Kaufpreis des Bestands in Cent
    avg_price: float | None = None  # Durchschnittlicher Kaufpreis in Cent
    current_value: float | None = None  # Aktueller Wert des Bestands in Cent


def get_transactions(
    db_path: Path | None = None, conn: sqlite3.Connection | None = None
) -> list[Transaction]:
    """Lädt alle Transaktionen aus der DB."""
    if conn is None:
        if db_path is None:
            raise ValueError("Entweder db_path oder conn muss angegeben werden.")
        conn = sqlite3.connect(str(db_path))

    try:
        cur = conn.execute("""
            SELECT uuid, type, account, portfolio,
                   other_account, other_portfolio,
                   date, currency_code, amount,
                   shares, security
            FROM transactions
            ORDER BY date
        """)
        return [Transaction(*row) for row in cur.fetchall()]
    except sqlite3.Error:
        _LOGGER.exception("Fehler beim Laden der Transaktionen")
        return []
    finally:
        if db_path is not None:  # Verbindung nur schließen, wenn hier geöffnet wurde
            conn.close()


def get_securities(db_path: Path) -> dict[str, Security]:
    """Lädt alle Wertpapiere aus der DB."""
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.execute("""
            SELECT uuid, name, currency_code,
                   note, isin, wkn, ticker_symbol,
                   retired, updated_at,
                   last_price, last_price_date
            FROM securities
            ORDER BY name
        """)
        return {
            row[0]: Security(
                uuid=row[0],
                name=row[1],
                currency_code=row[2],
                note=row[3],
                isin=row[4],
                wkn=row[5],
                ticker_symbol=row[6],
                retired=bool(row[7]),
                updated_at=row[8],
                last_price=row[9],
                last_price_date=row[10],
            )
            for row in cur.fetchall()
        }
    except sqlite3.Error:
        _LOGGER.exception("Fehler beim Laden der Wertpapiere")
        return {}
    finally:
        conn.close()


def get_securities_by_id(db_path: Path) -> dict[str, Security]:
    """Lädt alle Wertpapiere aus der DB und gibt sie als UUID-Dictionary zurück."""
    return get_securities(db_path)  # get_securities gibt bereits ein Dict zurück


def get_portfolio_by_name(db_path: Path, name: str) -> Portfolio | None:
    """Findet ein Portfolio anhand des Namens."""
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.execute(
            """
            SELECT uuid, name, note, reference_account, COALESCE(is_retired, 0)
            FROM portfolios
            WHERE name = ?
        """,
            (name,),
        )
        row = cur.fetchone()
        return Portfolio(*row) if row else None
    finally:
        conn.close()


def get_portfolio_by_uuid(db_path: Path, uuid: str) -> Portfolio | None:
    """Lädt ein Portfolio anhand seiner UUID aus der DB."""
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.execute(
            """
            SELECT uuid, name, note, reference_account, COALESCE(is_retired, 0)
            FROM portfolios
            WHERE uuid = ?
        """,
            (uuid,),
        )
        row = cur.fetchone()
        return Portfolio(*row) if row else None
    finally:
        conn.close()


def get_accounts(db_path: Path) -> list[Account]:
    """Lädt alle Konten aus der DB."""
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.execute("""
            SELECT uuid, name, currency_code, note, COALESCE(is_retired, 0), balance
            FROM accounts
            ORDER BY name
        """)
        return [Account(*row) for row in cur.fetchall()]
    except sqlite3.Error:
        _LOGGER.exception("Fehler beim Laden der Konten")
        return []
    finally:
        conn.close()


def get_portfolios(db_path: Path) -> list[Portfolio]:
    """Lädt alle Portfolios aus der DB."""
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.execute("""
            SELECT uuid, name, note, reference_account, COALESCE(is_retired, 0)
            FROM portfolios
            ORDER BY name
        """)
        return [Portfolio(*row) for row in cur.fetchall()]
    except sqlite3.Error:
        _LOGGER.exception("Fehler beim Laden der Portfolios")
        return []
    finally:
        conn.close()


def get_account_update_timestamp(db_path: Path, account_uuid: str) -> str | None:
    """Holt den letzten Update-Zeitstempel eines Kontos aus der DB."""
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.execute(
            "SELECT updated_at FROM accounts WHERE uuid = ?", (account_uuid,)
        )
        result = cur.fetchone()
        return result[0] if result else None
    except sqlite3.Error:
        _LOGGER.exception("DB-Fehler beim Lesen des Timestamps")
        return None
    finally:
        conn.close()


def get_last_file_update(db_path: Path) -> str | None:
    """Liest das letzte Änderungsdatum der Portfolio-Datei aus der Datenbank."""
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.execute("SELECT date FROM metadata WHERE key = 'last_file_update'")
        row = cur.fetchone()
        return row[0] if row else None
    except sqlite3.Error:
        _LOGGER.exception("Fehler beim Abrufen von last_file_update")
        return None
    finally:
        conn.close()


def get_portfolio_securities(
    db_path: Path, portfolio_uuid: str
) -> list[PortfolioSecurity]:
    """Lädt alle Wertpapiere eines Depots aus der Tabelle portfolio_securities."""
    conn = sqlite3.connect(str(db_path))
    try:
        # _LOGGER.debug("Lese portfolio_securities für portfolio_uuid=%s", portfolio_uuid)
        cur = conn.execute(
            """
            SELECT portfolio_uuid, security_uuid, current_holdings,
                   purchase_value, avg_price, current_value
            FROM portfolio_securities
            WHERE portfolio_uuid = ?
        """,
            (portfolio_uuid,),
        )
        return [PortfolioSecurity(*row) for row in cur.fetchall()]
    except sqlite3.Error:
        _LOGGER.exception(
            "Fehler beim Laden der Wertpapiere für das Depot %s", portfolio_uuid
        )
        return []
    finally:
        conn.close()


def get_all_portfolio_securities(db_path: Path) -> list[PortfolioSecurity]:
    """Lädt alle Einträge aus der Tabelle portfolio_securities."""
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.execute("""
            SELECT portfolio_uuid, security_uuid, current_holdings,
                   purchase_value, avg_price, current_value
            FROM portfolio_securities
        """)
        return [PortfolioSecurity(*row) for row in cur.fetchall()]
    except sqlite3.Error:
        _LOGGER.exception(
            "Fehler beim Laden aller Wertpapiere aus portfolio_securities"
        )
        return []
    finally:
        conn.close()


def get_portfolio_positions(db_path: Path, portfolio_uuid: str) -> list[dict[str, Any]]:
    """
    Liefert die Positionen (Wertpapiere) eines Depots inkl. Kauf-/Aktueller Wert und Gewinn.

    Rückgabe:
    [
      {
        "security_uuid": str,
        "name": str,
        "current_holdings": float,
        "purchase_value": float,   # EUR
        "current_value": float,    # EUR
        "gain_abs": float,         # EUR
        "gain_pct": float          # %
      },
      ...
    ]
    """
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT
                ps.security_uuid,
                s.name,
                ps.current_holdings,
                ps.purchase_value,   -- Cent
                ps.current_value     -- Cent
            FROM portfolio_securities ps
            JOIN securities s ON s.uuid = ps.security_uuid
            WHERE ps.portfolio_uuid = ?
            ORDER BY ps.current_value DESC
            """,
            (portfolio_uuid,),
        )
        rows = cur.fetchall()

        positions: list[dict[str, Any]] = []
        for (
            security_uuid,
            name,
            current_holdings,
            purchase_value_cents,
            current_value_cents,
        ) in rows:
            purchase_value = (purchase_value_cents or 0) / 100.0
            current_value = (current_value_cents or 0) / 100.0
            gain_abs = current_value - purchase_value
            gain_pct = (gain_abs / purchase_value * 100) if purchase_value > 0 else 0.0

            positions.append(
                {
                    "security_uuid": security_uuid,
                    "name": name,
                    "current_holdings": current_holdings,
                    "purchase_value": round(purchase_value, 2),
                    "current_value": round(current_value, 2),
                    "gain_abs": round(gain_abs, 2),
                    "gain_pct": round(gain_pct, 2),
                }
            )

        return positions
    except Exception:
        _LOGGER.exception(
            "get_portfolio_positions: Fehler beim Laden der Positionen für Portfolio %s",
            portfolio_uuid,
        )
        return []
    finally:
        conn.close()
