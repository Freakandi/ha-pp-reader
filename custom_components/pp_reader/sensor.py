import logging
import os
import voluptuous as vol
from homeassistant.components.sensor import SensorEntity
from homeassistant.const import CONF_NAME
from homeassistant.helpers.entity import Entity
from homeassistant.helpers.typing import HomeAssistantType, ConfigType
import homeassistant.helpers.config_validation as cv

from .reader import extract_data_portfolio, parse_data_portfolio

_LOGGER = logging.getLogger(__name__)

DEFAULT_NAME = "Portfolio Securities"
CONF_PATH = "file_path"

PLATFORM_SCHEMA = vol.Schema({
    vol.Required(CONF_PATH): cv.string,
    vol.Optional(CONF_NAME, default=DEFAULT_NAME): cv.string,
})


def setup_platform(hass: HomeAssistantType, config: ConfigType, add_entities, discovery_info=None):
    path = config[CONF_PATH]
    name = config.get(CONF_NAME)
    try:
        portfolio_data = parse_data_portfolio(path)
        if portfolio_data is None:
            raise ValueError("Portfolio konnte nicht gelesen werden.")
        entity = PortfolioSecuritiesSensor(name, portfolio_data)
        add_entities([entity], True)
    except Exception as e:
        _LOGGER.error(f"Fehler beim Laden der Portfolio-Datei: {e}")
        return


class PortfolioSecuritiesSensor(SensorEntity):
    def __init__(self, name, client_data):
        self._attr_name = name
        self._client = client_data
        self._attr_native_unit_of_measurement = "Wertpapiere"
        self._attr_icon = "mdi:chart-line"

    def update(self):
        self._attr_native_value = len(self._client.securities)
