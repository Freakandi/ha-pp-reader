import logging
from datetime import datetime
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .currencies.fx import ensure_exchange_rates_for_dates, get_exchange_rates

_LOGGER = logging.getLogger(__name__)

class PPReaderCoordinator(DataUpdateCoordinator):
    def __init__(self, hass, client, data):
        super().__init__(
            hass,
            _LOGGER,
            name="PPReader Data Coordinator",
            update_interval=None,  # Nur manuell beim Start
        )
        self.client = client
        self.data = data  # Eingeladene Portfolio-Datei

    async def _async_update_data(self):
        try:
            kaufdaten = []
            currencies = set()
            securities_by_id = {s.id: s for s in self.data.securities}

            # 🔥 Transaktionen analysieren
            for tx in self.data.transactions:
                if tx.type in (0, 2) and tx.HasField("security"):
                    kaufdatum = datetime.fromtimestamp(tx.date.seconds)
                    kaufdaten.append(kaufdatum)

                    sec = securities_by_id.get(tx.security)
                    if sec and sec.HasField("currencyCode") and sec.currencyCode != "EUR":
                        currencies.add(sec.currencyCode)

            # 🔥 Depotwährungen sammeln
            for sec in self.data.securities:
                if sec.HasField("currencyCode") and sec.currencyCode != "EUR":
                    currencies.add(sec.currencyCode)

            # 🔥 Wechselkurse laden
            await ensure_exchange_rates_for_dates(kaufdaten, currencies)
            await get_exchange_rates(self.data, datetime.now())

            _LOGGER.debug("PPReaderCoordinator: Daten und Wechselkurse erfolgreich geladen.")
            return self.data

        except Exception as err:
            raise UpdateFailed(f"Fehler beim Aktualisieren der Portfolio-Daten: {err}")
