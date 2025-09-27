"""Synchronisation von Portfolio Performance Daten."""

from __future__ import annotations

import json
import logging
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import TYPE_CHECKING, Any
from zoneinfo import ZoneInfo

try:  # pragma: no cover - dependency optional for unit tests
    from google.protobuf.timestamp_pb2 import Timestamp
except ModuleNotFoundError as err:  # pragma: no cover - protobuf dependency missing
    Timestamp = None  # type: ignore[assignment]
    _TIMESTAMP_IMPORT_ERROR = err
else:
    _TIMESTAMP_IMPORT_ERROR = None
from homeassistant.const import EVENT_PANELS_UPDATED
from homeassistant.core import HomeAssistant, callback

from pp_reader.currencies.fx import (
    ensure_exchange_rates_for_dates_sync,
    load_latest_rates_sync,
)

from ..logic.accounting import db_calc_account_balance  # noqa: TID252
from ..logic.securities import (  # noqa: TID252
    db_calculate_current_holdings,
    db_calculate_holdings_value,
    db_calculate_sec_purchase_value,
)
from .db_access import (
    fetch_live_portfolios,  # NEU: Einheitliche Aggregationsquelle
    get_portfolio_positions,  # Für Push der Positionsdaten (lazy + change push)
    get_transactions,
)


@dataclass(slots=True)
class SyncStats:
    """Aggregierte Statistiken über den Importlauf."""

    securities: int = 0
    transactions: int = 0
    fx_transactions: int = 0


@dataclass(slots=True)
class SyncChanges:
    """Verfolgt, welche Bereiche bei der Synchronisation Änderungen enthielten."""

    accounts: bool = False
    transactions: bool = False
    securities: bool = False
    portfolios: bool = False
    last_file_update: bool = False
    portfolio_securities: bool = False


if TYPE_CHECKING:
    from collections.abc import Iterable
    from pathlib import Path
    from sqlite3 import Connection, Cursor

    from custom_components.pp_reader.name.abuchen.portfolio import client_pb2
else:  # pragma: no cover - Laufzeittypen nur für Hinweise
    Iterable = Any  # type: ignore[assignment]
    Path = Any  # type: ignore[assignment]
    Connection = Cursor = Any  # type: ignore[assignment]
    client_pb2 = Any  # type: ignore[assignment]


DELETE_TABLE_CONFIG = {
    "transactions": {
        "select_sql": "SELECT uuid FROM transactions",
        "delete_sql": "DELETE FROM transactions WHERE uuid = ?",
        "truncate_sql": "DELETE FROM transactions",
        "id_column": "uuid",
    },
    "accounts": {
        "select_sql": "SELECT uuid FROM accounts",
        "delete_sql": "DELETE FROM accounts WHERE uuid = ?",
        "truncate_sql": "DELETE FROM accounts",
        "id_column": "uuid",
    },
    "securities": {
        "select_sql": "SELECT uuid FROM securities",
        "delete_sql": "DELETE FROM securities WHERE uuid = ?",
        "truncate_sql": "DELETE FROM securities",
        "id_column": "uuid",
    },
    "portfolios": {
        "select_sql": "SELECT uuid FROM portfolios",
        "delete_sql": "DELETE FROM portfolios WHERE uuid = ?",
        "truncate_sql": "DELETE FROM portfolios",
        "id_column": "uuid",
    },
}

DOMAIN = "pp_reader"

_LOGGER = logging.getLogger(__name__)


EVENT_DATA_MAX_BYTES = 32_768
_EVENT_SIZE_MARGIN = 512


def _is_sequence(value: Any) -> bool:
    """Return True for non-string sequences."""
    return isinstance(value, Sequence) and not isinstance(
        value, (str, bytes, bytearray)
    )


def _estimate_event_size(payload: dict[str, Any]) -> int:
    """Return the JSON encoded size of an event payload in bytes."""
    try:
        encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    except (TypeError, ValueError):
        return 0
    return len(encoded.encode("utf-8"))


def _normalize_portfolio_value_entry(item: Mapping[str, Any]) -> dict[str, Any] | None:
    """Compact a raw portfolio aggregation entry for event transport."""
    uuid = item.get("uuid") or item.get("portfolio_uuid")
    if not uuid:
        return None

    def _float(value_key: str, fallback_key: str | None = None) -> float:
        raw = item.get(value_key)
        if raw is None and fallback_key is not None:
            raw = item.get(fallback_key)
        try:
            return round(float(raw or 0.0), 2)
        except (TypeError, ValueError):
            return 0.0

    def _int(value_key: str, fallback_key: str | None = None) -> int:
        raw = item.get(value_key)
        if raw is None and fallback_key is not None:
            raw = item.get(fallback_key)
        try:
            return int(raw or 0)
        except (TypeError, ValueError):
            return 0

    return {
        "uuid": str(uuid),
        "position_count": _int("position_count", "count"),
        "current_value": _float("current_value", "value"),
        "purchase_sum": _float("purchase_sum"),
    }


