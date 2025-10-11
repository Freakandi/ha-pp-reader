"""
WebSocket handlers for the pp_reader integration.

This module provides WebSocket commands to retrieve dashboard data,
account information, portfolio data, and file update timestamps.
"""

from __future__ import annotations

import asyncio
import logging
import sqlite3
from collections.abc import Callable, Iterable, Mapping
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path
from typing import TYPE_CHECKING, Any

import voluptuous as vol
from homeassistant.components import websocket_api
from custom_components.pp_reader.util import async_run_executor_job
from custom_components.pp_reader.util.currency import cent_to_eur, round_currency

from .db_access import (
    fetch_live_portfolios,  # NEU: On-Demand Aggregation
    get_accounts,
    get_last_file_update,
    get_portfolio_positions,
    get_security_snapshot,
    iter_security_close_prices,
)


def _collect_active_fx_currencies(accounts: Iterable[Any]) -> set[str]:
    """Return all non-EUR currencies from active accounts."""
    active_currencies: set[str] = set()
    for account in accounts:
        if getattr(account, "is_retired", False):
            continue

        raw_currency = getattr(account, "currency_code", "EUR")
        if not isinstance(raw_currency, str):
            continue

        currency = raw_currency.strip().upper()
        if not currency or currency == "EUR":
            continue

        active_currencies.add(currency)

    return active_currencies


async def _load_accounts_payload(
    hass: "HomeAssistant", db_path: Path
) -> list[dict[str, Any]]:
    """Return account details formatted for websocket responses."""

    accounts = await async_run_executor_job(hass, get_accounts, db_path)

    fx_rates: dict[str, float] = {}
    try:
        active_fx_currencies = _collect_active_fx_currencies(accounts)
        if active_fx_currencies:
            ensure_rates = ensure_exchange_rates_for_dates
            load_rates = load_latest_rates
            if ensure_rates is None or load_rates is None:
                _LOGGER.warning(
                    "FX-Modul nicht verfügbar oder Fehler beim Laden der Kurse - setze Fremdwährungswerte=0 EUR.",
                )
            else:
                today = datetime.now(timezone.utc)
                await ensure_rates([today], active_fx_currencies, db_path)
                fx_rates = await load_rates(today, db_path)
    except Exception:  # noqa: BLE001
        _LOGGER.warning(
            "FX-Modul nicht verfügbar oder Fehler beim Laden der Kurse - setze Fremdwährungswerte=0 EUR.",
        )
        fx_rates = {}

    account_data: list[dict[str, Any]] = []
    for account in accounts:
        if getattr(account, "is_retired", False):
            continue

        currency = getattr(account, "currency_code", "EUR") or "EUR"
        orig_balance = cent_to_eur(getattr(account, "balance", None), default=0.0) or 0.0
        fx_unavailable = False
        if currency != "EUR":
            rate = fx_rates.get(currency)
            if rate:
                eur_balance = orig_balance / rate
            else:
                eur_balance = None
                fx_unavailable = True
                _LOGGER.warning(
                    "FX: Kein Kurs für %s – EUR-Wert nicht verfügbar",
                    currency,
                )
        else:
            eur_balance = orig_balance

        account_entry = {
            "name": account.name,
            "currency_code": currency,
            "orig_balance": round_currency(orig_balance) or 0.0,
            "balance": (
                round_currency(eur_balance) if eur_balance is not None else None
            ),
        }
        if fx_unavailable:
            account_entry["fx_unavailable"] = True
        account_data.append(account_entry)

    return account_data


try:
    from custom_components.pp_reader.currencies.fx import (
        ensure_exchange_rates_for_dates,
        load_latest_rates,
    )
except ImportError:  # pragma: no cover - optional FX module
    ensure_exchange_rates_for_dates = None  # type: ignore[assignment]
    load_latest_rates = None  # type: ignore[assignment]

if TYPE_CHECKING:
    from homeassistant.components.websocket_api import ActiveConnection
    from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)
DOMAIN = "pp_reader"


