"""
Provide database access functions and data models.

Handle transactions, securities, accounts, portfolios,
and related data in a SQLite database.
"""

import json
import logging
import sqlite3
from collections.abc import Iterator, Sequence
from contextlib import suppress
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from custom_components.pp_reader.data.aggregations import (
    AverageCostSelection,
    HoldingsAggregation,
    compute_holdings_aggregation,
    select_average_cost,
)
from custom_components.pp_reader.metrics.common import (
    compose_performance_payload,
    select_performance_metrics,
)
from custom_components.pp_reader.util.currency import (
    cent_to_eur,
    normalize_price_to_eur_sync,
    normalize_raw_price,
    round_currency,
    round_price,
)
from custom_components.pp_reader.util.datetime import UTC

_LOGGER = logging.getLogger("custom_components.pp_reader.data.db_access")


_MISSING_DB_RESOURCE_MESSAGE = "Entweder db_path oder conn muss angegeben werden."
_EIGHT_DECIMAL_SCALE = 10**8
_SCALED_INT_THRESHOLD = 10_000


def _from_eight_decimal(
    value: Any,
    *,
    decimals: int = 4,
    default: float | None = None,
) -> float | None:
    """Convert a stored 10^-8 fixed-point value into a float."""
    if value in (None, ""):
        return default

    try:
        numeric = float(value) / _EIGHT_DECIMAL_SCALE
    except (TypeError, ValueError):
        return default

    return round_currency(numeric, decimals=decimals, default=default)


def _from_holdings_raw(value: Any) -> float:
    """Convert stored holdings (10^-8 shares) to a float."""
    normalized = _from_eight_decimal(value, decimals=8, default=0.0)
    return normalized or 0.0


def _first_value(*values: Any) -> Any | None:
    """Return the first value that is not None or empty string."""
    for candidate in values:
        if candidate not in (None, ""):
            return candidate
    return None


def _compute_avg_price_cents(
    purchase_value_cents: Any,
    holdings: float | None,
) -> float | None:
    """Return the average purchase price (cents) per share."""
    if holdings in (None, 0):
        return None
    try:
        return float(purchase_value_cents) / float(holdings)
    except (TypeError, ValueError, ZeroDivisionError):
        return None


def _decode_scaled_currency(
    value: Any,
    *,
    decimals: int = 6,
) -> float | None:
    """Decode values that may already be floats or stored as 10^-8 integers."""
    if value in (None, ""):
        return None
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    if abs(numeric) >= _SCALED_INT_THRESHOLD:
        numeric = numeric / _EIGHT_DECIMAL_SCALE
    return round(numeric, decimals)


def _decode_holdings_value(value: Any) -> float:
    """Normalize holdings that may already be real numbers or scaled integers."""
    if value in (None, ""):
        return 0.0
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return 0.0
    if abs(numeric) >= _SCALED_INT_THRESHOLD:
        numeric = numeric / _EIGHT_DECIMAL_SCALE
    return round(numeric, 6)


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
    avg_price_native: float | None = (
        None  # Durchschnittlicher Kaufpreis in nativer Währung
    )
    current_value: float | None = None  # Aktueller Wert des Bestands in Cent


def _deserialize_portfolio_security_row(row: sqlite3.Row) -> PortfolioSecurity:
    """Map a sqlite row to PortfolioSecurity with normalized averages."""
    holdings = _decode_holdings_value(row["current_holdings"])
    purchase_value = int(row["purchase_value"] or 0)
    avg_price_cents = _compute_avg_price_cents(purchase_value, holdings)
    avg_price_native = _decode_scaled_currency(row["avg_price_native"])

    current_value_raw = row["current_value"]
    current_value = current_value_raw
    return PortfolioSecurity(
        portfolio_uuid=row["portfolio_uuid"],
        security_uuid=row["security_uuid"],
        current_holdings=holdings,
        purchase_value=purchase_value,
        avg_price=avg_price_cents,
        avg_price_native=avg_price_native,
        current_value=current_value,
    )


@dataclass
class FxRateRecord:
    """Persisted FX rate metadata."""

    date: str
    currency: str
    rate: float
    fetched_at: str | None = None
    data_source: str | None = None
    provider: str | None = None
    provenance: str | None = None


@dataclass
class PriceHistoryJob:
    """Persisted job entry in the price history queue."""

    id: int
    security_uuid: str
    requested_date: int | None
    status: str
    priority: int
    attempts: int
    scheduled_at: str | None
    started_at: str | None
    finished_at: str | None
    last_error: str | None
    data_source: str | None
    provenance: str | None
    created_at: str
    updated_at: str | None


@dataclass
class NewPriceHistoryJob:
    """Payload for enqueuing a new price history job."""

    security_uuid: str
    requested_date: int | None
    status: str = "pending"
    priority: int = 0
    scheduled_at: str | None = None
    data_source: str | None = None
    provenance: str | None = None


@dataclass
class MetricRunMetadata:
    """Record describing a persisted metric run."""

    run_uuid: str
    status: str
    trigger: str | None = None
    started_at: str | None = None
    finished_at: str | None = None
    duration_ms: int | None = None
    total_entities: int | None = None
    processed_portfolios: int | None = None
    processed_accounts: int | None = None
    processed_securities: int | None = None
    error_message: str | None = None
    provenance: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


@dataclass
class PortfolioMetricRecord:
    """Record describing portfolio level performance metrics."""

    metric_run_uuid: str
    portfolio_uuid: str
    valuation_currency: str = "EUR"
    current_value_cents: int = 0
    purchase_value_cents: int = 0
    gain_abs_cents: int = 0
    gain_pct: float | None = None
    total_change_eur_cents: int = 0
    total_change_pct: float | None = None
    source: str | None = None
    coverage_ratio: float | None = None
    position_count: int | None = None
    missing_value_positions: int | None = None
    provenance: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


@dataclass
class AccountMetricRecord:
    """Record describing account valuation metrics."""

    metric_run_uuid: str
    account_uuid: str
    currency_code: str
    valuation_currency: str = "EUR"
    balance_native_cents: int = 0
    balance_eur_cents: int | None = None
    fx_rate: float | None = None
    fx_rate_source: str | None = None
    fx_rate_timestamp: str | None = None
    coverage_ratio: float | None = None
    provenance: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


@dataclass
class SecurityMetricRecord:
    """Record describing security level metrics within a portfolio."""

    metric_run_uuid: str
    portfolio_uuid: str
    security_uuid: str
    valuation_currency: str = "EUR"
    security_currency_code: str = "EUR"
    holdings_raw: int = 0
    current_value_cents: int = 0
    purchase_value_cents: int = 0
    purchase_security_value_raw: int | None = None
    purchase_account_value_cents: int | None = None
    gain_abs_cents: int = 0
    gain_pct: float | None = None
    total_change_eur_cents: int = 0
    total_change_pct: float | None = None
    source: str | None = None
    coverage_ratio: float | None = None
    day_change_native: float | None = None
    day_change_eur: float | None = None
    day_change_pct: float | None = None
    day_change_source: str | None = None
    day_change_coverage: float | None = None
    last_price_native_raw: int | None = None
    last_close_native_raw: int | None = None
    provenance: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


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

    return (
        selection,
        purchase_value_eur,
        purchase_total_security,
        purchase_total_account,
    )


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
    conn.row_factory = sqlite3.Row
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
        rows = cur.fetchall()
        return [_deserialize_portfolio_security_row(row) for row in rows]
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
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.execute("""
            SELECT portfolio_uuid, security_uuid, current_holdings,
                   purchase_value, avg_price, avg_price_native, current_value
            FROM portfolio_securities
        """)
        return [_deserialize_portfolio_security_row(row) for row in cur.fetchall()]
    except sqlite3.Error:
        _LOGGER.exception(
            "Fehler beim Laden aller Wertpapiere aus portfolio_securities"
        )
        return []
    finally:
        conn.close()


