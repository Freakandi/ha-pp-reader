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
            holdings = {}
            securities_by_id = {s.uuid: s for s in self.data.securities}

            # 🔥 Aktive Bestände aufbauen
            for tx in self.data.transactions:
                if not tx.HasField("security"):
                    continue
                sid = tx.security
                shares = tx.shares if tx.HasField("shares") else 0
                if tx.type in (0, 2):  # Kauf
                    holdings[sid] = holdings.get(sid, 0) + shares
                elif tx.type in (1, 3):  # Verkauf
                    holdings[sid] = holdings.get(sid, 0) - shares

            # 🔥 Nur Währungen aktiver Bestände berücksichtigen
            for sec in self.data.securities:
                sid = sec.uuid
                if sid in holdings and holdings[sid] > 0:
                    if sec.HasField("currencyCode") and sec.currencyCode != "EUR":
                        currencies.add(sec.currencyCode)

            # 🔥 Kaufdaten nur für aktive Bestände sammeln
            for tx in self.data.transactions:
                if tx.type in (0, 2) and tx.HasField("security"):
                    sid = tx.security
                    if sid in holdings and holdings[sid] > 0:
                        kaufdatum = datetime.fromtimestamp(tx.date.seconds)
                        kaufdaten.append(kaufdatum)

            # 🔥 Wechselkurse laden, aber Fehler dabei tolerieren
            try:
                await ensure_exchange_rates_for_dates(kaufdaten, currencies)
                await get_exchange_rates(self.data, datetime.now())
            except Exception as fx_error:
                _LOGGER.warning("⚠️ Wechselkurse konnten nicht vollständig geladen werden: %s", fx_error)

            _LOGGER.debug("PPReaderCoordinator: Daten und Wechselkurse erfolgreich geladen.")
            return self.data

        except Exception as err:
            raise UpdateFailed(f"Fehler beim Aktualisieren der Portfolio-Daten: {err}")