def _compact_portfolio_values_payload(data: Any) -> Any:
    """Remove unused fields from portfolio value updates to keep payloads small."""

    def _compact_items(items: Sequence[Any]) -> list[dict[str, Any]]:
        compacted: list[dict[str, Any]] = []
        for item in items:
            if isinstance(item, Mapping):
                normalized = _normalize_portfolio_value_entry(item)
                if normalized is not None:
                    compacted.append(normalized)
        return compacted

    if isinstance(data, Mapping):
        result: dict[str, Any] = {}
        portfolios = data.get("portfolios")
        if _is_sequence(portfolios):
            result["portfolios"] = _compact_items(portfolios)
        else:
            normalized = _normalize_portfolio_value_entry(data)
            if normalized is not None:
                result["portfolios"] = [normalized]

        # Optional additional keys (e.g. "error") should be propagated if present
        for optional_key in ("error",):
            if optional_key in data:
                result[optional_key] = data[optional_key]
        return result

    if _is_sequence(data):
        return _compact_items(data)

    return data


def _normalize_position_entry(item: Mapping[str, Any]) -> dict[str, Any] | None:
    """Reduce a raw position entry to the fields required by the dashboard."""
    security_uuid = item.get("security_uuid")
    if security_uuid:
        security_uuid = str(security_uuid)

    def _float(value_key: str) -> float:
        raw = item.get(value_key)
        try:
            return round(float(raw or 0.0), 2)
        except (TypeError, ValueError):
            return 0.0

    normalized: dict[str, Any] = {
        "security_uuid": security_uuid,
        "name": item.get("name"),
        "current_holdings": item.get("current_holdings", 0),
        "purchase_value": _float("purchase_value"),
        "current_value": _float("current_value"),
        "gain_abs": _float("gain_abs"),
        "gain_pct": _float("gain_pct"),
    }

    return normalized


def _compact_portfolio_positions_payload(data: Any) -> Any:
    """Ensure position updates only transport the necessary keys."""
    if not isinstance(data, Mapping):
        return data

    positions = data.get("positions")
    compacted: list[dict[str, Any]] = []
    if _is_sequence(positions):
        for item in positions:
            if isinstance(item, Mapping):
                normalized = _normalize_position_entry(item)
                if normalized is not None:
                    compacted.append(normalized)

    result: dict[str, Any] = {
        "portfolio_uuid": data.get("portfolio_uuid"),
        "positions": compacted,
    }
    if "error" in data:
        result["error"] = data["error"]
    return result


def _compact_event_data(data_type: str, data: Any) -> Any:
    """Return an event payload with redundant fields stripped out."""
    if data_type == "portfolio_values":
        return _compact_portfolio_values_payload(data)

    if data_type == "portfolio_positions":
        return _compact_portfolio_positions_payload(data)

    return data


def _require_timestamp_support() -> None:
    """Ensure the protobuf Timestamp dependency is available."""
    if _TIMESTAMP_IMPORT_ERROR is not None:  # pragma: no cover - defensive
        msg = "protobuf runtime is required to work with Portfolio Performance data"
        raise RuntimeError(msg) from _TIMESTAMP_IMPORT_ERROR


def to_iso8601(ts: Timestamp) -> str:
    """
    Convert a Google Protobuf Timestamp to an ISO 8601 formatted string.

    Parameters
    ----------
    ts : Timestamp
        The Google Protobuf Timestamp object to convert.

    Returns
    -------
    str
        The ISO 8601 formatted string representation of the timestamp,
        or None if the timestamp is invalid or has zero seconds.

    """
    _require_timestamp_support()
    return ts.ToDatetime().isoformat() if ts is not None and ts.seconds != 0 else None


def delete_missing_entries(
    conn: Connection, table: str, id_column: str, current_ids: Iterable[str]
) -> None:
    """Remove entries that are no longer present in the source dataset."""
    config = DELETE_TABLE_CONFIG.get(table)
    if config is None or config["id_column"] != id_column:
        msg = (
            f"Invalid delete configuration for table={table!r} id_column={id_column!r}"
        )
        raise ValueError(msg)

    ids_to_keep = set(current_ids)
    cur = conn.cursor()
    if not ids_to_keep:
        _LOGGER.debug("Lösche alle Einträge aus %s (keine aktuellen IDs)", table)
        cur.execute(config["truncate_sql"])
    else:
        cur.execute(config["select_sql"])
        existing_ids = {row[0] for row in cur.fetchall()}
        stale_ids = existing_ids - ids_to_keep
        if stale_ids:
            cur.executemany(
                config["delete_sql"],
                [(stale_id,) for stale_id in stale_ids],
            )
    conn.commit()


def normalize_shares(shares: int | None) -> int | None:
    """Stellt sicher dass Shares als Integer gespeichert werden."""
    return int(shares) if shares is not None else None


def normalize_amount(amount: int | None) -> int | None:
    """Stellt sicher dass Beträge als Cent-Integer gespeichert werden."""
    return int(amount) if amount is not None else None


