"""
Portfolio Performance Reader custom component for Home Assistant.

This component integrates Portfolio Performance data into Home Assistant,
providing sensors and a dashboard.
"""

import logging
from datetime import datetime, timedelta
from pathlib import Path

from homeassistant.components import frontend, websocket_api
from homeassistant.components.panel_custom import (
    async_register_panel as panel_custom_async_register_panel,
)
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.helpers.typing import ConfigType

from .const import CONF_DB_PATH, CONF_FILE_PATH, DOMAIN
from .data.backup_db import setup_backup_system
from .data.coordinator import PPReaderCoordinator
from .data.db_init import initialize_database_schema
from .data.websocket import (
    ws_get_dashboard_data,
    ws_get_accounts,
    ws_get_last_file_update,
    ws_get_portfolio_data,
    ws_get_portfolio_positions,
)  # Neu: Registrierung neuer WebSocket-Commands (portfolio positions)
from .prices.price_service import (
    initialize_price_state,
    _run_price_cycle,  # Initiallauf (einmalig); Intervall folgt in separatem Item
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
        websocket_api.async_register_command(hass, ws_get_portfolio_positions)
        # _LOGGER.debug("✅ Websocket-Befehle erfolgreich registriert.")  # noqa: ERA001
    except TypeError:
        _LOGGER.exception("❌ Fehler bei der Registrierung der Websocket-Befehle")

    return True


def _apply_price_debug_logging(entry: ConfigEntry) -> None:
    """
    Wendet die Debug-Option auf den Preis-Logger-Namespace an.

    Setzt ausschließlich Logger unterhalb von:
        custom_components.pp_reader.prices
    auf DEBUG (bei aktivierter Option) bzw. INFO (sonst).
    Greift bei jedem (Re-)Setup / Reload.

    Beeinflusst keine anderen Namespaces.
    """
    try:
        enabled = bool(entry.options.get("enable_price_debug", False))
    except Exception:
        enabled = False

    level = logging.DEBUG if enabled else logging.INFO
    base_name = "custom_components.pp_reader.prices"
    submodules = [
        base_name,
        f"{base_name}.price_service",
        f"{base_name}.yahooquery_provider",
        f"{base_name}.revaluation",
        f"{base_name}.symbols",
        f"{base_name}.provider_base",
    ]
    for name in submodules:
        logging.getLogger(name).setLevel(level)

    if enabled:
        _LOGGER.info(
            "Preis-Debug aktiviert (Logger-Level DEBUG) entry_id=%s", entry.entry_id
        )
    else:
        _LOGGER.debug(
            "Preis-Debug deaktiviert (Logger-Level INFO) entry_id=%s", entry.entry_id
        )


async def _async_reload_entry_on_update(hass: HomeAssistant, entry: ConfigEntry):
    """
    Update-Listener für ConfigEntry (Options-/Datenänderungen).

    Erkennt Intervalländerungen (price_update_interval_seconds) und loggt diese,
    bevor ein vollständiger Reload ausgelöst wird. Der Reload sorgt für Neuplanung
    und erneuten Initiallauf. Debug-Flag Anwendung folgt in separatem Item.
    """
    store = hass.data.get(DOMAIN, {}).get(entry.entry_id)
    old_interval = store.get("price_interval_applied") if store else None

    # neuen Intervallwert analog Setup ermitteln (Fallback + Mindestwert)
    try:
        raw_interval = entry.options.get("price_update_interval_seconds", 900)
        new_interval = int(raw_interval)
    except Exception:
        new_interval = 900
    if new_interval < 300:
        new_interval = 900

    if old_interval is not None and old_interval != new_interval:
        _LOGGER.info(
            "Preis-Service: Intervall geändert (old=%ss → new=%ss) – Reload (entry_id=%s)",
            old_interval,
            new_interval,
            entry.entry_id,
        )
    else:
        _LOGGER.debug(
            "Reload Listener ausgelöst (entry_id=%s) – Intervall unverändert (%s s)",
            entry.entry_id,
            new_interval,
        )

    await hass.config_entries.async_reload(entry.entry_id)


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

        # Apply Debug Logging (vor erstem Preiszyklus)
        _apply_price_debug_logging(entry)

        # Coordinator initialisieren
        coordinator = PPReaderCoordinator(
            hass,
            db_path=db_path,
            file_path=Path(file_path),
            entry_id=entry.entry_id,
        )
        await coordinator.async_config_entry_first_refresh()

        hass.data[DOMAIN][entry.entry_id]["coordinator"] = coordinator

        # Plattformen laden (Sensoren)
        await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

        # --- NEU: Preis-Service Initialisierung + einmaliger Initiallauf ---
        initialize_price_state(hass, entry.entry_id)
        hass.async_create_task(_run_price_cycle(hass, entry.entry_id))
        _LOGGER.debug("Initialer Preiszyklus gestartet (entry_id=%s)", entry.entry_id)
        # ---------------------------------------------------------------

        # --- NEU: Wiederkehrenden Preis-Task planen (Intervall laut Option) ---
        store = hass.data[DOMAIN][entry.entry_id]
        if not store.get("price_task_cancel"):
            try:
                raw_interval = entry.options.get("price_update_interval_seconds", 900)
                interval = int(raw_interval)
            except Exception:
                interval = 900
            if interval < 300:
                interval = 900

            async def _scheduled_price_cycle(_now):
                hass.async_create_task(_run_price_cycle(hass, entry.entry_id))

            remove_listener = async_track_time_interval(
                hass, _scheduled_price_cycle, timedelta(seconds=interval)
            )
            store["price_task_cancel"] = remove_listener
            store["price_interval_applied"] = interval  # <--- NEU: gemerktes Intervall
            _LOGGER.debug(
                "Preis-Service Intervall-Task geplant: every %ss (entry_id=%s)",
                interval,
                entry.entry_id,
            )
        # ----------------------------------------------------------------------

        # Update-Listener für Reload-Verhalten (Interval-/Debug-Änderungen)
        entry.async_on_unload(entry.add_update_listener(_async_reload_entry_on_update))

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
                cache_bust = datetime.utcnow().strftime("%Y%m%d%H%M%S")
                await panel_custom_async_register_panel(
                    hass,
                    frontend_url_path="ppreader",
                    webcomponent_name="pp-reader-panel",
                    module_url=f"/pp_reader_dashboard/panel.js?v={cache_bust}",
                    sidebar_title="Portfolio Dashboard",
                    sidebar_icon="mdi:chart-line",
                    require_admin=False,
                    config={"entry_id": entry.entry_id},
                )
                _LOGGER.info(
                    "✅ Custom Panel 'ppreader' registriert (cache_bust=%s, entry_id=%s)",
                    cache_bust,
                    entry.entry_id,
                )
            except ValueError:
                _LOGGER.exception("❌ Fehler bei der Registrierung des Panels")
            except AttributeError:
                _LOGGER.exception(
                    "❌ panel_custom.async_register_panel nicht verfügbar (HA-Version prüfen)"
                )
        else:
            _LOGGER.warning(
                "Das Panel 'ppreader' ist bereits registriert. "
                "Überspringe Registrierung."
            )

        return True  # noqa: TRY300

    except Exception:
        _LOGGER.exception("Fehler beim Setup des Config Entries")
        return False


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

    store = hass.data.get(DOMAIN, {}).get(entry.entry_id)
    if store:
        # --- NEU: Preis-Service Cleanup (unload_cleanup Item) -----------------
        try:
            cancel_cb = store.get("price_task_cancel")
            if cancel_cb:
                try:
                    cancel_cb()
                    _LOGGER.debug(
                        "Preis-Service: Intervall-Task gecancelt (entry_id=%s)",
                        entry.entry_id,
                    )
                except Exception:
                    _LOGGER.warning(
                        "Preis-Service: Fehler beim Cancel des Intervall-Tasks",
                        exc_info=True,
                    )
            # Preis-bezogene Keys entfernen (nur price_* – andere (coordinator) bleiben bis Gesamtentfernung)
            price_keys = [k for k in list(store.keys()) if k.startswith("price_")]
            for k in price_keys:
                store.pop(k, None)
            _LOGGER.debug(
                "Preis-Service: State-Cleanup abgeschlossen removed_keys=%s entry_id=%s",
                price_keys,
                entry.entry_id,
            )
        except Exception:
            _LOGGER.warning(
                "Preis-Service: Unerwarteter Fehler beim Unload-Cleanup",
                exc_info=True,
            )
        # ----------------------------------------------------------------------

    # Gesamten Entry-State löschen wenn Plattformen entladen
    if unload_ok:
        hass.data[DOMAIN].pop(entry.entry_id, None)
        if not hass.data[DOMAIN]:
            hass.data.pop(DOMAIN, None)

    return unload_ok
