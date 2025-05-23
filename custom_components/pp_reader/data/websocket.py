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

def send_dashboard_update(hass, entry_id, updated_data):
    """Sendet ein Update-Event an alle verbundenen WebSocket-Clients."""
    # Sicherstellen, dass der Aufruf im Haupt-Event-Loop erfolgt
    def _send_update():
        async_dispatcher_send(hass, f"{DOMAIN}_updated_{entry_id}", updated_data)
        _LOGGER.debug("Update-Event für entry_id %s gesendet", entry_id)

    # Verwende call_soon_threadsafe, um sicherzustellen, dass der Aufruf im Event-Loop erfolgt
    hass.loop.call_soon_threadsafe(_send_update)

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
        _LOGGER.debug("Kontodaten für aktive Konten erfolgreich abgerufen und gesendet: %s", account_data)

        # Dispatcher-Listener für Updates registrieren
        async_dispatcher_connect(
            hass,
            f"{DOMAIN}_accounts_updated_{entry_id}",
            lambda updated_data: connection.send_message(
                {
                    "id": msg["id"] + 1,
                    "type": "pp_reader/accounts_updated",
                    "data": updated_data,
                }
            ),
        )

    except Exception as e:
        _LOGGER.exception("Fehler beim Abrufen der Kontodaten: %s", e)
        connection.send_error(msg["id"], "db_error", str(e))

def ws_update_accounts(hass, entry_id, updated_data):
    """Sendet ein Update-Event an alle verbundenen WebSocket-Clients für Kontodaten."""
    def _send_update():
        async_dispatcher_send(hass, f"{DOMAIN}_accounts_updated_{entry_id}", updated_data)
        _LOGGER.debug("Kontodaten-Update-Event für entry_id %s gesendet", entry_id)

    hass.loop.call_soon_threadsafe(_send_update)

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
                # Zeitstempel im ISO-8601-Format parsen und in das gewünschte Format umwandeln
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
        _LOGGER.debug("Last file update erfolgreich abgerufen: %s", last_file_update)

        # Dispatcher-Listener für Updates registrieren
        async_dispatcher_connect(
            hass,
            f"{DOMAIN}_last_file_update_updated_{entry_id}",
            lambda new_data: connection.send_message(
                {
                    "id": msg["id"] + 1,
                    "type": "pp_reader/last_file_update_updated",
                    "data": new_data,
                }
            ),
        )

    except Exception as e:
        _LOGGER.exception("Fehler beim Abrufen von last_file_update: %s", e)
        connection.send_error(msg["id"], "db_error", str(e))

def ws_update_last_file_update(hass, entry_id, last_file_update):
    """Sendet ein Update-Event an alle verbundenen WebSocket-Clients für last_file_update."""
    def _send_update():
        async_dispatcher_send(
            hass,
            f"{DOMAIN}_last_file_update_updated_{entry_id}",
            {"last_file_update": last_file_update},
        )
        _LOGGER.debug("Last file update-Event für entry_id %s gesendet: %s", entry_id, last_file_update)

    hass.loop.call_soon_threadsafe(_send_update)