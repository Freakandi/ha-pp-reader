"""Unified Market Data Resolver."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import numpy as np
import pandas as pd

if TYPE_CHECKING:
    import sqlite3
    from datetime import date


from custom_components.pp_reader.metrics.core.fx_access import (
    get_best_available_fx_rate,
)
from custom_components.pp_reader.util.currency import PRICE_SCALE

_LOGGER = logging.getLogger(__name__)


class MarketResolver:
    """
    Unified resolver for market data (Prices, FX Rates, Security Metadata).

    This class provides a single, consistent source for all market-related
    data required for performance calculations. It loads all necessary data
    into memory upon initialization and uses efficient pandas lookups to serve
    requests for prices, rates, and other security attributes.
    """

    def __init__(self, conn: sqlite3.Connection) -> None:
        """Initialize with a database connection."""
        self.conn = conn
        self._df_prices: pd.DataFrame = pd.DataFrame()
        self._df_rates: pd.DataFrame = pd.DataFrame()
        self._df_securities: pd.DataFrame = pd.DataFrame()
        self._prices_idx: pd.DataFrame = pd.DataFrame()
        self._rates_idx: pd.DataFrame = pd.DataFrame()
        # Fast lookup cache: currency -> (dates_array, rates_array)
        self._fx_cache: dict[str, tuple[np.ndarray, np.ndarray]] = {}
        self._sec_curr_map: dict[str, str] = {}

    def _load_fx_data(self) -> None:
        """Load FX rates from the database into a DataFrame."""
        query = "SELECT currency, date, rate FROM fx_rates"
        try:
            self._df_rates = pd.read_sql_query(query, self.conn)
            self._df_rates["date"] = pd.to_datetime(
                self._df_rates["date"], format="%Y-%m-%d"
            ).dt.tz_localize("UTC")
        except (pd.errors.DatabaseError, KeyError):
            self._df_rates = pd.DataFrame(columns=["currency", "date", "rate"])

        if not self._df_rates.empty:
            # Sort and index for fast lookup
            self._df_rates = self._df_rates.sort_values("date")
            # Build fast numpy cache
            # We convert dates to int64 (nanoseconds) for blazing fast searchsorted
            for curr, group in self._df_rates.groupby("currency"):
                self._fx_cache[curr] = (
                    group["date"].astype(np.int64).to_numpy(),
                    group["rate"].to_numpy(dtype=float),
                )
        else:
            self._fx_cache = {}

    def load_data(self) -> None:
        """Load reference data into memory."""
        self._load_fx_data()

        # 1. Load Historical Prices
        query_hist = "SELECT security_uuid, date, close FROM historical_prices"
        try:
            df_hist = pd.read_sql_query(query_hist, self.conn)
            # Safe date conversion
            df_hist["date"] = pd.to_datetime(
                df_hist["date"], unit="D", origin="unix"
            ).dt.tz_localize("UTC")
            df_hist["close"] = df_hist["close"] / PRICE_SCALE
            df_hist = df_hist[["security_uuid", "date", "close"]]
        except (pd.errors.DatabaseError, KeyError):
            df_hist = pd.DataFrame(columns=["security_uuid", "date", "close"])
        # 2. Load Live Prices from Securities
        query_latest = "SELECT uuid, last_price, last_price_date FROM securities"
        try:
            df_latest = pd.read_sql_query(query_latest, self.conn)
            df_latest = df_latest.dropna(subset=["last_price", "last_price_date"])

            if not df_latest.empty:
                df_latest["date"] = pd.to_datetime(
                    df_latest["last_price_date"], unit="s", origin="unix"
                ).dt.tz_localize("UTC")
                df_latest["close"] = df_latest["last_price"] / PRICE_SCALE
                df_latest["security_uuid"] = df_latest["uuid"]
                df_latest = df_latest[["security_uuid", "date", "close"]]
            else:
                df_latest = pd.DataFrame(columns=["security_uuid", "date", "close"])
        except (pd.errors.DatabaseError, KeyError):
            df_latest = pd.DataFrame(columns=["security_uuid", "date", "close"])
        # 3. ROBUST MERGE: Concat + Drop Duplicates
        # df_latest comes last, so keep='last' preserves it.
        if df_hist.empty and df_latest.empty:
            self._df_prices = pd.DataFrame(columns=["security_uuid", "date", "close"])
        else:
            self._df_prices = pd.concat([df_hist, df_latest], ignore_index=True)
            self._df_prices = self._df_prices.drop_duplicates(
                subset=["security_uuid", "date"], keep="last"
            )

        if not self._df_prices.empty:
            self._prices_idx = self._df_prices.set_index(
                ["security_uuid", "date"]
            ).sort_index()
        else:
            self._prices_idx = pd.DataFrame()
        # 4. Load Securities Metadata
        query_sec = "SELECT uuid, currency_code FROM securities"
        try:
            self._df_securities = pd.read_sql_query(query_sec, self.conn)
            self._sec_curr_map = self._df_securities.set_index("uuid")[
                "currency_code"
            ].to_dict()
        except (pd.errors.DatabaseError, KeyError):
            self._df_securities = pd.DataFrame(columns=["uuid", "currency_code"])
            self._sec_curr_map = {}

    def get_price(self, sec_id: str, d: date | pd.Timestamp) -> float:
        """Get the price for a security on a specific date with forward-fill."""
        try:
            ts = pd.Timestamp(d)
            ts = ts.tz_localize("UTC") if ts.tzinfo is None else ts.tz_convert("UTC")
            idx = (sec_id, ts)

            if idx in self._prices_idx.index:
                price = self._prices_idx.loc[idx, "close"]
                # Handle cases where .loc returns a Series due to duplicate index
                # entries
                if isinstance(price, pd.Series):
                    # The robust merge logic should ensure the last one is the live
                    # price
                    return price.iloc[-1]
                return price

            sec_prices = self._prices_idx.loc[sec_id]
            loc = sec_prices.index.searchsorted(ts, side="right")
            if loc > 0:
                price = sec_prices.iloc[loc - 1]["close"]
                # Handle cases where slicing returns a Series, e.g. multiple prices
                # on same day
                if isinstance(price, pd.Series):
                    return price.iloc[-1]
                return price

        except (KeyError, IndexError):
            pass  # Fall through to return 0.0
        return 0.0

    def get_fx(self, currency: str, d: date | pd.Timestamp) -> float | None:
        """
        Get the FX rate for a currency on a specific date using in-memory data.

        Prioritizes in-memory lookup using numpy arrays for speed.
        """
        if not currency or currency == "EUR":
            return 1.0

        ts = pd.Timestamp(d)
        ts = ts.tz_localize("UTC") if ts.tzinfo is None else ts.tz_convert("UTC")

        # Fast Numpy Lookup
        cache = self._fx_cache.get(currency)
        if cache:
            dates, rates = cache
            # Use int64 comparison for speed
            ts_val = ts.value
            # side='right' finds the index where ts would be inserted to maintain order.
            # We want the last date <= ts, which is index - 1.
            idx = np.searchsorted(dates, ts_val, side="right")
            if idx > 0:
                return float(rates[idx - 1])
            # If idx == 0, it means the requested date is before all known dates.
            # Fallback to DB or return None.

        # Fallback to DB (Legacy behavior)
        iso_date = ts.strftime("%Y-%m-%d")
        return get_best_available_fx_rate(self.conn, currency, iso_date)

    def get_security_currency(self, sec_uuid: str) -> str:
        """Get the currency code for a given security UUID."""
        return self._sec_curr_map.get(sec_uuid, "EUR")

    def get_price_series(self, sec_uuid: str, start: date, end: date) -> pd.Series:
        """Get a time series of prices for a security over a date range."""
        if (
            self._prices_idx.empty
            or sec_uuid not in self._prices_idx.index.get_level_values(0)
        ):
            return pd.Series(dtype=float)

        date_range = pd.date_range(start=start, end=end, freq="D", tz="UTC")
        sec_prices = self._prices_idx.loc[sec_uuid]

        # Reindex with forward fill
        return sec_prices["close"].reindex(date_range, method="ffill")

    def get_prices_pivot(
        self, securities: list[str], date_range: pd.DatetimeIndex
    ) -> tuple[pd.DataFrame, pd.DataFrame]:
        """Get a forward-filled pivot table of prices for multiple securities."""
        if self._df_prices.empty or not securities:
            return pd.DataFrame(index=date_range), pd.DataFrame(index=date_range)

        df_filtered = self._df_prices[self._df_prices["security_uuid"].isin(securities)]

        if df_filtered.empty:
            return pd.DataFrame(index=date_range), pd.DataFrame(index=date_range)

        pivot_unfilled = df_filtered.pivot_table(
            index="date", columns="security_uuid", values="close"
        )
        pivot_reindexed = pivot_unfilled.reindex(date_range)
        price_exists_mask = pivot_reindexed.notna()
        pivot_filled = pivot_reindexed.ffill().bfill()

        return pivot_filled, price_exists_mask

    def get_fx_pivot(
        self, currencies: list[str], date_range: pd.DatetimeIndex
    ) -> pd.DataFrame:
        """Get a forward-filled pivot table of FX rates for multiple currencies."""
        if self._df_rates.empty or not currencies:
            return pd.DataFrame(index=date_range)

        df_filtered = self._df_rates[self._df_rates["currency"].isin(currencies)]

        if df_filtered.empty:
            return pd.DataFrame(index=date_range)

        pivot_unfilled = df_filtered.pivot_table(
            index="date", columns="currency", values="rate"
        )
        pivot_reindexed = pivot_unfilled.reindex(date_range)
        return pivot_reindexed.ffill().bfill()

    def is_price_stale(self, sec_uuid: str, d: date | pd.Timestamp) -> bool:
        """Check if the price for a security on a given date is stale (>7 days old)."""
        ts = pd.Timestamp(d)
        ts = ts.tz_localize("UTC") if ts.tzinfo is None else ts.tz_convert("UTC")

        if sec_uuid not in self._prices_idx.index.get_level_values(0):
            return True

        sec_prices = self._prices_idx.loc[sec_uuid]
        loc = sec_prices.index.searchsorted(ts, side="right")

        if loc == 0:
            return True  # No price before or at date

        last_date = sec_prices.index[loc - 1]
        age = (ts - last_date).days
        return age > 7  # noqa: PLR2004
