import logging
from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from .const import DOMAIN, CONF_FILE_PATH
from .reader import parse_data_portfolio
from .logic.accounting import calculate_account_balance


_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities
) -> None:
    """Set up one sensor per active account from the .portfolio file."""
    file_path = entry.data.get(CONF_FILE_PATH)
    client = await hass.async_add_executor_job(parse_data_portfolio, file_path)

    if not client:
        _LOGGER.error("❌ Parsing fehlgeschlagen, keine Sensoren erstellt.")
        return

    # Erzeuge Sensoren für alle aktiven Konten
    sensors = []
    for account in client.accounts:
        if not account.isRetired:
            saldo = calculate_account_balance(account.uuid, client.transactions)
            sensors.append(PortfolioAccountBalanceSensor(account, saldo))

    async_add_entities(sensors)

class PortfolioAccountBalanceSensor(SensorEntity):
    """Sensor zeigt den Saldo eines einzelnen Kontos."""

    def __init__(self, account, saldo):
        self._account = account
        self._attr_name = f"Konto: {account.name}"
        self._attr_unique_id = f"pp_account_{account.uuid}"
        self._attr_icon = "mdi:bank"
        self._attr_native_unit_of_measurement = "€"
        self._attr_native_value = round(saldo, 2)

    @property
    def extra_state_attributes(self):
        return {
            "uuid": self._account.uuid,
            "currency": self._account.currencyCode,
        }

    async def async_update(self):
        """Wird derzeit nicht zyklisch aktualisiert."""
        pass  # HA ruft setup nur bei Neustart / Reload auf

