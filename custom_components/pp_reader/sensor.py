import logging
from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from .const import DOMAIN, CONF_FILE_PATH
from .reader import parse_data_portfolio

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

def calculate_account_balance(account_uuid, transactions):
    """Berechnet den Kontostand eines Kontos anhand der Transaktionen."""
    saldo = 0

    for tx in transactions:
        # CASH_TRANSFER wird separat behandelt
        if tx.type == 5:  # CASH_TRANSFER
            if tx.account == account_uuid:
                saldo -= tx.amount
            elif tx.otherAccount == account_uuid:
                saldo += tx.amount
            continue

        # Nur Transaktionen, die sich direkt auf dieses Konto beziehen
        if tx.account != account_uuid:
            continue

        # Bestimme Vorzeichen basierend auf Transaktionstyp
        negative_types = {7, 10, 11, 13}  # REMOVAL, INTEREST_CHARGE, TAX, FEE
        positive_types = {6, 8, 9, 12, 14}  # DEPOSIT, DIVIDEND, INTEREST, TAX_REFUND, FEE_REFUND

        sign = 0
        if tx.type in positive_types:
            sign = +1
        elif tx.type in negative_types:
            sign = -1
        else:
            continue  # Unbehandelte Typen ignorieren

        # Summiere alle Units vom Typ GROSS_VALUE
        for unit in tx.units:
            if unit.type == 0:  # GROSS_VALUE
                saldo += sign * unit.amount

    return saldo / 100.0  # Betrag in Euro (statt Cent)

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

