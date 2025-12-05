"""Portfolio Performance Reader custom component for Home Assistant."""

from __future__ import annotations

import asyncio
import inspect
import logging
from collections.abc import Callable, Mapping
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import TYPE_CHECKING, Any, Final

from homeassistant.components import websocket_api
from homeassistant.components.frontend import (
    async_register_built_in_panel,
)
from homeassistant.components.frontend import (
    async_remove_panel as frontend_async_remove_panel,
)
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.panel_custom import (
    DEFAULT_EMBED_IFRAME,
    DEFAULT_TRUST_EXTERNAL,
)
from homeassistant.const import Platform
from homeassistant.exceptions import ConfigEntryNotReady, HomeAssistantError
from homeassistant.helpers.event import (
    async_track_time_change,
    async_track_time_interval,
)

from .const import (
    CONF_DB_PATH,
    CONF_FILE_PATH,
    CONF_FX_UPDATE_INTERVAL_SECONDS,
    CONF_HISTORY_RETENTION_YEARS,
    CONFIG_ENTRY_VERSION,
    DEFAULT_DB_SUBDIR,
    DEFAULT_FX_UPDATE_INTERVAL_SECONDS,
    DOMAIN,
    MIN_FX_UPDATE_INTERVAL_SECONDS,
)
from .currencies import fx as fx_module
from .data import backup_db as backup_db_module
from .data import coordinator as coordinator_module
from .data import db_init as db_init_module
from .data import websocket as websocket_module
from .prices import price_service as price_service_module
from .util import async_run_executor_job
from .util.paths import resolve_storage_path

_LOGGER = logging.getLogger(__name__)
PLATFORMS: list[Platform] = [Platform.SENSOR]

PANEL_SIDEBAR_TITLE: Final = "Portfolio Dashboard"
PANEL_SIDEBAR_ICON: Final = "mdi:chart-line"
PANEL_WEB_COMPONENT: Final = "pp-reader-panel"

if TYPE_CHECKING:
    from types import ModuleType

    from homeassistant.config_entries import ConfigEntry
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.typing import ConfigType

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


def _get_price_service_module() -> ModuleType:
    """Return the price service module on demand."""
    return price_service_module


def _get_fx_module() -> ModuleType:
    """Return the FX helper module on demand."""
    return fx_module


def _build_panel_config(
    module_url: str,
    *,
    entry_id: str | None,
    placeholder: bool,
) -> dict[str, Any]:
    """Return the panel registration payload used for placeholder and live panels."""
    config: dict[str, Any] = {"entry_id": entry_id}
    if placeholder:
        config["placeholder"] = True

    config["_panel_custom"] = {
        "name": PANEL_WEB_COMPONENT,
        "module_url": module_url,
        "embed_iframe": DEFAULT_EMBED_IFRAME,
        "trust_external": DEFAULT_TRUST_EXTERNAL,
    }
    return config


def _get_websocket_module() -> ModuleType:
    """Return the websocket helpers module on demand."""
    return websocket_module


def _get_entry_options(entry: ConfigEntry) -> Mapping[str, Any]:
    """Return a mapping with config entry options."""
    options = getattr(entry, "options", None)
    if isinstance(options, Mapping):
        return options
    return {}


def _extract_feature_flag_options(options: Mapping[str, Any]) -> dict[str, bool]:
    """Return normalized feature flag overrides from the entry options."""
    raw_flags = options.get("feature_flags")
    if not isinstance(raw_flags, Mapping):
        return {}

    normalized: dict[str, bool] = {}
    for raw_name, raw_value in raw_flags.items():
        if not isinstance(raw_name, str):
            continue
        name = raw_name.strip().lower()
        if not name:
            continue
        normalized[name] = bool(raw_value)

    return normalized


