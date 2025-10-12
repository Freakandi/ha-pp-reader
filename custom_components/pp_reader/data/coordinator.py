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
from collections.abc import Iterable, Mapping
from datetime import datetime, timedelta
from importlib import import_module
from pathlib import Path
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from custom_components.pp_reader.logic import accounting as _accounting_module
from custom_components.pp_reader.util import async_run_executor_job
from custom_components.pp_reader.util.currency import cent_to_eur, round_currency

from .db_access import fetch_live_portfolios, get_accounts, get_transactions
from .performance import compose_performance_payload, select_performance_metrics

try:
    from . import reader as _reader_module
except ModuleNotFoundError:  # pragma: no cover - optional dep for tests
    _reader_module = None

_LOGGER = logging.getLogger(__name__)


def _get_last_db_update(db_path: Path) -> datetime | None:
    """Read the last known file timestamp from the metadata table."""
    with sqlite3.connect(str(db_path)) as conn:
        cur = conn.cursor()
        cur.execute("SELECT date FROM metadata WHERE key = 'last_file_update'")
        result = cur.fetchone()
    if result and result[0]:
        return datetime.fromisoformat(result[0])
    return None


def _sync_data_to_db(
    data: Mapping[str, Any],
    hass: HomeAssistant,
    entry_id: str,
    last_update_iso: str,
    db_path: Path,
) -> None:
    """Persist parsed portfolio data to SQLite using the legacy sync helper."""
    try:
        sync_module = import_module(
            "custom_components.pp_reader.data.sync_from_pclient"
        )
    except ModuleNotFoundError as err:  # pragma: no cover - optional dep for tests
        msg = "protobuf runtime is required to synchronize Portfolio Performance data"
        raise RuntimeError(msg) from err

    sync_from_pclient = sync_module.sync_from_pclient

    with sqlite3.connect(str(db_path)) as conn:
        sync_from_pclient(
            data,
            conn,
            hass,
            entry_id,
            last_update_iso,
            db_path,
        )


def _normalize_portfolio_amount(value: Any) -> float:
    """Normalize mixed cent/float values to a rounded EUR float."""

    if value is None:
        return 0.0

    if isinstance(value, float):
        normalized_float = round_currency(value, default=None)
        return normalized_float if normalized_float is not None else 0.0

    cent_value: int | None
    if isinstance(value, int):
        cent_value = value
    else:
        try:
            cent_value = int(value)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            cent_value = None

    if cent_value is not None:
        normalized_cent = cent_to_eur(cent_value, default=None)
        if normalized_cent is not None:
            return normalized_cent

    normalized_generic = round_currency(value, default=None)
    if normalized_generic is not None:
        return normalized_generic

    return 0.0


def _portfolio_contract_entry(
    entry: Mapping[str, Any] | None,
) -> tuple[str, dict[str, Any]] | None:
    """Normalize aggregation rows to the coordinator sensor contract (item 4a)."""
    if not isinstance(entry, Mapping):
        return None

    portfolio_uuid = entry.get("uuid") or entry.get("portfolio_uuid")
    if not portfolio_uuid:
        return None

    current_value_raw = entry.get("current_value")
    if current_value_raw is None:
        current_value_raw = entry.get("value")

    purchase_sum_raw = entry.get("purchase_sum")
    if purchase_sum_raw is None:
        purchase_sum_raw = entry.get("purchaseSum")

    position_count_raw = entry.get("position_count")
    if position_count_raw is None:
        position_count_raw = entry.get("count")
    if position_count_raw is None:
        position_count_raw = 0
    try:
        position_count = int(position_count_raw or 0)
    except (TypeError, ValueError):
        position_count = 0

    current_value = _normalize_portfolio_amount(current_value_raw)
    purchase_sum = _normalize_portfolio_amount(purchase_sum_raw)

    performance_metrics, day_change_metrics = select_performance_metrics(
        current_value=current_value_raw,
        purchase_value=purchase_sum_raw,
        holdings=position_count,
    )

    performance_mapping = entry.get("performance")
    if isinstance(performance_mapping, Mapping):
        performance_payload = compose_performance_payload(
            performance_mapping,
            metrics=performance_metrics,
            day_change=day_change_metrics,
        )
    else:
        performance_payload = compose_performance_payload(
            None,
            metrics=performance_metrics,
            day_change=day_change_metrics,
        )

    try:
        gain_abs = round(float(performance_payload.get("gain_abs")), 2)
    except (TypeError, ValueError):
        gain_abs = round(performance_metrics.gain_abs, 2)

    try:
        gain_pct = round(float(performance_payload.get("gain_pct")), 2)
    except (TypeError, ValueError):
        gain_pct = round(performance_metrics.gain_pct, 2)

    return portfolio_uuid, {
        "name": entry.get("name"),
        "value": current_value,
        "count": position_count,
        "purchase_sum": purchase_sum,
        "gain_abs": gain_abs,
        "gain_pct": gain_pct,
        "performance": performance_payload,
    }


def _coerce_live_portfolios(raw_portfolios: Any) -> list[Any]:
    """Convert the aggregation result into an iterable list."""
    if isinstance(raw_portfolios, dict):
        return list(raw_portfolios.values())
    if isinstance(raw_portfolios, list):
        return raw_portfolios
    if raw_portfolios:
        return list(raw_portfolios)
    return []