def _coerce_float(value: Any, *, default: float = 0.0) -> float:
    """Return ``value`` as float with a graceful fallback."""
    if isinstance(value, (int, float)):
        return float(value)

    if value is None:
        return default

    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _coerce_optional_float(value: Any) -> float | None:
    """Return ``value`` as float or ``None`` when conversion fails."""
    if isinstance(value, (int, float)):
        return float(value)

    if value is None:
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _serialise_security_snapshot(snapshot: Mapping[str, Any] | None) -> dict[str, Any]:
    """Normalise snapshot payload for websocket transmission."""
    if not snapshot:
        return {
            "name": "",
            "currency_code": "EUR",
            "total_holdings": 0.0,
            "last_price_native": None,
            "last_price_eur": None,
            "market_value_eur": None,
            "purchase_value_eur": 0.0,
            "average_purchase_price_native": None,
            "purchase_total_security": 0.0,
            "purchase_total_account": 0.0,
            "avg_price_security": None,
            "avg_price_account": None,
            "average_cost": None,
            "last_close_native": None,
            "last_close_eur": None,
            "day_price_change_native": None,
            "day_price_change_eur": None,
            "day_change_pct": None,
            "performance": None,
        }

    data = dict(snapshot)

    raw_name = snapshot.get("name")
    data["name"] = raw_name if isinstance(raw_name, str) else str(raw_name or "")

    raw_currency = snapshot.get("currency_code")
    if isinstance(raw_currency, str):
        currency = raw_currency.strip().upper() or "EUR"
    else:
        currency = "EUR"
    data["currency_code"] = currency

    data["total_holdings"] = _coerce_float(snapshot.get("total_holdings"))
    data["last_price_native"] = _coerce_optional_float(
        snapshot.get("last_price_native")
    )
    data["last_price_eur"] = _coerce_optional_float(snapshot.get("last_price_eur"))
    data["market_value_eur"] = _coerce_optional_float(
        snapshot.get("market_value_eur")
    )
    data["purchase_value_eur"] = _coerce_float(snapshot.get("purchase_value_eur"))
    data["average_purchase_price_native"] = _coerce_optional_float(
        snapshot.get("average_purchase_price_native")
    )

    purchase_total_security = _coerce_optional_float(
        snapshot.get("purchase_total_security")
    )
    data["purchase_total_security"] = (
        purchase_total_security if purchase_total_security is not None else 0.0
    )

    purchase_total_account = _coerce_optional_float(
        snapshot.get("purchase_total_account")
    )
    data["purchase_total_account"] = (
        purchase_total_account if purchase_total_account is not None else 0.0
    )

    data["avg_price_security"] = _coerce_optional_float(
        snapshot.get("avg_price_security")
    )
    data["avg_price_account"] = _coerce_optional_float(
        snapshot.get("avg_price_account")
    )

    raw_average_cost = snapshot.get("average_cost")
    if isinstance(raw_average_cost, Mapping):
        data["average_cost"] = dict(raw_average_cost)
    else:
        data["average_cost"] = None
    data["last_close_native"] = _coerce_optional_float(
        snapshot.get("last_close_native")
    )
    data["last_close_eur"] = _coerce_optional_float(snapshot.get("last_close_eur"))
    data["day_price_change_native"] = _coerce_optional_float(
        snapshot.get("day_price_change_native")
    )
    data["day_price_change_eur"] = _coerce_optional_float(
        snapshot.get("day_price_change_eur")
    )
    data["day_change_pct"] = _coerce_optional_float(snapshot.get("day_change_pct"))

    raw_performance = snapshot.get("performance")
    if isinstance(raw_performance, Mapping):
        performance_payload = dict(raw_performance)
        day_change_raw = performance_payload.get("day_change")
        if isinstance(day_change_raw, Mapping):
            performance_payload["day_change"] = dict(day_change_raw)
        data["performance"] = performance_payload
    else:
        data["performance"] = None

    last_price_raw = snapshot.get("last_price")
    if isinstance(last_price_raw, Mapping):
        data["last_price"] = {
            "native": _coerce_optional_float(last_price_raw.get("native")),
            "eur": _coerce_optional_float(last_price_raw.get("eur")),
        }

    return data