async def async_migrate_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Handle config entry migrations."""
    version = entry.version or 1
    if version >= CONFIG_ENTRY_VERSION:
        return True

    _LOGGER.info(
        "Migriere Config Entry %s von Version %s -> %s",
        entry.entry_id,
        version,
        CONFIG_ENTRY_VERSION,
    )

    new_options = dict(entry.options or {})
    options_changed = False
    if "feature_flags" in new_options:
        new_options.pop("feature_flags")
        options_changed = True

    if options_changed:
        hass.config_entries.async_update_entry(
            entry,
            version=CONFIG_ENTRY_VERSION,
            options=new_options,
        )
    else:
        hass.config_entries.async_update_entry(
            entry,
            version=CONFIG_ENTRY_VERSION,
        )

    return True


def _store_feature_flags(
    store: dict[str, Any], overrides: Mapping[str, bool]
) -> dict[str, bool]:
    """Persist feature flag values in the entry store."""
    flags = dict(overrides)
    store["feature_flags"] = flags
    return flags


def _normalize_history_retention_years(options: Mapping[str, Any]) -> int | None:
    """Return the configured retention horizon in years or ``None`` for unlimited."""
    raw_value = options.get(CONF_HISTORY_RETENTION_YEARS)
    if raw_value is None:
        return None

    if isinstance(raw_value, str):
        cleaned = raw_value.strip()
        if not cleaned:
            return None
        if cleaned.lower() in {"none", "unlimited"}:
            return None
        raw_value = cleaned

    try:
        years = int(raw_value)
    except (TypeError, ValueError):
        _LOGGER.warning(
            "Ungültige history_retention_years Option (%r) -> keine Begrenzung",
            raw_value,
        )
        return None

    if years <= 0:
        return None

    return years


def _store_history_retention(
    store: dict[str, Any], options: Mapping[str, Any]
) -> int | None:
    """Persist the retention configuration in the entry store and return it."""
    retention_years = _normalize_history_retention_years(options)
    store["history_retention_years"] = retention_years
    return retention_years


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


def _get_fx_interval_seconds(options: Mapping[str, Any]) -> int:
    """Normalize the configured FX refresh interval with sane defaults."""
    raw_interval = options.get(
        CONF_FX_UPDATE_INTERVAL_SECONDS, DEFAULT_FX_UPDATE_INTERVAL_SECONDS
    )
    try:
        interval = int(raw_interval)
    except (TypeError, ValueError):
        return DEFAULT_FX_UPDATE_INTERVAL_SECONDS
    if interval < MIN_FX_UPDATE_INTERVAL_SECONDS:
        return DEFAULT_FX_UPDATE_INTERVAL_SECONDS
    return interval


def _schedule_price_interval(
    hass: HomeAssistant,
    entry: ConfigEntry,
    store: dict[str, Any],
    interval: int,
) -> Callable[[], None]:
    """Schedule the recurring price update task and persist the cancel handle."""

    async def _scheduled_price_cycle(_now: datetime) -> None:
        price_service = _get_price_service_module()

        hass.async_create_task(
            price_service._run_price_cycle(hass, entry.entry_id)  # noqa: SLF001
        )

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


async def _run_fx_refresh_once(
    hass: HomeAssistant,
    entry: ConfigEntry,
    store: dict[str, Any],
) -> None:
    """Ensure current FX rates are cached for active currencies."""
    fx_module = _get_fx_module()
    from custom_components.pp_reader.data.fx_backfill import (
        backfill_fx,
    )

    db_path = store.get("db_path")
    if db_path is None:
        _LOGGER.debug(
            "FX-Refresh: Kein db_path im Store gefunden (entry_id=%s)",
            entry.entry_id,
        )
        return
    if not isinstance(db_path, Path):
        db_path = Path(db_path)
        store["db_path"] = db_path

    fx_lock = store.get("fx_lock")
    if not isinstance(fx_lock, asyncio.Lock):
        fx_lock = asyncio.Lock()
        store["fx_lock"] = fx_lock

    if fx_lock.locked():
        _LOGGER.debug(
            "FX-Refresh: Vorheriger Lauf noch aktiv, Skip (entry_id=%s)",
            entry.entry_id,
        )
        return

    async with fx_lock:
        try:
            currencies = await hass.async_add_executor_job(
                fx_module.discover_active_currencies,
                db_path,
            )
        except Exception:  # noqa: BLE001
            _LOGGER.warning(
                "FX-Refresh: Fehler beim Ermitteln aktiver Währungen (entry_id=%s)",
                entry.entry_id,
                exc_info=True,
            )
            return

        if not currencies:
            _LOGGER.debug(
                "FX-Refresh: Keine Nicht-EUR Währungen aktiv (entry_id=%s)",
                entry.entry_id,
            )
            store["fx_last_refresh"] = datetime.now(UTC)
            return

        reference = datetime.now(UTC)
        try:
            backfill_summary = await backfill_fx(
                db_path=db_path,
                currencies=currencies,
                end=reference,
            )
            inserted_total = sum(backfill_summary.values())
            if inserted_total:
                _LOGGER.info(
                    "FX-Refresh: Backfill eingefügt=%d für %s (entry_id=%s)",
                    inserted_total,
                    sorted(backfill_summary.keys()),
                    entry.entry_id,
                )
        except Exception:  # noqa: BLE001
            _LOGGER.warning(
                "FX-Refresh: Backfill fehlgeschlagen (entry_id=%s)",
                entry.entry_id,
                exc_info=True,
            )

        # Keep the latest-day fetch to refresh today's rate even after backfill.
        try:
            await fx_module.ensure_exchange_rates_for_dates(
                [reference],
                currencies,
                db_path,
            )
        except Exception:  # noqa: BLE001
            _LOGGER.warning(
                "FX-Refresh: Fehler beim Aktualisieren der Wechselkurse (entry_id=%s)",
                entry.entry_id,
                exc_info=True,
            )
        else:
            store["fx_last_refresh"] = reference
            _LOGGER.debug(
                "FX-Refresh: Aktualisiert für %s (entry_id=%s)",
                sorted(currencies),
                entry.entry_id,
            )


def _schedule_fx_interval(
    hass: HomeAssistant,
    entry: ConfigEntry,
    store: dict[str, Any],
    interval: int,
) -> Callable[[], None]:
    """Schedule recurring FX cache refresh."""

    async def _scheduled_fx_cycle(_now: datetime) -> None:
        await _run_fx_refresh_once(hass, entry, store)

    remove_listener = async_track_time_interval(
        hass,
        _scheduled_fx_cycle,
        timedelta(seconds=interval),
    )
    store["fx_task_cancel"] = remove_listener
    store["fx_interval_applied"] = interval
    _LOGGER.debug(
        "FX-Service Intervall-Task geplant: every %ss (entry_id=%s)",
        interval,
        entry.entry_id,
    )
    return remove_listener


async def _register_panel_if_absent(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Ensure the custom panel exists and refresh it when already present."""
    existing_panel = next(
        (
            panel
            for panel in hass.data.get("frontend_panels", {}).values()
            if panel.frontend_url_path == "ppreader"
        ),
        None,
    )

    if existing_panel is not None:
        existing_entry_id = (existing_panel.config or {}).get("entry_id")
        if existing_entry_id == entry.entry_id:
            _LOGGER.debug(
                "Aktualisiere bestehendes Panel 'ppreader' für entry_id=%s",
                entry.entry_id,
            )
        else:
            _LOGGER.info(
                "Ersetze vorhandenes Panel 'ppreader' (alt=%s) durch entry_id=%s",
                existing_entry_id,
                entry.entry_id,
            )
        update_existing = True
    else:
        update_existing = False

    try:
        cache_bust = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
        module_url = f"/pp_reader_dashboard/panel.js?v={cache_bust}"
        panel_config = _build_panel_config(
            module_url,
            entry_id=entry.entry_id,
            placeholder=False,
        )
        register_result = async_register_built_in_panel(
            hass,
            component_name="custom",
            sidebar_title=PANEL_SIDEBAR_TITLE,
            sidebar_icon=PANEL_SIDEBAR_ICON,
            frontend_url_path="ppreader",
            config=panel_config,
            require_admin=False,
            update=update_existing,
        )
        if inspect.isawaitable(register_result):
            await register_result
        _LOGGER.info(
            "Custom Panel 'ppreader' registriert (cache_bust=%s, entry_id=%s)",
            cache_bust,
            entry.entry_id,
        )
    except ValueError:
        _LOGGER.exception("Fehler bei der Registrierung des Panels")
    except AttributeError:
        _LOGGER.exception(
            "panel_custom.async_register_panel nicht verfügbar (HA-Version prüfen)"
        )


