"""Portfolio Performance Reader custom component for Home Assistant."""

import logging
from collections.abc import Callable, Mapping
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Final

from homeassistant.components import websocket_api
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.panel_custom import (
    async_register_panel as panel_custom_async_register_panel,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryNotReady, HomeAssistantError
from homeassistant.helpers.event import async_track_time_interval
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
    ws_get_portfolio_positions,
)
from .prices.price_service import (
    _run_price_cycle,  # Initiallauf (einmalig); Intervall folgt in separatem Item
    initialize_price_state,
)

_LOGGER = logging.getLogger(__name__)
PLATFORMS: list[Platform] = [Platform.SENSOR]

PRICE_LOGGER_NAMES = [
    "custom_components.pp_reader.prices",
    "custom_components.pp_reader.prices.price_service",
    "custom_components.pp_reader.prices.yahooquery_provider",
    "custom_components.pp_reader.prices.revaluation",
    "custom_components.pp_reader.prices.symbols",
    "custom_components.pp_reader.prices.provider_base",
]

DEFAULT_PRICE_INTERVAL_SECONDS: Final = 900
MIN_PRICE_INTERVAL_SECONDS: Final = 300
CANCEL_EXCEPTIONS: tuple[type[Exception], ...] = (
    HomeAssistantError,
    RuntimeError,
    TypeError,
    ValueError,
)


def _get_entry_options(entry: ConfigEntry) -> Mapping[str, Any]:
    """Return a mapping with config entry options."""
    options = getattr(entry, "options", None)
    if isinstance(options, Mapping):
        return options
    return {}


def _get_price_interval_seconds(options: Mapping[str, Any]) -> int:
    """Normalize the configured interval with sane defaults."""
    raw_interval = options.get(
        "price_update_interval_seconds", DEFAULT_PRICE_INTERVAL_SECONDS
    )
    try:
        interval = int(raw_interval)
    except (TypeError, ValueError):
        return DEFAULT_PRICE_INTERVAL_SECONDS
    if interval < MIN_PRICE_INTERVAL_SECONDS:
        return DEFAULT_PRICE_INTERVAL_SECONDS
    return interval


def _schedule_price_interval(
    hass: HomeAssistant,
    entry: ConfigEntry,
    store: dict[str, Any],
    interval: int,
) -> Callable[[], None]:
    """Schedule the recurring price update task and persist the cancel handle."""

    async def _scheduled_price_cycle(_now: datetime) -> None:
        hass.async_create_task(_run_price_cycle(hass, entry.entry_id))

    remove_listener = async_track_time_interval(
        hass, _scheduled_price_cycle, timedelta(seconds=interval)
    )
    store["price_task_cancel"] = remove_listener
    store["price_interval_applied"] = interval
    _LOGGER.debug(
        "Preis-Service Intervall-Task geplant: every %ss (entry_id=%s)",
        interval,
        entry.entry_id,
    )
    return remove_listener