def _build_portfolio_data(live_portfolios: Iterable[Any]) -> dict[str, dict[str, Any]]:
    """Create the coordinator contract for portfolio entries."""
    portfolio_data: dict[str, dict[str, Any]] = {}
    for entry in live_portfolios:
        normalized = _portfolio_contract_entry(entry)
        if not normalized:
            continue
        portfolio_uuid, payload = normalized
        portfolio_data[portfolio_uuid] = payload
    return portfolio_data


# NOTE (On-Demand Aggregation Migration):
# The dashboard / WebSocket layer now obtains live portfolio aggregates via the
# on-demand helper (fetch_live_portfolios) to ensure a single source of truth
# that already reflects the latest persisted live prices. This coordinator
# instance remains the authoritative (legacy) data source ONLY for sensor entities.
# DO NOT:
# - Mutate key names or nested shapes in self.data (accounts, portfolios,
#   transactions, last_update).
# - Introduce divergent aggregation logic here; if aggregation changes are
#   required they must be implemented centrally in the shared DB helpers and/or
#   fetch_live_portfolios to avoid drift between sensor and UI values.
# Any refactor touching aggregation should reference this comment and the
# migration checklist in .docs/TODO_updateGoals.md (section 4).
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
            last_update_truncated = self._get_last_file_update()
            last_db_update = await async_run_executor_job(
                self.hass, _get_last_db_update, self.db_path
            )

            if self._should_sync(last_db_update, last_update_truncated):
                await self._sync_portfolio_file(last_update_truncated)

            accounts = await async_run_executor_job(
                self.hass, get_accounts, self.db_path
            )
            transactions = await async_run_executor_job(
                self.hass, get_transactions, self.db_path
            )

            account_balances = self._calculate_account_balances(accounts, transactions)
            live_portfolios = await self._load_live_portfolios()
            portfolio_data = _build_portfolio_data(live_portfolios)

            self.data = {
                "accounts": {
                    account.uuid: {
                        "name": account.name,
                        "balance": account_balances[account.uuid],
                        "is_retired": account.is_retired,
                    }
                    for account in accounts
                },
                "portfolios": portfolio_data,
                "transactions": transactions,
                "last_update": last_update_truncated.isoformat(),
            }

        except Exception as e:
            _LOGGER.exception("Fehler beim Laden der Daten")
            msg = f"Update fehlgeschlagen: {e}"
            raise UpdateFailed(msg) from e

        return self.data

    def _get_last_file_update(self) -> datetime:
        """Truncate the file's last modification timestamp to the minute."""
        last_update = self.file_path.stat().st_mtime
        return datetime.fromtimestamp(last_update).replace(  # noqa: DTZ006
            second=0, microsecond=0
        )

    @staticmethod
    def _should_sync(last_db_update: datetime | None, file_update: datetime) -> bool:
        """Return True when the DB snapshot is older than the file on disk."""
        return not last_db_update or file_update > last_db_update

    async def _sync_portfolio_file(self, last_update_truncated: datetime) -> None:
        """Parse and persist the portfolio when the file has changed."""
        _LOGGER.info("Dateiänderung erkannt, starte Datenaktualisierung...")

        if _reader_module is None:  # pragma: no cover - optional dep for tests
            msg = "protobuf runtime is required to parse Portfolio Performance files"
            raise UpdateFailed(msg)

        parse_data_portfolio = _reader_module.parse_data_portfolio

        data = await async_run_executor_job(
            self.hass, parse_data_portfolio, str(self.file_path)
        )
        if not data:
            msg = "Portfolio-Daten konnten nicht geladen werden"
            raise UpdateFailed(msg)

        try:
            _LOGGER.info("📥 Synchronisiere Daten mit SQLite DB...")
            await async_run_executor_job(
                self.hass,
                _sync_data_to_db,
                data,
                self.hass,
                self.entry_id,
                last_update_truncated.isoformat(),
                self.db_path,
            )
        except Exception as exc:
            msg = "DB-Synchronisation fehlgeschlagen"
            raise UpdateFailed(msg) from exc

        self.last_file_update = last_update_truncated
        _LOGGER.info("Daten erfolgreich aktualisiert.")

    def _calculate_account_balances(
        self, accounts: Iterable[Any], transactions: Iterable[Any]
    ) -> dict[str, Any]:
        """Aggregate balances for each account using the shared helper."""
        calculate_account_balance = _accounting_module.calculate_account_balance

        return {
            account.uuid: calculate_account_balance(account.uuid, transactions)
            for account in accounts
        }

    async def _load_live_portfolios(self) -> list[Any]:
        """Fetch live portfolio aggregates while shielding coordinator errors."""
        try:
            raw_portfolios = await async_run_executor_job(
                self.hass, fetch_live_portfolios, self.db_path
            )
        except Exception:
            _LOGGER.exception(
                "PPReaderCoordinator: fetch_live_portfolios fehlgeschlagen - "
                "verwende leeren Snapshot"
            )
            return []
        return _coerce_live_portfolios(raw_portfolios)
