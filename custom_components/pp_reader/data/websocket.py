"""
WebSocket handlers for the pp_reader integration.

This module provides WebSocket commands to retrieve dashboard data,
account information, portfolio data, and file update timestamps.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path
from typing import TYPE_CHECKING, Any

import voluptuous as vol
from homeassistant.components import websocket_api

from custom_components.pp_reader.util import async_run_executor_job
from custom_components.pp_reader.util.currency import round_currency

from .db_access import get_last_file_update
from .normalization_pipeline import (
    async_fetch_security_history,
    async_normalize_security_snapshot,
    async_normalize_snapshot,
    serialize_account_snapshot,
    serialize_portfolio_snapshot,
)

if TYPE_CHECKING:
    from collections.abc import Callable, Mapping

    from homeassistant.components.websocket_api import ActiveConnection
    from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)
DOMAIN = "pp_reader"


def _get_entry_data(hass: HomeAssistant, entry_id: str) -> dict[str, Any]:
    """Return the hass.data entry payload or raise LookupError."""
    domain_entries = hass.data.get(DOMAIN)
    entry_data = (
        domain_entries.get(entry_id) if isinstance(domain_entries, dict) else None
    )
    if entry_data is None:
        message = f"entry_id {entry_id} unknown"
        raise LookupError(message)

    return entry_data


def _resolve_db_path(entry_data: Mapping[str, Any]) -> Path:
    """Extract the db_path from a config entry payload."""
    db_path_raw = entry_data.get("db_path")
    if not db_path_raw:
        message = "db_path für den Config Entry fehlt"
        raise ValueError(message)
    return Path(db_path_raw)


def _accounts_payload(result: Any) -> list[dict[str, Any]]:
    """Convert AccountSnapshot dataclasses into the legacy payload format."""
    payload: list[dict[str, Any]] = []
    for account in result.accounts:
        serialized = serialize_account_snapshot(account)
        formatted: dict[str, Any] = {}
        for key in ("name", "currency_code", "orig_balance", "balance"):
            if key in serialized:
                formatted[key] = serialized[key]
        if serialized.get("fx_unavailable"):
            formatted["fx_unavailable"] = True
        payload.append(formatted)
    return payload


def _portfolio_summaries(result: Any) -> list[dict[str, Any]]:
    """Return portfolio summary payloads with legacy purchase_sum key."""
    payload: list[dict[str, Any]] = []
    for snapshot in result.portfolios:
        serialized = serialize_portfolio_snapshot(snapshot)
        purchase_value = serialized.pop("purchase_value", 0.0) or 0.0
        formatted: dict[str, Any] = {
            "uuid": serialized.get("uuid"),
            "name": serialized.get("name"),
            "current_value": serialized.get("current_value"),
            "purchase_sum": purchase_value,
            "position_count": serialized.get("position_count"),
            "missing_value_positions": serialized.get("missing_value_positions"),
            "has_current_value": serialized.get("has_current_value"),
            "performance": serialized.get("performance"),
        }
        optional_keys = ("coverage_ratio", "provenance", "metric_run_uuid")
        for key in optional_keys:
            if key in serialized:
                formatted[key] = serialized[key]
        payload.append(formatted)
    return payload


def _positions_payload(portfolio: Any) -> list[dict[str, Any]]:
    """Convert PositionSnapshot dataclasses to websocket payload entries."""
    return [
        {
            "security_uuid": position.security_uuid,
            "name": position.name,
            "current_holdings": round_currency(
                position.current_holdings,
                decimals=6,
                default=0.0,
            )
            or 0.0,
            "purchase_value": round_currency(
                position.purchase_value,
                default=0.0,
            )
            or 0.0,
            "current_value": round_currency(
                position.current_value,
                default=0.0,
            )
            or 0.0,
            "average_cost": dict(position.average_cost),
            "performance": dict(position.performance),
            "aggregation": dict(position.aggregation),
        }
        for position in portfolio.positions
    ]
def _wrap_with_loop_fallback(
    handler: Callable[[HomeAssistant, ActiveConnection, dict[str, Any]], Any],
) -> Callable[[HomeAssistant, ActiveConnection, dict[str, Any]], Any]:
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
    def wrapper(
        hass: HomeAssistant,
        connection: ActiveConnection,
        msg: dict[str, Any],
    ) -> Any:
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
    if not entry_id:
        connection.send_error(msg["id"], "invalid_format", "entry_id erforderlich")
        return

    try:
        entry_data = _get_entry_data(hass, entry_id)
        db_path = _resolve_db_path(entry_data)
    except LookupError as err:
        connection.send_error(msg["id"], "not_found", str(err))
        return
    except ValueError as err:
        connection.send_error(msg["id"], "db_error", str(err))
        return
    except Exception:
        _LOGGER.exception("WebSocket: Fehler beim Auflösen von entry_id %s", entry_id)
        error_msg = "entry_id Auflösung fehlgeschlagen"
        connection.send_error(msg["id"], "db_error", error_msg)
        return

    coordinator = entry_data.get("coordinator")

    # Accounts & Transactions weiter wie zuvor (Snapshot / bestehende Helper)
    accounts: list[dict[str, Any]] = []
    transactions = []
    last_file_update = None
    if coordinator:
        transactions = coordinator.data.get("transactions", [])
        last_file_update = coordinator.data.get("last_update")

    try:
        snapshot = await async_normalize_snapshot(hass, db_path)
    except Exception:
        _LOGGER.exception("Fehler beim Laden der Normalisierung (dashboard)")
        connection.send_error(
            msg["id"],
            "db_error",
            "Fehler beim Laden der Normalisierung",
        )
        return

    accounts = _accounts_payload(snapshot)
    portfolios = _portfolio_summaries(snapshot)

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
    except KeyError:
        connection.send_error(msg["id"], "invalid_format", "entry_id erforderlich")
        return

    try:
        entry_data = _get_entry_data(hass, entry_id)
        db_path = _resolve_db_path(entry_data)
    except LookupError as err:
        connection.send_error(msg["id"], "not_found", str(err))
        return
    except ValueError as err:
        connection.send_error(msg["id"], "db_error", str(err))
        return

    try:
        snapshot = await async_normalize_snapshot(hass, db_path)
    except Exception:
        _LOGGER.exception("Fehler beim Laden der Normalisierung (accounts)")
        connection.send_error(
            msg["id"],
            "db_error",
            "Fehler beim Laden der Normalisierung",
        )
        return

    account_data = _accounts_payload(snapshot)
    connection.send_result(msg["id"], {"accounts": account_data})


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
    if not entry_id:
        connection.send_error(msg["id"], "invalid_format", "entry_id erforderlich")
        return

    try:
        entry_data = _get_entry_data(hass, entry_id)
        db_path = _resolve_db_path(entry_data)
    except LookupError as err:
        connection.send_error(msg["id"], "not_found", str(err))
        return
    except ValueError as err:
        connection.send_error(msg["id"], "db_error", str(err))
        return
    except Exception:
        _LOGGER.exception(
            "WebSocket: Fehler beim Auflösen des Config Entries (%s)",
            entry_id,
        )
        error_msg = "entry_id Auflösung fehlgeschlagen"
        connection.send_error(msg["id"], "db_error", error_msg)
        return

    try:
        snapshot = await async_normalize_snapshot(hass, db_path)
    except Exception:
        _LOGGER.exception("Fehler beim Laden der Normalisierung (portfolio_data)")
        connection.send_error(
            msg["id"],
            "db_error",
            "Fehler beim Laden der Normalisierung",
        )
        return

    portfolios = _portfolio_summaries(snapshot)

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

    try:
        entry_data = _get_entry_data(hass, entry_id)
        db_path = _resolve_db_path(entry_data)
    except LookupError as err:
        connection.send_error(msg_id, "not_found", str(err))
        return
    except ValueError as err:
        connection.send_error(msg_id, "db_error", str(err))
        return

    security_uuid = msg.get("security_uuid")
    start_date = msg.get("start_date")
    end_date = msg.get("end_date")

    try:
        payload = await async_fetch_security_history(
            hass,
            db_path,
            security_uuid,
            start_date=start_date,
            end_date=end_date,
        )
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
async def ws_get_security_snapshot(  # noqa: PLR0911
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

    try:
        entry_data = _get_entry_data(hass, entry_id)
        db_path = _resolve_db_path(entry_data)
    except LookupError as err:
        connection.send_error(msg_id, "not_found", str(err))
        return
    except ValueError as err:
        connection.send_error(msg_id, "db_error", str(err))
        return

    try:
        snapshot = await async_normalize_security_snapshot(
            hass,
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

    if not entry_id:
        connection.send_error(msg["id"], "invalid_format", "entry_id erforderlich")
        return
    if not portfolio_uuid:
        connection.send_error(
            msg["id"],
            "invalid_format",
            "portfolio_uuid erforderlich",
        )
        return

    try:
        entry_data = _get_entry_data(hass, entry_id)
        db_path = _resolve_db_path(entry_data)
    except LookupError as err:
        connection.send_error(msg["id"], "not_found", str(err))
        return
    except ValueError as err:
        connection.send_error(msg["id"], "db_error", str(err))
        return

    try:
        snapshot = await async_normalize_snapshot(
            hass,
            db_path,
            include_positions=True,
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

    portfolio = next(
        (item for item in snapshot.portfolios if item.uuid == portfolio_uuid),
        None,
    )
    if portfolio is None:
        connection.send_result(
            msg["id"],
            {
                "portfolio_uuid": portfolio_uuid,
                "positions": [],
                "error": "Unbekanntes Depot oder nicht (mehr) vorhanden.",
            },
        )
        return

    connection.send_result(
        msg["id"],
        {
            "portfolio_uuid": portfolio_uuid,
            "positions": _positions_payload(portfolio),
        },
    )


def async_register_commands(hass: HomeAssistant) -> None:
    """Registriert alle WebSocket-Commands dieses Modules."""
    websocket_api.async_register_command(hass, ws_get_portfolio_positions)
    websocket_api.async_register_command(hass, ws_get_security_history)
    websocket_api.async_register_command(hass, ws_get_security_snapshot)
