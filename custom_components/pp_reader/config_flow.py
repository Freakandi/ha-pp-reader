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

from .const import CONF_DB_PATH, CONF_FILE_PATH, DOMAIN
from .data.reader import parse_data_portfolio

_LOGGER = logging.getLogger(__name__)

DEFAULT_DB_DIR = "/config/pp_reader_data"


class PPReaderConfigFlowContext(ConfigFlowContext):
    """Custom context type for the pp_reader config flow."""

    file_path: str
    db_use_default: bool


class PortfolioConfigFlow(ConfigFlow, domain=DOMAIN):
    """Config flow handler for the pp_reader Home Assistant custom component."""

    VERSION = 1
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
            file_path = user_input[CONF_FILE_PATH]
            db_use_default = user_input.get("db_use_default", True)

            if not Path(file_path).is_file():
                errors["base"] = "file_not_found"
            else:
                try:
                    parsed = await self.hass.async_add_executor_job(
                        parse_data_portfolio, file_path
                    )

                    if parsed is None:
                        errors["base"] = "parse_failed"
                    else:
                        self.context.update(
                            {
                                "file_path": file_path,
                                "db_use_default": db_use_default,
                            }
                        )

                        if db_use_default:
                            portfolio_stem = Path(file_path).stem
                            db_path = Path(DEFAULT_DB_DIR) / f"{portfolio_stem}.db"

                            return self.async_create_entry(
                                title=Path(file_path).name,
                                data={
                                    CONF_FILE_PATH: file_path,
                                    CONF_DB_PATH: str(db_path),
                                },
                            )
                        return await self.async_step_db_path()
                except Exception:
                    _LOGGER.exception("Unbekannter Fehler")
                    errors["base"] = "unknown"

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
            db_dir = Path(db_custom_path)

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
                vol.Required("db_custom_path"): str,
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
        self._entry = config_entry
        self._logger = logging.getLogger(f"{__name__}.options")

    def _current_interval(self) -> int:
        """Hole aktuell gesetztes Intervall oder Default."""
        try:
            val = int(self._entry.options.get("price_update_interval_seconds", 900))
            if val < 300:
                return 900
            return val
        except Exception:
            return 900

    def _current_debug(self) -> bool:
        """Aktuellen Debug-Flag Wert oder Default liefern."""
        try:
            return bool(self._entry.options.get("enable_price_debug", False))
        except Exception:
            return False

    async def async_step_init(self, user_input: dict | None = None):
        """Initialer Options-Schritt (Intervall + Debug)."""
        errors: dict[str, str] = {}

        if user_input is not None:
            # Intervall-Validierung
            interval = user_input.get("price_update_interval_seconds")
            if interval is None:
                user_input["price_update_interval_seconds"] = 900
                interval = 900
            if not isinstance(interval, int) or interval < 300:
                errors["price_update_interval_seconds"] = "invalid_interval"

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
                ): vol.All(int, vol.Range(min=300)),
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


async def async_get_options_flow(config_entry: ConfigEntry):
    """Entry Point für Home Assistant zum Erstellen des OptionsFlows."""
    return PPReaderOptionsFlowHandler(config_entry)