def _normalize_security_holding_row(row: sqlite3.Row) -> dict[str, Any]:
    """Return a normalized dict for holdings aggregation."""
    return {
        "portfolio_uuid": row["portfolio_uuid"],
        "security_uuid": row["security_uuid"],
        "current_holdings": _decode_holdings_value(row["current_holdings"]),
        "purchase_value": row["purchase_value"],
        "avg_price_native": _decode_scaled_currency(row["avg_price_native"]),
        "avg_price_security": _decode_scaled_currency(row["avg_price_security"]),
        "avg_price_account": _decode_scaled_currency(row["avg_price_account"]),
        "security_currency_total": _decode_scaled_currency(
            row["security_currency_total"],
            decimals=6,
        )
        or 0.0,
        "account_currency_total": _decode_scaled_currency(
            row["account_currency_total"],
            decimals=6,
        )
        or 0.0,
    }


def _load_security_holdings(
    conn: sqlite3.Connection,
    security_uuid: str,
) -> list[dict[str, Any]]:
    """Fetch portfolio holdings for a given security."""
    try:
        cursor = conn.execute(
            """
            SELECT
                portfolio_uuid,
                security_uuid,
                current_holdings,
                purchase_value,
                avg_price_native,
                avg_price_security,
                avg_price_account,
                security_currency_total,
                account_currency_total
            FROM portfolio_securities
            WHERE security_uuid = ?
            """,
            (security_uuid,),
        )
    except sqlite3.Error:
        _LOGGER.exception(
            "Fehler beim Laden der Holdings für security_uuid=%s",
            security_uuid,
        )
        return []

    return [_normalize_security_holding_row(row) for row in cursor.fetchall()]


def _empty_security_snapshot(security_row: sqlite3.Row) -> dict[str, Any]:
    """Return the default empty snapshot payload."""
    return {
        "name": security_row["name"],
        "currency_code": security_row["currency_code"] or "EUR",
        "total_holdings": 0.0,
        "last_price_native": None,
        "last_price_eur": None,
        "market_value_eur": 0.0,
        "purchase_value_eur": 0.0,
        "average_cost": {
            "eur": None,
            "security": None,
            "account": None,
            "native": None,
            "source": "unavailable",
            "coverage_ratio": None,
        },
        "aggregation": {
            "total_holdings": 0.0,
            "purchase_value_eur": 0.0,
            "purchase_total_security": None,
            "purchase_total_account": None,
        },
        "last_close_native": None,
        "last_close_eur": None,
        "performance": {
            "gain_abs": 0.0,
            "gain_pct": 0.0,
            "total_change_eur": 0.0,
            "total_change_pct": 0.0,
            "source": "metrics",
            "coverage_ratio": None,
            "day_change": {
                "price_change_native": None,
                "price_change_eur": None,
                "change_pct": None,
                "source": "unavailable",
                "coverage_ratio": 0.0,
            },
        },
    }


def _build_day_change_payload(
    *,
    last_price_native: float | None,
    last_price_eur: float | None,
    last_close_native: float | None,
    last_close_eur: float | None,
) -> dict[str, Any]:
    """Return the structured day change payload."""
    if (
        last_price_native is None
        or last_close_native is None
        or last_price_eur is None
        or last_close_eur is None
    ):
        return {
            "price_change_native": None,
            "price_change_eur": None,
            "change_pct": None,
            "source": "unavailable",
            "coverage_ratio": 0.5,
        }

    price_change_native = round_price(
        last_price_native - last_close_native,
        decimals=6,
    )
    price_change_eur = round_price(
        last_price_eur - last_close_eur,
        decimals=6,
    )
    change_pct = (
        round_currency(
            (price_change_native / last_close_native) * 100,
            default=None,
        )
        if last_close_native
        else None
    )
    return {
        "price_change_native": price_change_native,
        "price_change_eur": price_change_eur,
        "change_pct": change_pct,
        "source": "native",
        "coverage_ratio": 1.0,
    }


def _build_snapshot_from_holdings(
    db_path: Path,
    conn: sqlite3.Connection,
    security_uuid: str,
    security_row: sqlite3.Row,
) -> dict[str, Any]:
    """Construct a snapshot from portfolio_securities when metrics are unavailable."""
    holdings_rows = _load_security_holdings(conn, security_uuid)
    if not holdings_rows:
        return _empty_security_snapshot(security_row)

    aggregation = compute_holdings_aggregation(holdings_rows)
    (
        selection,
        purchase_value_eur,
        purchase_total_security,
        purchase_total_account,
    ) = _resolve_average_cost_totals(aggregation)

    purchase_value_eur = (
        round_currency(purchase_value_eur, default=0.0) or 0.0
    )
    purchase_total_security = (
        round_currency(purchase_total_security, default=0.0) or 0.0
    )
    purchase_total_account = (
        round_currency(purchase_total_account, default=0.0) or 0.0
    )

    total_holdings = round_currency(
        aggregation.total_holdings,
        decimals=6,
        default=0.0,
    ) or 0.0

    reference_date = datetime.now()  # noqa: DTZ005
    currency_code = security_row["currency_code"] or "EUR"

    last_price_native_raw = security_row["last_price"]
    last_price_native = normalize_raw_price(last_price_native_raw, decimals=4)
    last_price_eur = None
    if last_price_native_raw is not None:
        last_price_eur = normalize_price_to_eur_sync(
            last_price_native_raw,
            currency_code,
            reference_date,
            db_path,
        )
    market_value_eur = 0.0
    if last_price_eur is not None and total_holdings:
        market_value_eur = (
            round_currency(last_price_eur * total_holdings, default=0.0) or 0.0
        )

    raw_last_close, last_close_native = fetch_previous_close(
        db_path,
        security_uuid,
        conn=conn,
    )
    last_close_eur = None
    if raw_last_close is not None:
        last_close_eur = normalize_price_to_eur_sync(
            raw_last_close,
            currency_code,
            reference_date,
            db_path,
        )

    day_change_payload = _build_day_change_payload(
        last_price_native=last_price_native,
        last_price_eur=last_price_eur,
        last_close_native=last_close_native,
        last_close_eur=last_close_eur,
    )

    gain_abs = round_currency(market_value_eur - purchase_value_eur, default=0.0) or 0.0
    gain_pct = (
        round_currency((gain_abs / purchase_value_eur) * 100, default=0.0)
        if purchase_value_eur
        else 0.0
    )

    average_cost_payload = {
        "native": selection.native,
        "security": selection.security,
        "account": selection.account,
        "eur": selection.eur,
        "source": selection.source,
        "coverage_ratio": selection.coverage_ratio,
    }

    aggregation_payload = {
        "total_holdings": total_holdings,
        "purchase_value_eur": purchase_value_eur,
        "purchase_total_security": purchase_total_security,
        "purchase_total_account": purchase_total_account,
        "purchase_value_cents": int(aggregation.purchase_value_cents or 0),
    }

    performance_payload = {
        "gain_abs": gain_abs,
        "gain_pct": gain_pct,
        "total_change_eur": gain_abs,
        "total_change_pct": gain_pct,
        "source": "calculated",
        "coverage_ratio": 1.0 if total_holdings or purchase_value_eur else 0.0,
        "day_change": day_change_payload,
    }

    return {
        "name": security_row["name"],
        "currency_code": currency_code,
        "total_holdings": total_holdings,
        "last_price_native": round_price(last_price_native, decimals=6),
        "last_price_eur": round_price(last_price_eur, decimals=6),
        "market_value_eur": market_value_eur,
        "purchase_value_eur": purchase_value_eur,
        "average_cost": average_cost_payload,
        "aggregation": aggregation_payload,
        "last_close_native": round_price(last_close_native, decimals=6),
        "last_close_eur": round_price(last_close_eur, decimals=6),
        "performance": performance_payload,
    }


