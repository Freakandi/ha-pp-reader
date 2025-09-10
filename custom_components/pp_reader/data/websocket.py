"""
WebSocket handlers for the pp_reader integration.

This module provides WebSocket commands to retrieve dashboard data,
account information, portfolio data, and file update timestamps.
"""

import logging
from datetime import datetime

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.components.websocket_api import ActiveConnection
from homeassistant.helpers.dispatcher import (
    async_dispatcher_connect,
)

_LOGGER = logging.getLogger(__name__)
DOMAIN = "pp_reader"


# === Dashboard Websocket Test-Command ===
@websocket_api.websocket_command(
    {
        vol.Required("type"): "pp_reader/get_dashboard_data",
        vol.Optional("entry_id"): str,
    }
)
@websocket_api.async_response
async def ws_get_dashboard_data(hass, connection: ActiveConnection, msg: dict) -> None:
    """Handle WebSocket command to get dashboard data (accounts + portfolios, incl. FX)."""
    try:
        entry_id = msg["entry_id"]
        db_path = hass.data[DOMAIN][entry_id]["db_path"]
        from .db_access import get_accounts, get_portfolios

        accounts = await hass.async_add_executor_job(get_accounts, db_path)
        portfolios = await hass.async_add_executor_job(get_portfolios, db_path)

        # FX Vorbereitung
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

        # Accounts transformieren (gleiches Format wie ws_get_accounts)
        accounts_payload = []
        for a in accounts:
            if a.is_retired:
                continue
            currency = getattr(a, "currency_code", "EUR") or "EUR"
            orig_balance = a.balance / 100.0  # Originalbetrag in Konto-Währung
            if currency != "EUR":
                rate = fx_rates.get(currency)
                eur_balance = (orig_balance / rate) if rate else 0.0
            else:
                eur_balance = orig_balance
            accounts_payload.append(
                {
                    "name": a.name,
                    "currency_code": currency,
                    "orig_balance": round(orig_balance, 2),
                    "balance": round(
                        eur_balance, 2
                    ),  # EUR-Wert (Abwärtskompatibilität)
                }
            )

        connection.send_result(
            msg["id"],
            {
                "accounts": accounts_payload,
                "portfolios": [p.__dict__ for p in portfolios],
            },
        )

        async_dispatcher_connect(
            hass,
            f"{DOMAIN}_updated_{entry_id}",
            lambda new_data: connection.send_message(
                {
                    "id": msg["id"] + 1,
                    "type": "pp_reader/dashboard_data_updated",
                    "data": new_data,
                }
            ),
        )

    except Exception as e:  # noqa: BLE001
        _LOGGER.exception("Fehler beim Abrufen der Dashboard-Daten")
        connection.send_error(msg["id"], "db_error", str(e))


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

    except Exception as e:  # noqa: BLE001
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
        vol.Optional("entry_id"): str,  # Erwartet die entry_id
    }
)
@websocket_api.async_response
async def ws_get_portfolio_data(hass, connection: ActiveConnection, msg: dict) -> None:
    """Handle WebSocket command to get portfolio data."""
    try:
        # Zugriff auf die Datenbank
        entry_id = msg["entry_id"]
        db_path = hass.data[DOMAIN][entry_id]["db_path"]
        from ..data.db_access import get_portfolios
        from ..logic.portfolio import (
            db_calculate_portfolio_purchase_sum,
            db_calculate_portfolio_value_and_count,
        )

        # Lade alle aktiven Depots
        portfolios = await hass.async_add_executor_job(get_portfolios, db_path)
        active_portfolios = [p for p in portfolios if not p.is_retired]

        # Berechne die Werte für jedes aktive Depot
        portfolio_data = []
        for portfolio in active_portfolios:
            portfolio_uuid = portfolio.uuid

            # Berechne den aktuellen Wert und die Anzahl der Positionen
            value, position_count = await hass.async_add_executor_job(
                db_calculate_portfolio_value_and_count, portfolio_uuid, db_path
            )

            # Berechne die Kaufpreissumme
            purchase_sum = await hass.async_add_executor_job(
                db_calculate_portfolio_purchase_sum, portfolio_uuid, db_path
            )

            # Füge die berechneten Daten hinzu
            portfolio_data.append(
                {
                    "name": portfolio.name,
                    "position_count": position_count,
                    "current_value": value,
                    "purchase_sum": purchase_sum,
                }
            )

        # Antwort senden
        connection.send_result(
            msg["id"],
            {
                "portfolios": portfolio_data,
            },
        )
        # _LOGGER.debug("Depotdaten erfolgreich abgerufen und gesendet: %s", portfolio_data)  # noqa: ERA001

    except Exception as e:
        _LOGGER.exception("Fehler beim Abrufen der Depotdaten")
        connection.send_error(msg["id"], "db_error", str(e))
