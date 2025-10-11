"""Holdings aggregation helpers for Portfolio Performance Reader."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from typing import Any, Mapping

from custom_components.pp_reader.util.currency import (
    cent_to_eur,
    round_currency,
    round_price,
)

__all__ = [
    "HoldingsAggregation",
    "AverageCostSelection",
    "compute_holdings_aggregation",
    "select_average_cost",
]


@dataclass(slots=True, frozen=True)
class HoldingsAggregation:
    """Summaries for aggregated security holdings."""

    total_holdings: float
    positive_holdings: float
    purchase_value_cents: int
    purchase_value_eur: float
    security_currency_total: float
    account_currency_total: float
    average_purchase_price_native: float | None
    avg_price_security: float | None
    avg_price_account: float | None

    @property
    def purchase_total_security(self) -> float:
        """Return the aggregated security currency total."""

        return self.security_currency_total

    @property
    def purchase_total_account(self) -> float:
        """Return the aggregated account currency total."""

        return self.account_currency_total


@dataclass(slots=True, frozen=True)
class AverageCostSelection:
    """Selected average cost information derived from holdings."""

    native: float | None
    security: float | None
    account: float | None
    eur: float | None
    source: str
    coverage_ratio: float | None


def _coerce_float(value: Any) -> float | None:
    """Try to coerce the given value into a float."""

    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _get_value(row: Mapping[str, Any] | Any, key: str) -> Any:
    """Extract a value from a mapping-like row."""

    if isinstance(row, Mapping):
        return row.get(key)
    if hasattr(row, key):
        return getattr(row, key, None)
    try:
        return row[key]  # type: ignore[index]
    except (KeyError, TypeError, IndexError):
        return None


def compute_holdings_aggregation(
    rows: Iterable[Mapping[str, Any] | Any],
) -> HoldingsAggregation:
    """Compute aggregate metrics for portfolio security holdings."""

    total_holdings_raw = 0.0
    positive_holdings_raw = 0.0
    purchase_value_cents = 0
    security_currency_total_raw = 0.0
    account_currency_total_raw = 0.0
    native_weighted_sum = 0.0
    native_covered_shares = 0.0
    security_weighted_sum = 0.0
    security_covered_shares = 0.0
    account_weighted_sum = 0.0
    account_covered_shares = 0.0

    for row in rows:
        holdings = _coerce_float(_get_value(row, "current_holdings")) or 0.0
        total_holdings_raw += holdings

        purchase_raw = _get_value(row, "purchase_value")
        if purchase_raw not in (None, ""):
            try:
                purchase_value_cents += int(round(float(purchase_raw)))
            except (TypeError, ValueError):
                pass

        security_total_raw = _coerce_float(
            _get_value(row, "security_currency_total")
        )
        if security_total_raw is not None:
            security_currency_total_raw += security_total_raw

        account_total_raw = _coerce_float(
            _get_value(row, "account_currency_total")
        )
        if account_total_raw is not None:
            account_currency_total_raw += account_total_raw

        if holdings > 0:
            positive_holdings_raw += holdings

            avg_native_raw = _coerce_float(_get_value(row, "avg_price_native"))
            if avg_native_raw is not None:
                native_weighted_sum += holdings * avg_native_raw
                native_covered_shares += holdings

            avg_security_raw = _coerce_float(
                _get_value(row, "avg_price_security")
            )
            if avg_security_raw is not None:
                security_weighted_sum += holdings * avg_security_raw
                security_covered_shares += holdings

            avg_account_raw = _coerce_float(_get_value(row, "avg_price_account"))
            if avg_account_raw is not None:
                account_weighted_sum += holdings * avg_account_raw
                account_covered_shares += holdings

    total_holdings = round(total_holdings_raw, 6)
    positive_holdings = round(positive_holdings_raw, 6)

    purchase_total_security = round_currency(
        security_currency_total_raw, default=0.0
    )
    if purchase_total_security is None:
        purchase_total_security = 0.0

    purchase_total_account = round_currency(
        account_currency_total_raw, default=0.0
    )
    if purchase_total_account is None:
        purchase_total_account = 0.0

    purchase_value_eur = cent_to_eur(purchase_value_cents, default=0.0) or 0.0

    average_purchase_price_native = None
    if (
        positive_holdings_raw > 0
        and native_covered_shares > 0
        and abs(native_covered_shares - positive_holdings_raw) <= 1e-6
    ):
        average_purchase_price_native = round_price(
            native_weighted_sum / native_covered_shares,
            decimals=6,
        )

    avg_price_security = None
    if (
        security_covered_shares > 0
        and positive_holdings_raw > 0
        and abs(security_covered_shares - positive_holdings_raw) <= 1e-6
    ):
        avg_price_security = round_price(
            security_weighted_sum / security_covered_shares,
            decimals=6,
        )

    avg_price_account = None
    if (
        account_covered_shares > 0
        and positive_holdings_raw > 0
        and abs(account_covered_shares - positive_holdings_raw) <= 1e-6
    ):
        avg_price_account = round_price(
            account_weighted_sum / account_covered_shares,
            decimals=6,
        )

    return HoldingsAggregation(
        total_holdings=total_holdings,
        positive_holdings=positive_holdings,
        purchase_value_cents=purchase_value_cents,
        purchase_value_eur=purchase_value_eur,
        security_currency_total=purchase_total_security,
        account_currency_total=purchase_total_account,
        average_purchase_price_native=average_purchase_price_native,
        avg_price_security=avg_price_security,
        avg_price_account=avg_price_account,
    )


def select_average_cost(
    aggregation: HoldingsAggregation,
    *,
    holdings: float | None = None,
    purchase_value_eur: float | None = None,
    security_currency_total: float | None = None,
    account_currency_total: float | None = None,
) -> AverageCostSelection:
    """Derive consistent average cost values based on a holdings aggregation."""

    native = aggregation.average_purchase_price_native
    security = aggregation.avg_price_security
    account = aggregation.avg_price_account
    eur = None

    total_holdings = aggregation.total_holdings
    positive_holdings = aggregation.positive_holdings

    preferred_holdings = holdings
    if preferred_holdings is None:
        preferred_holdings = positive_holdings if positive_holdings > 0 else None

    fallback_holdings = None
    if total_holdings > 0:
        fallback_holdings = total_holdings

    effective_purchase_value_eur = (
        purchase_value_eur
        if purchase_value_eur is not None
        else aggregation.purchase_value_eur
    )
    effective_security_total = (
        security_currency_total
        if security_currency_total is not None
        else aggregation.security_currency_total
    )
    effective_account_total = (
        account_currency_total
        if account_currency_total is not None
        else aggregation.account_currency_total
    )

    source = "aggregation"

    def _derive_average(total: float | None, share_count: float | None) -> float | None:
        if total in (None, "") or share_count in (None, 0):
            return None
        try:
            return round_price(float(total) / float(share_count), decimals=6)
        except (TypeError, ValueError, ZeroDivisionError):
            return None

    if security is None and preferred_holdings is not None:
        derived_security = _derive_average(
            effective_security_total,
            preferred_holdings,
        )
        if derived_security is not None:
            security = derived_security
            source = "totals"

    if account is None and preferred_holdings is not None:
        derived_account = _derive_average(
            effective_account_total,
            preferred_holdings,
        )
        if derived_account is not None:
            account = derived_account
            source = "totals"

    if eur is None and preferred_holdings is not None:
        derived_eur = _derive_average(
            effective_purchase_value_eur,
            preferred_holdings,
        )
        if derived_eur is not None:
            eur = derived_eur
            source = "totals"

    if eur is None and fallback_holdings is not None:
        derived_eur = _derive_average(
            effective_purchase_value_eur,
            fallback_holdings,
        )
        if derived_eur is not None:
            eur = derived_eur
            source = "eur_total"

    base_reference = None
    if holdings is not None and holdings > 0:
        base_reference = holdings
    elif fallback_holdings is not None and fallback_holdings > 0:
        base_reference = fallback_holdings

    covered_shares = None
    if source == "aggregation" and positive_holdings > 0:
        covered_shares = positive_holdings
    elif source == "totals" and preferred_holdings is not None:
        covered_shares = preferred_holdings
    elif source == "eur_total" and fallback_holdings is not None:
        covered_shares = fallback_holdings

    coverage_ratio = None
    if (
        covered_shares is not None
        and base_reference not in (None, 0)
        and base_reference is not None
    ):
        try:
            ratio = min(float(covered_shares) / float(base_reference), 1.0)
            coverage_ratio = round(ratio, 6)
        except (TypeError, ValueError, ZeroDivisionError):
            coverage_ratio = None

    return AverageCostSelection(
        native=native,
        security=security,
        account=account,
        eur=eur,
        source=source,
        coverage_ratio=coverage_ratio,
    )