def _normalize_portfolio_positions(
    positions: Iterable[Mapping[str, Any]] | None,
) -> list[dict[str, Any]]:
    """Return portfolio position payload including purchase metrics."""

    if not positions:
        return []

    normalized: list[dict[str, Any]] = []
    for item in positions:
        if not isinstance(item, Mapping):
            continue

        security_uuid = item.get("security_uuid")
        if security_uuid is not None:
            security_uuid = str(security_uuid)

        avg_price_native = _coerce_optional_float(
            item.get("average_purchase_price_native")
        )
        avg_price_security = _coerce_optional_float(item.get("avg_price_security"))
        avg_price_account = _coerce_optional_float(item.get("avg_price_account"))

        purchase_total_security = _coerce_optional_float(
            item.get("purchase_total_security")
        )
        if purchase_total_security is None:
            purchase_total_security = 0.0

        purchase_total_account = _coerce_optional_float(
            item.get("purchase_total_account")
        )
        if purchase_total_account is None:
            purchase_total_account = 0.0

        purchase_value = round(_coerce_float(item.get("purchase_value")), 2)

        raw_average_cost = item.get("average_cost")
        average_cost: dict[str, Any] | None = None
        if isinstance(raw_average_cost, Mapping):
            average_cost = dict(raw_average_cost)

        normalized.append(
            {
                "security_uuid": security_uuid,
                "name": item.get("name"),
                "current_holdings": round(
                    _coerce_float(item.get("current_holdings")), 6
                ),
                "purchase_value": purchase_value,
                "current_value": round(_coerce_float(item.get("current_value")), 2),
                "gain_abs": round(_coerce_float(item.get("gain_abs")), 2),
                "gain_pct": round(_coerce_float(item.get("gain_pct")), 2),
                "average_purchase_price_native": avg_price_native,
                "purchase_total_security": purchase_total_security,
                "purchase_total_account": purchase_total_account,
                "avg_price_security": avg_price_security,
                "avg_price_account": avg_price_account,
                "average_cost": average_cost,
            }
        )

    return normalized


def _wrap_with_loop_fallback(
    handler: Callable[[Any, Any, dict[str, Any]], None],
) -> Callable[[Any, Any, dict[str, Any]], None]:
    """Ensure websocket handlers run in tests without a running event loop."""
    original = getattr(handler, "__wrapped__", None)
    if original is None:
        return handler

    def _resolve_loop(candidate: Any) -> asyncio.AbstractEventLoop | None:
        if isinstance(candidate, asyncio.AbstractEventLoop):
            return candidate
        return None

    def _drain_coroutine(
        coro: Any,
        loop: asyncio.AbstractEventLoop | None,
    ) -> None:
        if not asyncio.iscoroutine(coro):
            return

        if loop is not None:
            task = loop.create_task(coro)
            loop.run_until_complete(task)
            return

        temp_loop = asyncio.new_event_loop()
        try:
            asyncio.set_event_loop(temp_loop)
            temp_loop.run_until_complete(coro)
        finally:
            asyncio.set_event_loop(None)
            temp_loop.run_until_complete(temp_loop.shutdown_asyncgens())
            temp_loop.close()

    @wraps(handler)
    def wrapper(hass, connection, msg):  # type: ignore[override]
        loop = _resolve_loop(getattr(hass, "loop", None))

        if loop is not None and not loop.is_running():
            _drain_coroutine(original(hass, connection, msg), loop)
            return None

        try:
            result = handler(hass, connection, msg)
        except RuntimeError as err:  # pragma: no cover - compatibility path
            if "no running event loop" not in str(err):
                raise
            loop = _resolve_loop(getattr(hass, "loop", None))
            _drain_coroutine(original(hass, connection, msg), loop)
            return None

        if asyncio.iscoroutine(result):
            try:
                asyncio.get_running_loop()
            except RuntimeError:
                loop = _resolve_loop(getattr(hass, "loop", None))
                _drain_coroutine(result, loop)
                return None

        return result

    wrapper.__wrapped__ = original  # type: ignore[attr-defined]
    return wrapper


