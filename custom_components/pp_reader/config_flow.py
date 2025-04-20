import os
import logging

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import DOMAIN, CONF_FILE_PATH
from .reader import parse_data_portfolio

_LOGGER = logging.getLogger(__name__)


class PortfolioConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Portfolio Performance."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        errors = {}

        if user_input is not None:
            file_path = user_input[CONF_FILE_PATH]

            if not os.path.exists(file_path):
                errors["base"] = "file_not_found"
            else:
                parsed = await self.hass.async_add_executor_job(parse_data_portfolio, file_path)
                if parsed is None:
                    errors["base"] = "parse_failed"
                else:
                    # Verhindere Duplikate
                    await self.async_set_unique_id(file_path)
                    self._abort_if_unique_id_configured()

                    return self.async_create_entry(
                        title=os.path.basename(file_path),
                        data={CONF_FILE_PATH: file_path}
                    )

        schema = vol.Schema({
            vol.Required(CONF_FILE_PATH): str
        })

        return self.async_show_form(
            step_id="user",
            data_schema=schema,
            errors=errors
        )

