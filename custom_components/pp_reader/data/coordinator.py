"""
Define the PPReaderCoordinator class.

Manage data updates from a portfolio file and synchronize it with an SQLite database.

It includes functionality to:
- Detect changes in the portfolio file.
- Parse and synchronize portfolio data with the database.
- Load and calculate account balances, portfolio values, and transactions.
"""

import logging
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from pp_reader.logic.accounting import calculate_account_balance
from pp_reader.logic.portfolio import calculate_portfolio_value, calculate_purchase_sum

from .db_access import get_accounts, get_portfolios, get_transactions
from .reader import parse_data_portfolio
from .sync_from_pclient import sync_from_pclient

_LOGGER = logging.getLogger(__name__)


class PPReaderCoordinator(DataUpdateCoordinator):
    """
    A coordinator for data updates from a file, synching to an SQLite database.

    This class handles:
    - Detecting changes in the portfolio file.
    - Parsing and synchronizing portfolio data with the database.
    - Loading and calculating account balances, portfolio values,
      and transactions.
    """

    def __init__(
        self, hass: HomeAssistant, *, db_path: Path, file_path: Path, entry_id: str
    ) -> None:
        """
        Initialisiere den Coordinator.

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

    async def _async_update_data(self) -> dict:
        """Daten aus der SQLite-Datenbank laden und aktualisieren."""
        try:
            # Prüfe den letzten Änderungszeitstempel der Portfolio-Datei
            last_update = self.file_path.stat().st_mtime
            last_update_truncated = datetime.fromtimestamp(last_update).replace(  # noqa: DTZ006
                second=0, microsecond=0
            )
            # _LOGGER.debug(
            #     "📂 Letzte Änderung der Portfolio-Datei: %s",  # noqa: ERA001
            #     last_update_truncated,
            # )  # noqa: ERA001, RUF100

            # Vergleiche das aktuelle Änderungsdatum mit dem gespeicherten Wert
            # in der DB
            def get_last_db_update() -> datetime | None:
                conn = sqlite3.connect(str(self.db_path))
                try:
                    cur = conn.cursor()
                    cur.execute(
                        "SELECT date FROM metadata WHERE key = 'last_file_update'"
                    )
                    result = cur.fetchone()
                    # Überprüfen, ob result[0] ein gültiger String ist
                    if result and result[0]:
                        return datetime.fromisoformat(result[0])
                    return None
                finally:
                    conn.close()

            last_db_update = await self.hass.async_add_executor_job(get_last_db_update)
            # _LOGGER.debug(
            #     "📂 Letzter gespeicherter Zeitstempel in der DB: %s",  # noqa: ERA001
            #     last_db_update,  # noqa: ERA001
            # )  # noqa: ERA001, RUF100

            # Synchronisiere nur, wenn der Zeitstempel sich geändert hat
            if not last_db_update or last_update_truncated > last_db_update:
                _LOGGER.info("Dateiänderung erkannt, starte Datenaktualisierung...")

                # Portfolio-Datei laden und in DB synchronisieren
                data = await self.hass.async_add_executor_job(
                    parse_data_portfolio, str(self.file_path)
                )
                if not data:
                    msg = "Portfolio-Daten konnten nicht geladen werden"
                    raise UpdateFailed(msg)  # noqa: TRY301

                try:
                    _LOGGER.info("📥 Synchronisiere Daten mit SQLite DB...")

                    # DB-Synchronisation in einem eigenen Executor-Job
                    def sync_data() -> None:
                        conn = sqlite3.connect(str(self.db_path))
                        try:
                            # _LOGGER.debug(
                            #     "Rufe sync_from_pclient auf mit
                            #     entry_id: %s", self.entry_id,
                            # )  # noqa: ERA001, RUF100
                            sync_from_pclient(
                                data,
                                conn,
                                self.hass,
                                self.entry_id,
                                last_update_truncated.isoformat(),
                                self.db_path,
                            )
                        finally:
                            conn.close()

                    await self.hass.async_add_executor_job(sync_data)

                except Exception as e:
                    msg = "DB-Synchronisation fehlgeschlagen"
                    raise UpdateFailed(msg) from e

                # Aktualisiere den internen Zeitstempel
                self.last_file_update = last_update_truncated
                _LOGGER.info("Daten erfolgreich aktualisiert.")

            # Lade Konten, Depots und Transaktionen
            # (bestehende Funktionalität bleibt unverändert)
            accounts = await self.hass.async_add_executor_job(
                get_accounts, self.db_path
            )

            portfolios = await self.hass.async_add_executor_job(
                get_portfolios, self.db_path
            )

            transactions = await self.hass.async_add_executor_job(
                get_transactions, self.db_path
            )

            # Berechne Kontostände
            account_balances = {
                account.uuid: calculate_account_balance(account.uuid, transactions)
                for account in accounts
            }

            # Berechne Depotwerte und Kaufsummen
            portfolio_data = {}
            for portfolio in portfolios:
                reference_date = datetime.now() # noqa: DTZ005
                value, count = await calculate_portfolio_value(
                    portfolio.uuid, reference_date, self.db_path
                )
                purchase_sum = await calculate_purchase_sum(
                    portfolio.uuid, self.db_path
                )
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

            return self.data  # noqa: TRY300

        except Exception as e:
            _LOGGER.exception("Fehler beim Laden der Daten")
            msg = f"Update fehlgeschlagen: {e}"
            raise UpdateFailed(msg) from e
