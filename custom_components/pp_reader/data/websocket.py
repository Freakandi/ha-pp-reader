"""
WebSocket handlers for the pp_reader integration.

This module provides WebSocket commands to retrieve dashboard data,
account information, portfolio data, and file update timestamps.
"""

import logging
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.components.websocket_api import ActiveConnection

from .db_access import (
    fetch_live_portfolios,  # NEU: On-Demand Aggregation
    )

_LOGGER = logging.getLogger(__name__)
DOMAIN = "pp_reader"


async def _live_portfolios_payload(
    hass,
    entry_id: str,
    *,
    entry_data: dict[str, Any] | None = None,
    log_context: str = "",
) -> list[dict[str, Any]]:
    """Fetch live portfolio aggregates with coordinator fallback."""
    domain_data = hass.data.get(DOMAIN, {})
    data = entry_data or domain_data.get(entry_id)
    if not data:
        raise LookupError(f"entry_id {entry_id} not registered")

    db_path: Path = data["db_path"]
    coordinator = data.get("coordinator")

    try:
        portfolios = await hass.async_add_executor_job(fetch_live_portfolios, db_path)
        if isinstance(portfolios, list):
            return portfolios
        if isinstance(portfolios, dict):
            return list(portfolios.values())
        return list(portfolios)
    except Exception:
        context_suffix = f" ({log_context})" if log_context else ""
        _LOGGER.warning(
            "On-Demand Portfolio Aggregation%s fehlgeschlagen – Fallback auf Coordinator Daten",
            context_suffix,
            exc_info=True,
        )

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
async def ws_get_dashboard_data(hass, connection, msg):
    """
    Return full initial dashboard dataset (accounts, portfolios, last_file_update, transactions).

    Änderung (Migration Schritt 2.b):
    - Portfolios jetzt via fetch_live_portfolios (On-Demand Aggregation, Single Source of Truth).
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
    accounts = {}
    transactions = []
    last_file_update = None
    if coordinator:
        accounts = coordinator.data.get("accounts", {})
        transactions = coordinator.data.get("transactions", [])
        last_file_update = coordinator.data.get("last_update")

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
async def ws_get_accounts(hass, connection: ActiveConnection, msg: dict) -> None:
    """Return active accounts with original and EUR-converted balance (FX)."""
    try:
        entry_id = msg["entry_id"]
        db_path = hass.data[DOMAIN][entry_id]["db_path"]
        from .db_access import get_accounts

        accounts = await hass.async_add_executor_job(get_accounts, db_path)

        # FX laden
        try:
            from ..currencies.fx import (
                ensure_exchange_rates_for_dates,
                load_latest_rates,
            )

            active_fx_currencies = {
                getattr(a, "currency_code", "EUR")
                for a in accounts
                if not a.is_retired and getattr(a, "currency_code", "EUR") != "EUR"
            }
            if active_fx_currencies:
                today = datetime.now()
                await ensure_exchange_rates_for_dates(
                    [today], active_fx_currencies, db_path
                )
                fx_rates = await load_latest_rates(today, db_path)
            else:
                fx_rates = {}
        except Exception:  # noqa: BLE001
            _LOGGER.warning(
                "FX-Modul nicht verfügbar oder Fehler beim Laden der Kurse – setze Fremdwährungswerte=0 EUR."
            )
            fx_rates = {}

        account_data = []
        for a in accounts:
            if a.is_retired:
                continue
            currency = getattr(a, "currency_code", "EUR") or "EUR"
            orig_balance = a.balance / 100.0  # Originalbetrag (Konto-Währung)
            if currency != "EUR":
                rate = fx_rates.get(currency)
                eur_balance = (orig_balance / rate) if rate else 0.0
            else:
                eur_balance = orig_balance
            account_data.append(
                {
                    "name": a.name,
                    "currency_code": currency,
                    "orig_balance": round(orig_balance, 2),
                    "balance": round(eur_balance, 2),  # EUR-Wert
                }
            )

        connection.send_result(
            msg["id"],
            {
                "accounts": account_data,
            },
        )

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
    hass, connection: ActiveConnection, msg: dict
) -> None:
    """Handle WebSocket command to get the last file update timestamp."""
    try:
        # Zugriff auf die Datenbank
        entry_id = msg["entry_id"]
        db_path = hass.data[DOMAIN][entry_id]["db_path"]
        from .db_access import get_last_file_update

        # Datenbankabfrage ausführen
        last_file_update_raw = await hass.async_add_executor_job(
            get_last_file_update, db_path
        )

        # Zeitstempel formatieren
        if last_file_update_raw:
            try:
                # Zeitstempel im ISO-8601-Format "%Y-%m-%dT%H:%M:%S" parsen und in das gewünschte Format umwandeln
                last_file_update = datetime.strptime(
                    last_file_update_raw, "%Y-%m-%dT%H:%M:%S"
                ).strftime("%d.%m.%Y, %H:%M")
            except ValueError:
                _LOGGER.exception("Fehler beim Parsen des Zeitstempels")
                last_file_update = "Unbekannt"
        else:
            last_file_update = "Unbekannt"

        # Antwort senden
        connection.send_result(
            msg["id"],
            {
                "last_file_update": last_file_update,
            },
        )
        # _LOGGER.debug("Last file update erfolgreich abgerufen: %s", last_file_update)  # noqa: ERA001

    except Exception as e:
        _LOGGER.exception("Fehler beim Abrufen von last_file_update")
        connection.send_error(msg["id"], "db_error", str(e))


# === Websocket Portfolio-Data ===
@websocket_api.websocket_command(
    {
        vol.Required("type"): "pp_reader/get_portfolio_data",
        vol.Required("entry_id"): str,
    }
)
@websocket_api.async_response
async def ws_get_portfolio_data(hass, connection, msg):
    """
    Return current portfolio aggregates via on-demand DB aggregation.

    Änderung (Migration Schritt 2.a):
    - Statt Coordinator-Snapshot jetzt Aufruf `fetch_live_portfolios` (Single Source of Truth).
    - Fallback (WARN) auf alten Snapshot bei Fehler, um keine Hard-Failure im Frontend zu erzeugen.
    - Payload-Shape UNVERÄNDERT: {"portfolios": { uuid: {name,value,count,purchase_sum}, ... }}.
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


# Registrierung neuer WS-Command (am Ende der bestehenden Registrierungen oder analog zu anderen)
@websocket_api.websocket_command(
    {
        vol.Required("type"): "pp_reader/get_portfolio_positions",
        vol.Required("entry_id"): str,
        vol.Required("portfolio_uuid"): str,
    }
)
@websocket_api.async_response
async def ws_get_portfolio_positions(hass, connection, msg):
    """
    Liefert die Wertpapier-Positionen eines Depots (lazy load beim Aufklappen im Frontend).
    Bei Fehler oder unbekanntem Depot wird ein 'error' Feld zurückgegeben.
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

    exists = await hass.async_add_executor_job(_portfolio_exists)
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
        positions = await hass.async_add_executor_job(
            get_portfolio_positions, db_path, portfolio_uuid
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
            "positions": positions,
        },
    )


def async_register_commands(hass):
    """Registriert alle WebSocket-Commands dieses Modules."""
    websocket_api.async_register_command(hass, ws_get_portfolio_positions)