def extract_exchange_rate(pdecimal: Any) -> float | None:
    """Extrahiert einen positiven Wechselkurs aus PDecimalValue."""
    if not pdecimal or not pdecimal.HasField("value"):
        return None
    value = int.from_bytes(pdecimal.value, byteorder="little", signed=True)
    return abs(value / (10**pdecimal.scale))


def maybe_field(message: Any, field_name: str) -> Any:
    """Gibt einen optionalen Protobuf-Wert zurück, falls vorhanden."""
    if not hasattr(message, field_name):
        return None

    value = getattr(message, field_name)

    has_field = getattr(message, "HasField", None)
    if callable(has_field):
        try:
            if has_field(field_name):
                return value
        except ValueError:
            # Proto3-Skalarfelder besitzen keine Presence-Informationen.
            # In diesem Fall verwenden wir den direkten Attributwert.
            return value
        else:
            return None

    return value


@callback
def _push_update(
    hass: HomeAssistant | None,
    entry_id: str | None,
    data_type: str,
    data: Any,
) -> None:
    """Thread-sicheres Pushen eines Update-Events in den HA Event Loop."""
    if not hass or not entry_id:
        return

    compact_data = _compact_event_data(data_type, data)
    payload = {
        "domain": DOMAIN,
        "entry_id": entry_id,
        "data_type": data_type,
        "data": compact_data,
    }

    payload_size = _estimate_event_size(payload)
    if payload_size > EVENT_DATA_MAX_BYTES:
        _LOGGER.warning(
            (
                "Event payload for %s exceeds recorder limit (%d > %d bytes). "
                "Content was compacted but will still be dropped by the recorder."
            ),
            data_type,
            payload_size,
            EVENT_DATA_MAX_BYTES,
        )
    elif payload_size > (EVENT_DATA_MAX_BYTES - _EVENT_SIZE_MARGIN):
        _LOGGER.debug(
            "Event payload for %s is close to recorder limit (%d bytes)",
            data_type,
            payload_size,
        )
    try:
        # Direkter thread-sicherer Aufruf der synchronen fire-Methode
        hass.loop.call_soon_threadsafe(hass.bus.fire, EVENT_PANELS_UPDATED, payload)
    except Exception:
        _LOGGER.exception("Fehler beim Schedulen des Events %s", data_type)


def sync_from_pclient(  # noqa: PLR0913 - API erfordert diese Parameter
    client: client_pb2.PClient,
    conn: Connection,
    hass: HomeAssistant | None = None,
    entry_id: str | None = None,
    last_file_update: str | None = None,
    db_path: Path | None = None,
) -> None:
    """Synchronisiere Daten aus Portfolio Performance mit der lokalen SQLite DB."""
    runner = _SyncRunner(
        client=client,
        conn=conn,
        hass=hass,
        entry_id=entry_id,
        last_file_update=last_file_update,
        db_path=db_path,
    )
    runner.run()