async def _ensure_placeholder_panel(hass: HomeAssistant) -> None:
    """Register a lightweight placeholder panel so /ppreader never 404s."""
    existing_panel = next(
        (
            panel
            for panel in hass.data.get("frontend_panels", {}).values()
            if panel.frontend_url_path == "ppreader"
        ),
        None,
    )

    if existing_panel is not None:
        return

    try:
        panel_config = _build_panel_config(
            "/pp_reader_dashboard/panel.js?v=bootstrap",
            entry_id=None,
            placeholder=True,
        )
        register_result = async_register_built_in_panel(
            hass,
            component_name="custom",
            sidebar_title=PANEL_SIDEBAR_TITLE,
            sidebar_icon=PANEL_SIDEBAR_ICON,
            frontend_url_path="ppreader",
            config=panel_config,
            require_admin=False,
        )
        if inspect.isawaitable(register_result):
            await register_result
        _LOGGER.debug("Panel-Placeholder 'ppreader' registriert")
    except ValueError:
        _LOGGER.exception("Fehler bei der Registrierung des Panel-Platzhalters")
    except AttributeError:
        _LOGGER.exception(
            "panel_custom.async_register_panel nicht verfügbar (HA-Version prüfen)"
        )


def _initialize_price_tasks(
    hass: HomeAssistant,
    entry: ConfigEntry,
    store: dict[str, Any],
    options: Mapping[str, Any],
) -> None:
    """Ensure the price service state and recurring task are set up."""
    price_service = _get_price_service_module()
    price_service.initialize_price_state(hass, entry.entry_id)
    _LOGGER.debug("Initialer Preiszyklus wird gestartet (entry_id=%s)", entry.entry_id)
    hass.async_create_task(
        price_service._run_price_cycle(hass, entry.entry_id)  # noqa: SLF001
    )

    if not store.get("price_task_cancel"):
        interval = _get_price_interval_seconds(options)
        _schedule_price_interval(hass, entry, store, interval)


