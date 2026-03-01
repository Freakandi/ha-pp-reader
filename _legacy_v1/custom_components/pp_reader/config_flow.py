"""
Config flow for the pp_reader Home Assistant custom component.

Handles user configuration steps for setting up portfolio file and database path.
"""

import logging
from pathlib import Path
from typing import Any

import voluptuous as vol
from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowContext,
    ConfigFlowResult,
    OptionsFlow,  # NEU: OptionsFlow import
)

from .const import (
    CONF_DB_PATH,
    CONF_FILE_PATH,
    CONF_FX_UPDATE_INTERVAL_SECONDS,
    CONFIG_ENTRY_VERSION,
    DEFAULT_DB_SUBDIR,
    DEFAULT_FX_UPDATE_INTERVAL_SECONDS,
    DOMAIN,
    MIN_FX_UPDATE_INTERVAL_SECONDS,
)
from .services import (
    PortfolioParseError,
    PortfolioValidationError,
    parser_pipeline,
)
from .util.paths import default_database_path, resolve_storage_path

_LOGGER = logging.getLogger(__name__)

DEFAULT_OPTIONS_PRICE_UPDATE_INTERVAL = 900
MIN_OPTIONS_PRICE_UPDATE_INTERVAL = 300


class _ValidationWriter:
    """No-op writer used to validate portfolio uploads."""

    def write_accounts(self, _accounts: list[Any]) -> None:
        return None

    def write_portfolios(self, _portfolios: list[Any]) -> None:
        return None

    def write_securities(self, _securities: list[Any]) -> None:
        return None

    def write_transactions(self, _transactions: list[Any]) -> None:
        return None


_VALIDATION_WRITER = _ValidationWriter()


class PPReaderConfigFlowContext(ConfigFlowContext):
    """Custom context type for the pp_reader config flow."""

    file_path: str
    db_use_default: bool


