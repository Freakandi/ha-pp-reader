"""Regression tests for security purchase aggregation."""

from __future__ import annotations

from pathlib import Path

import pytest

from custom_components.pp_reader.data.db_access import Transaction
from custom_components.pp_reader.logic import securities


def _patch_fx(
    monkeypatch: pytest.MonkeyPatch,
    *,
    rates: dict[str, float] | None = None,
) -> None:
    """Stub FX helpers so transactions use deterministic rates."""

    monkeypatch.setattr(
        securities,
        "ensure_exchange_rates_for_dates_sync",
        lambda dates, currencies, db_path: None,
    )
    monkeypatch.setattr(
        securities,
        "load_latest_rates_sync",
        lambda reference_date, db_path: (rates or {"EUR": 1.0}),
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


def test_harmonic_drive_purchase_without_fx_row(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """JPY purchases without native FX rows should fall back to account totals."""

    _patch_fx(monkeypatch, rates={"JPY": 1.0})

    db_path = tmp_path / "fx.sqlite"
    transactions = [
        Transaction(
            uuid="ce0a9c37-937d-4678-8900-b07b12f4474c",
            type=0,
            account="7b539b3c-32db-41db-8a2a-b500d1c03d71",
            portfolio="f9996e0d-743d-417f-b0f2-150dd68df646",
            other_account=None,
            other_portfolio=None,
            date="2025-09-09T00:00:00",
            currency_code="JPY",
            amount=24_899_900,
            shares=10_000_000_000,
            security="df1d3f53-85a0-4685-a660-b5a6b0055a24",
        )
    ]
    tx_units = {
        "ce0a9c37-937d-4678-8900-b07b12f4474c": [
            {"type": 2, "amount": 19_900, "currency_code": "JPY"}
        ]
    }

    metrics = securities.db_calculate_sec_purchase_value(
        transactions,
        db_path,
        tx_units=tx_units,
    )

    key = (
        "f9996e0d-743d-417f-b0f2-150dd68df646",
        "df1d3f53-85a0-4685-a660-b5a6b0055a24",
    )
    assert key in metrics
    computation = metrics[key]

    assert computation.purchase_value == pytest.approx(248_800.0, rel=0, abs=1e-6)
    assert computation.security_currency_total == pytest.approx(
        248_800.0, rel=0, abs=1e-6
    )
    assert computation.account_currency_total == pytest.approx(
        248_800.0, rel=0, abs=1e-6
    )
    assert computation.avg_price_native is None
    assert computation.avg_price_security == pytest.approx(2_488.0, rel=0, abs=1e-6)
    assert computation.avg_price_account == pytest.approx(2_488.0, rel=0, abs=1e-6)
