# purchase_sensors.py
import os
import logging
from datetime import datetime
from homeassistant.components.sensor import SensorEntity
from homeassistant.util import slugify

from custom_components.pp_reader.reader import parse_data_portfolio
from custom_components.pp_reader.logic.portfolio import calculate_purchase_sum

_LOGGER = logging.getLogger(__name__)


class PortfolioPurchaseSensor(SensorEntity):
    """Sensor für die Kaufsumme eines Depots (Summe der Kaufpreise aktiver Positionen)."""

    should_poll = True

    def __init__(self, hass, portfolio_name, file_path):
        self.hass = hass
        self._portfolio_name = portfolio_name
        self._file_path = file_path
        self._purchase_sum = 0.0
        self._last_mtime = os.path.getmtime(file_path)

        self._attr_name = f"Kaufsumme {portfolio_name}"
        base = os.path.basename(file_path)
        self._attr_unique_id = f"{slugify(base)}_{slugify(portfolio_name)}_kaufsumme"
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:cash"

    @property
    def native_value(self):
        return self._purchase_sum

    async def async_update(self):
        """Aktualisiere die Kaufsumme, wenn Datei verändert wurde oder Kaufsumme noch 0 ist."""
        try:
            current_mtime = os.path.getmtime(self._file_path)
            if current_mtime != self._last_mtime or self._purchase_sum == 0:
                _LOGGER.debug("🔄 Aktualisiere Kaufsumme für: %s", self._portfolio_name)

                data = await self.hass.async_add_executor_job(parse_data_portfolio, self._file_path)
                if not data:
                    _LOGGER.error("❌ Fehler beim Parsen der Portfolio-Datei für %s", self._portfolio_name)
                    return

                securities_by_id = {s.uuid: s for s in data.securities}

                # Kaufsumme neu berechnen
                for portfolio in data.portfolios:
                    if portfolio.name == self._portfolio_name:
                        self._purchase_sum = await calculate_purchase_sum(
                            portfolio,
                            data.transactions,
                            securities_by_id,
                            reference_date=datetime.fromtimestamp(current_mtime)
                        )
                        self._last_mtime = current_mtime
                        _LOGGER.debug("✅ Neue Kaufsumme für %s: %.2f €", self._portfolio_name, self._purchase_sum)
                        break
        except Exception as e:
            _LOGGER.error("❌ Fehler beim Update der Kaufsumme: %s", e)
