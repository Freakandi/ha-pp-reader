"""Konfigurations-Flow für Portfolio Performance Reader."""
from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResult
from homeassistant.const import CONF_PATH
import voluptuous as vol

from .const import DOMAIN


class PPReaderConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Konfigurations-Flow für die Integration."""

    VERSION = 1

    async def async_step_user(self, user_input=None) -> FlowResult:
        """Erster Schritt des Flows – Abfrage des Datei-Pfads."""
        if user_input is not None:
            return self.async_create_entry(
                title="Portfolio Datei",
                data={CONF_PATH: user_input[CONF_PATH]},
            )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_PATH, default="/config/portfolio/S-Depot.portfolio"): str,
                }
            ),
        )
