"""Frankfurter FX range helpers used for historical backfills."""

from __future__ import annotations

import json
import logging
import ssl
from datetime import date, datetime, timedelta

import aiohttp
from homeassistant.util import ssl as hass_ssl

from custom_components.pp_reader.data.db_access import FxRateRecord
from custom_components.pp_reader.util.datetime import UTC

_LOGGER = logging.getLogger("custom_components.pp_reader.util.fx")

API_URL = "https://api.frankfurter.app"
DEFAULT_PROVIDER = "frankfurter"
DEFAULT_PROVIDER_HOST = "frankfurter.app"
DEFAULT_TIMEOUT = 15

__all__ = ["fetch_fx_range"]


def _normalize_currency(value: str) -> str:
    if not value:
        message = "currency must be provided"
        raise ValueError(message)
    return value.strip().upper()


def _normalize_date(value: date | datetime | str) -> str:
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            message = "date string must not be empty"
            raise ValueError(message)
        return stripped
    msg = f"Unsupported date type: {type(value)!r}"
    raise TypeError(msg)


def _iter_expected_dates(start: date, end: date) -> list[str]:
    total_days = (end - start).days + 1
    return [
        (start + timedelta(days=offset)).isoformat() for offset in range(total_days)
    ]


async def fetch_fx_range(
    currency: str,
    start_date: date | datetime | str,
    end_date: date | datetime | str,
    *,
    provider: str = DEFAULT_PROVIDER,
) -> list[FxRateRecord]:
    """
    Fetch historical FX rates for a currency between two dates (inclusive).

    Returns a list of FxRateRecord entries; missing weekend/holiday dates are
    logged and skipped instead of raising errors.
    """
    normalized_currency = _normalize_currency(currency)
    start_str = _normalize_date(start_date)
    end_str = _normalize_date(end_date)

    start_dt = datetime.fromisoformat(start_str).date()
    end_dt = datetime.fromisoformat(end_str).date()
    if start_dt > end_dt:
        message = "start_date must be on or before end_date"
        raise ValueError(message)

    url = f"{API_URL}/{start_str}..{end_str}?from=EUR&to={normalized_currency}"
    timeout = aiohttp.ClientTimeout(total=DEFAULT_TIMEOUT)
    ssl_context = hass_ssl.client_context()
    if hasattr(ssl_context, "verify_flags"):
        ssl_context.verify_flags &= ~getattr(ssl, "VERIFY_X509_STRICT", 0)
    connector = aiohttp.TCPConnector(ssl=ssl_context)

    fetched_at = (
        datetime.now(tz=UTC).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")
    )
    provenance = json.dumps(
        {
            "provider": provider,
            "range_start": start_str,
            "range_end": end_str,
        },
        sort_keys=True,
    )

    try:
        async with (
            aiohttp.ClientSession(
                timeout=timeout,
                trust_env=True,
                connector=connector,
            ) as session,
            session.get(url) as response,
        ):
            if response.status != 200:  # noqa: PLR2004
                _LOGGER.warning(
                    "FX range fetch failed for %s (%s..%s): status %s",
                    normalized_currency,
                    start_str,
                    end_str,
                    response.status,
                )
                return []
            payload = await response.json()
    except (TimeoutError, aiohttp.ClientError, OSError) as err:
        _LOGGER.warning(
            "FX range fetch network error for %s (%s..%s): %s",
            normalized_currency,
            start_str,
            end_str,
            err,
        )
        return []
    except Exception:
        _LOGGER.exception("FX range fetch failed for %s", normalized_currency)
        return []

    rates = payload.get("rates") or {}
    records: list[FxRateRecord] = []
    observed_dates = set()
    for day, values in sorted(rates.items()):
        try:
            rate_value = float(values.get(normalized_currency))
        except (TypeError, ValueError, AttributeError):
            _LOGGER.debug(
                "Skipping invalid FX rate for %s on %s",
                normalized_currency,
                day,
            )
            continue

        observed_dates.add(day)
        records.append(
            FxRateRecord(
                date=day,
                currency=normalized_currency,
                rate=rate_value,
                fetched_at=fetched_at,
                data_source=provider,
                provider=DEFAULT_PROVIDER_HOST,
                provenance=provenance,
            )
        )

    expected_dates = set(_iter_expected_dates(start_dt, end_dt))
    missing_dates = sorted(expected_dates - observed_dates)
    if missing_dates:
        preview = ", ".join(missing_dates[:5])
        _LOGGER.info(
            (
                "FX range for %s missing %d day(s) (likely weekend/holiday); "
                "first gaps: %s"
            ),
            normalized_currency,
            len(missing_dates),
            preview,
        )

    return records