class _SyncRunner:
    """Kapselt die synchronen Import-Schritte."""

    def __init__(  # noqa: PLR0913 - Keyword-API für HA-Aufrufer
        self,
        *,
        client: client_pb2.PClient,
        conn: Connection,
        hass: HomeAssistant | None,
        entry_id: str | None,
        last_file_update: str | None,
        db_path: Path | None,
    ) -> None:
        self.client = client
        self.conn = conn
        self.hass = hass
        self.entry_id = entry_id
        self.last_file_update = last_file_update
        self.db_path = db_path
        self.stats = SyncStats()
        self.changes = SyncChanges()
        self.updated_data: dict[str, list[Any]] = {
            "accounts": [],
            "securities": [],
            "portfolios": [],
            "transactions": [],
        }
        self.changed_portfolios: set[str] = set()
        self.accounts_currency_map: dict[str, str] = {}
        self.all_transactions: list[Any] = []
        self.tx_units: dict[str, dict[str, Any]] = {}
        self.cursor: Cursor | None = None

    def run(self) -> None:
        self.cursor = self.conn.cursor()
        try:
            self.conn.execute("BEGIN TRANSACTION")
            self._store_last_file_update()
            self._sync_transactions()
            self._sync_accounts()
            self._sync_securities()
            self._sync_portfolios()
            self._sync_portfolio_securities()
        except Exception:
            self.conn.rollback()
            _LOGGER.exception("sync_from_pclient: Fehler während der Synchronisation")
            self._reset_change_flags()
            raise
        else:
            self._emit_updates()
        finally:
            if self.cursor is not None:
                self.cursor.close()
            self._log_summary()

    # Datenbank-Schritte -------------------------------------------------

    def _store_last_file_update(self) -> None:
        if not self.last_file_update or self.cursor is None:
            return
        self.cursor.execute(
            """
            INSERT OR REPLACE INTO metadata (
                key, date
            ) VALUES (
                'last_file_update', ?
            )
            """,
            (self.last_file_update,),
        )
        self.changes.last_file_update = True

    def _sync_transactions(self) -> None:
        if self.cursor is None:
            return
        transaction_ids = {t.uuid for t in self.client.transactions}
        delete_missing_entries(self.conn, "transactions", "uuid", transaction_ids)

        for transaction in self.client.transactions:
            other_updated_at = maybe_field(transaction, "otherUpdatedAt")
            self.cursor.execute(
                "SELECT * FROM transactions WHERE uuid = ?",
                (transaction.uuid,),
            )
            existing_transaction = self.cursor.fetchone()

            new_transaction_data = (
                transaction.uuid,
                int(transaction.type),
                maybe_field(transaction, "account"),
                maybe_field(transaction, "portfolio"),
                maybe_field(transaction, "otherAccount"),
                maybe_field(transaction, "otherPortfolio"),
                maybe_field(transaction, "otherUuid"),
                to_iso8601(other_updated_at),
                to_iso8601(transaction.date),
                transaction.currencyCode,
                normalize_amount(maybe_field(transaction, "amount")),
                normalize_shares(maybe_field(transaction, "shares")),
                maybe_field(transaction, "note"),
                maybe_field(transaction, "security"),
                maybe_field(transaction, "source"),
                to_iso8601(transaction.updatedAt),
            )

            if not existing_transaction or existing_transaction != new_transaction_data:
                self.changes.transactions = True
                self.updated_data["transactions"].append(transaction.uuid)
                self.cursor.execute(
                    """
                    INSERT OR REPLACE INTO transactions (
                        uuid, type, account, portfolio, other_account, other_portfolio,
                        other_uuid, other_updated_at, date, currency_code, amount,
                        shares, note, security, source, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    new_transaction_data,
                )

            self.stats.transactions += 1

        self.conn.commit()
        self.tx_units = self._rebuild_transaction_units()
        self.all_transactions = self._load_all_transactions()

    def _rebuild_transaction_units(self) -> dict[str, dict[str, Any]]:
        if self.cursor is None:
            return {}

        self.cursor.execute("DELETE FROM transaction_units")
        for transaction in self.client.transactions:
            for unit in transaction.units:
                fx_rate = None
                if unit.HasField("fxRateToBase"):
                    scale = unit.fxRateToBase.scale
                    value = int.from_bytes(
                        unit.fxRateToBase.value, byteorder="little", signed=True
                    )
                    fx_rate = abs(value / (10**scale))

                self.cursor.execute(
                    """
                    INSERT INTO transaction_units (
                        transaction_uuid, type, amount, currency_code,
                        fx_amount, fx_currency_code, fx_rate_to_base
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        transaction.uuid,
                        unit.type,
                        unit.amount,
                        unit.currencyCode,
                        maybe_field(unit, "fxAmount"),
                        maybe_field(unit, "fxCurrencyCode"),
                        fx_rate,
                    ),
                )
                if unit.HasField("fxAmount"):
                    self.stats.fx_transactions += 1

        self.cursor.execute(
            """
            SELECT transaction_uuid, fx_amount, fx_currency_code
            FROM transaction_units
            WHERE fx_amount IS NOT NULL
            """
        )
        tx_units: dict[str, dict[str, Any]] = {}
        for tx_uuid, fx_amount, fx_ccy in self.cursor.fetchall():
            if fx_amount is not None and fx_ccy:
                tx_units.setdefault(
                    tx_uuid,
                    {
                        "fx_amount": fx_amount,
                        "fx_currency_code": fx_ccy,
                    },
                )

        self.conn.commit()
        return tx_units

    def _load_all_transactions(self) -> list[Any]:
        try:
            return get_transactions(conn=self.conn)
        except Exception:
            _LOGGER.exception(
                "sync_from_pclient: Konnte Transaktionen nicht laden "
                "(all_transactions leer)."
            )
            return []

    def _sync_accounts(self) -> None:
        if self.cursor is None:
            return
        account_ids = {account.uuid for account in self.client.accounts}
        delete_missing_entries(self.conn, "accounts", "uuid", account_ids)

        self.cursor.execute("SELECT uuid, currency_code FROM accounts")
        self.accounts_currency_map = {
            row[0]: row[1] or "EUR" for row in self.cursor.fetchall()
        }

        for account in self.client.accounts:
            self.accounts_currency_map.setdefault(
                account.uuid, account.currencyCode or "EUR"
            )
            self.cursor.execute(
                """
                SELECT uuid, name, currency_code, note, is_retired, updated_at, balance
                FROM accounts
                WHERE uuid = ?
                """,
                (account.uuid,),
            )
            existing_account = self.cursor.fetchone()

            is_retired = 1 if getattr(account, "isRetired", False) else 0
            updated_at = (
                to_iso8601(account.updatedAt) if account.HasField("updatedAt") else None
            )
            new_account_data = (
                account.uuid,
                account.name,
                account.currencyCode,
                account.note if account.HasField("note") else None,
                is_retired,
                updated_at,
            )

            if self.changes.transactions:
                if is_retired:
                    balance = 0
                else:
                    account_transactions = [
                        tx
                        for tx in self.all_transactions
                        if account.uuid in (tx.account, tx.other_account)
                    ]
                    balance = db_calc_account_balance(
                        account.uuid,
                        account_transactions,
                        accounts_currency_map=self.accounts_currency_map,
                        tx_units=self.tx_units,
                    )
            else:
                balance = existing_account[-1] if existing_account else 0

            if (
                not existing_account
                or existing_account[1:6] != new_account_data[1:]
                or balance != (existing_account[6] if existing_account else None)
            ):
                self.changes.accounts = True
                self.updated_data["accounts"].append(
                    {
                        "name": account.name,
                        "balance": balance,
                        "currency_code": account.currencyCode,
                        "is_retired": is_retired,
                    }
                )
                self.cursor.execute(
                    """
                    INSERT OR REPLACE INTO accounts
                    (uuid, name, currency_code, note, is_retired, updated_at, balance)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (*new_account_data, balance),
                )

    def _sync_securities(self) -> None:
        if self.cursor is None:
            return
        _LOGGER.debug("sync_from_pclient: Synchronisiere Wertpapiere...")
        security_ids = {security.uuid for security in self.client.securities}
        delete_missing_entries(self.conn, "securities", "uuid", security_ids)

        for security in self.client.securities:
            retired = 1 if getattr(security, "isRetired", False) else 0
            security_updated_at = maybe_field(security, "updatedAt")
            updated_at = to_iso8601(security_updated_at)
            new_security_attrs = (
                security.name,
                maybe_field(security, "isin"),
                maybe_field(security, "wkn"),
                maybe_field(security, "tickerSymbol"),
                security.currencyCode,
                retired,
                updated_at,
            )

            self.cursor.execute(
                """
                SELECT name, isin, wkn, ticker_symbol,
                       currency_code, retired, updated_at
                FROM securities
                WHERE uuid = ?
                """,
                (security.uuid,),
            )
            existing_attr_row = self.cursor.fetchone()

            if not existing_attr_row:
                self.cursor.execute(
                    """
                    INSERT INTO securities (
                        uuid, name, isin, wkn, ticker_symbol, feed,
                        currency_code, retired, updated_at
                    ) VALUES (?,?,?,?,?,?,?,?,?)
                    """,
                    (
                        security.uuid,
                        new_security_attrs[0],
                        new_security_attrs[1],
                        new_security_attrs[2],
                        new_security_attrs[3],
                        None,
                        new_security_attrs[4],
                        new_security_attrs[5],
                        new_security_attrs[6],
                    ),
                )
                self.changes.securities = True
                self.updated_data["securities"].append(security.uuid)
            elif existing_attr_row != new_security_attrs:
                self.cursor.execute(
                    """
                    UPDATE securities
                    SET name=?, isin=?, wkn=?, ticker_symbol=?,
                        currency_code=?, retired=?, updated_at=?
                    WHERE uuid=?
                    """,
                    (*new_security_attrs, security.uuid),
                )
                self.changes.securities = True
                self.updated_data["securities"].append(security.uuid)

            if security.prices:
                for price in security.prices:
                    descriptor = getattr(price, "DESCRIPTOR", None)
                    fields = descriptor.fields_by_name if descriptor else {}
                    high = getattr(price, "high", None) if "high" in fields else None
                    low = getattr(price, "low", None) if "low" in fields else None
                    volume = (
                        getattr(price, "volume", None) if "volume" in fields else None
                    )

                    self.cursor.execute(
                        """
                        INSERT OR REPLACE INTO historical_prices (
                            security_uuid, date, close, high, low, volume
                        ) VALUES (?,?,?,?,?,?)
                        """,
                        (
                            security.uuid,
                            price.date,
                            price.close,
                            high,
                            low,
                            volume,
                        ),
                    )

                latest_price = max(security.prices, key=lambda price: price.date)
                _require_timestamp_support()
                assert Timestamp is not None  # noqa: S101 - runtime guard for type checkers
                latest_price_date_iso = to_iso8601(
                    Timestamp(seconds=latest_price.date * 86400)
                )
                self.cursor.execute(
                    """
                    UPDATE securities
                    SET last_price = ?, last_price_date = ?
                    WHERE uuid = ?
                    """,
                    (latest_price.close, latest_price_date_iso, security.uuid),
                )

            self.stats.securities += 1

    def _sync_portfolios(self) -> None:
        if self.cursor is None:
            return
        portfolio_ids = {portfolio.uuid for portfolio in self.client.portfolios}
        delete_missing_entries(self.conn, "portfolios", "uuid", portfolio_ids)

        for portfolio in self.client.portfolios:
            self.cursor.execute(
                "SELECT * FROM portfolios WHERE uuid = ?",
                (portfolio.uuid,),
            )
            existing_portfolio = self.cursor.fetchone()

            is_retired = 1 if getattr(portfolio, "isRetired", False) else 0
            portfolio_updated_at = maybe_field(portfolio, "updatedAt")
            updated_at = to_iso8601(portfolio_updated_at)
            reference_account = maybe_field(portfolio, "referenceAccount")
            new_portfolio_data = (
                portfolio.uuid,
                portfolio.name,
                maybe_field(portfolio, "note"),
                reference_account,
                is_retired,
                updated_at,
            )

            if not existing_portfolio or existing_portfolio != new_portfolio_data:
                self.changes.portfolios = True
                self.updated_data["portfolios"].append(portfolio.uuid)
                self.cursor.execute(
                    """
                    INSERT OR REPLACE INTO portfolios (
                        uuid, name, note, reference_account, is_retired, updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    new_portfolio_data,
                )

        # Changes must be committed before other tasks attempt database writes
        # (e.g. exchange rate updates during portfolio securities sync).
        self.conn.commit()

    def _sync_portfolio_securities(self) -> None:
        if self.cursor is None:
            return
        if not (self.changes.transactions or self.changes.securities):
            return

        _LOGGER.debug(
            "sync_from_pclient: Berechne und synchronisiere portfolio_securities..."
        )
        current_holdings = db_calculate_current_holdings(self.all_transactions)
        purchase_values = db_calculate_sec_purchase_value(
            self.all_transactions, self.db_path
        )

        current_hold_pur: dict[tuple[str, str], dict[str, Any]] = {}
        for key, purchase_value in purchase_values.items():
            if key in current_holdings:
                current_hold_pur[key] = {
                    "current_holdings": current_holdings[key],
                    "purchase_value": purchase_value,
                }

        current_holdings_values = db_calculate_holdings_value(
            self.db_path, self.conn, current_hold_pur
        )

        portfolio_sec_processed = 0
        for (portfolio_uuid, security_uuid), data in current_holdings_values.items():
            current_holdings_val = data.get("current_holdings", 0)
            purchase_value = data.get("purchase_value", 0)
            current_value = data.get("current_value", 0)

            self.cursor.execute(
                """
                SELECT current_holdings, purchase_value, current_value
                FROM portfolio_securities
                WHERE portfolio_uuid = ? AND security_uuid = ?
                """,
                (portfolio_uuid, security_uuid),
            )
            existing_entry = self.cursor.fetchone()

            expected_values = (
                current_holdings_val,
                int(purchase_value * 100),
                int(current_value * 100),
            )
            if not existing_entry or existing_entry != expected_values:
                self.changes.portfolio_securities = True
                self.cursor.execute(
                    """
                    INSERT OR REPLACE INTO portfolio_securities (
                        portfolio_uuid,
                        security_uuid,
                        current_holdings,
                        purchase_value,
                        current_value
                    ) VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        portfolio_uuid,
                        security_uuid,
                        current_holdings_val,
                        expected_values[1],
                        expected_values[2],
                    ),
                )
                portfolio_sec_processed += 1
                self.changed_portfolios.add(portfolio_uuid)

        portfolio_security_keys = set(current_holdings_values.keys())
        self.cursor.execute(
            "SELECT portfolio_uuid, security_uuid FROM portfolio_securities"
        )
        existing_keys = set(self.cursor.fetchall())
        keys_to_delete = existing_keys - portfolio_security_keys

        if keys_to_delete:
            self.cursor.executemany(
                """
                DELETE FROM portfolio_securities
                WHERE portfolio_uuid = ? AND security_uuid = ?
                """,
                keys_to_delete,
            )
            if self.cursor.rowcount > 0:
                self.changes.portfolio_securities = True
                for portfolio_uuid, _security_uuid in keys_to_delete:
                    self.changed_portfolios.add(portfolio_uuid)

        _LOGGER.debug(
            "sync_from_pclient: portfolio_securities upsert summary: "
            "upserts=%d deletions=%d changes_flag=%s",
            portfolio_sec_processed,
            len(keys_to_delete),
            self.changes.portfolio_securities,
        )
        self.conn.commit()

    # Event Versand ------------------------------------------------------

    def _emit_updates(self) -> None:
        if not (self.hass and self.entry_id):
            self._log_missing_dispatch()
            return

        self._emit_account_updates()
        self._emit_transaction_updates()
        self._emit_last_file_update()
        self._emit_portfolio_updates()

    def _emit_account_updates(self) -> None:
        if not self.changes.accounts or self.cursor is None:
            return
        self.cursor.execute(
            """
            SELECT name, currency_code, balance
            FROM accounts
            WHERE is_retired = 0
            ORDER BY name
            """
        )
        db_accounts = [
            {
                "name": row[0],
                "currency_code": row[1] or "EUR",
                "raw_balance": row[2],
            }
            for row in self.cursor.fetchall()
        ]

        fx_currencies = {
            account["currency_code"]
            for account in db_accounts
            if account["currency_code"] and account["currency_code"] != "EUR"
        }

        fx_rates: dict[str, float] = {}
        if fx_currencies:
            try:
                today = datetime.now(tz=ZoneInfo("UTC"))
                ensure_exchange_rates_for_dates_sync(
                    [today],
                    fx_currencies,
                    self.db_path,
                )
                fx_rates = load_latest_rates_sync(today, self.db_path)
            except Exception:
                _LOGGER.exception(
                    "FX: Fehler beim Laden der Wechselkurse - "
                    "Fremdwährungskonten werden mit EUR=0 gesendet."
                )

        updated_accounts: list[dict[str, Any]] = []
        for account in db_accounts:
            currency = account["currency_code"]
            orig_balance = account["raw_balance"] / 100.0
            if currency != "EUR":
                rate = fx_rates.get(currency)
                if rate:
                    eur_balance = orig_balance / rate
                else:
                    eur_balance = 0.0
                    _LOGGER.warning(
                        "FX: Kein Kurs für %s - setze EUR-Wert=0",
                        currency,
                    )
            else:
                eur_balance = orig_balance

            updated_accounts.append(
                {
                    "name": account["name"],
                    "currency_code": currency,
                    "orig_balance": round(orig_balance, 2),
                    "balance": round(eur_balance, 2),
                }
            )

        if updated_accounts:
            _push_update(self.hass, self.entry_id, "accounts", updated_accounts)
            _LOGGER.debug(
                "sync_from_pclient: 📡 Kontodaten-Update-Event gesendet: %s",
                updated_accounts,
            )
        else:
            _LOGGER.debug(
                "sync_from_pclient: Keine aktualisierten Konten zum Senden vorhanden."
            )

    def _emit_transaction_updates(self) -> None:
        if not self.changes.transactions or self.cursor is None:
            return
        try:
            self.cursor.execute(
                """
                SELECT uuid, type, account, portfolio, other_account, other_portfolio,
                       other_uuid, other_updated_at, date, currency_code, amount,
                       shares, note, security, source, updated_at
                FROM transactions
                ORDER BY date DESC, updated_at DESC
                LIMIT 50
                """
            )
            latest_transactions = [
                {
                    "uuid": row[0],
                    "type": row[1],
                    "account": row[2],
                    "portfolio": row[3],
                    "other_account": row[4],
                    "other_portfolio": row[5],
                    "other_uuid": row[6],
                    "other_updated_at": row[7],
                    "date": row[8],
                    "currency_code": row[9],
                    "amount": row[10],
                    "shares": row[11],
                    "note": row[12],
                    "security": row[13],
                    "source": row[14],
                    "updated_at": row[15],
                }
                for row in self.cursor.fetchall()
            ]
            _push_update(
                self.hass,
                self.entry_id,
                "transactions",
                {
                    "updated": latest_transactions,
                    "changed_ids": self.updated_data["transactions"],
                },
            )
            _LOGGER.debug(
                "sync_from_pclient: 📡 Transaktions-Update-Event gesendet (%d IDs)",
                len(self.updated_data["transactions"]),
            )
        except Exception:
            _LOGGER.exception(
                "sync_from_pclient: Fehler beim Senden des transactions Events"
            )

    def _emit_last_file_update(self) -> None:
        if not self.changes.last_file_update or not self.last_file_update:
            return
        try:
            formatted_last_file_update = (
                datetime.strptime(self.last_file_update, "%Y-%m-%dT%H:%M:%S")
                .replace(tzinfo=ZoneInfo("Europe/Berlin"))
                .isoformat()
            )
            _push_update(
                self.hass,
                self.entry_id,
                "last_file_update",
                formatted_last_file_update,
            )
            _LOGGER.debug(
                "sync_from_pclient: 📡 last_file_update-Event gesendet: %s",
                formatted_last_file_update,
            )
        except Exception:
            _LOGGER.exception(
                "sync_from_pclient: Fehler beim Formatieren von last_file_update"
            )

    def _emit_portfolio_updates(self) -> None:
        if not (self.changes.portfolios or self.changes.portfolio_securities):
            return
        portfolio_values: list[dict[str, Any]] = []
        try:
            portfolio_values = fetch_live_portfolios(self.db_path)
            if not portfolio_values:
                _LOGGER.debug(
                    "sync_from_pclient: Keine Portfolio-Werte für Event vorhanden "
                    "(fetch_live_portfolios lieferte keine Daten)"
                )
            else:
                filtered_values = portfolio_values
                if self.changed_portfolios:
                    filtered_values = [
                        row
                        for row in portfolio_values
                        if row.get("uuid") in self.changed_portfolios
                    ]
                    if not filtered_values:
                        _LOGGER.debug(
                            "sync_from_pclient: Keine Treffer für changed_portfolios "
                            "→ sende komplette Aggregation (%d Portfolios)",
                            len(portfolio_values),
                        )
                        filtered_values = portfolio_values

                _push_update(
                    self.hass,
                    self.entry_id,
                    "portfolio_values",
                    filtered_values,
                )
                _LOGGER.debug(
                    "sync_from_pclient: 📡 portfolio_values-Event gesendet "
                    "(%d Portfolios)",
                    len(filtered_values),
                )
        except Exception:
            _LOGGER.exception(
                "sync_from_pclient: Fehler beim Senden des portfolio_values Events"
            )

        try:
            if not portfolio_values:
                _LOGGER.debug(
                    "sync_from_pclient: Überspringe portfolio_positions Push - "
                    "portfolio_values Event wurde nicht gesendet."
                )
                return

            if not self.changed_portfolios:
                _LOGGER.debug(
                    "sync_from_pclient: Keine gültigen changed_portfolios -> "
                    "Überspringe portfolio_positions Push."
                )
                return

            valid_changed = {
                portfolio_uuid
                for portfolio_uuid in self.changed_portfolios
                if portfolio_uuid and isinstance(portfolio_uuid, str)
            }
            if not valid_changed:
                _LOGGER.debug(
                    "sync_from_pclient: changed_portfolios vorhanden (%d), aber "
                    "keine gültigen UUIDs nach Filter: %s",
                    len(self.changed_portfolios),
                    list(self.changed_portfolios)[:10],
                )
                return

            _LOGGER.debug(
                "sync_from_pclient: Kandidaten für portfolio_positions Push "
                "(valid_changed=%d): %s",
                len(valid_changed),
                list(valid_changed)[:10],
            )

            positions_map = fetch_positions_for_portfolios(self.db_path, valid_changed)
            empty_lists = [
                portfolio_uuid
                for portfolio_uuid, positions in positions_map.items()
                if not positions
            ]
            if empty_lists:
                _LOGGER.debug(
                    "sync_from_pclient: %d Portfolios ohne Positionen "
                    "(werden trotzdem gesendet): %s",
                    len(empty_lists),
                    empty_lists[:10],
                )

            for portfolio_uuid, positions in positions_map.items():
                try:
                    _push_update(
                        self.hass,
                        self.entry_id,
                        "portfolio_positions",
                        {
                            "portfolio_uuid": portfolio_uuid,
                            "positions": positions,
                        },
                    )
                    _LOGGER.debug(
                        "sync_from_pclient: 📡 portfolio_positions-Event für %s "
                        "gesendet (%d Positionen)",
                        portfolio_uuid,
                        len(positions),
                    )
                except Exception:
                    _LOGGER.exception(
                        "sync_from_pclient: Fehler beim Senden des "
                        "portfolio_positions Events für %s",
                        portfolio_uuid,
                    )
        except Exception:
            _LOGGER.exception(
                "sync_from_pclient: Allgemeiner Fehler beim Push der "
                "portfolio_positions Events"
            )

    # Logging ------------------------------------------------------------

    def _log_missing_dispatch(self) -> None:
        changes_detected = any(
            (
                self.changes.accounts,
                self.changes.transactions,
                self.changes.securities,
                self.changes.portfolios,
                self.changes.last_file_update,
                self.changes.portfolio_securities,
            )
        )
        _LOGGER.error(
            "❌ sync_from_pclient: Kein Event gesendet. Gründe:\n"
            "  - changes_detected: %s\n"
            "  - hass vorhanden: %s\n"
            "  - entry_id vorhanden: %s\n"
            "  - updated_data(accounts=%d, securities=%d, portfolios=%d, "
            "transactions=%d)",
            changes_detected,
            bool(self.hass),
            bool(self.entry_id),
            len(self.updated_data["accounts"]),
            len(self.updated_data["securities"]),
            len(self.updated_data["portfolios"]),
            len(self.updated_data["transactions"]),
        )

    def _log_summary(self) -> None:
        _LOGGER.info(
            "sync_from_pclient: Import abgeschlossen: %d Wertpapiere, "
            "%d Transaktionen (%d mit Fremdwährung)",
            self.stats.securities,
            self.stats.transactions,
            self.stats.fx_transactions,
        )

    def _reset_change_flags(self) -> None:
        self.changes = SyncChanges()
        self.updated_data = {
            "accounts": [],
            "securities": [],
            "portfolios": [],
            "transactions": [],
        }
        self.changed_portfolios.clear()


def fetch_positions_for_portfolios(
    db_path: Path, portfolio_ids: set[str]
) -> dict[str, list[dict]]:
    """
    Hilfsfunktion: Lädt Positionslisten für mehrere Portfolios.

    Gibt Dict { portfolio_uuid: [ {position...}, ... ] } zurück.

    Hinweise:
      - Reihenfolge der Positionen ist jetzt alphabetisch nach Name
        (ORDER BY s.name ASC), siehe SQL in db_access.get_portfolio_positions
        (früher: aktueller Wert DESC).
      - Werte sind bereits in EUR normalisiert und auf 2 Nachkommastellen gerundet.
    """
    result: dict[str, list[dict]] = {}
    for pid in portfolio_ids:
        try:
            result[pid] = get_portfolio_positions(db_path, pid)
        except Exception:
            _LOGGER.exception(
                "fetch_positions_for_portfolios: Fehler beim Laden der "
                "Positionen für %s",
                pid,
            )
            result[pid] = []
    return result


# (Sicherstellen, dass am Modulende kein ausführbarer Code steht - nur
# Funktions- oder Konstantendefinitionen)
# Entferne ggf. versehentlich hinzugefügte Debug- oder Testaufrufe wie:
# sync_from_pclient(...), print(...), o.Ä.