async def _live_portfolios_payload(
    hass: HomeAssistant,
    entry_id: str,
    *,
    entry_data: dict[str, Any] | None = None,
    log_context: str = "",
) -> list[dict[str, Any]]:
    """Fetch live portfolio aggregates with coordinator fallback."""
    domain_data = hass.data.get(DOMAIN, {})
    data = entry_data or domain_data.get(entry_id)
    if not data:
        message = f"entry_id {entry_id} not registered"
        raise LookupError(message)

    db_path: Path = data["db_path"]
    coordinator = data.get("coordinator")

    result: list[dict[str, Any]] | None = None
    try:
        portfolios = await async_run_executor_job(
            hass, fetch_live_portfolios, db_path
        )
    except Exception:  # noqa: BLE001 - broad catch keeps coordinator fallback intact
        context_suffix = f" ({log_context})" if log_context else ""
        _LOGGER.warning(
            (
                "On-Demand Portfolio Aggregation%s fehlgeschlagen - "
                "Fallback auf Coordinator Daten"
            ),
            context_suffix,
            exc_info=True,
        )
    else:
        if isinstance(portfolios, list):
            result = list(portfolios)
        elif isinstance(portfolios, dict):
            result = list(portfolios.values())
        elif isinstance(portfolios, Iterable):
            result = list(portfolios)

    if result is not None:
        return result

    if not coordinator:
        return []

    snapshot = coordinator.data.get("portfolios", [])

    if isinstance(snapshot, list):
        return snapshot

    if isinstance(snapshot, dict):
        normalized: list[dict[str, Any]] = []
        for portfolio_uuid, raw in snapshot.items():
            if not isinstance(raw, dict):
                continue
            normalized.append(
                {
                    "uuid": portfolio_uuid,
                    "name": raw.get("name"),
                    "current_value": raw.get("current_value", raw.get("value", 0)),
                    "purchase_sum": raw.get("purchase_sum", 0),
                    "position_count": raw.get("position_count", raw.get("count", 0)),
                }
            )
        return normalized

    return []


