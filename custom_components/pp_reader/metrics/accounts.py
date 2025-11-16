"""Account metric computation helpers."""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from custom_components.pp_reader.data.db_access import (
    AccountMetricRecord,
    FxRateRecord,
    get_accounts,
)
from custom_components.pp_reader.util import async_run_executor_job

if TYPE_CHECKING:
    from pathlib import Path

    from homeassistant.core import HomeAssistant

try:
    from custom_components.pp_reader.currencies.fx import (
        ensure_exchange_rates_for_dates,
        load_cached_rate_records,
    )
except ImportError:  # pragma: no cover - optional FX runtime
    ensure_exchange_rates_for_dates = None  # type: ignore[assignment]
    load_cached_rate_records = None  # type: ignore[assignment]

_LOGGER = logging.getLogger("custom_components.pp_reader.metrics.accounts")


async def async_compute_account_metrics(
    hass: HomeAssistant,
    db_path: Path,
    run_uuid: str,
) -> list[AccountMetricRecord]:
    """Compute account valuation metrics for the provided run."""
    if not run_uuid:
        msg = "run_uuid darf nicht leer sein"
        raise ValueError(msg)

    accounts = await async_run_executor_job(hass, get_accounts, db_path)
    active_accounts = [
        account for account in accounts if not getattr(account, "is_retired", False)
    ]

    non_eur_currencies = {
        (getattr(account, "currency_code", "") or "EUR").strip().upper()
        for account in active_accounts
    }
    non_eur_currencies.discard("EUR")
    fx_records: dict[str, FxRateRecord] = {}

    if non_eur_currencies:
        if ensure_exchange_rates_for_dates is None or load_cached_rate_records is None:
            _LOGGER.warning(
                "FX-Modul nicht verfügbar - Fremdwährungskonten können nicht "
                "bewertet werden."
            )
        else:
            reference_date = datetime.now(UTC)
            try:
                await ensure_exchange_rates_for_dates(
                    [reference_date], non_eur_currencies, db_path
                )
                fx_records = await load_cached_rate_records(reference_date, db_path)
            except Exception:
                _LOGGER.exception("Fehler beim Laden der FX-Kurse für Kontometriken")
                fx_records = {}

    records: list[AccountMetricRecord] = []
    for account in active_accounts:
        currency = (account.currency_code or "EUR").strip().upper()
        balance_native_cents = _coerce_int(getattr(account, "balance", None))

        balance_eur_cents: int | None
        fx_rate: float | None = None
        fx_source: str | None = None
        fx_timestamp: str | None = None
        coverage_ratio: float | None = None
        provenance: str | None = None

        if currency == "EUR":
            balance_eur_cents = balance_native_cents
            coverage_ratio = 1.0
        else:
            record = fx_records.get(currency)
            if record is not None:
                fx_rate = _coerce_float(record.rate)
                if fx_rate and fx_rate > 0:
                    balance_eur_cents = round(balance_native_cents / fx_rate)
                    coverage_ratio = 1.0
                    fx_source = record.data_source or record.provider
                    fx_timestamp = record.fetched_at
                    provenance = record.provenance
                else:
                    balance_eur_cents = None
                    coverage_ratio = 0.0
            else:
                balance_eur_cents = None
                coverage_ratio = 0.0

        records.append(
            AccountMetricRecord(
                metric_run_uuid=run_uuid,
                account_uuid=account.uuid,
                currency_code=currency,
                balance_native_cents=balance_native_cents,
                balance_eur_cents=balance_eur_cents,
                fx_rate=fx_rate,
                fx_rate_source=fx_source,
                fx_rate_timestamp=fx_timestamp,
                coverage_ratio=coverage_ratio,
                provenance=provenance,
            )
        )

    return records


def _coerce_int(value: Any) -> int:
    """Best-effort coercion of numeric values to int."""
    if value in (None, ""):
        return 0

    if isinstance(value, float):
        return round(value)

    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _coerce_float(value: Any) -> float | None:
    """Best-effort coercion of numeric values to float."""
    if value in (None, ""):
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None