async def _register_panel_if_absent(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Register the custom panel if Home Assistant does not have it yet."""
    if any(
        panel.frontend_url_path == "ppreader"
        for panel in hass.data.get("frontend_panels", {}).values()
    ):
        _LOGGER.warning(
            "Das Panel 'ppreader' ist bereits registriert. Überspringe Registrierung."
        )
        return

    try:
        cache_bust = datetime.now(datetime.UTC).strftime("%Y%m%d%H%M%S")
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


def _initialize_price_tasks(
    hass: HomeAssistant,
    entry: ConfigEntry,
    store: dict[str, Any],
    options: Mapping[str, Any],
) -> None:
    """Ensure the price service state and recurring task are set up."""
    initialize_price_state(hass, entry.entry_id)
    _LOGGER.debug("Initialer Preiszyklus wird gestartet (entry_id=%s)", entry.entry_id)
    hass.async_create_task(_run_price_cycle(hass, entry.entry_id))

    if not store.get("price_task_cancel"):
        interval = _get_price_interval_seconds(options)
        _schedule_price_interval(hass, entry, store, interval)


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
    """Apply the `enable_price_debug` option to the price logger namespace."""
    options = _get_entry_options(entry)
    enabled = bool(options.get("enable_price_debug", False))

    level = logging.DEBUG if enabled else logging.INFO
    effective_levels = {}
    for name in PRICE_LOGGER_NAMES:
        logger = logging.getLogger(name)
        logger.setLevel(
            level if enabled else logger.level
        )  # do not downgrade an already higher level explicitly
        effective_levels[name] = logging.getLogger(name).getEffectiveLevel()

    if enabled:
        _LOGGER.info(
            "Preis-Debug Option=ON -> Ziel-Level=DEBUG (effective: %s)",
            {k: logging.getLevelName(v) for k, v in effective_levels.items()},
        )
    else:
        _LOGGER.info(
            "Preis-Debug Option=OFF (globale Logger-Konfiguration kann DEBUG-Ausgaben"
            " dennoch anzeigen) effective=%s",
            {k: logging.getLevelName(v) for k, v in effective_levels.items()},
        )


async def _async_reload_entry_on_update(
    hass: HomeAssistant, entry: ConfigEntry
) -> None:
    """Apply changed options (interval / debug) and restart the initial cycle."""
    _apply_price_debug_logging(entry)
    store = hass.data.get(DOMAIN, {}).get(entry.entry_id)
    if not store:
        return

    old_cancel = store.get("price_task_cancel")
    old_interval = store.get("price_interval_applied")

    if old_cancel:
        try:
            old_cancel()
        except CANCEL_EXCEPTIONS:  # pragma: no cover (defensiv)
            _LOGGER.warning(
                "Preis-Service: Fehler beim Cancel des alten Intervall-Tasks (Reload)",
                exc_info=True,
            )

    initialize_price_state(hass, entry.entry_id)

    options = _get_entry_options(entry)
    new_interval = _get_price_interval_seconds(options)
    _schedule_price_interval(hass, entry, store, new_interval)

    if old_interval is not None and old_interval != new_interval:
        _LOGGER.info(
            "Preis-Service: Intervall geändert alt=%ss neu=%ss (entry_id=%s)",
            old_interval,
            new_interval,
            entry.entry_id,
        )
    else:
        _LOGGER.debug(
            "Preis-Service: Intervall (re)gesetzt=%ss (entry_id=%s)",
            new_interval,
            entry.entry_id,
        )

    hass.async_create_task(_run_price_cycle(hass, entry.entry_id))
    _LOGGER.debug(
        "Preis-Service: Reload Initiallauf gestartet (entry_id=%s)", entry.entry_id
    )


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Portfolio Performance Reader from a config entry."""
    try:
        options = _get_entry_options(entry)
        file_path = entry.data[CONF_FILE_PATH]
        db_path = Path(entry.data[CONF_DB_PATH])

        try:
            _LOGGER.info("📁 Initialisiere Datenbank falls notwendig: %s", db_path)
            initialize_database_schema(db_path)
        except Exception as exc:
            _LOGGER.exception("❌ Fehler bei der DB-Initialisierung")
            msg = "Datenbank konnte nicht initialisiert werden"
            raise ConfigEntryNotReady(msg) from exc

        hass.data.setdefault(DOMAIN, {})
        store: dict[str, Any] = {
            "file_path": str(file_path),
            "db_path": db_path,
        }
        hass.data[DOMAIN][entry.entry_id] = store

        _apply_price_debug_logging(entry)

        coordinator = PPReaderCoordinator(
            hass,
            db_path=db_path,
            file_path=Path(file_path),
            entry_id=entry.entry_id,
        )
        await coordinator.async_config_entry_first_refresh()
        store["coordinator"] = coordinator

        await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

        _initialize_price_tasks(hass, entry, store, options)

        entry.async_on_unload(entry.add_update_listener(_async_reload_entry_on_update))

        try:
            await setup_backup_system(hass, db_path)
        except Exception:
            _LOGGER.exception("❌ Fehler beim Setup des Backup-Systems")

        await _register_panel_if_absent(hass, entry)

        return True  # noqa: TRY300

    except Exception:
        _LOGGER.exception("Fehler beim Setup des Config Entries")
        raise


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
                except CANCEL_EXCEPTIONS:
                    _LOGGER.warning(
                        "Preis-Service: Fehler beim Cancel des Intervall-Tasks",
                        exc_info=True,
                    )
            # Preis-bezogene Keys entfernen (nur price_*).
            # Andere Einträge bleiben bis zur Gesamtentfernung bestehen.
            price_keys = [k for k in list(store.keys()) if k.startswith("price_")]
            for k in price_keys:
                store.pop(k, None)
            _LOGGER.debug(
                (
                    "Preis-Service: State-Cleanup abgeschlossen removed_keys=%s "
                    "entry_id=%s"
                ),
                price_keys,
                entry.entry_id,
            )
        except Exception:  # noqa: BLE001
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