def get_security_snapshot(  # noqa: PLR0912, PLR0915
    db_path: Path, security_uuid: str
) -> dict[str, Any]:
    """Load aggregated security metrics from persisted metric tables."""
    if not security_uuid:
        message = "security_uuid darf nicht leer sein"
        raise ValueError(message)

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        security_row = conn.execute(
            """
            SELECT
                name,
                currency_code,
                last_price
            FROM securities
            WHERE uuid = ?
            """,
            (security_uuid,),
        ).fetchone()
        if security_row is None:
            unknown_message = f"Unbekannte security_uuid: {security_uuid}"
            raise LookupError(unknown_message)

        run_uuid = load_latest_completed_metric_run_uuid(db_path, conn=conn)
        if not run_uuid:
            return _build_snapshot_from_holdings(
                db_path,
                conn,
                security_uuid,
                security_row,
            )

        rows = conn.execute(
            """
            SELECT
                holdings_raw,
                current_value_cents,
                purchase_value_cents,
                purchase_security_value_raw,
                purchase_account_value_cents,
                gain_abs_cents,
                gain_pct,
                total_change_eur_cents,
                total_change_pct,
                source,
                coverage_ratio,
                day_change_native,
                day_change_eur,
                day_change_pct,
                day_change_source,
                day_change_coverage,
                last_price_native_raw,
                last_close_native_raw,
                provenance
            FROM security_metrics
            WHERE metric_run_uuid = ?
              AND security_uuid = ?
            """,
            (run_uuid, security_uuid),
        ).fetchall()

        if not rows:
            return _build_snapshot_from_holdings(
                db_path,
                conn,
                security_uuid,
                security_row,
            )

        totals = {
            "holdings_raw": 0,
            "current_value_cents": 0,
            "purchase_value_cents": 0,
            "purchase_account_value_cents": 0,
            "purchase_security_value_raw": 0,
            "gain_abs_cents": 0,
            "total_change_eur_cents": 0,
        }
        coverage_values: list[float] = []
        provenance_values: list[str] = []
        day_change_source = None
        day_change_coverage = None
        day_change_native = None
        day_change_eur = None
        day_change_pct = None
        last_price_native_raw = None
        last_close_native_raw = None

        for row in rows:
            row_data = dict(row)
            totals["holdings_raw"] += int(row_data.get("holdings_raw") or 0)
            totals["current_value_cents"] += int(
                row_data.get("current_value_cents") or 0
            )
            totals["purchase_value_cents"] += int(
                row_data.get("purchase_value_cents") or 0
            )
            totals["purchase_account_value_cents"] += int(
                row_data.get("purchase_account_value_cents") or 0
            )
            totals["purchase_security_value_raw"] += int(
                row_data.get("purchase_security_value_raw") or 0
            )
            totals["gain_abs_cents"] += int(row_data.get("gain_abs_cents") or 0)
            totals["total_change_eur_cents"] += int(
                row_data.get("total_change_eur_cents") or 0
            )

            coverage = row_data.get("coverage_ratio")
            if coverage not in (None, ""):
                coverage_values.append(float(coverage))

            provenance = row_data.get("provenance")
            if provenance:
                provenance_values.append(str(provenance))

            if day_change_native is None and row_data.get("day_change_native"):
                day_change_native = row_data.get("day_change_native")
                day_change_eur = row_data.get("day_change_eur")
                day_change_pct = row_data.get("day_change_pct")
                day_change_source = row_data.get("day_change_source")
                day_change_coverage = row_data.get("day_change_coverage")

            if last_price_native_raw is None and row_data.get("last_price_native_raw"):
                last_price_native_raw = row_data.get("last_price_native_raw")
            if last_close_native_raw is None and row_data.get("last_close_native_raw"):
                last_close_native_raw = row_data.get("last_close_native_raw")

        total_holdings = _from_holdings_raw(totals["holdings_raw"])
        current_value_eur = (
            cent_to_eur(totals["current_value_cents"], default=0.0) or 0.0
        )
        purchase_value_eur = (
            cent_to_eur(totals["purchase_value_cents"], default=0.0) or 0.0
        )
        purchase_total_account = cent_to_eur(
            totals["purchase_account_value_cents"], default=None
        )
        purchase_total_security = _from_eight_decimal(
            totals["purchase_security_value_raw"],
            decimals=6,
            default=None,
        )

        average_cost_eur = (
            round_currency(purchase_value_eur / total_holdings, default=None)
            if total_holdings
            else None
        )
        average_cost_security = (
            round_price(
                purchase_total_security / total_holdings,
                decimals=6,
                default=None,
            )
            if total_holdings and purchase_total_security not in (None, 0.0)
            else None
        )
        average_cost_account = (
            round_currency(purchase_total_account / total_holdings, default=None)
            if total_holdings and purchase_total_account not in (None, 0.0)
            else None
        )

        gain_abs_eur = cent_to_eur(totals["gain_abs_cents"], default=0.0) or 0.0
        gain_pct = (
            round_currency((gain_abs_eur / purchase_value_eur) * 100, default=0.0)
            if purchase_value_eur
            else 0.0
        )
        total_change_eur = (
            cent_to_eur(totals["total_change_eur_cents"], default=None) or gain_abs_eur
        )
        total_change_pct = (
            round_currency((total_change_eur / purchase_value_eur) * 100, default=0.0)
            if purchase_value_eur
            else 0.0
        )

        reference_date = datetime.now()  # noqa: DTZ005
        currency_code: str = security_row["currency_code"] or "EUR"
        last_price_native = normalize_raw_price(last_price_native_raw, decimals=4)
        if last_price_native is None:
            last_price_native = normalize_raw_price(security_row["last_price"])
        last_price_eur = normalize_price_to_eur_sync(
            last_price_native_raw,
            currency_code,
            reference_date,
            db_path,
        )
        last_close_native = normalize_raw_price(last_close_native_raw, decimals=4)
        raw_last_close = None
        if last_close_native_raw is None:
            raw_last_close, last_close_native = fetch_previous_close(
                db_path,
                security_uuid,
                conn=conn,
            )
            if raw_last_close is not None and last_close_native is None:
                last_close_native = normalize_raw_price(raw_last_close, decimals=4)
        last_close_eur = normalize_price_to_eur_sync(
            raw_last_close or last_close_native_raw,
            currency_code,
            reference_date,
            db_path,
        )

        coverage_ratio = None
        if coverage_values:
            coverage_ratio = round_currency(
                sum(coverage_values) / len(coverage_values),
                decimals=4,
                default=None,
            )

        day_change_payload: dict[str, Any] | None = None
        if any(
            value not in (None, "") for value in (day_change_native, day_change_pct)
        ):
            day_change_payload = {
                "price_change_native": round_price(day_change_native, decimals=6),
                "price_change_eur": round_price(day_change_eur, decimals=6),
                "change_pct": day_change_pct,
                "source": day_change_source or "metrics",
                "coverage_ratio": day_change_coverage,
            }

        performance_payload: dict[str, Any] = {
            "gain_abs": round_currency(gain_abs_eur, default=0.0) or 0.0,
            "gain_pct": gain_pct or 0.0,
            "total_change_eur": round_currency(total_change_eur, default=0.0) or 0.0,
            "total_change_pct": total_change_pct or 0.0,
            "source": "metrics",
            "coverage_ratio": coverage_ratio,
        }
        if provenance_values:
            performance_payload["provenance"] = provenance_values[0]
        if day_change_payload:
            performance_payload["day_change"] = day_change_payload

        return {
            "name": security_row["name"],
            "currency_code": currency_code,
            "total_holdings": round_currency(
                total_holdings,
                decimals=6,
                default=0.0,
            )
            or 0.0,
            "last_price_native": round_price(last_price_native, decimals=6),
            "last_price_eur": round_price(last_price_eur, decimals=6),
            "market_value_eur": round_currency(current_value_eur, default=0.0) or 0.0,
            "purchase_value_eur": round_currency(purchase_value_eur, default=0.0)
            or 0.0,
            "average_cost": {
                "eur": average_cost_eur,
                "security": average_cost_security,
                "account": average_cost_account,
            },
            "aggregation": {
                "total_holdings": total_holdings,
                "purchase_value_eur": purchase_value_eur,
                "purchase_total_security": purchase_total_security,
                "purchase_total_account": purchase_total_account,
            },
            "last_close_native": round_price(last_close_native, decimals=6),
            "last_close_eur": round_price(last_close_eur, decimals=6),
            "performance": performance_payload,
        }
    finally:
        conn.close()


