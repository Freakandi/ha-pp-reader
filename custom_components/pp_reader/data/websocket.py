from homeassistant.components import websocket_api
from homeassistant.components.websocket_api import async_response, ActiveConnection
from homeassistant.helpers.dispatcher import async_dispatcher_connect, async_dispatcher_send
import voluptuous as vol
import logging

_LOGGER = logging.getLogger(__name__)
DOMAIN = "pp_reader"

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

    except Exception as e:
        _LOGGER.exception("Fehler beim Abrufen der Kontodaten: %s", e)
        connection.send_error(msg["id"], "db_error", str(e))


def send_dashboard_update(hass, entry_id, updated_data):
    """Sendet ein Update-Event an alle verbundenen WebSocket-Clients."""
    # Sicherstellen, dass der Aufruf im Haupt-Event-Loop erfolgt
    def _send_update():
        async_dispatcher_send(hass, f"{DOMAIN}_updated_{entry_id}", updated_data)
        _LOGGER.debug("Update-Event für entry_id %s gesendet", entry_id)

    # Verwende call_soon_threadsafe, um sicherzustellen, dass der Aufruf im Event-Loop erfolgt
    hass.loop.call_soon_threadsafe(_send_update)