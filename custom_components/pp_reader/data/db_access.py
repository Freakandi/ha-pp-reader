"""
Provide database access functions and data models.

Handle transactions, securities, accounts, portfolios,
and related data in a SQLite database.
"""

import logging
import sqlite3
from collections.abc import Iterator
from contextlib import suppress
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from custom_components.pp_reader.data.aggregations import (
    AverageCostSelection,
    HoldingsAggregation,
    compute_holdings_aggregation,
    select_average_cost,
)
from custom_components.pp_reader.data.performance import select_performance_metrics
from custom_components.pp_reader.util.currency import (
    cent_to_eur,
    normalize_price_to_eur_sync,
    normalize_raw_price,
    round_currency,
    round_price,
)

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
    avg_price_native: float | None = None  # Durchschnittlicher Kaufpreis in nativer Währung
    current_value: float | None = None  # Aktueller Wert des Bestands in Cent


def _resolve_average_cost_totals(
    aggregation: HoldingsAggregation,
    *,
    holdings_override: float | None = None,
    purchase_value_eur_override: float | None = None,
    security_total_override: float | None = None,
    account_total_override: float | None = None,
) -> tuple[AverageCostSelection, float, float, float]:
    """Select average cost values and derive consistent totals."""

    total_holdings = aggregation.total_holdings
    positive_holdings = aggregation.positive_holdings

    preferred_holdings = holdings_override
    if preferred_holdings in (None, 0) and positive_holdings > 0:
        preferred_holdings = positive_holdings

    fallback_holdings = total_holdings if total_holdings > 0 else None

    selection = select_average_cost(
        aggregation,
        holdings=holdings_override,
        purchase_value_eur=purchase_value_eur_override,
        security_currency_total=security_total_override,
        account_currency_total=account_total_override,
    )

    coverage_shares: float | None = None
    if selection.source == "aggregation" and positive_holdings > 0:
        coverage_shares = positive_holdings
    elif selection.source == "totals" and preferred_holdings not in (None, 0):
        coverage_shares = preferred_holdings
    elif selection.source == "eur_total" and fallback_holdings not in (None, 0):
        coverage_shares = fallback_holdings

    purchase_value_eur = (
        purchase_value_eur_override
        if purchase_value_eur_override is not None
        else aggregation.purchase_value_eur
    )
    purchase_total_security = (
        security_total_override
        if security_total_override is not None
        else aggregation.security_currency_total
    )
    purchase_total_account = (
        account_total_override
        if account_total_override is not None
        else aggregation.account_currency_total
    )

    if coverage_shares not in (None, 0):
        share_count = float(coverage_shares)

        if selection.eur is not None and purchase_value_eur is None:
            derived_eur = round_currency(selection.eur * share_count)
            if derived_eur is not None:
                purchase_value_eur = derived_eur

        if selection.security is not None and purchase_total_security is None:
            derived_security_total = round_currency(
                selection.security * share_count,
            )
            if derived_security_total is not None:
                purchase_total_security = derived_security_total

        if selection.account is not None and purchase_total_account is None:
            derived_account_total = round_currency(
                selection.account * share_count,
            )
            if derived_account_total is not None:
                purchase_total_account = derived_account_total

    return selection, purchase_value_eur, purchase_total_security, purchase_total_account


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
) -> Iterator[tuple[int, float | None, int | None]]:
    """Yield ordered close prices with native floats and raw values."""
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
                try:
                    close_raw = int(close_value) if close_value is not None else None
                except (TypeError, ValueError):
                    close_raw = None

                normalized_close = normalize_raw_price(close_raw)
                yield int(date_value), normalized_close, close_raw
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
) -> list[tuple[int, float | None, int | None]]:
    """Return a concrete list of close prices with normalized and raw values."""
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
                   purchase_value, avg_price, avg_price_native, current_value
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
                   purchase_value, avg_price, avg_price_native, current_value
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
    """Aggregate holdings and pricing information for a security."""
    if not security_uuid:
        message = "security_uuid darf nicht leer sein"
        raise ValueError(message)

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
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
            SELECT
                current_holdings,
                purchase_value,
                avg_price_native,
                security_currency_total,
                account_currency_total,
                avg_price_security,
                avg_price_account
            FROM portfolio_securities
            WHERE security_uuid = ?
            """,
            (security_uuid,),
        )
        holdings_rows = holdings_cursor.fetchall()
        aggregation = compute_holdings_aggregation(holdings_rows)

        raw_price = security_row["last_price"]
        currency_code: str = security_row["currency_code"] or "EUR"
        reference_date = datetime.now()  # noqa: DTZ005
        last_price_native = None
        if raw_price:
            try:
                last_price_native = normalize_raw_price(raw_price, decimals=4)
            except Exception:  # pragma: no cover - defensive
                last_price_native = None
        last_price_eur = normalize_price_to_eur_sync(
            raw_price, currency_code, reference_date, db_path
        )
        last_price_eur_value = (
            round_price(last_price_eur, decimals=4)
            if last_price_eur is not None
            else None
        )
        total_holdings = aggregation.total_holdings
        market_value_eur = (
            round_currency(total_holdings * last_price_eur)
            if last_price_eur is not None
            else None
        )

        (
            average_cost,
            purchase_value_eur,
            purchase_total_security_value,
            purchase_total_account_value,
        ) = _resolve_average_cost_totals(
            aggregation,
            holdings_override=total_holdings if total_holdings > 0 else None,
        )

        if purchase_value_eur is None:
            purchase_value_eur = 0.0
        if purchase_total_security_value is None:
            purchase_total_security_value = 0.0
        if purchase_total_account_value is None:
            purchase_total_account_value = 0.0
        avg_price_security_value = aggregation.avg_price_security
        if avg_price_security_value is None:
            avg_price_security_value = average_cost.security
            if (
                avg_price_security_value == 0.0
                and purchase_total_security_value in (0.0, None)
            ):
                avg_price_security_value = None
        avg_price_account_value = aggregation.avg_price_account
        if avg_price_account_value is None:
            avg_price_account_value = average_cost.account
            if (
                avg_price_account_value == 0.0
                and purchase_total_account_value in (0.0, None)
            ):
                avg_price_account_value = None

        average_cost_payload = asdict(average_cost)
        if (
            average_cost_payload["security"] == 0.0
            and avg_price_security_value is None
        ):
            average_cost_payload["security"] = None
        if (
            average_cost_payload["account"] == 0.0
            and avg_price_account_value is None
        ):
            average_cost_payload["account"] = None
        if (
            average_cost_payload.get("native") is None
            and aggregation.average_purchase_price_native is not None
        ):
            average_cost_payload["native"] = aggregation.average_purchase_price_native

        raw_last_close, last_close_native = fetch_previous_close(
            db_path,
            security_uuid,
            conn=conn,
        )
        last_close_eur = None
        if raw_last_close is not None:
            try:
                last_close_eur = normalize_price_to_eur_sync(
                    raw_last_close,
                    currency_code,
                    reference_date,
                    db_path,
                )
                if last_close_eur is not None:
                    last_close_eur = round_price(last_close_eur, decimals=4)
            except Exception:  # pragma: no cover - defensive
                last_close_eur = None

        fx_rate = None
        if (
            last_price_native not in (None, 0)
            and last_price_eur_value not in (None, 0)
        ):
            fx_rate = last_price_native / last_price_eur_value
        elif (
            last_close_native not in (None, 0)
            and last_close_eur not in (None, 0)
        ):
            fx_rate = last_close_native / last_close_eur

        performance_metrics, day_change_metrics = select_performance_metrics(
            current_value=market_value_eur,
            purchase_value=purchase_value_eur,
            holdings=total_holdings,
            last_price_native=last_price_native,
            last_close_native=last_close_native,
            fx_rate=fx_rate,
        )
        performance_payload = asdict(performance_metrics)
        day_change_payload = asdict(day_change_metrics)
        performance_payload["day_change"] = day_change_payload

        return {
            "name": security_row["name"],
            "currency_code": currency_code,
            "total_holdings": total_holdings,
            "last_price_native": last_price_native,
            "last_price_eur": last_price_eur_value,
            "market_value_eur": market_value_eur,
            "purchase_value_eur": purchase_value_eur,
            "purchase_total_security": purchase_total_security_value,
            "purchase_total_account": purchase_total_account_value,
            "avg_price_security": avg_price_security_value,
            "avg_price_account": avg_price_account_value,
            "average_cost": average_cost_payload,
            "last_close_native": last_close_native,
            "last_close_eur": last_close_eur,
            "day_price_change_native": day_change_payload["price_change_native"],
            "day_price_change_eur": day_change_payload["price_change_eur"],
            "day_change_pct": day_change_payload["change_pct"],
            "performance": performance_payload,
        }
    finally:
        conn.close()


def fetch_previous_close(
    db_path: Path,
    security_uuid: str,
    *,
    conn: sqlite3.Connection | None = None,
) -> tuple[int | None, float | None]:
    """Fetch the most recent historical close price for a security."""
    if not security_uuid:
        message = "security_uuid darf nicht leer sein"
        raise ValueError(message)

    local_conn = conn
    if local_conn is None:
        local_conn = sqlite3.connect(str(db_path))

    try:
        try:
            cursor = local_conn.execute(
                """
                SELECT close
                FROM historical_prices
                WHERE security_uuid = ?
                ORDER BY date DESC
                LIMIT 1
                """,
                (security_uuid,),
            )
            row = cursor.fetchone()
        except sqlite3.Error:
            _LOGGER.exception(
                "Fehler beim Laden des letzten Schlusskurses (security_uuid=%s)",
                security_uuid,
            )
            return None, None

        if not row:
            return None, None

        raw_close = row[0]
        if raw_close is None:
            return None, None

        close_native: float | None = None
        try:
            normalized_close = normalize_raw_price(int(raw_close), decimals=4)
            if normalized_close is not None:
                close_native = round(normalized_close, 4)
        except Exception:  # pragma: no cover - defensive
            _LOGGER.exception(
                "Fehler bei der Normalisierung des Schlusskurses (security_uuid=%s)",
                security_uuid,
            )
            close_native = None

        return int(raw_close), close_native
    finally:
        if conn is None:
            with suppress(sqlite3.Error):
                local_conn.close()


def get_portfolio_positions(db_path: Path, portfolio_uuid: str) -> list[dict[str, Any]]:
    """
    Liefert Depot-Positionen inklusive Kaufwert, aktuellem Wert und Gewinn.

    Rückgabe:
    [
      {
        "security_uuid": str,
        "name": str,
        "current_holdings": float,
        "purchase_value": float,          # EUR
        "current_value": float,           # EUR
        "gain_abs": float,                # EUR
        "gain_pct": float,                # %
        "purchase_total_security": float,
        "purchase_total_account": float,
        "avg_price_security": float | None,
        "avg_price_account": float | None,
        "performance": dict[str, Any],
        "aggregation": dict[str, Any],
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
                ps.purchase_value,        -- Cent
                ps.current_value,         -- Cent
                ps.avg_price_native,
                ps.security_currency_total,
                ps.account_currency_total,
                ps.avg_price_security,
                ps.avg_price_account
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
            avg_price_native_raw,
            security_total_raw,
            account_total_raw,
            avg_price_security_raw,
            avg_price_account_raw,
        ) in rows:
            aggregation = compute_holdings_aggregation(
                [
                    {
                        "current_holdings": current_holdings,
                        "purchase_value": purchase_value_cents,
                        "avg_price_native": avg_price_native_raw,
                        "security_currency_total": security_total_raw,
                        "account_currency_total": account_total_raw,
                        "avg_price_security": avg_price_security_raw,
                        "avg_price_account": avg_price_account_raw,
                    }
                ]
            )

            (
                average_cost,
                purchase_value,
                purchase_total_security_value,
                purchase_total_account_value,
            ) = _resolve_average_cost_totals(
                aggregation,
                holdings_override=aggregation.total_holdings
                if aggregation.total_holdings > 0
                else None,
            )

            if purchase_value is None:
                purchase_value = 0.0
            if purchase_total_security_value is None:
                purchase_total_security_value = 0.0
            if purchase_total_account_value is None:
                purchase_total_account_value = 0.0

            avg_price_security_value = aggregation.avg_price_security
            if avg_price_security_value is None:
                avg_price_security_value = average_cost.security
                if (
                    avg_price_security_value == 0.0
                    and purchase_total_security_value in (0.0, None)
                ):
                    avg_price_security_value = None
            avg_price_account_value = aggregation.avg_price_account
            if avg_price_account_value is None:
                avg_price_account_value = average_cost.account
                if (
                    avg_price_account_value == 0.0
                    and purchase_total_account_value in (0.0, None)
                ):
                    avg_price_account_value = None

            average_cost_payload = asdict(average_cost)
            if (
                average_cost_payload["security"] == 0.0
                and avg_price_security_value is None
            ):
                average_cost_payload["security"] = None
            if (
                average_cost_payload["account"] == 0.0
                and avg_price_account_value is None
            ):
                average_cost_payload["account"] = None
            if (
                average_cost_payload.get("native") is None
                and aggregation.average_purchase_price_native is not None
            ):
                average_cost_payload["native"] = aggregation.average_purchase_price_native

            aggregation_dict = {
                "total_holdings": aggregation.total_holdings,
                "positive_holdings": aggregation.positive_holdings,
                "purchase_value_cents": aggregation.purchase_value_cents,
                "purchase_value_eur": purchase_value,
                "security_currency_total": purchase_total_security_value,
                "account_currency_total": purchase_total_account_value,
                "avg_price_security": avg_price_security_value,
                "avg_price_account": avg_price_account_value,
                "purchase_total_security": purchase_total_security_value,
                "purchase_total_account": purchase_total_account_value,
            }

            holdings = aggregation_dict["total_holdings"]
            current_value = cent_to_eur(current_value_cents, default=0.0) or 0.0

            performance_metrics, _ = select_performance_metrics(
                current_value=current_value,
                purchase_value=purchase_value,
                holdings=holdings,
            )
            performance_payload = asdict(performance_metrics)
            gain_abs = performance_payload["gain_abs"]
            gain_pct = performance_payload["gain_pct"]

            positions.append(
                {
                    "security_uuid": security_uuid,
                    "name": name,
                    "current_holdings": holdings,
                    "purchase_value": purchase_value,
                    "current_value": current_value,
                    "gain_abs": gain_abs,
                    "gain_pct": gain_pct,
                    "purchase_total_security": aggregation_dict[
                        "purchase_total_security"
                    ],
                    "purchase_total_account": aggregation_dict[
                        "purchase_total_account"
                    ],
                    "avg_price_security": aggregation_dict["avg_price_security"],
                    "avg_price_account": aggregation_dict["avg_price_account"],
                    "average_cost": average_cost_payload,
                    "performance": performance_payload,
                    "aggregation": aggregation_dict,
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

    current_value = cent_to_eur(row["current_value"], default=0.0) or 0.0
    purchase_sum = cent_to_eur(row["purchase_sum"], default=0.0) or 0.0
    missing_value_positions = 0
    if "missing_value_positions" in row.keys():
        try:
            missing_value_positions = int(row["missing_value_positions"] or 0)
        except (TypeError, ValueError):
            missing_value_positions = 0

    has_current_value = missing_value_positions == 0

    performance_metrics, _ = select_performance_metrics(
        current_value=current_value,
        purchase_value=purchase_sum,
        holdings=row["position_count"],
    )
    performance_payload = asdict(performance_metrics)
    gain_abs = performance_payload["gain_abs"]
    gain_pct = performance_payload["gain_pct"]

    return {
        "uuid": row["uuid"],
        "name": row["name"],
        "current_value": current_value,
        "purchase_sum": purchase_sum,
        "gain_abs": gain_abs,
        "gain_pct": gain_pct,
        "performance": performance_payload,
        "position_count": row["position_count"]
        if row["position_count"] is not None
        else 0,
        "missing_value_positions": missing_value_positions,
        "has_current_value": has_current_value,
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
            "performance": <dict>,       # Gain & change metrics metadata
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
            COUNT(CASE WHEN ps.current_holdings > 0 THEN 1 END) AS position_count,
            SUM(
                CASE
                    WHEN ps.current_holdings > 0 AND ps.current_value IS NULL THEN 1
                    ELSE 0
                END
            ) AS missing_value_positions
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
