"""
Provide database access functions and data models.

Handle transactions, securities, accounts, portfolios,
and related data in a SQLite database.
"""

import logging
import sqlite3
from collections.abc import Iterator
from contextlib import suppress
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

_LOGGER = logging.getLogger("custom_components.pp_reader.data.db_access")


_MISSING_DB_RESOURCE_MESSAGE = "Entweder db_path oder conn muss angegeben werden."


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
    type: str | None = None
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
            raise ValueError(_MISSING_DB_RESOURCE_MESSAGE)
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
        cur = conn.execute(
            """
            SELECT uuid, name, type, currency_code,
                   isin, wkn, ticker_symbol,
                   retired, updated_at,
                   last_price, last_price_date
            FROM securities
            ORDER BY name
            """
        )
        return {
            row[0]: Security(
                uuid=row[0],
                name=row[1],
                type=row[2],
                currency_code=row[3],
                note=None,  # keine Spalte in Schema → bewusst None
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


def iter_security_close_prices(
    db_path: Path,
    security_uuid: str,
    start_date: int | None = None,
    end_date: int | None = None,
) -> Iterator[tuple[int, int]]:
    """Liefert tägliche Schlusskurse eines Wertpapiers in aufsteigender Reihenfolge."""
    if not security_uuid:
        message = "security_uuid darf nicht leer sein"
        raise ValueError(message)

    if start_date is not None and not isinstance(start_date, int):
        message = "start_date muss vom Typ int oder None sein"
        raise TypeError(message)
    if end_date is not None and not isinstance(end_date, int):
        message = "end_date muss vom Typ int oder None sein"
        raise TypeError(message)
    if start_date is not None and end_date is not None and end_date < start_date:
        message = "end_date muss größer oder gleich start_date sein"
        raise ValueError(message)

    try:
        conn = sqlite3.connect(str(db_path))
    except sqlite3.Error:
        _LOGGER.exception(
            "Fehler beim Öffnen der Datenbank für historische Preise (db_path=%s)",
            db_path,
        )
        return

    try:
        sql = [
            "SELECT date, close",
            "FROM historical_prices",
            "WHERE security_uuid = ?",
        ]
        params: list[Any] = [security_uuid]

        if start_date is not None:
            sql.append("AND date >= ?")
            params.append(start_date)
        if end_date is not None:
            sql.append("AND date <= ?")
            params.append(end_date)

        sql.append("ORDER BY date ASC")
        statement = " ".join(sql)

        try:
            cursor = conn.execute(statement, params)
        except sqlite3.Error:
            _LOGGER.exception(
                "Fehler beim Lesen historischer Preise (security_uuid=%s)",
                security_uuid,
            )
            return

        try:
            for date_value, close_value in cursor:
                yield int(date_value), int(close_value)
        except sqlite3.Error:
            _LOGGER.exception(
                "Fehler beim Iterieren historischer Preise (security_uuid=%s)",
                security_uuid,
            )
    finally:
        with suppress(sqlite3.Error):
            conn.close()


def get_security_close_prices(
    db_path: Path,
    security_uuid: str,
    start_date: int | None = None,
    end_date: int | None = None,
) -> list[tuple[int, int]]:
    """Gibt tägliche Schlusskurse eines Wertpapiers als Liste zurück."""
    return list(
        iter_security_close_prices(
            db_path=db_path,
            security_uuid=security_uuid,
            start_date=start_date,
            end_date=end_date,
        )
    )


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
        _LOGGER.debug("Lese portfolio_securities für portfolio_uuid=%s", portfolio_uuid)
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


def get_security_snapshot(db_path: Path, security_uuid: str) -> dict[str, Any]:
    """Aggregate holdings and EUR-normalised pricing for a security."""
    if not security_uuid:
        message = "security_uuid darf nicht leer sein"
        raise ValueError(message)

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        from custom_components.pp_reader.logic.portfolio import (  # local import
            normalize_price_to_eur_sync,
        )

        cursor = conn.execute(
            """
            SELECT name, currency_code, COALESCE(last_price, 0) AS last_price
            FROM securities
            WHERE uuid = ?
            """,
            (security_uuid,),
        )
        security_row = cursor.fetchone()
        if security_row is None:
            raise LookupError(f"Unbekannte security_uuid: {security_uuid}")

        holdings_cursor = conn.execute(
            """
            SELECT COALESCE(SUM(current_holdings), 0)
            FROM portfolio_securities
            WHERE security_uuid = ?
            """,
            (security_uuid,),
        )
        holdings_row = holdings_cursor.fetchone()
        total_holdings = (
            float(holdings_row[0])
            if holdings_row and holdings_row[0] is not None
            else 0.0
        )

        raw_price = security_row["last_price"]
        currency_code: str = security_row["currency_code"] or "EUR"
        reference_date = datetime.now()  # noqa: DTZ005
        last_price_eur = normalize_price_to_eur_sync(
            raw_price, currency_code, reference_date, db_path
        )
        market_value_eur = round(total_holdings * last_price_eur, 2)

        return {
            "name": security_row["name"],
            "currency_code": currency_code,
            "total_holdings": round(total_holdings, 6),
            "last_price_eur": round(last_price_eur, 4),
            "market_value_eur": market_value_eur,
        }
    finally:
        conn.close()


def get_portfolio_positions(db_path: Path, portfolio_uuid: str) -> list[dict[str, Any]]:
    """
    Liefert Depot-Positionen inklusive Kaufwert, aktuellem Wert und Gewinn.

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
            ORDER BY s.name ASC   -- Alphabetische Standardsortierung
                                    -- (vorher: aktueller Wert DESC)
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

    except Exception:
        _LOGGER.exception(
            "get_portfolio_positions: Fehler beim Laden der Positionen für "
            "Portfolio %s",
            portfolio_uuid,
        )
        return []
    else:
        return positions
    finally:
        conn.close()


def _normalize_portfolio_row(row: sqlite3.Row) -> dict[str, Any]:
    """
    Map a sqlite3.Row to the unified portfolio dict format.

    Expected columns (query responsibility):
      - uuid
      - name
      - current_value (Cent)
      - purchase_sum (Cent)
      - position_count
    """

    def _cent_to_eur(value: Any) -> float:
        if value is None:
            return 0.0
        try:
            return round(float(value) / 100.0, 2)
        except (TypeError, ValueError):
            return 0.0

    current_value = _cent_to_eur(row["current_value"])
    purchase_sum = _cent_to_eur(row["purchase_sum"])

    gain_abs = round(current_value - purchase_sum, 2)
    gain_pct = round((gain_abs / purchase_sum * 100) if purchase_sum > 0 else 0.0, 2)

    return {
        "uuid": row["uuid"],
        "name": row["name"],
        "current_value": current_value,
        "purchase_sum": purchase_sum,
        "gain_abs": gain_abs,
        "gain_pct": gain_pct,
        "position_count": row["position_count"]
        if row["position_count"] is not None
        else 0,
    }


def fetch_live_portfolios(db_path: Path) -> list[dict[str, Any]]:
    """
    Aggregiert aktuelle Portfoliodaten aus der SQLite-DB (Single Source of Truth).

    Rückgabeformat (vereinheitlicht - WebSocket & Event Konsum):
        [
          {
            "uuid": <str>,
            "name": <str>,
            "current_value": <float>,    # EUR (2 Nachkommastellen)
            "purchase_sum": <float>,     # EUR (2 Nachkommastellen)
            "gain_abs": <float>,         # EUR (2 Nachkommastellen)
            "gain_pct": <float>,         # % (2 Nachkommastellen)
            "position_count": <int>
          },
          ...
        ]

    Fehlerbehandlung:
      - Bei beliebigem Fehler (SQLite / unerwartete Column Issues) wird eine leere Liste
        zurückgegeben, der Fehler geloggt (exception Log). Dies verhindert einen
        kompletten Ausfall des WebSocket Handlers und hält den Fallback deterministisch.
        (Bewusst gewählt für On-Demand Pfad; Sensoren bleiben Coordinator-basiert.)

    Performance:
      - Nutzung des Index `idx_portfolio_securities_portfolio` (siehe Schema).
      - OPTIONAL (später): Mikro-Caching (≤5s) falls Messungen Bedarf zeigen.
    """
    conn: sqlite3.Connection | None = None
    try:
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        # NOTE: current_value & purchase_sum aggregieren die verknüpften
        # Positionen.
        # Nutzung last_price falls vorhanden erfolgt bereits beim Update der
        # portfolio_securities Tabelle (Annahme lt. Architektur), daher hier
        # direkte Summen.
        # Falls zukünftig ein direkter JOIN zu securities.last_price nötig wäre,
        # würde dies hier zentral ergänzt.
        sql = """
        SELECT
            p.uuid AS uuid,
            p.name AS name,
            COALESCE(SUM(ps.current_value), 0) AS current_value,
            COALESCE(SUM(ps.purchase_value), 0) AS purchase_sum,
            COUNT(CASE WHEN ps.current_holdings > 0 THEN 1 END) AS position_count
        FROM portfolios p
        LEFT JOIN portfolio_securities ps
          ON p.uuid = ps.portfolio_uuid
        GROUP BY p.uuid, p.name
        ORDER BY p.name COLLATE NOCASE
        """
        rows = cur.execute(sql).fetchall()
        return [_normalize_portfolio_row(r) for r in rows]
    except Exception:
        _LOGGER.exception("fetch_live_portfolios fehlgeschlagen (db_path=%s)", db_path)
        return []
    finally:
        if conn is not None:
            with suppress(Exception):
                conn.close()  # type: ignore[has-type]
