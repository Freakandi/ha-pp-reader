"""Compatibility layer exposing currency helpers for legacy imports."""

from custom_components.pp_reader.currencies.fx import (
    ensure_exchange_rates_for_dates,
    ensure_exchange_rates_for_dates_sync,
    load_latest_rates,
    load_latest_rates_sync,
)

__all__ = [
    "ensure_exchange_rates_for_dates",
    "ensure_exchange_rates_for_dates_sync",
    "load_latest_rates",
    "load_latest_rates_sync",
]

