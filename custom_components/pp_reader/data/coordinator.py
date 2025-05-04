import logging
import sqlite3
from datetime import timedelta, datetime
from pathlib import Path
from homeassistant.config_entries import ConfigEntry, ConfigEntryNotReady
from homeassistant.core import HomeAssistant  # Importiere HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .db_access import get_accounts, get_portfolios, get_transactions
from ..logic.accounting import calculate_account_balance
from ..logic.portfolio import calculate_portfolio_value, calculate_purchase_sum
from .reader import parse_data_portfolio
from .sync_from_pclient import sync_from_pclient

_LOGGER = logging.getLogger(__name__)


class PPReaderCoordinator(DataUpdateCoordinator):
    def __init__(self, hass: HomeAssistant, *, db_path: Path, file_path: Path):
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
            update_interval=timedelta(minutes=5),  # Aktualisierung alle 5 Minuten
        )
        self.db_path = db_path
        self.file_path = file_path
        self.hass = hass  # Speichere die HomeAssistant-Instanz
        self.data = {
            "accounts": [],
            "portfolios": [],
            "transactions": [],
            "last_update": None,  # Neues Attribut für den letzten Änderungszeitstempel
        }
        self.last_file_update = None  # Initialisierung des Attributs

    async def _async_update_data(self):
        """Daten aus der SQLite-Datenbank laden und aktualisieren."""
        try:
            # Prüfe den letzten Änderungszeitstempel der Portfolio-Datei
            last_update = self.file_path.stat().st_mtime
            _LOGGER.debug("📂 Letzte Änderung der Portfolio-Datei: %s", datetime.fromtimestamp(last_update))

            # Vergleiche das aktuelle Änderungsdatum mit dem gespeicherten Wert
            if self.last_file_update is None or last_update > self.last_file_update:
                _LOGGER.info("Dateiänderung erkannt, starte Datenaktualisierung...")

                # Portfolio-Datei laden und in DB synchronisieren
                data = await self.hass.async_add_executor_job(parse_data_portfolio, str(self.file_path))
                if not data:
                    raise UpdateFailed("Portfolio-Daten konnten nicht geladen werden")
            
                try:
                    _LOGGER.info("📥 Synchronisiere Daten mit SQLite DB...")
            
                    # DB-Synchronisation in einem eigenen Executor-Job
                    def sync_data():
                        conn = sqlite3.connect(str(self.db_path))
                        try:
                            sync_from_pclient(data, conn)
                        finally:
                            conn.close()
                    
                    await self.hass.async_add_executor_job(sync_data)
            
                except Exception as e:
                    _LOGGER.exception("❌ Fehler bei der DB-Synchronisation: %s", str(e))
                    raise UpdateFailed("DB-Synchronisation fehlgeschlagen")

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
                            "is_retired": account.is_retired  # Hinzufügen des is_retired-Attributs
                        }
                        for account in accounts
                    },
                    "portfolios": portfolio_data,
                    "transactions": transactions,
                    "last_update": datetime.fromtimestamp(last_update).isoformat(),  # Speichere den Zeitstempel als ISO-String
                }

                # Aktualisiere das gespeicherte Änderungsdatum
                self.last_file_update = last_update
                _LOGGER.info("Daten erfolgreich aktualisiert.")
            else:
                _LOGGER.debug("Keine Dateiänderung erkannt, überspringe Datenaktualisierung.")

            return self.data

        except Exception as e:
            _LOGGER.error("Fehler beim Laden der Daten: %s", e)
            raise UpdateFailed(f"Update fehlgeschlagen: {e}")