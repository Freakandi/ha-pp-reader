import logging
from datetime import timedelta
from pathlib import Path
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .db_access import get_accounts, get_portfolios, get_transactions
from .logic.accounting import calculate_account_balance
from .logic.portfolio import calculate_portfolio_value, calculate_purchase_sum

_LOGGER = logging.getLogger(__name__)


class PPReaderCoordinator(DataUpdateCoordinator):
    def __init__(self, hass, *, db_path: Path):
        """Initialisiere den Coordinator.

        Args:
            hass: HomeAssistant Instanz
            db_path: Pfad zur SQLite-Datenbank
        """
        super().__init__(
            hass,
            _LOGGER,
            name="pp_reader",
            update_interval=timedelta(minutes=5),  # Aktualisierung alle 5 Minuten
        )
        self.db_path = db_path
        self.data = {
            "accounts": [],
            "portfolios": [],
            "transactions": [],
        }

    async def _async_update_data(self):
        """Daten aus der SQLite-Datenbank laden und aktualisieren."""
        try:
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
                value, count = calculate_portfolio_value(portfolio.uuid, transactions)
                purchase_sum = calculate_purchase_sum(portfolio.uuid, transactions)
                portfolio_data[portfolio.uuid] = {
                    "value": value,
                    "count": count,
                    "purchase_sum": purchase_sum,
                }

            # Speichere die Daten
            self.data = {
                "accounts": {account.uuid: {"name": account.name, "balance": account_balances[account.uuid]} for account in accounts},
                "portfolios": portfolio_data,
                "transactions": transactions,
            }

            return self.data

        except Exception as e:
            _LOGGER.error("Fehler beim Laden der Daten: %s", e)
            raise UpdateFailed(f"Update fehlgeschlagen: {e}")