class PortfolioConfigFlow(ConfigFlow, domain=DOMAIN):
    """Config flow handler for the pp_reader Home Assistant custom component."""

    VERSION = CONFIG_ENTRY_VERSION
    context: PPReaderConfigFlowContext  # Use the custom context type

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """
        Handle the user step of the configuration flow.

        Parameters
        ----------
        user_input : dict, optional
            The user input provided during the configuration step.

        Returns
        -------
        ConfigFlowResult
            The result of the configuration flow step.

        """
        errors = {}

        if user_input is not None:
            file_path_input = user_input[CONF_FILE_PATH]
            db_use_default = user_input.get("db_use_default", True)

            resolved_file_path: Path | None = None
            try:
                resolved_file_path = resolve_storage_path(self.hass, file_path_input)
            except ValueError:
                errors["base"] = "file_not_found"
            else:
                if not resolved_file_path.is_file():
                    errors["base"] = "file_not_found"

            if not errors and resolved_file_path is not None:
                try:
                    await parser_pipeline.async_parse_portfolio(
                        hass=self.hass,
                        path=str(resolved_file_path),
                        writer=_VALIDATION_WRITER,
                        fire_progress=False,
                    )
                except (PortfolioParseError, PortfolioValidationError) as err:
                    _LOGGER.warning(
                        "Portfolio-Validierung fehlgeschlagen: %s",
                        err,
                    )
                    errors["base"] = "parse_failed"
                except Exception:
                    _LOGGER.exception("Unbekannter Fehler beim Parserlauf")
                    errors["base"] = "unknown"
                else:
                    self.context.update(
                        {
                            "file_path": str(resolved_file_path),
                            "db_use_default": db_use_default,
                        }
                    )

                    if db_use_default:
                        portfolio_stem = resolved_file_path.stem
                        db_path = default_database_path(self.hass, portfolio_stem)

                        return self.async_create_entry(
                            title=resolved_file_path.name,
                            data={
                                CONF_FILE_PATH: str(resolved_file_path),
                                CONF_DB_PATH: str(db_path),
                            },
                        )
                    return await self.async_step_db_path()

        data_schema = vol.Schema(
            {
                vol.Required(CONF_FILE_PATH): str,
                vol.Required("db_use_default", default=True): bool,
            }
        )

        return self.async_show_form(
            step_id="user", data_schema=data_schema, errors=errors
        )

    async def async_step_db_path(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """
        Handle the database path step of the configuration flow.

        Parameters
        ----------
        user_input : dict, optional
            The user input provided during the configuration step.

        Returns
        -------
        ConfigFlowResult
            The result of the configuration flow step.

        """
        errors = {}

        if user_input is not None:
            db_custom_path = user_input.get("db_custom_path", "").strip()

            if not db_custom_path:
                errors["base"] = "invalid_custom_db_path"
            else:
                try:
                    db_dir = resolve_storage_path(self.hass, db_custom_path)
                except ValueError:
                    errors["base"] = "invalid_custom_db_path"
                else:
                    if not db_dir.exists() or not db_dir.is_dir():
                        errors["base"] = "invalid_custom_db_path"
                    else:
                        portfolio_stem = Path(self.context["file_path"]).stem
                        db_path = db_dir / f"{portfolio_stem}.db"

                        return self.async_create_entry(
                            title=Path(self.context["file_path"]).name,
                            data={
                                CONF_FILE_PATH: self.context["file_path"],
                                CONF_DB_PATH: str(db_path),
                            },
                        )

        data_schema = vol.Schema(
            {
                vol.Required(
                    "db_custom_path", default=self.hass.config.path(DEFAULT_DB_SUBDIR)
                ): str,
            }
        )

        return self.async_show_form(
            step_id="db_path", data_schema=data_schema, errors=errors
        )


# -----------------------------------------------------------------------------
# Options Flow (Grundgerüst)
# -----------------------------------------------------------------------------
class PPReaderOptionsFlowHandler(OptionsFlow):
    """
    OptionsFlow für pp_reader (Intervall- & Debug-Option).

    Implementiert:
      - price_update_interval_seconds (int, ≥300, default 900)
      - enable_price_debug (bool, default False)

    Noch ausstehend (separate Items):
      - Anwendung der Optionen beim Reload / Logger-Umschaltung
    """

    def __init__(self, config_entry: ConfigEntry) -> None:
        """Store the config entry and set up a logger scoped to the options flow."""
        self._entry = config_entry
        self._logger = logging.getLogger(f"{__name__}.options")

    def _current_interval(self) -> int:
        """Hole aktuell gesetztes Intervall oder Default."""
        try:
            val = int(
                self._entry.options.get(
                    "price_update_interval_seconds",
                    DEFAULT_OPTIONS_PRICE_UPDATE_INTERVAL,
                )
            )
        except (TypeError, ValueError):
            return DEFAULT_OPTIONS_PRICE_UPDATE_INTERVAL
        if val < MIN_OPTIONS_PRICE_UPDATE_INTERVAL:
            return DEFAULT_OPTIONS_PRICE_UPDATE_INTERVAL
        return val

    def _current_debug(self) -> bool:
        """Aktuellen Debug-Flag Wert oder Default liefern."""
        try:
            return bool(self._entry.options.get("enable_price_debug", False))
        except (TypeError, ValueError):
            return False

    def _current_fx_interval(self) -> int:
        """Aktuell gesetztes FX-Intervall oder Default liefern."""
        try:
            val = int(
                self._entry.options.get(
                    CONF_FX_UPDATE_INTERVAL_SECONDS,
                    DEFAULT_FX_UPDATE_INTERVAL_SECONDS,
                )
            )
        except (TypeError, ValueError):
            return DEFAULT_FX_UPDATE_INTERVAL_SECONDS
        if val < MIN_FX_UPDATE_INTERVAL_SECONDS:
            return DEFAULT_FX_UPDATE_INTERVAL_SECONDS
        return val

    async def async_step_init(self, user_input: dict | None = None) -> ConfigFlowResult:
        """Initialer Options-Schritt (Intervall + Debug)."""
        errors: dict[str, str] = {}

        if user_input is not None:
            # Intervall-Validierung
            interval = user_input.get("price_update_interval_seconds")
            if interval is None:
                user_input["price_update_interval_seconds"] = (
                    DEFAULT_OPTIONS_PRICE_UPDATE_INTERVAL
                )
                interval = DEFAULT_OPTIONS_PRICE_UPDATE_INTERVAL
            if (
                not isinstance(interval, int)
                or interval < MIN_OPTIONS_PRICE_UPDATE_INTERVAL
            ):
                errors["price_update_interval_seconds"] = "invalid_interval"

            fx_interval = user_input.get(CONF_FX_UPDATE_INTERVAL_SECONDS)
            if fx_interval is None:
                user_input[CONF_FX_UPDATE_INTERVAL_SECONDS] = (
                    DEFAULT_FX_UPDATE_INTERVAL_SECONDS
                )
                fx_interval = DEFAULT_FX_UPDATE_INTERVAL_SECONDS
            if (
                not isinstance(fx_interval, int)
                or fx_interval < MIN_FX_UPDATE_INTERVAL_SECONDS
            ):
                errors[CONF_FX_UPDATE_INTERVAL_SECONDS] = "invalid_interval"

            # Debug Flag defensiv normieren
            user_input["enable_price_debug"] = bool(
                user_input.get("enable_price_debug", False)
            )

            if not errors:
                self._logger.debug("OptionsFlow: Speichere Optionen %s", user_input)
                return self.async_create_entry(title="", data=user_input)

        data_schema = vol.Schema(
            {
                vol.Optional(
                    "price_update_interval_seconds",
                    default=self._current_interval(),
                ): vol.All(int, vol.Range(min=MIN_OPTIONS_PRICE_UPDATE_INTERVAL)),
                vol.Optional(
                    CONF_FX_UPDATE_INTERVAL_SECONDS,
                    default=self._current_fx_interval(),
                ): vol.All(int, vol.Range(min=MIN_FX_UPDATE_INTERVAL_SECONDS)),
                vol.Optional(
                    "enable_price_debug",
                    default=self._current_debug(),
                ): bool,
            }
        )
        return self.async_show_form(
            step_id="init",
            data_schema=data_schema,
            errors=errors,
        )


async def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
    """Entry Point für Home Assistant zum Erstellen des OptionsFlows."""
    return PPReaderOptionsFlowHandler(config_entry)
