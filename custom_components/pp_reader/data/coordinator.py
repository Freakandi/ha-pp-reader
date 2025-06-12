import logging
import sqlite3
from datetime import timedelta, datetime
from pathlib import Path
from homeassistant.core import HomeAssistant  # Importiere HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .db_access import get_accounts, get_portfolios, get_transactions
from ..logic.accounting import calculate_account_balance
from ..logic.portfolio import calculate_portfolio_value, calculate_purchase_sum
from .reader import parse_data_portfolio
from .sync_from_pclient import sync_from_pclient

_LOGGER = logging.getLogger(__name__)


class PPReaderCoordinator(DataUpdateCoordinator):
    def __init__(self, hass: HomeAssistant, *, db_path: Path, file_path: Path, entry_id: str):
        """Initialisiere den Coordinator.

        Args:
            hass: HomeAssistant Instanz
            db_path: Pfad zur SQLite-Datenbank
            file_path: Pfad zur Portfolio-Datei
            entry_id: Die Entry-ID des Frontend-Panels für websocket-subscription
        """
        super().__init__(
            hass,
            _LOGGER,
            name="pp_reader",
            update_interval=timedelta(minutes=1),
        )
        self.db_path = db_path
        self.file_path = file_path
        self.entry_id = entry_id
        self.hass = hass
        self.data = {
            "accounts": [],
            "portfolios": [],
            "transactions": [],
            "last_update": None,
        }
        self.last_file_update = None  # Initialisierung des Attributs

    async def _async_update_data(self):
        """Daten aus der SQLite-Datenbank laden und aktualisieren."""
        try:
            # Prüfe den letzten Änderungszeitstempel der Portfolio-Datei
            last_update = self.file_path.stat().st_mtime
            last_update_truncated = datetime.fromtimestamp(last_update).replace(second=0, microsecond=0)
            # _LOGGER.debug("📂 Letzte Änderung der Portfolio-Datei: %s", last_update_truncated)

            # Vergleiche das aktuelle Änderungsdatum mit dem gespeicherten Wert in der DB
            def get_last_db_update():
                conn = sqlite3.connect(str(self.db_path))
                try:
                    cur = conn.cursor()
                    cur.execute("SELECT date FROM metadata WHERE key = 'last_file_update'")
                    result = cur.fetchone()
                    # Überprüfen, ob result[0] ein gültiger String ist
                    if result and result[0]:
                        return datetime.fromisoformat(result[0])
                    return None
                finally:
                    conn.close()

            last_db_update = await self.hass.async_add_executor_job(get_last_db_update)
            # _LOGGER.debug("📂 Letzter gespeicherter Zeitstempel in der DB: %s", last_db_update)

            # Synchronisiere nur, wenn der Zeitstempel sich geändert hat
            if not last_db_update or last_update_truncated > last_db_update:
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
                            # _LOGGER.debug("Rufe sync_from_pclient auf mit entry_id: %s", self.entry_id)
                            sync_from_pclient(data, conn, self.hass, self.entry_id, last_update_truncated.isoformat(), self.db_path)
                        finally:
                            conn.close()

                    await self.hass.async_add_executor_job(sync_data)

                except Exception as e:
                    _LOGGER.exception("❌ Fehler bei der DB-Synchronisation: %s", str(e))
                    raise UpdateFailed("DB-Synchronisation fehlgeschlagen")

                # Aktualisiere den internen Zeitstempel
                self.last_file_update = last_update_truncated
                _LOGGER.info("Daten erfolgreich aktualisiert.")

            # Lade Konten, Depots und Transaktionen (bestehende Funktionalität bleibt unverändert)
            accounts = await self.hass.async_add_executor_job(get_accounts, self.db_path)

            portfolios = await self.hass.async_add_executor_job(get_portfolios, self.db_path)

            transactions = await self.hass.async_add_executor_job(get_transactions, self.db_path)

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
                "last_update": last_update_truncated.isoformat(),
            }

            return self.data

        except Exception as e:
            _LOGGER.error("Fehler beim Laden der Daten: %s", e)
            raise UpdateFailed(f"Update fehlgeschlagen: {e}")