# === Dashboard Websocket Test-Command ===
@websocket_api.websocket_command(
    {
        vol.Required("type"): "pp_reader/get_dashboard_data",
        vol.Required("entry_id"): str,
    }
)
@websocket_api.async_response
async def ws_get_dashboard_data(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """
    Return the initial dashboard dataset for the configured entry.

    Änderung (Migration Schritt 2.b):
    - Portfolios jetzt via fetch_live_portfolios (On-Demand Aggregation,
      Single Source of Truth).
    - Fallback auf Coordinator Snapshot bei Fehler (stale aber verfügbar).
    - Andere Teile (accounts, last_file_update, transactions) unverändert.
    - Payload-Shape bleibt unverändert (keine Mutation bestehender Keys).
    """
    entry_id = msg.get("entry_id")
    domain_data = hass.data.get(DOMAIN, {})
    entry_data = domain_data.get(entry_id)

    if not entry_data:
        connection.send_error(msg["id"], "not_found", f"entry_id {entry_id} unknown")
        return

    coordinator = entry_data.get("coordinator")

    # Accounts & Transactions weiter wie zuvor (Snapshot / bestehende Helper)
    accounts: list[dict[str, Any]] = []
    transactions = []
    last_file_update = None
    if coordinator:
        transactions = coordinator.data.get("transactions", [])
        last_file_update = coordinator.data.get("last_update")

    db_path_raw = entry_data.get("db_path")
    if db_path_raw:
        try:
            accounts = await _load_accounts_payload(hass, Path(db_path_raw))
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Fehler beim Laden der Kontodaten für das Dashboard")
            accounts = []

    # NEU: Live Portfolios
    portfolios = await _live_portfolios_payload(
        hass,
        entry_id,
        entry_data=entry_data,
        log_context="dashboard",
    )

    connection.send_result(
        msg["id"],
        {
            "accounts": accounts,
            "portfolios": portfolios,
            "last_file_update": last_file_update,
            "transactions": transactions,
        },
    )


# === Websocket Accounts-Data ===
@websocket_api.websocket_command(
    {
        vol.Required("type"): "pp_reader/get_accounts",
        vol.Optional("entry_id"): str,
    }
)
@websocket_api.async_response
async def ws_get_accounts(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Return active accounts with original and EUR-converted balance (FX)."""
    try:
        entry_id = msg["entry_id"]
        db_path = hass.data[DOMAIN][entry_id]["db_path"]
        account_data = await _load_accounts_payload(hass, Path(db_path))
        connection.send_result(msg["id"], {"accounts": account_data})
    except KeyError:
        connection.send_error(msg["id"], "not_found", "Ungültiger entry_id oder fehlende Daten")
    except Exception as e:
        _LOGGER.exception("Fehler beim Abrufen der Kontodaten (mit FX)")
        connection.send_error(msg["id"], "db_error", str(e))


# === Websocket FileUpdate-Timestamp ===
@websocket_api.websocket_command(
    {
        vol.Required("type"): "pp_reader/get_last_file_update",
        vol.Optional("entry_id"): str,  # Erwartet die entry_id
    }
)
@websocket_api.async_response
async def ws_get_last_file_update(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Handle WebSocket command to get the last file update timestamp."""
    msg_id = msg.get("id")

    try:
        domain_entries: dict[str, dict[str, Any]] | None = hass.data.get(DOMAIN)
        if not domain_entries:
            connection.send_error(
                msg_id, "not_found", "Keine pp_reader Config Entries registriert"
            )
            return

        entry_id = msg.get("entry_id")
        entry_data: dict[str, Any] | None = None

        if entry_id:
            entry_data = domain_entries.get(entry_id)
            if not entry_data:
                connection.send_error(
                    msg_id, "not_found", f"entry_id {entry_id} unknown"
                )
                return
        elif len(domain_entries) == 1:
            entry_id, entry_data = next(iter(domain_entries.items()))
        else:
            connection.send_error(
                msg_id,
                "not_found",
                "entry_id erforderlich, wenn mehrere Config Entries aktiv sind",
            )
            return

        db_path_raw = entry_data.get("db_path") if entry_data else None
        if not db_path_raw:
            connection.send_error(
                msg_id,
                "db_error",
                "db_path für den Config Entry fehlt",
            )
            return

        db_path = Path(db_path_raw)

        last_file_update_raw = await async_run_executor_job(
            hass, get_last_file_update, db_path
        )

        if last_file_update_raw:
            try:
                parsed_update = datetime.strptime(
                    last_file_update_raw, "%Y-%m-%dT%H:%M:%S"
                ).replace(tzinfo=timezone.utc)  # noqa: UP017
                last_file_update = parsed_update.strftime("%d.%m.%Y, %H:%M")
            except ValueError:
                _LOGGER.exception("Fehler beim Parsen des Zeitstempels")
                last_file_update = "Unbekannt"
        else:
            last_file_update = "Unbekannt"

        connection.send_result(
            msg_id,
            {
                "last_file_update": last_file_update,
            },
        )
    except Exception as e:
        _LOGGER.exception("Fehler beim Abrufen von last_file_update")
        connection.send_error(msg_id, "db_error", str(e))


# === Websocket Portfolio-Data ===
@websocket_api.websocket_command(
    {
        vol.Required("type"): "pp_reader/get_portfolio_data",
        vol.Required("entry_id"): str,
    }
)
@websocket_api.async_response
async def ws_get_portfolio_data(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """
    Return current portfolio aggregates via on-demand DB aggregation.

    Änderung (Migration Schritt 2.a):
    - Statt Coordinator-Snapshot jetzt Aufruf `fetch_live_portfolios`
      (Single Source of Truth).
    - Fallback (WARN) auf alten Snapshot bei Fehler, um keine Hard-Failure im
      Frontend zu erzeugen.
    - Payload-Shape UNVERÄNDERT: {"portfolios": { uuid:
      {name,value,count,purchase_sum}, ... }}.
    """
    entry_id = msg.get("entry_id")
    domain_data = hass.data.get(DOMAIN, {})
    entry_data = domain_data.get(entry_id)

    if not entry_data:
        connection.send_error(msg["id"], "not_found", f"entry_id {entry_id} unknown")
        return

    portfolios = await _live_portfolios_payload(
        hass,
        entry_id,
        entry_data=entry_data,
        log_context="portfolio",
    )

    connection.send_result(
        msg["id"],
        {
            "portfolios": portfolios,
        },
    )


ws_get_portfolio_data_handler = _wrap_with_loop_fallback(ws_get_portfolio_data)


async def ws_get_portfolio_data_async(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Async wrapper so tests can await the WebSocket handler directly."""
    loop = asyncio.get_running_loop()
    before = set(asyncio.all_tasks(loop))
    result = ws_get_portfolio_data_handler(hass, connection, msg)
    if asyncio.iscoroutine(result):  # pragma: no cover - defensive guard
        await result
    after = set(asyncio.all_tasks(loop))
    pending = [task for task in after - before if not task.done()]
    if pending:
        await asyncio.gather(*pending)


ws_get_portfolio_data = ws_get_portfolio_data_async


@websocket_api.websocket_command(
    {
        vol.Required("type"): "pp_reader/get_security_history",
        vol.Required("entry_id"): str,
        vol.Required("security_uuid"): str,
        vol.Optional("start_date"): vol.Any(None, vol.Coerce(int)),
        vol.Optional("end_date"): vol.Any(None, vol.Coerce(int)),
    }
)
@websocket_api.async_response
async def ws_get_security_history(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return historical close prices for a security."""
    msg_id = msg.get("id")
    entry_id = msg.get("entry_id")

    if not entry_id:
        connection.send_error(msg_id, "invalid_format", "entry_id erforderlich")
        return

    domain_entries = hass.data.get(DOMAIN)
    if not isinstance(domain_entries, dict):
        connection.send_error(
            msg_id,
            "not_found",
            "Keine pp_reader Config Entries registriert",
        )
        return

    entry_data = domain_entries.get(entry_id)
    if not isinstance(entry_data, dict):
        connection.send_error(msg_id, "not_found", f"entry_id {entry_id} unknown")
        return

    db_path_raw = entry_data.get("db_path")
    if db_path_raw is None:
        connection.send_error(
            msg_id,
            "db_error",
            "db_path für den Config Entry fehlt",
        )
        return

    security_uuid = msg.get("security_uuid")
    start_date = msg.get("start_date")
    end_date = msg.get("end_date")

    def _collect_prices() -> list[tuple[int, int]]:
        return list(
            iter_security_close_prices(
                db_path=Path(db_path_raw),
                security_uuid=security_uuid,
                start_date=start_date,
                end_date=end_date,
            )
        )

    try:
        prices = await async_run_executor_job(hass, _collect_prices)
    except (TypeError, ValueError) as err:
        connection.send_error(msg_id, "invalid_format", str(err))
        return
    except Exception:
        _LOGGER.exception(
            "WebSocket: Fehler beim Laden historischer Preise (security_uuid=%s)",
            security_uuid,
        )
        connection.send_error(
            msg_id,
            "db_error",
            "Fehler beim Laden historischer Preise",
        )
        return

    payload: list[dict[str, Any]] = []
    for date_value, close_value, close_raw in prices:
        entry: dict[str, Any] = {"date": date_value}
        if close_value is not None:
            entry["close"] = close_value
        if close_raw is not None:
            entry["close_raw"] = close_raw
        payload.append(entry)

    response: dict[str, Any] = {
        "security_uuid": security_uuid,
        "prices": payload,
    }
    if start_date is not None:
        response["start_date"] = start_date
    if end_date is not None:
        response["end_date"] = end_date

    connection.send_result(msg_id, response)


ws_get_security_history = _wrap_with_loop_fallback(ws_get_security_history)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "pp_reader/get_security_snapshot",
        vol.Required("entry_id"): str,
        vol.Required("security_uuid"): str,
    }
)
@websocket_api.async_response
async def ws_get_security_snapshot(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return aggregated holdings and price snapshot for a security."""
    msg_id = msg.get("id")
    entry_id = msg.get("entry_id")
    security_uuid = msg.get("security_uuid")

    if not entry_id:
        connection.send_error(msg_id, "invalid_format", "entry_id erforderlich")
        return

    if not security_uuid:
        connection.send_error(
            msg_id,
            "invalid_format",
            "security_uuid erforderlich",
        )
        return

    domain_entries = hass.data.get(DOMAIN)
    if not isinstance(domain_entries, dict):
        connection.send_error(
            msg_id,
            "not_found",
            "Keine pp_reader Config Entries registriert",
        )
        return

    entry_data = domain_entries.get(entry_id)
    if not isinstance(entry_data, dict):
        connection.send_error(msg_id, "not_found", f"entry_id {entry_id} unknown")
        return

    db_path_raw = entry_data.get("db_path")
    if db_path_raw is None:
        connection.send_error(
            msg_id,
            "db_error",
            "db_path für den Config Entry fehlt",
        )
        return

    db_path = Path(db_path_raw)

    try:
        raw_snapshot = await async_run_executor_job(
            hass,
            get_security_snapshot,
            db_path,
            security_uuid,
        )
    except LookupError as err:
        connection.send_error(msg_id, "not_found", str(err))
        return
    except ValueError as err:
        connection.send_error(msg_id, "invalid_format", str(err))
        return
    except Exception:
        _LOGGER.exception(
            "WebSocket: Fehler beim Laden des Snapshots (security_uuid=%s)",
            security_uuid,
        )
        connection.send_error(
            msg_id,
            "db_error",
            "Fehler beim Laden des Snapshots",
        )
        return

    snapshot = (
        _serialise_security_snapshot(raw_snapshot)
        if isinstance(raw_snapshot, Mapping)
        else _serialise_security_snapshot(None)
    )

    connection.send_result(
        msg_id,
        {
            "security_uuid": security_uuid,
            "snapshot": snapshot,
        },
    )


ws_get_security_snapshot = _wrap_with_loop_fallback(ws_get_security_snapshot)


# Registrierung neuer WS-Command (am Ende der bestehenden Registrierungen
# oder analog zu anderen)
@websocket_api.websocket_command(
    {
        vol.Required("type"): "pp_reader/get_portfolio_positions",
        vol.Required("entry_id"): str,
        vol.Required("portfolio_uuid"): str,
    }
)
@websocket_api.async_response
async def ws_get_portfolio_positions(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """
    Liefert die Wertpapier-Positionen eines Depots.

    Die Daten werden lazy geladen, sobald das Frontend ein Depot aufklappt.
    Bei Fehler oder unbekanntem Depot wird ein "error" Feld zurückgegeben.
    """
    entry_id = msg.get("entry_id")
    portfolio_uuid = msg.get("portfolio_uuid")

    config_entry = hass.config_entries.async_get_entry(entry_id)
    if not config_entry:
        connection.send_error(
            msg["id"], "not_found", f"Config entry {entry_id} nicht gefunden"
        )
        return

    db_path = Path(config_entry.data.get("db_path"))

    def _portfolio_exists() -> bool:
        try:
            conn = sqlite3.connect(str(db_path))
            try:
                cur = conn.execute(
                    "SELECT 1 FROM portfolios WHERE uuid = ? LIMIT 1", (portfolio_uuid,)
                )
                return cur.fetchone() is not None
            finally:
                conn.close()
        except Exception:  # noqa: BLE001
            return False

    exists = await async_run_executor_job(hass, _portfolio_exists)
    if not exists:
        # Explizite Fehlerrückgabe statt leerer Liste
        connection.send_result(
            msg["id"],
            {
                "portfolio_uuid": portfolio_uuid,
                "positions": [],
                "error": "Unbekanntes Depot oder nicht (mehr) vorhanden.",
            },
        )
        return

    try:
        positions = await async_run_executor_job(
            hass, get_portfolio_positions, db_path, portfolio_uuid
        )
    except Exception:
        _LOGGER.exception(
            "WebSocket: Fehler beim Laden der Positionen für Portfolio %s",
            portfolio_uuid,
        )
        connection.send_result(
            msg["id"],
            {
                "portfolio_uuid": portfolio_uuid,
                "positions": [],
                "error": "Fehler beim Laden der Positionsdaten.",
            },
        )
        return

    connection.send_result(
        msg["id"],
        {
            "portfolio_uuid": portfolio_uuid,
            "positions": _normalize_portfolio_positions(positions),
        },
    )


def async_register_commands(hass: HomeAssistant) -> None:
    """Registriert alle WebSocket-Commands dieses Modules."""
    websocket_api.async_register_command(hass, ws_get_portfolio_positions)
    websocket_api.async_register_command(hass, ws_get_security_history)
    websocket_api.async_register_command(hass, ws_get_security_snapshot)
