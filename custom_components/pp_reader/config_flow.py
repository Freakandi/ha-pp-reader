import os
import logging
import voluptuous as vol
from pathlib import Path
from homeassistant import config_entries
from homeassistant.core import callback
from .const import DOMAIN, CONF_FILE_PATH, CONF_API_TOKEN, CONF_DB_PATH
from .reader import parse_data_portfolio

_LOGGER = logging.getLogger(__name__)

DEFAULT_DB_DIR = "/config/pp_reader_data"

class PortfolioConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        errors = {}

        if user_input is not None:
            file_path = user_input[CONF_FILE_PATH]
            token = user_input[CONF_API_TOKEN]
            db_use_default = user_input.get("db_use_default", True)

            if not os.path.isfile(file_path):
                errors["base"] = "file_not_found"
            else:
                try:
                    parsed = await self.hass.async_add_executor_job(parse_data_portfolio, file_path)

                    if parsed is None:
                        errors["base"] = "parse_failed"
                    else:
                        self.context.update({
                            CONF_FILE_PATH: file_path,
                            CONF_API_TOKEN: token,
                            "db_use_default": db_use_default,
                        })

                        if db_use_default:
                            portfolio_stem = Path(file_path).stem
                            db_path = Path(DEFAULT_DB_DIR) / f"{portfolio_stem}.db"

                            return self.async_create_entry(
                                title=os.path.basename(file_path),
                                data={
                                    CONF_FILE_PATH: file_path,
                                    CONF_API_TOKEN: token,
                                    CONF_DB_PATH: str(db_path)
                                }
                            )
                        else:
                            return await self.async_step_db_path()
                except Exception as e:
                    _LOGGER.exception("Unbekannter Fehler: %s", e)
                    errors["base"] = "unknown"

        data_schema = vol.Schema({
            vol.Required(CONF_FILE_PATH): str,
            vol.Required(CONF_API_TOKEN): str,
            vol.Required("db_use_default", default=True): bool,
        })

        return self.async_show_form(
            step_id="user",
            data_schema=data_schema,
            errors=errors
        )

    async def async_step_db_path(self, user_input=None):
        errors = {}

        if user_input is not None:
            db_custom_path = user_input.get("db_custom_path", "").strip()
            db_dir = Path(db_custom_path)

            if not db_dir.exists() or not db_dir.is_dir():
                errors["base"] = "invalid_custom_db_path"
            else:
                portfolio_stem = Path(self.context[CONF_FILE_PATH]).stem
                db_path = db_dir / f"{portfolio_stem}.db"

                return self.async_create_entry(
                    title=os.path.basename(self.context[CONF_FILE_PATH]),
                    data={
                        CONF_FILE_PATH: self.context[CONF_FILE_PATH],
                        CONF_API_TOKEN: self.context[CONF_API_TOKEN],
                        CONF_DB_PATH: str(db_path)
                    }
                )

        data_schema = vol.Schema({
            vol.Required("db_custom_path"): str,
        })

        return self.async_show_form(
            step_id="db_path",
            data_schema=data_schema,
            errors=errors
        )
