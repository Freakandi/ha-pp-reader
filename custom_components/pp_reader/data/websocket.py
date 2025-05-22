from homeassistant.components import websocket_api
from homeassistant.components.websocket_api import async_response, ActiveConnection
import voluptuous as vol
import logging

_LOGGER = logging.getLogger(__name__)

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
        db_path = hass.data["pp_reader"][entry_id]["db_path"]
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
    except Exception as e:
        _LOGGER.exception("Fehler beim Abrufen der Dashboard-Daten: %s", e)
        connection.send_error(msg["id"], "db_error", str(e))