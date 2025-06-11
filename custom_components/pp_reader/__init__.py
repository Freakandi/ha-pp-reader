"""
Portfolio Performance Reader custom component for Home Assistant.

This component integrates Portfolio Performance data into Home Assistant,
providing sensors and a dashboard.
"""

import logging
from pathlib import Path

from homeassistant.components import frontend, websocket_api
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.helpers.typing import ConfigType

from .const import CONF_DB_PATH, CONF_FILE_PATH, DOMAIN
from .data.backup_db import setup_backup_system
from .data.coordinator import PPReaderCoordinator
from .data.db_init import initialize_database_schema
from .data.websocket import (
    ws_get_accounts,
    ws_get_dashboard_data,
    ws_get_last_file_update,
    ws_get_portfolio_data,
)

_LOGGER = logging.getLogger(__name__)
PLATFORMS: list[Platform] = [Platform.SENSOR]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:  # noqa: ARG001
    """Set up your component."""
    # Dashboard-Dateien registrieren
    this_dir = Path(__file__).parent
    dashboard_folder = this_dir / "www" / "pp_reader_dashboard"
    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(
                path=hass.config.path(str(dashboard_folder)),
                url_path="/pp_reader_dashboard",
                cache_headers=False,
            )
        ]
    )

    # Websocket-API registrieren
    try:
        websocket_api.async_register_command(hass, ws_get_dashboard_data)
        websocket_api.async_register_command(hass, ws_get_accounts)
        websocket_api.async_register_command(hass, ws_get_last_file_update)
        websocket_api.async_register_command(hass, ws_get_portfolio_data)
        # _LOGGER.debug("✅ Websocket-Befehle erfolgreich registriert.")  # noqa: ERA001
    except TypeError:
        _LOGGER.exception(
            "❌ Fehler bei der Registrierung der Websocket-Befehle"
        )

    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Portfolio Performance Reader from a config entry."""
    try:
        # DB-Pfad aus Config holen und DB initialisieren
        file_path = entry.data[CONF_FILE_PATH]
        db_path = Path(entry.data[CONF_DB_PATH])

        # Datenbank initialisieren
        try:
            _LOGGER.info("📁 Initialisiere Datenbank falls notwendig: %s", db_path)
            initialize_database_schema(db_path)
        except Exception as exc:
            _LOGGER.exception("❌ Fehler bei der DB-Initialisierung")
            msg = "Datenbank konnte nicht initialisiert werden"
            raise ConfigEntryNotReady(msg) from exc

        # Datenstruktur initialisieren
        hass.data.setdefault(DOMAIN, {})
        hass.data[DOMAIN][entry.entry_id] = {
            "file_path": str(file_path),
            "db_path": db_path,
        }

        # Coordinator initialisieren
        coordinator = PPReaderCoordinator(
            hass,
            db_path=db_path,
            file_path=Path(file_path),
            entry_id=entry.entry_id,  # Entry-ID übergeben
        )
        try:
            await coordinator.async_config_entry_first_refresh()
            # _LOGGER.debug(
            #     "Initialisiere Coordinator mit entry_id: %s",  # noqa: ERA001
            #     entry.entry_id,
            # )  # noqa: ERA001, RUF100
        except Exception as exc:
            _LOGGER.exception(
                "❌ Fehler beim ersten Datenabruf des Coordinators"
            )
            msg = "Coordinator konnte nicht initialisiert werden"
            raise ConfigEntryNotReady(msg) from exc

        # Coordinator in hass.data speichern
        hass.data[DOMAIN][entry.entry_id]["coordinator"] = coordinator

        _LOGGER.info("Portfolio Daten erfolgreich initialisiert")

        # Plattformen laden
        try:
            _LOGGER.info("🔄 Starte Sensor-Setup...")
            await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
            _LOGGER.info("✅ Sensor-Setup abgeschlossen")
        except Exception as exc:
            _LOGGER.exception("❌ Fehler beim Sensor-Setup")
            msg = "Sensor-Setup fehlgeschlagen"
            raise ConfigEntryNotReady(msg) from exc

        # Backup-System starten
        try:
            await setup_backup_system(hass, db_path)
        except Exception:
            _LOGGER.exception("❌ Fehler beim Setup des Backup-Systems")

        # Vor der Registrierung des Panels prüfen, ob es bereits existiert
        if not any(
            panel.frontend_url_path == "ppreader"
            for panel in hass.data.get("frontend_panels", {}).values()
        ):
            try:
                frontend.async_register_built_in_panel(
                    hass,
                    component_name="custom",
                    sidebar_title="Portfolio Dashboard",
                    sidebar_icon="mdi:finance",
                    frontend_url_path="ppreader",
                    require_admin=False,
                    config={
                        "_panel_custom": {
                            "name": "pp-reader-panel",
                            "embed_iframe": False,
                            "module_url": "/pp_reader_dashboard/panel.js",
                            "trust_external": True,
                            "config": {"entry_id": entry.entry_id},
                        }
                    },
                )
                _LOGGER.info("✅ Custom Panel 'ppreader' erfolgreich registriert.")
            except ValueError:
                _LOGGER.exception(
                    "❌ Fehler bei der Registrierung des Panels"
                )
        else:
            _LOGGER.warning(
                "Das Panel 'ppreader' ist bereits registriert. "
                "Überspringe Registrierung."
            )

        return True  # noqa: TRY300

    except Exception:
        _LOGGER.exception("Kritischer Fehler beim Setup")
        return False


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        hass.data[DOMAIN].pop(entry.entry_id)
    return unload_ok
