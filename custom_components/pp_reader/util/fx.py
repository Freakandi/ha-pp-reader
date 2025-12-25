"""ECB FX range helpers used for historical backfills."""

from __future__ import annotations

import json
import logging
import ssl
from collections import defaultdict
from datetime import UTC, date, datetime, timedelta
from typing import Any

import aiohttp
from homeassistant.util import ssl as hass_ssl

from custom_components.pp_reader.data.db_access import FxRateRecord

_LOGGER = logging.getLogger("custom_components.pp_reader.util.fx")

API_URL = "https://data-api.ecb.europa.eu/service/data/EXR"
DEFAULT_PROVIDER = "ecb"
DEFAULT_PROVIDER_HOST = "ecb.europa.eu"
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


def _parse_ecb_sdmx_response(
    data: dict[str, Any] | None,
) -> dict[str, dict[str, float]]:
    """Parse ECB SDMX-JSON response into date->currency->rate mapping."""
    result: dict[str, dict[str, float]] = defaultdict(dict)

    if not data:
        return result

    try:
        structure = data.get("structure", {})
        dimensions = structure.get("dimensions", {})
        series_dims = dimensions.get("series", [])
        obs_dims = dimensions.get("observation", [])

        # Find index of CURRENCY in series keys
        curr_idx = next(
            (i for i, d in enumerate(series_dims) if d["id"] == "CURRENCY"), None
        )
        if curr_idx is None:
            return {}

        # Get currency codes mapping (index -> code)
        currencies_map = {
            i: val["id"] for i, val in enumerate(series_dims[curr_idx]["values"])
        }

        # Get dates mapping (index -> date_str)
        # Time period is usually at index 0 of observation dimensions
        time_dim = next((d for d in obs_dims if d["id"] == "TIME_PERIOD"), None)
        if not time_dim:
            return {}

        dates_map = {str(i): val["id"] for i, val in enumerate(time_dim["values"])}

        # Parse data
        data_sets = data.get("dataSets", [])
        if not data_sets:
            return {}

        series = data_sets[0].get("series", {})
        for key, series_data in series.items():
            # Key is "0:1:0:0:0" etc.
            key_parts = key.split(":")
            if len(key_parts) <= curr_idx:
                continue

            curr_code_idx = int(key_parts[curr_idx])
            currency = currencies_map.get(curr_code_idx)
            if not currency:
                continue

            observations = series_data.get("observations", {})
            for date_idx, obs_vals in observations.items():
                date_str = dates_map.get(str(date_idx))
                if date_str and obs_vals:
                    try:
                        rate = float(obs_vals[0])
                        result[date_str][currency] = rate
                    except (ValueError, TypeError):
                        pass

    except Exception:
        _LOGGER.exception("Error parsing ECB SDMX response")

    return result


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

    # ECB SDMX API URL
    url = f"{API_URL}/D.{normalized_currency}.EUR.SP00.A"
    params = {"startPeriod": start_str, "endPeriod": end_str, "detail": "dataonly"}

    headers = {"Accept": "application/vnd.sdmx.data+json;version=1.0.0-wd"}

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
            session.get(url, params=params, headers=headers) as response,
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

    parsed_data = _parse_ecb_sdmx_response(payload)
    records: list[FxRateRecord] = []
    observed_dates = set()

    # Iterate over sorted dates we found
    for day, rates_map in sorted(parsed_data.items()):
        if normalized_currency not in rates_map:
            continue
        rate_value = rates_map[normalized_currency]
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
        _LOGGER.warning(
            (
                "FX range for %s missing %d day(s) (likely weekend/holiday); "
                "first gaps: %s"
            ),
            normalized_currency,
            len(missing_dates),
            preview,
        )

    return records
