import logging
import sqlite3
from datetime import timedelta, datetime
from pathlib import Path
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .db_access import get_accounts, get_portfolios, get_transactions
from .sync_from_pclient import sync_from_pclient
from ..logic.accounting import calculate_account_balance
from ..logic.portfolio import calculate_portfolio_value, calculate_purchase_sum
from ..data.reader import parse_data_portfolio

_LOGGER = logging.getLogger(__name__)


class PPReaderCoordinator(DataUpdateCoordinator):
    def __init__(self, hass, *, db_path: Path, file_path: Path):
        """Initialisiere den Coordinator.

        Args:
            hass: HomeAssistant Instanz
            db_path: Pfad zur SQLite-Datenbank
            file_path: Pfad zur Portfolio-Datei
        """
        super().__init__(
            hass,
            _LOGGER,
            name="pp_reader",
            update_interval=timedelta(minutes=1),
        )
        self.db_path = db_path
        self.file_path = file_path
        self.data = {
            "accounts": [],
            "portfolios": [],
            "transactions": [],
            "last_update": None,  # Neues Attribut für den letzten Änderungszeitstempel
        }
        self._last_update = None  # Attribut für den letzten Änderungszeitstempel
        self._update_interval = timedelta(minutes=1)
        self._last_file_update = None  # Initialisiere das Attribut für den letzten Änderungszeitstempel
        
    async def _async_update_data(self):
        """Daten aus der SQLite-Datenbank laden und aktualisieren."""
        _LOGGER.debug("🔄 _async_update_data wurde aufgerufen.")
        try:
            # Prüfe den letzten Änderungszeitstempel der Portfolio-Datei
            last_update = self.file_path.stat().st_mtime
            _LOGGER.debug("📂 Letzte Änderung der Portfolio-Datei (st_mtime): %s", datetime.fromtimestamp(last_update))
            _LOGGER.debug("📂 Letzter bekannter Änderungszeitstempel (_last_file_update): %s",
                          datetime.fromtimestamp(self._last_file_update) if self._last_file_update else "None")

            # Wenn sich die Datei geändert hat, synchronisiere die Datenbank
            if self._last_file_update is None or int(last_update) != int(self._last_file_update):
                _LOGGER.info("📂 Portfolio-Datei wurde geändert. Starte Synchronisation...")
                self._last_file_update = last_update

                # Portfolio-Datei in ein PClient-Objekt laden
                client = await self.hass.async_add_executor_job(parse_data_portfolio, str(self.file_path))
                if not client:
                    _LOGGER.error("❌ Portfolio-Daten konnten nicht geladen werden.")
                    raise UpdateFailed("Portfolio-Daten konnten nicht geladen werden")
                else:
                    _LOGGER.info("✅ Portfolio-Daten erfolgreich geladen.")

                # DB-Synchronisation in einem eigenen Executor-Job
                def sync_data():
                    conn = sqlite3.connect(str(self.db_path))
                    try:
                        sync_from_pclient(client, conn)
                    finally:
                        conn.close()

                await self.hass.async_add_executor_job(sync_data)
            else:
                _LOGGER.debug("📂 Keine Änderung der Portfolio-Datei erkannt. Synchronisation wird übersprungen.")

            # Lade Konten
            accounts = await self.hass.async_add_executor_job(get_accounts, self.db_path)
            _LOGGER.debug("🔄 Konten geladen: %d", len(accounts))

            # Lade Depots
            portfolios = await self.hass.async_add_executor_job(get_portfolios, self.db_path)
            _LOGGER.debug("🔄 Depots geladen: %d", len(portfolios))

            # Lade Transaktionen
            transactions = await self.hass.async_add_executor_job(get_transactions, self.db_path)
            _LOGGER.debug("🔄 Transaktionen geladen: %d", len(transactions))

            # Berechne Kontostände
            account_balances = {
                account.uuid: calculate_account_balance(account.uuid, transactions)
                for account in accounts
            }

            # Berechne Depotwerte und Kaufsummen
            portfolio_data = {}
            for portfolio in portfolios:
                reference_date = datetime.now()  # Aktuelles Datum als Referenz
                value, count = await calculate_portfolio_value(
                    portfolio.uuid, reference_date, self.db_path
                )
                purchase_sum = await calculate_purchase_sum(portfolio.uuid, self.db_path)
                portfolio_data[portfolio.uuid] = {
                    "name": portfolio.name,
                    "value": value,
                    "count": count,
                    "purchase_sum": purchase_sum,
                }
                _LOGGER.debug(
                    "💰 Depot %s: Wert %.2f € (%d Positionen), Kaufsumme %.2f €",
                    portfolio.name,
                    value,
                    count,
                    purchase_sum,
                )
                            
            # Speichere die Daten
            self.data = {
                "accounts": {
                    account.uuid: {
                        "name": account.name,
                        "balance": account_balances[account.uuid],
                        "is_retired": account.is_retired
                    }
                    for account in accounts
                },
                "portfolios": portfolio_data,
                "transactions": transactions,
                "last_update": datetime.fromtimestamp(last_update).isoformat(),  # Speichere den Zeitstempel als ISO-String
            }
            _LOGGER.debug("📂 Aktualisierte Datenstruktur mit last_update: %s", self.data["last_update"])

            return self.data

        except Exception as e:
            _LOGGER.error("Fehler beim Laden der Daten: %s", e)
            raise UpdateFailed(f"Update fehlgeschlagen: {e}")