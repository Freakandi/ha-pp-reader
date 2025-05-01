import logging
from datetime import datetime, timedelta
from pathlib import Path
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .currencies.fx import ensure_exchange_rates_for_dates, get_exchange_rates

_LOGGER = logging.getLogger(__name__)


class PPReaderCoordinator(DataUpdateCoordinator):
    def __init__(self, hass, *, db_path: Path):
        super().__init__(
            hass,
            _LOGGER,
            name="pp_reader",
            update_interval=timedelta(minutes=5),
        )
        self.db_path = db_path

    async def _async_update_data(self):
        """Daten aktualisieren."""
        # Hier könnten wir z.B. prüfen ob sich die .portfolio Datei geändert hat
        return None
