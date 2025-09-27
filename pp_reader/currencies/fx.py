"""Proxy module exposing currency helpers under the `pp_reader` namespace."""

from custom_components.pp_reader.currencies.fx import (
    ensure_exchange_rates_for_dates,
    ensure_exchange_rates_for_dates_sync,
    get_exchange_rates,
    get_required_currencies,
    load_latest_rates,
    load_latest_rates_sync,
)

__all__ = [
    "ensure_exchange_rates_for_dates",
    "ensure_exchange_rates_for_dates_sync",
    "get_exchange_rates",
    "get_required_currencies",
    "load_latest_rates",
    "load_latest_rates_sync",
]

