"""Regression tests for security purchase aggregation."""

from __future__ import annotations

from pathlib import Path

import pytest

from custom_components.pp_reader.data.db_access import Transaction
from custom_components.pp_reader.logic import securities


def _patch_fx(monkeypatch: pytest.MonkeyPatch) -> None:
    """Stub FX helpers so EUR transactions use unit rates."""

    monkeypatch.setattr(
        securities,
        "ensure_exchange_rates_for_dates_sync",
        lambda dates, currencies, db_path: None,
    )
    monkeypatch.setattr(
        securities,
        "load_latest_rates_sync",
        lambda reference_date, db_path: {"EUR": 1.0},
    )


def _make_transaction() -> Transaction:
    """Return the SSR Mining purchase transaction."""

    return Transaction(
        uuid="b3002fd2-db71-4ab6-9370-977b76d34497",
        type=0,
        account="5e0f756c-14a2-4b67-9d87-9e5ddb6a62db",
        portfolio="8d84468b-7023-45a9-b842-6478811e022c",
        other_account=None,
        other_portfolio=None,
        date="2024-04-16T00:00:00",
        currency_code="EUR",
        amount=49_520,
        shares=10_000_000_000,
        security="3d5c8979-2dd5-47ec-893c-305114e36351",
    )


def test_ssr_mining_purchase_metrics(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """Native purchase totals should match Portfolio Performance exports."""

    _patch_fx(monkeypatch)

    db_path = tmp_path / "fx.sqlite"
    transactions = [_make_transaction()]
    tx_units = {
        "b3002fd2-db71-4ab6-9370-977b76d34497": [
            {"type": 2, "amount": 100, "currency_code": "EUR"},
            {
                "type": 0,
                "amount": 49_420,
                "currency_code": "EUR",
                "fx_amount": 72_489,
                "fx_currency_code": "CAD",
            },
        ]
    }

    metrics = securities.db_calculate_sec_purchase_value(
        transactions,
        db_path,
        tx_units=tx_units,
    )

    key = (
        "8d84468b-7023-45a9-b842-6478811e022c",
        "3d5c8979-2dd5-47ec-893c-305114e36351",
    )
    assert key in metrics
    computation = metrics[key]

    assert computation.purchase_value == pytest.approx(494.20, rel=0, abs=1e-6)
    assert computation.security_currency_total == pytest.approx(
        724.89, rel=0, abs=1e-6
    )
    assert computation.account_currency_total == pytest.approx(
        494.20, rel=0, abs=1e-6
    )
    assert computation.avg_price_native == pytest.approx(7.2489, rel=0, abs=1e-6)
    assert computation.avg_price_security == pytest.approx(7.2489, rel=0, abs=1e-6)
    assert computation.avg_price_account == pytest.approx(4.942, rel=0, abs=1e-6)