def _utc_now_isoformat() -> str:
    """Return the current UTC timestamp in ISO8601 notation."""
    return datetime.now(tz=UTC).replace(microsecond=0).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )


def _row_to_metric_run(row: sqlite3.Row) -> MetricRunMetadata:
    """Convert a sqlite row into a MetricRunMetadata record."""
    return MetricRunMetadata(
        run_uuid=row["run_uuid"],
        status=row["status"],
        trigger=row["trigger"],
        started_at=row["started_at"],
        finished_at=row["finished_at"],
        duration_ms=row["duration_ms"],
        total_entities=row["total_entities"],
        processed_portfolios=row["processed_portfolios"],
        processed_accounts=row["processed_accounts"],
        processed_securities=row["processed_securities"],
        error_message=row["error_message"],
        provenance=row["provenance"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def upsert_metric_run_metadata(
    db_path: Path,
    run: MetricRunMetadata,
    *,
    conn: sqlite3.Connection | None = None,
) -> None:
    """Insert or update metadata for a metric run."""
    if not run.run_uuid:
        message = "run_uuid darf nicht leer sein"
        raise ValueError(message)
    if not run.status:
        message = "status darf nicht leer sein"
        raise ValueError(message)

    timestamp = _utc_now_isoformat()
    started_at = run.started_at or timestamp
    created_at = run.created_at or timestamp
    local_conn = conn or sqlite3.connect(str(db_path))

    try:
        try:
            local_conn.execute(
                """
                INSERT INTO metric_runs (
                    run_uuid,
                    status,
                    trigger,
                    started_at,
                    finished_at,
                    duration_ms,
                    total_entities,
                    processed_portfolios,
                    processed_accounts,
                    processed_securities,
                    error_message,
                    provenance,
                    created_at,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(run_uuid) DO UPDATE SET
                    status = excluded.status,
                    trigger = excluded.trigger,
                    started_at = excluded.started_at,
                    finished_at = excluded.finished_at,
                    duration_ms = excluded.duration_ms,
                    total_entities = excluded.total_entities,
                    processed_portfolios = excluded.processed_portfolios,
                    processed_accounts = excluded.processed_accounts,
                    processed_securities = excluded.processed_securities,
                    error_message = excluded.error_message,
                    provenance = excluded.provenance,
                    updated_at = excluded.updated_at
                """,
                (
                    run.run_uuid,
                    run.status,
                    run.trigger,
                    started_at,
                    run.finished_at,
                    run.duration_ms,
                    run.total_entities,
                    run.processed_portfolios,
                    run.processed_accounts,
                    run.processed_securities,
                    run.error_message,
                    run.provenance,
                    created_at,
                    timestamp,
                ),
            )
            if conn is None:
                local_conn.commit()
        except sqlite3.Error:
            _LOGGER.exception(
                "Fehler beim Speichern des Metric-Runs (run_uuid=%s)",
                run.run_uuid,
            )
            raise
    finally:
        if conn is None:
            local_conn.close()


def load_metric_run(
    db_path: Path,
    run_uuid: str,
    *,
    conn: sqlite3.Connection | None = None,
) -> MetricRunMetadata | None:
    """Load a specific metric run by its UUID."""
    if not run_uuid:
        message = "run_uuid darf nicht leer sein"
        raise ValueError(message)

    local_conn = conn or sqlite3.connect(str(db_path))
    local_conn.row_factory = sqlite3.Row
    try:
        cursor = local_conn.execute(
            """
            SELECT
                run_uuid,
                status,
                trigger,
                started_at,
                finished_at,
                duration_ms,
                total_entities,
                processed_portfolios,
                processed_accounts,
                processed_securities,
                error_message,
                provenance,
                created_at,
                updated_at
            FROM metric_runs
            WHERE run_uuid = ?
            """,
            (run_uuid,),
        )
        row = cursor.fetchone()
        return _row_to_metric_run(row) if row else None
    finally:
        if conn is None:
            local_conn.close()


def load_latest_completed_metric_run_uuid(
    db_path: Path,
    *,
    conn: sqlite3.Connection | None = None,
) -> str | None:
    """Return the most recent completed metric run uuid or None."""
    local_conn = conn or sqlite3.connect(str(db_path))
    try:
        cursor = local_conn.execute(
            """
            SELECT run_uuid
            FROM metric_runs
            WHERE status = 'completed'
            ORDER BY
                COALESCE(finished_at, started_at) DESC,
                started_at DESC
            LIMIT 1
            """
        )
        row = cursor.fetchone()
        if row is None:
            return None
        return row[0]
    finally:
        if conn is None:
            local_conn.close()


def list_metric_runs(
    db_path: Path,
    *,
    limit: int = 20,
    conn: sqlite3.Connection | None = None,
) -> list[MetricRunMetadata]:
    """Return the most recent metric runs ordered by start time descending."""
    if limit <= 0:
        message = "limit muss größer als 0 sein"
        raise ValueError(message)

    local_conn = conn or sqlite3.connect(str(db_path))
    local_conn.row_factory = sqlite3.Row
    try:
        cursor = local_conn.execute(
            """
            SELECT
                run_uuid,
                status,
                trigger,
                started_at,
                finished_at,
                duration_ms,
                total_entities,
                processed_portfolios,
                processed_accounts,
                processed_securities,
                error_message,
                provenance,
                created_at,
                updated_at
            FROM metric_runs
            ORDER BY started_at DESC
            LIMIT ?
            """,
            (limit,),
        )
        rows = cursor.fetchall()
        return [_row_to_metric_run(row) for row in rows]
    finally:
        if conn is None:
            local_conn.close()


def delete_metric_run(
    db_path: Path,
    run_uuid: str,
    *,
    conn: sqlite3.Connection | None = None,
) -> None:
    """Delete a metric run and cascade associated metric records."""
    if not run_uuid:
        message = "run_uuid darf nicht leer sein"
        raise ValueError(message)

    local_conn = conn or sqlite3.connect(str(db_path))
    try:
        local_conn.execute(
            "DELETE FROM metric_runs WHERE run_uuid = ?",
            (run_uuid,),
        )
        if conn is None:
            local_conn.commit()
    except sqlite3.Error:
        _LOGGER.exception(
            "Fehler beim Löschen des Metric-Runs (run_uuid=%s)",
            run_uuid,
        )
        raise
    finally:
        if conn is None:
            local_conn.close()


def _row_to_portfolio_metric(row: sqlite3.Row) -> PortfolioMetricRecord:
    """Convert a sqlite row into a PortfolioMetricRecord."""
    return PortfolioMetricRecord(
        metric_run_uuid=row["metric_run_uuid"],
        portfolio_uuid=row["portfolio_uuid"],
        valuation_currency=row["valuation_currency"],
        current_value_cents=row["current_value_cents"],
        purchase_value_cents=row["purchase_value_cents"],
        gain_abs_cents=row["gain_abs_cents"],
        gain_pct=row["gain_pct"],
        total_change_eur_cents=row["total_change_eur_cents"],
        total_change_pct=row["total_change_pct"],
        source=row["source"],
        coverage_ratio=row["coverage_ratio"],
        position_count=row["position_count"],
        missing_value_positions=row["missing_value_positions"],
        provenance=row["provenance"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _row_to_account_metric(row: sqlite3.Row) -> AccountMetricRecord:
    """Convert a sqlite row into an AccountMetricRecord."""
    return AccountMetricRecord(
        metric_run_uuid=row["metric_run_uuid"],
        account_uuid=row["account_uuid"],
        currency_code=row["currency_code"],
        valuation_currency=row["valuation_currency"],
        balance_native_cents=row["balance_native_cents"],
        balance_eur_cents=row["balance_eur_cents"],
        fx_rate=row["fx_rate"],
        fx_rate_source=row["fx_rate_source"],
        fx_rate_timestamp=row["fx_rate_timestamp"],
        coverage_ratio=row["coverage_ratio"],
        provenance=row["provenance"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _row_to_security_metric(row: sqlite3.Row) -> SecurityMetricRecord:
    """Convert a sqlite row into a SecurityMetricRecord."""
    return SecurityMetricRecord(
        metric_run_uuid=row["metric_run_uuid"],
        portfolio_uuid=row["portfolio_uuid"],
        security_uuid=row["security_uuid"],
        valuation_currency=row["valuation_currency"],
        security_currency_code=row["security_currency_code"],
        holdings_raw=row["holdings_raw"],
        current_value_cents=row["current_value_cents"],
        purchase_value_cents=row["purchase_value_cents"],
        purchase_security_value_raw=row["purchase_security_value_raw"],
        purchase_account_value_cents=row["purchase_account_value_cents"],
        gain_abs_cents=row["gain_abs_cents"],
        gain_pct=row["gain_pct"],
        total_change_eur_cents=row["total_change_eur_cents"],
        total_change_pct=row["total_change_pct"],
        source=row["source"],
        coverage_ratio=row["coverage_ratio"],
        day_change_native=row["day_change_native"],
        day_change_eur=row["day_change_eur"],
        day_change_pct=row["day_change_pct"],
        day_change_source=row["day_change_source"],
        day_change_coverage=row["day_change_coverage"],
        last_price_native_raw=row["last_price_native_raw"],
        last_close_native_raw=row["last_close_native_raw"],
        provenance=row["provenance"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def upsert_portfolio_metrics(
    db_path: Path,
    records: Sequence[PortfolioMetricRecord],
    *,
    conn: sqlite3.Connection | None = None,
) -> None:
    """Insert or update portfolio metrics for a run."""
    if not records:
        return

    timestamp = _utc_now_isoformat()
    local_conn = conn or sqlite3.connect(str(db_path))
    try:
        local_conn.executemany(
            """
            INSERT INTO portfolio_metrics (
                metric_run_uuid,
                portfolio_uuid,
                valuation_currency,
                current_value_cents,
                purchase_value_cents,
                gain_abs_cents,
                gain_pct,
                total_change_eur_cents,
                total_change_pct,
                source,
                coverage_ratio,
                position_count,
                missing_value_positions,
                provenance,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(metric_run_uuid, portfolio_uuid) DO UPDATE SET
                valuation_currency = excluded.valuation_currency,
                current_value_cents = excluded.current_value_cents,
                purchase_value_cents = excluded.purchase_value_cents,
                gain_abs_cents = excluded.gain_abs_cents,
                gain_pct = excluded.gain_pct,
                total_change_eur_cents = excluded.total_change_eur_cents,
                total_change_pct = excluded.total_change_pct,
                source = excluded.source,
                coverage_ratio = excluded.coverage_ratio,
                position_count = excluded.position_count,
                missing_value_positions = excluded.missing_value_positions,
                provenance = excluded.provenance,
                updated_at = excluded.updated_at
            """,
            [
                (
                    record.metric_run_uuid,
                    record.portfolio_uuid,
                    record.valuation_currency or "EUR",
                    record.current_value_cents,
                    record.purchase_value_cents,
                    record.gain_abs_cents,
                    record.gain_pct,
                    record.total_change_eur_cents,
                    record.total_change_pct,
                    record.source,
                    record.coverage_ratio,
                    record.position_count,
                    record.missing_value_positions,
                    record.provenance,
                    record.created_at or timestamp,
                    record.updated_at or timestamp,
                )
                for record in records
            ],
        )
        if conn is None:
            local_conn.commit()
    except sqlite3.Error:
        _LOGGER.exception(
            "Fehler beim Speichern der Portfolio-Metriken (run_uuid=%s)",
            records[0].metric_run_uuid,
        )
        raise
    finally:
        if conn is None:
            local_conn.close()


def fetch_portfolio_metrics(
    db_path: Path,
    run_uuid: str,
    *,
    conn: sqlite3.Connection | None = None,
) -> list[PortfolioMetricRecord]:
    """Load portfolio metrics associated with a metric run."""
    if not run_uuid:
        message = "run_uuid darf nicht leer sein"
        raise ValueError(message)

    local_conn = conn or sqlite3.connect(str(db_path))
    local_conn.row_factory = sqlite3.Row
    try:
        cursor = local_conn.execute(
            """
            SELECT
                metric_run_uuid,
                portfolio_uuid,
                valuation_currency,
                current_value_cents,
                purchase_value_cents,
                gain_abs_cents,
                gain_pct,
                total_change_eur_cents,
                total_change_pct,
                source,
                coverage_ratio,
                position_count,
                missing_value_positions,
                provenance,
                created_at,
                updated_at
            FROM portfolio_metrics
            WHERE metric_run_uuid = ?
            ORDER BY portfolio_uuid
            """,
            (run_uuid,),
        )
        rows = cursor.fetchall()
        return [_row_to_portfolio_metric(row) for row in rows]
    finally:
        if conn is None:
            local_conn.close()


def upsert_account_metrics(
    db_path: Path,
    records: Sequence[AccountMetricRecord],
    *,
    conn: sqlite3.Connection | None = None,
) -> None:
    """Insert or update account metrics for a run."""
    if not records:
        return

    timestamp = _utc_now_isoformat()
    local_conn = conn or sqlite3.connect(str(db_path))
    try:
        local_conn.executemany(
            """
            INSERT INTO account_metrics (
                metric_run_uuid,
                account_uuid,
                currency_code,
                valuation_currency,
                balance_native_cents,
                balance_eur_cents,
                fx_rate,
                fx_rate_source,
                fx_rate_timestamp,
                coverage_ratio,
                provenance,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(metric_run_uuid, account_uuid) DO UPDATE SET
                currency_code = excluded.currency_code,
                valuation_currency = excluded.valuation_currency,
                balance_native_cents = excluded.balance_native_cents,
                balance_eur_cents = excluded.balance_eur_cents,
                fx_rate = excluded.fx_rate,
                fx_rate_source = excluded.fx_rate_source,
                fx_rate_timestamp = excluded.fx_rate_timestamp,
                coverage_ratio = excluded.coverage_ratio,
                provenance = excluded.provenance,
                updated_at = excluded.updated_at
            """,
            [
                (
                    record.metric_run_uuid,
                    record.account_uuid,
                    record.currency_code,
                    record.valuation_currency or "EUR",
                    record.balance_native_cents,
                    record.balance_eur_cents,
                    record.fx_rate,
                    record.fx_rate_source,
                    record.fx_rate_timestamp,
                    record.coverage_ratio,
                    record.provenance,
                    record.created_at or timestamp,
                    record.updated_at or timestamp,
                )
                for record in records
            ],
        )
        if conn is None:
            local_conn.commit()
    except sqlite3.Error:
        _LOGGER.exception(
            "Fehler beim Speichern der Konto-Metriken (run_uuid=%s)",
            records[0].metric_run_uuid,
        )
        raise
    finally:
        if conn is None:
            local_conn.close()


def fetch_account_metrics(
    db_path: Path,
    run_uuid: str,
    *,
    conn: sqlite3.Connection | None = None,
) -> list[AccountMetricRecord]:
    """Load account metrics associated with a metric run."""
    if not run_uuid:
        message = "run_uuid darf nicht leer sein"
        raise ValueError(message)

    local_conn = conn or sqlite3.connect(str(db_path))
    local_conn.row_factory = sqlite3.Row
    try:
        cursor = local_conn.execute(
            """
            SELECT
                metric_run_uuid,
                account_uuid,
                currency_code,
                valuation_currency,
                balance_native_cents,
                balance_eur_cents,
                fx_rate,
                fx_rate_source,
                fx_rate_timestamp,
                coverage_ratio,
                provenance,
                created_at,
                updated_at
            FROM account_metrics
            WHERE metric_run_uuid = ?
            ORDER BY account_uuid
            """,
            (run_uuid,),
        )
        rows = cursor.fetchall()
        return [_row_to_account_metric(row) for row in rows]
    finally:
        if conn is None:
            local_conn.close()


def upsert_security_metrics(
    db_path: Path,
    records: Sequence[SecurityMetricRecord],
    *,
    conn: sqlite3.Connection | None = None,
) -> None:
    """Insert or update security metrics for a run."""
    if not records:
        return

    timestamp = _utc_now_isoformat()
    local_conn = conn or sqlite3.connect(str(db_path))
    try:
        local_conn.executemany(
            """
            INSERT INTO security_metrics (
                metric_run_uuid,
                portfolio_uuid,
                security_uuid,
                valuation_currency,
                security_currency_code,
                holdings_raw,
                current_value_cents,
                purchase_value_cents,
                purchase_security_value_raw,
                purchase_account_value_cents,
                gain_abs_cents,
                gain_pct,
                total_change_eur_cents,
                total_change_pct,
                source,
                coverage_ratio,
                day_change_native,
                day_change_eur,
                day_change_pct,
                day_change_source,
                day_change_coverage,
                last_price_native_raw,
                last_close_native_raw,
                provenance,
                created_at,
                updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
            ON CONFLICT(metric_run_uuid, portfolio_uuid, security_uuid) DO UPDATE SET
                valuation_currency = excluded.valuation_currency,
                security_currency_code = excluded.security_currency_code,
                holdings_raw = excluded.holdings_raw,
                current_value_cents = excluded.current_value_cents,
                purchase_value_cents = excluded.purchase_value_cents,
                purchase_security_value_raw = excluded.purchase_security_value_raw,
                purchase_account_value_cents = excluded.purchase_account_value_cents,
                gain_abs_cents = excluded.gain_abs_cents,
                gain_pct = excluded.gain_pct,
                total_change_eur_cents = excluded.total_change_eur_cents,
                total_change_pct = excluded.total_change_pct,
                source = excluded.source,
                coverage_ratio = excluded.coverage_ratio,
                day_change_native = excluded.day_change_native,
                day_change_eur = excluded.day_change_eur,
                day_change_pct = excluded.day_change_pct,
                day_change_source = excluded.day_change_source,
                day_change_coverage = excluded.day_change_coverage,
                last_price_native_raw = excluded.last_price_native_raw,
                last_close_native_raw = excluded.last_close_native_raw,
                provenance = excluded.provenance,
                updated_at = excluded.updated_at
            """,
            [
                (
                    record.metric_run_uuid,
                    record.portfolio_uuid,
                    record.security_uuid,
                    record.valuation_currency or "EUR",
                    record.security_currency_code or "EUR",
                    record.holdings_raw,
                    record.current_value_cents,
                    record.purchase_value_cents,
                    record.purchase_security_value_raw,
                    record.purchase_account_value_cents,
                    record.gain_abs_cents,
                    record.gain_pct,
                    record.total_change_eur_cents,
                    record.total_change_pct,
                    record.source,
                    record.coverage_ratio,
                    record.day_change_native,
                    record.day_change_eur,
                    record.day_change_pct,
                    record.day_change_source,
                    record.day_change_coverage,
                    record.last_price_native_raw,
                    record.last_close_native_raw,
                    record.provenance,
                    record.created_at or timestamp,
                    record.updated_at or timestamp,
                )
                for record in records
            ],
        )
        if conn is None:
            local_conn.commit()
    except sqlite3.Error:
        _LOGGER.exception(
            "Fehler beim Speichern der Wertpapier-Metriken (run_uuid=%s)",
            records[0].metric_run_uuid,
        )
        raise
    finally:
        if conn is None:
            local_conn.close()


def fetch_security_metrics(
    db_path: Path,
    run_uuid: str,
    *,
    conn: sqlite3.Connection | None = None,
) -> list[SecurityMetricRecord]:
    """Load security metrics associated with a metric run."""
    if not run_uuid:
        message = "run_uuid darf nicht leer sein"
        raise ValueError(message)

    local_conn = conn or sqlite3.connect(str(db_path))
    local_conn.row_factory = sqlite3.Row
    try:
        cursor = local_conn.execute(
            """
            SELECT
                metric_run_uuid,
                portfolio_uuid,
                security_uuid,
                valuation_currency,
                security_currency_code,
                holdings_raw,
                current_value_cents,
                purchase_value_cents,
                purchase_security_value_raw,
                purchase_account_value_cents,
                gain_abs_cents,
                gain_pct,
                total_change_eur_cents,
                total_change_pct,
                source,
                coverage_ratio,
                day_change_native,
                day_change_eur,
                day_change_pct,
                day_change_source,
                day_change_coverage,
                last_price_native_raw,
                last_close_native_raw,
                provenance,
                created_at,
                updated_at
            FROM security_metrics
            WHERE metric_run_uuid = ?
            ORDER BY portfolio_uuid, security_uuid
            """,
            (run_uuid,),
        )
        rows = cursor.fetchall()
        return [_row_to_security_metric(row) for row in rows]
    finally:
        if conn is None:
            local_conn.close()


def upsert_fx_rate(
    db_path: Path,
    rate: FxRateRecord,
    *,
    conn: sqlite3.Connection | None = None,
) -> None:
    """Insert or update an FX rate entry."""
    if not rate.date:
        message = "date darf nicht leer sein"
        raise ValueError(message)
    if not rate.currency:
        message = "currency darf nicht leer sein"
        raise ValueError(message)

    local_conn = conn or sqlite3.connect(str(db_path))

    try:
        try:
            local_conn.execute(
                """
                INSERT OR REPLACE INTO fx_rates (
                    date,
                    currency,
                    rate,
                    fetched_at,
                    data_source,
                    provider,
                    provenance
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    rate.date,
                    rate.currency,
                    rate.rate,
                    rate.fetched_at,
                    rate.data_source,
                    rate.provider,
                    rate.provenance,
                ),
            )
            if conn is None:
                local_conn.commit()
        except sqlite3.Error:
            _LOGGER.exception(
                "Fehler beim Speichern des Wechselkurses (date=%s, currency=%s)",
                rate.date,
                rate.currency,
            )
            raise
    finally:
        if conn is None:
            local_conn.close()


def load_fx_rates_for_date(
    db_path: Path,
    date: str,
    *,
    conn: sqlite3.Connection | None = None,
) -> list[FxRateRecord]:
    """Load all FX rates stored for a specific date."""
    if not date:
        message = "date darf nicht leer sein"
        raise ValueError(message)

    local_conn = conn or sqlite3.connect(str(db_path))

    try:
        try:
            cursor = local_conn.execute(
                """
                SELECT
                    date,
                    currency,
                    rate,
                    fetched_at,
                    data_source,
                    provider,
                    provenance
                FROM fx_rates
                WHERE date = ?
                """,
                (date,),
            )
        except sqlite3.Error:
            _LOGGER.exception(
                "Fehler beim Laden der Wechselkurse (date=%s)",
                date,
            )
            raise

        rows = cursor.fetchall()
        return [
            FxRateRecord(
                date=row[0],
                currency=row[1],
                rate=row[2],
                fetched_at=row[3],
                data_source=row[4],
                provider=row[5],
                provenance=row[6],
            )
            for row in rows
        ]
    finally:
        if conn is None:
            local_conn.close()


def enqueue_price_history_job(
    db_path: Path,
    job: NewPriceHistoryJob,
    *,
    conn: sqlite3.Connection | None = None,
) -> int:
    """Insert a job into the price history queue and return its identifier."""
    if not job.security_uuid:
        message = "security_uuid darf nicht leer sein"
        raise ValueError(message)
    if not job.status:
        message = "status darf nicht leer sein"
        raise ValueError(message)

    timestamp = _utc_now_isoformat()
    local_conn = conn or sqlite3.connect(str(db_path))

    try:
        try:
            cursor = local_conn.execute(
                """
                INSERT INTO price_history_queue (
                    security_uuid,
                    requested_date,
                    status,
                    priority,
                    scheduled_at,
                    data_source,
                    provenance,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    job.security_uuid,
                    job.requested_date,
                    job.status,
                    job.priority,
                    job.scheduled_at,
                    job.data_source,
                    job.provenance,
                    timestamp,
                ),
            )
        except sqlite3.Error:
            _LOGGER.exception(
                "Fehler beim Anlegen eines Price-History-Jobs (security_uuid=%s)",
                job.security_uuid,
            )
            raise
        else:
            job_id = int(cursor.lastrowid)
            if conn is None:
                local_conn.commit()
            return job_id
    finally:
        if conn is None:
            local_conn.close()


def price_history_job_exists(
    db_path: Path,
    security_uuid: str,
    *,
    statuses: Sequence[str] = ("pending", "running"),
) -> bool:
    """Return True when a job for the security exists in one of the statuses."""
    if not security_uuid:
        message = "security_uuid darf nicht leer sein"
        raise ValueError(message)
    statuses_tuple = tuple(statuses)
    if not statuses_tuple:
        return False

    conn = sqlite3.connect(str(db_path))
    try:
        cursor = conn.execute(
            """
            SELECT status
            FROM price_history_queue
            WHERE security_uuid = ?
            """,
            (security_uuid,),
        )
        return any(row[0] in statuses_tuple for row in cursor.fetchall())
    finally:
        conn.close()


def mark_price_history_job_started(db_path: Path, job_id: int) -> None:
    """Transition a job into running status and increment attempts."""
    timestamp = _utc_now_isoformat()
    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute(
            """
            UPDATE price_history_queue
            SET status = 'running',
                attempts = attempts + 1,
                started_at = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (timestamp, timestamp, job_id),
        )
        conn.commit()
    finally:
        conn.close()


def complete_price_history_job(
    db_path: Path,
    job_id: int,
    *,
    status: str,
    last_error: str | None = None,
    provenance_updates: dict[str, Any] | None = None,
) -> None:
    """Complete a job, updating optional error/provenance metadata."""
    if not status:
        message = "status darf nicht leer sein"
        raise ValueError(message)

    timestamp = _utc_now_isoformat()
    conn = sqlite3.connect(str(db_path))
    try:
        provenance_fragment = None
        if provenance_updates:
            provenance_fragment = json.dumps(provenance_updates)

        conn.execute(
            """
            UPDATE price_history_queue
            SET status = ?,
                finished_at = ?,
                last_error = ?,
                updated_at = ?,
                provenance = COALESCE(?, provenance)
            WHERE id = ?
            """,
            (status, timestamp, last_error, timestamp, provenance_fragment, job_id),
        )
        conn.commit()
    finally:
        conn.close()


def get_price_history_jobs_by_status(
    db_path: Path,
    status: str,
    *,
    limit: int | None = None,
    conn: sqlite3.Connection | None = None,
) -> list[PriceHistoryJob]:
    """Return queue entries filtered by status ordered by priority descending."""
    if not status:
        message = "status darf nicht leer sein"
        raise ValueError(message)

    local_conn = conn or sqlite3.connect(str(db_path))

    try:
        query = """
            SELECT
                id,
                security_uuid,
                requested_date,
                status,
                priority,
                attempts,
                scheduled_at,
                started_at,
                finished_at,
                last_error,
                data_source,
                provenance,
                created_at,
                updated_at
            FROM price_history_queue
            WHERE status = ?
            ORDER BY priority DESC, scheduled_at ASC, id ASC
        """
        params: list[Any] = [status]
        if limit is not None:
            if limit <= 0:
                message = "limit muss größer als 0 sein"
                raise ValueError(message)
            query += " LIMIT ?"
            params.append(limit)

        try:
            cursor = local_conn.execute(query, params)
        except sqlite3.Error:
            _LOGGER.exception(
                "Fehler beim Lesen der Price-History-Jobs mit Status '%s'",
                status,
            )
            raise

        rows = cursor.fetchall()
        return [
            PriceHistoryJob(
                id=row[0],
                security_uuid=row[1],
                requested_date=row[2],
                status=row[3],
                priority=row[4],
                attempts=row[5],
                scheduled_at=row[6],
                started_at=row[7],
                finished_at=row[8],
                last_error=row[9],
                data_source=row[10],
                provenance=row[11],
                created_at=row[12],
                updated_at=row[13],
            )
            for row in rows
        ]
    finally:
        if conn is None:
            local_conn.close()


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
        except (TypeError, ValueError):  # pragma: no cover - defensive
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




def _normalize_portfolio_row(row: sqlite3.Row) -> dict[str, Any]:
    """
    Map a sqlite3.Row to the unified portfolio dict format.

    Expected columns:
      - current_value_cents
      - purchase_value_cents
      - gain_abs_cents
      - total_change_eur_cents
      - gain_pct
      - total_change_pct
      - source
      - coverage_ratio
      - position_count
      - missing_value_positions
      - provenance
    """
    current_value = cent_to_eur(row["current_value_cents"], default=0.0) or 0.0
    purchase_sum = cent_to_eur(row["purchase_value_cents"], default=0.0) or 0.0

    try:
        position_count = int(row["position_count"] or 0)
    except (TypeError, ValueError):
        position_count = 0

    try:
        missing_value_positions = int(row["missing_value_positions"] or 0)
    except (TypeError, ValueError):
        missing_value_positions = 0

    performance_payload: dict[str, Any] = {
        "gain_abs": cent_to_eur(row["gain_abs_cents"], default=0.0) or 0.0,
        "gain_pct": row["gain_pct"],
        "total_change_eur": cent_to_eur(
            row["total_change_eur_cents"],
            default=None,
        )
        or cent_to_eur(row["gain_abs_cents"], default=0.0)
        or 0.0,
        "total_change_pct": row["total_change_pct"],
        "source": row["source"] or "metrics",
        "coverage_ratio": row["coverage_ratio"],
    }
    if row["provenance"]:
        performance_payload["provenance"] = row["provenance"]

    normalized = {
        "uuid": row["uuid"],
        "name": row["name"],
        "current_value": current_value,
        "purchase_sum": purchase_sum,
        "performance": performance_payload,
        "position_count": position_count,
        "missing_value_positions": missing_value_positions,
        "has_current_value": missing_value_positions == 0,
        "metric_run_uuid": row["metric_run_uuid"],
    }
    coverage_ratio = row["coverage_ratio"]
    if coverage_ratio is not None:
        normalized["coverage_ratio"] = coverage_ratio
    provenance = row["provenance"]
    if provenance:
        normalized["provenance"] = provenance
    return normalized


def _fallback_live_portfolios(db_path: Path) -> list[dict[str, Any]]:
    """Aggregate live portfolio values directly from portfolio_securities."""
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        cursor = conn.execute(
            """
            SELECT
                p.uuid,
                p.name,
                COALESCE(SUM(ps.current_value), 0) AS current_value_cents,
                COALESCE(SUM(ps.purchase_value), 0) AS purchase_value_cents,
                SUM(
                    CASE
                        WHEN ps.current_holdings IS NOT NULL AND ps.current_holdings > 0
                        THEN 1
                        ELSE 0
                    END
                ) AS position_count
            FROM portfolios p
            LEFT JOIN portfolio_securities ps ON ps.portfolio_uuid = p.uuid
            GROUP BY p.uuid, p.name
            ORDER BY p.name COLLATE NOCASE
            """
        )
        rows = cursor.fetchall()
    finally:
        conn.close()

    fallback_rows: list[dict[str, Any]] = []
    for row in rows:
        current_value = cent_to_eur(row["current_value_cents"], default=0.0) or 0.0
        purchase_sum = cent_to_eur(row["purchase_value_cents"], default=0.0) or 0.0
        try:
            position_count = int(row["position_count"] or 0)
        except (TypeError, ValueError):
            position_count = 0

        metrics_payload, day_change = select_performance_metrics(
            current_value=current_value,
            purchase_value=purchase_sum,
            holdings=position_count,
        )
        performance_payload = compose_performance_payload(
            None,
            metrics=metrics_payload,
            day_change=day_change,
        )

        entry: dict[str, Any] = {
            "uuid": row["uuid"],
            "name": row["name"],
            "current_value": current_value,
            "purchase_sum": purchase_sum,
            "position_count": position_count,
            "missing_value_positions": 0,
            "has_current_value": position_count > 0 or current_value > 0,
            "metric_run_uuid": None,
            "performance": performance_payload,
        }
        coverage_ratio = performance_payload.get("coverage_ratio")
        if coverage_ratio is not None:
            entry["coverage_ratio"] = coverage_ratio
        fallback_rows.append(entry)
    return fallback_rows


def fetch_live_portfolios(db_path: Path) -> list[dict[str, Any]]:
    """Return latest persisted portfolio metrics for websocket/event consumers."""
    conn: sqlite3.Connection | None = None
    try:
        run_uuid = load_latest_completed_metric_run_uuid(db_path)
        if not run_uuid:
            _LOGGER.debug(
                "fetch_live_portfolios: kein abgeschlossener Metric-Run gefunden"
            )
            return _fallback_live_portfolios(db_path)

        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        cursor = conn.execute(
            """
            SELECT
                pm.metric_run_uuid,
                pm.portfolio_uuid AS uuid,
                p.name AS name,
                pm.current_value_cents,
                pm.purchase_value_cents,
                pm.gain_abs_cents,
                pm.gain_pct,
                pm.total_change_eur_cents,
                pm.total_change_pct,
                pm.source,
                pm.coverage_ratio,
                pm.position_count,
                pm.missing_value_positions,
                pm.provenance
            FROM portfolio_metrics pm
            JOIN portfolios p ON p.uuid = pm.portfolio_uuid
            WHERE pm.metric_run_uuid = ?
            ORDER BY p.name COLLATE NOCASE
            """,
            (run_uuid,),
        )
        rows = cursor.fetchall()
        return [_normalize_portfolio_row(row) for row in rows]
    except Exception:
        _LOGGER.exception("fetch_live_portfolios fehlgeschlagen (db_path=%s)", db_path)
        return []
    finally:
        if conn is not None:
            with suppress(Exception):
                conn.close()  # type: ignore[has-type]