def _initialize_fx_tasks(
    hass: HomeAssistant,
    entry: ConfigEntry,
    store: dict[str, Any],
    options: Mapping[str, Any],
) -> None:
    """Ensure FX refresh scheduling is active."""
    store.setdefault("fx_task_cancel", None)
    store.setdefault("fx_interval_applied", None)
    if not isinstance(store.get("fx_lock"), asyncio.Lock):
        store["fx_lock"] = asyncio.Lock()

    if not store.get("fx_task_cancel"):
        interval = _get_fx_interval_seconds(options)
        _schedule_fx_interval(hass, entry, store, interval)

    hass.async_create_task(_run_fx_refresh_once(hass, entry, store))


def _initialize_history_tasks(
    hass: HomeAssistant,
    entry: ConfigEntry,
    store: dict[str, Any],
) -> None:
    """Schedule periodic processing of price history jobs."""

    async def _run_history_queue(_now: datetime) -> None:
        coordinator: Any = store.get("coordinator")
        if coordinator is None:
            return
        hass.async_create_task(
            coordinator._plan_and_process_history_jobs(reason="scheduled")  # noqa: SLF001
        )

    remove_listener = async_track_time_change(
        hass,
        _run_history_queue,
        hour=[2, 14],
        minute=0,
        second=0,
    )
    store["history_task_cancel"] = remove_listener
    _LOGGER.debug(
        "Price-History Scheduler aktiviert (02:00/14:00 lokal) entry_id=%s",
        entry.entry_id,
    )

    coordinator: Any = store.get("coordinator")
    if coordinator is not None:
        hass.async_create_task(
            coordinator._plan_and_process_history_jobs(reason="startup")  # noqa: SLF001
        )


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:  # noqa: ARG001
    """Set up your component."""
    # Dashboard-Dateien registrieren
    this_dir = Path(__file__).parent
    dashboard_folder = this_dir / "www" / "pp_reader_dashboard"

    await asyncio.gather(
        _ensure_placeholder_panel(hass),
        hass.http.async_register_static_paths(
            [
                StaticPathConfig(
                    path=str(dashboard_folder.resolve()),
                    url_path="/pp_reader_dashboard",
                    cache_headers=False,
                )
            ]
        ),
    )

    # Websocket-API registrieren
    try:
        websocket = _get_websocket_module()

        websocket_api.async_register_command(hass, websocket.ws_get_dashboard_data)
        websocket_api.async_register_command(hass, websocket.ws_get_accounts)
        websocket_api.async_register_command(hass, websocket.ws_get_last_file_update)
        websocket_api.async_register_command(
            hass, websocket.ws_get_portfolio_data_handler
        )
        websocket_api.async_register_command(hass, websocket.ws_get_portfolio_positions)
        websocket_api.async_register_command(hass, websocket.ws_get_security_snapshot)
        websocket_api.async_register_command(hass, websocket.ws_get_security_history)
        websocket_api.async_register_command(hass, websocket.ws_get_news_prompt)
        # _LOGGER.debug("Websocket-Befehle erfolgreich registriert.")  # noqa: ERA001
    except TypeError:
        _LOGGER.exception("Fehler bei der Registrierung der Websocket-Befehle")

    return True


