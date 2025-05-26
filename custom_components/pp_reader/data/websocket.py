from homeassistant.components import websocket_api
from homeassistant.components.websocket_api import async_response, ActiveConnection
from homeassistant.helpers.dispatcher import async_dispatcher_connect, async_dispatcher_send
import voluptuous as vol
import logging
from datetime import datetime

_LOGGER = logging.getLogger(__name__)
DOMAIN = "pp_reader"

# === Dashboard Websocket Test-Command ===
@websocket_api.websocket_command(
    {
        vol.Required("type"): "pp_reader/get_dashboard_data",
        vol.Optional("entry_id"): str,  # Erwartet die entry_id
    }
)
@websocket_api.async_response
async def ws_get_dashboard_data(hass, connection: ActiveConnection, msg: dict) -> None:
    """Handle WebSocket command to get dashboard data."""
    try:
        # Zugriff auf die Datenbank
        entry_id = msg["entry_id"]
        db_path = hass.data[DOMAIN][entry_id]["db_path"]
        from .db_access import get_accounts, get_portfolios

        # Datenbankabfragen ausführen
        accounts = await hass.async_add_executor_job(get_accounts, db_path)
        portfolios = await hass.async_add_executor_job(get_portfolios, db_path)

        # Antwort senden
        connection.send_result(
            msg["id"],
            {
                "accounts": [a.__dict__ for a in accounts],
                "portfolios": [p.__dict__ for p in portfolios],
            },
        )

        # Dispatcher-Listener für Updates registrieren
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

    except Exception as e:
        _LOGGER.exception("Fehler beim Abrufen der Dashboard-Daten: %s", e)
        connection.send_error(msg["id"], "db_error", str(e))

# === Websocket Accounts-Data ===
@websocket_api.websocket_command(
    {
        vol.Required("type"): "pp_reader/get_accounts",
        vol.Optional("entry_id"): str,  # Erwartet die entry_id
    }
)
@websocket_api.async_response
async def ws_get_accounts(hass, connection: ActiveConnection, msg: dict) -> None:
    """Handle WebSocket command to get account data (name and balance) for active accounts."""
    try:
        # Zugriff auf die Datenbank
        entry_id = msg["entry_id"]
        db_path = hass.data[DOMAIN][entry_id]["db_path"]
        from .db_access import get_accounts

        # Datenbankabfrage ausführen
        accounts = await hass.async_add_executor_job(get_accounts, db_path)

        # Nur aktive Konten (isRetired=0) und relevante Daten extrahieren
        account_data = [
            {"name": a.name, "balance": a.balance / 100.0}  # Kontostand von Cent in Euro umrechnen
            for a in accounts
            if not a.is_retired  # Nur Konten mit isRetired=0
        ]

        # Antwort senden
        connection.send_result(
            msg["id"],
            {
                "accounts": account_data,
            },
        )
        # _LOGGER.debug("Kontodaten für aktive Konten erfolgreich abgerufen und gesendet: %s", account_data)

    except Exception as e:
        _LOGGER.exception("Fehler beim Abrufen der Kontodaten: %s", e)
        connection.send_error(msg["id"], "db_error", str(e))

# === Websocket FileUpdate-Timestamp ===
@websocket_api.websocket_command(
    {
        vol.Required("type"): "pp_reader/get_last_file_update",
        vol.Optional("entry_id"): str,  # Erwartet die entry_id
    }
)
@websocket_api.async_response
async def ws_get_last_file_update(hass, connection: ActiveConnection, msg: dict) -> None:
    """Handle WebSocket command to get the last file update timestamp."""
    try:
        # Zugriff auf die Datenbank
        entry_id = msg["entry_id"]
        db_path = hass.data[DOMAIN][entry_id]["db_path"]
        from .db_access import get_last_file_update

        # Datenbankabfrage ausführen
        last_file_update_raw = await hass.async_add_executor_job(get_last_file_update, db_path)

        # Zeitstempel formatieren
        if last_file_update_raw:
            try:
                # Zeitstempel im ISO-8601-Format "%Y-%m-%dT%H:%M:%S" parsen und in das gewünschte Format umwandeln
                last_file_update = datetime.strptime(last_file_update_raw, "%Y-%m-%dT%H:%M:%S").strftime("%d.%m.%Y, %H:%M")
            except ValueError as e:
                _LOGGER.error("Fehler beim Parsen des Zeitstempels: %s", e)
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
        # _LOGGER.debug("Last file update erfolgreich abgerufen: %s", last_file_update)

    except Exception as e:
        _LOGGER.exception("Fehler beim Abrufen von last_file_update: %s", e)
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
        from ..logic.portfolio import (
            db_calculate_portfolio_value_and_count,
            db_calculate_portfolio_purchase_sum,
        )
        from ..data.db_access import get_portfolios

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
            portfolio_data.append({
                "name": portfolio.name,
                "position_count": position_count,
                "current_value": value,
                "purchase_sum": purchase_sum,
            })

        # Antwort senden
        connection.send_result(
            msg["id"],
            {
                "portfolios": portfolio_data,
            },
        )
        # _LOGGER.debug("Depotdaten erfolgreich abgerufen und gesendet: %s", portfolio_data)

    except Exception as e:
        _LOGGER.exception("Fehler beim Abrufen der Depotdaten: %s", e)
        connection.send_error(msg["id"], "db_error", str(e))
