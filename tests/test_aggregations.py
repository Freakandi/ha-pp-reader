"""Unit tests for holdings aggregation helpers."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from custom_components.pp_reader.data.aggregations import (
    HoldingsAggregation,
    compute_holdings_aggregation,
)


def test_compute_holdings_aggregation_handles_mixed_rows() -> None:
    """The helper should sum holdings and compute weighted averages consistently."""

    rows = [
        {
            "current_holdings": 5,
            "purchase_value": 1000,
            "security_currency_total": 200.456,
            "account_currency_total": 201.789,
            "avg_price_native": 20.3333333,
            "avg_price_security": 40.9876543,
            "avg_price_account": 41.1234567,
        },
        {
            "current_holdings": "3",
            "purchase_value": "2000.4",
            "security_currency_total": "120.12",
            "account_currency_total": None,
            "avg_price_native": "30.123456",
            "avg_price_security": None,
            "avg_price_account": "35.987654",
        },
        {
            "current_holdings": -2,
            "purchase_value": 500,
            "security_currency_total": None,
            "account_currency_total": "50.555",
            "avg_price_native": 25,
            "avg_price_security": 45,
            "avg_price_account": 46,
        },
    ]

    result = compute_holdings_aggregation(rows)

    assert isinstance(result, HoldingsAggregation)
    assert result.total_holdings == pytest.approx(6.0)
    assert result.positive_holdings == pytest.approx(8.0)
    assert result.purchase_value_cents == 3500
    assert result.purchase_value_eur == pytest.approx(35.0)
    assert result.security_currency_total == pytest.approx(320.58)
    assert result.purchase_total_security == pytest.approx(320.58)
    assert result.account_currency_total == pytest.approx(252.34)
    assert result.purchase_total_account == pytest.approx(252.34)
    assert result.average_purchase_price_native == pytest.approx(24.004629)
    assert result.avg_price_security is None
    assert result.avg_price_account == pytest.approx(39.197531)


def test_compute_holdings_aggregation_handles_missing_and_invalid_values() -> None:
    """Rows with missing or invalid data should gracefully fall back to defaults."""

    rows = [
        {
            "current_holdings": None,
            "purchase_value": None,
            "security_currency_total": None,
            "account_currency_total": None,
            "avg_price_native": None,
            "avg_price_security": None,
            "avg_price_account": None,
        },
        SimpleNamespace(
            current_holdings="not-a-number",
            purchase_value="oops",
            security_currency_total="",
            account_currency_total=" ",
            avg_price_native="bad",
            avg_price_security="bad",
            avg_price_account="bad",
        ),
    ]

    result = compute_holdings_aggregation(rows)

    assert isinstance(result, HoldingsAggregation)
    assert result.total_holdings == pytest.approx(0.0)
    assert result.positive_holdings == pytest.approx(0.0)
    assert result.purchase_value_cents == 0
    assert result.purchase_value_eur == pytest.approx(0.0)
    assert result.security_currency_total == pytest.approx(0.0)
    assert result.account_currency_total == pytest.approx(0.0)
    assert result.average_purchase_price_native is None
    assert result.avg_price_security is None
    assert result.avg_price_account is None