def _apply_price_debug_logging(entry: ConfigEntry) -> None:
    """Apply the `enable_price_debug` option to the price logger namespace."""
    options = _get_entry_options(entry)
    enabled = bool(options.get("enable_price_debug", False))

    level = logging.DEBUG if enabled else logging.INFO
    effective_levels = {}
    base_logger = logging.getLogger("custom_components.pp_reader")
    base_logger.setLevel(logging.INFO)
    for name in PRICE_LOGGER_NAMES:
        logger = logging.getLogger(name)
        logger.setLevel(level)
        effective_levels[name] = logger.getEffectiveLevel()

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
    price_service = _get_price_service_module()
    _apply_price_debug_logging(entry)
    store = hass.data.get(DOMAIN, {}).get(entry.entry_id)
    if not store:
        return

    options = _get_entry_options(entry)
    flag_overrides = _extract_feature_flag_options(options)
    _store_feature_flags(store, flag_overrides)
    _store_history_retention(store, options)

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

    fx_cancel = store.get("fx_task_cancel")
    fx_interval = store.get("fx_interval_applied")
    if fx_cancel:
        try:
            fx_cancel()
        except CANCEL_EXCEPTIONS:  # pragma: no cover (defensiv)
            _LOGGER.warning(
                "FX-Service: Fehler beim Cancel des alten Intervall-Tasks (Reload)",
                exc_info=True,
            )

    if not isinstance(store.get("fx_lock"), asyncio.Lock):
        store["fx_lock"] = asyncio.Lock()

    price_service.initialize_price_state(hass, entry.entry_id)

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

    hass.async_create_task(
        price_service._run_price_cycle(hass, entry.entry_id)  # noqa: SLF001
    )
    _LOGGER.debug(
        "Preis-Service: Reload Initiallauf gestartet (entry_id=%s)", entry.entry_id
    )

    new_fx_interval = _get_fx_interval_seconds(options)
    _schedule_fx_interval(hass, entry, store, new_fx_interval)

    if fx_interval is not None and fx_interval != new_fx_interval:
        _LOGGER.info(
            "FX-Service: Intervall geändert alt=%ss neu=%ss (entry_id=%s)",
            fx_interval,
            new_fx_interval,
            entry.entry_id,
        )
    else:
        _LOGGER.debug(
            "FX-Service: Intervall (re)gesetzt=%ss (entry_id=%s)",
            new_fx_interval,
            entry.entry_id,
        )

    hass.async_create_task(_run_fx_refresh_once(hass, entry, store))


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Portfolio Performance Reader from a config entry."""
    panel_registered = False

    try:
        await _ensure_placeholder_panel(hass)

        setup_backup_system = backup_db_module.setup_backup_system
        coordinator_cls = coordinator_module.PPReaderCoordinator
        initialize_database_schema = db_init_module.initialize_database_schema

        options = _get_entry_options(entry)
        stored_file_path = entry.data[CONF_FILE_PATH]
        resolved_file_path = resolve_storage_path(hass, stored_file_path)
        portfolio_file = Path(resolved_file_path)
        portfolio_stem = portfolio_file.stem
        default_db_relative = Path(DEFAULT_DB_SUBDIR) / f"{portfolio_stem}.db"
        db_path = resolve_storage_path(
            hass,
            entry.data.get(CONF_DB_PATH),
            default_relative=default_db_relative,
        )

        try:
            _LOGGER.info("Initialisiere Datenbank falls notwendig: %s", db_path)
            await async_run_executor_job(hass, initialize_database_schema, db_path)
        except Exception as exc:
            _LOGGER.exception("Fehler bei der DB-Initialisierung")
            msg = "Datenbank konnte nicht initialisiert werden"
            raise ConfigEntryNotReady(msg) from exc

        hass.data.setdefault(DOMAIN, {})
        store: dict[str, Any] = {"file_path": str(portfolio_file), "db_path": db_path}
        hass.data[DOMAIN][entry.entry_id] = store

        flag_overrides = _extract_feature_flag_options(options)
        _store_feature_flags(store, flag_overrides)
        _store_history_retention(store, options)

        _apply_price_debug_logging(entry)

        await _register_panel_if_absent(hass, entry)
        panel_registered = True

        coordinator = coordinator_cls(
            hass,
            db_path=db_path,
            file_path=portfolio_file,
            entry_id=entry.entry_id,
        )
        await coordinator.async_config_entry_first_refresh()
        store["coordinator"] = coordinator

        await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

        _initialize_price_tasks(hass, entry, store, options)
        _initialize_fx_tasks(hass, entry, store, options)
        _initialize_history_tasks(hass, entry, store)

        entry.async_on_unload(entry.add_update_listener(_async_reload_entry_on_update))

        try:
            await setup_backup_system(hass, db_path)
        except Exception:
            _LOGGER.exception("Fehler beim Setup des Backup-Systems")

        return True  # noqa: TRY300

    except Exception:
        _LOGGER.exception("Fehler beim Setup des Config Entries")
        if panel_registered:
            frontend_async_remove_panel(hass, "ppreader", warn_if_unknown=False)
        raise


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:  # noqa: PLR0912
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
        try:
            fx_cancel = store.get("fx_task_cancel")
            if fx_cancel:
                try:
                    fx_cancel()
                    _LOGGER.debug(
                        "FX-Service: Intervall-Task gecancelt (entry_id=%s)",
                        entry.entry_id,
                    )
                except CANCEL_EXCEPTIONS:
                    _LOGGER.warning(
                        "FX-Service: Fehler beim Cancel des Intervall-Tasks",
                        exc_info=True,
                    )
            fx_keys = [k for k in list(store.keys()) if k.startswith("fx_")]
            for key in fx_keys:
                store.pop(key, None)
            if fx_keys:
                _LOGGER.debug(
                    (
                        "FX-Service: State-Cleanup abgeschlossen "
                        "removed_keys=%s entry_id=%s"
                    ),
                    fx_keys,
                    entry.entry_id,
                )
        except Exception:  # noqa: BLE001
            _LOGGER.warning(
                "FX-Service: Unerwarteter Fehler beim Unload-Cleanup",
                exc_info=True,
            )
        try:
            cancel_history = store.get("history_task_cancel")
            if cancel_history:
                cancel_history()
                _LOGGER.debug(
                    "Price-History Scheduler gestoppt (entry_id=%s)", entry.entry_id
                )
        except Exception:  # noqa: BLE001
            _LOGGER.debug("History-Scheduler: Fehler beim Cleanup", exc_info=True)

    # Gesamten Entry-State löschen wenn Plattformen entladen
    if unload_ok:
        hass.data[DOMAIN].pop(entry.entry_id, None)
        if not hass.data[DOMAIN]:
            hass.data.pop(DOMAIN, None)

    return unload_ok
