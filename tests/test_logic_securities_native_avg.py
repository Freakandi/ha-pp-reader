"""Tests for native average purchase price aggregation."""

from __future__ import annotations

import logging
from pathlib import Path

import pytest

from custom_components.pp_reader.data.db_access import Transaction
from custom_components.pp_reader.logic import securities


def _make_transaction(
    *,
    uuid: str,
    tx_type: int,
    portfolio: str,
    security: str,
    date: str,
    currency: str,
    amount_cents: int,
    shares_raw: int,
) -> Transaction:
    """Build a transaction instance with the required fields."""
    return Transaction(
        uuid=uuid,
        type=tx_type,
        account="acct-1",
        portfolio=portfolio,
        other_account=None,
        other_portfolio=None,
        date=date,
        currency_code=currency,
        amount=amount_cents,
        shares=shares_raw,
        security=security,
    )


def _patch_fx(monkeypatch: pytest.MonkeyPatch, rate: float) -> None:
    """Stub FX helpers used during purchase aggregation."""
    monkeypatch.setattr(
        securities,
        "ensure_exchange_rates_for_dates_sync",
        lambda dates, currencies, db_path: None,
    )
    monkeypatch.setattr(
        securities,
        "load_latest_rates_sync",
        lambda reference_date, db_path: {"USD": rate, "CHF": rate},
    )


def _patch_fx_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    """Stub FX helpers so no rates are returned."""
    monkeypatch.setattr(
        securities,
        "ensure_exchange_rates_for_dates_sync",
        lambda dates, currencies, db_path: None,
    )
    monkeypatch.setattr(
        securities,
        "load_latest_rates_sync",
        lambda reference_date, db_path: {},
    )


@pytest.mark.parametrize("rate", [1.25, 1.1])
def test_purchase_value_and_native_average(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, rate: float
) -> None:
    """FIFO aggregation should compute EUR totals and native averages."""
    _patch_fx(monkeypatch, rate)

    db_path = tmp_path / "fx.sqlite"
    transactions = [
        _make_transaction(
            uuid="tx-buy-1",
            tx_type=0,
            portfolio="pf-1",
            security="sec-1",
            date="2024-01-10T00:00:00",
            currency="USD",
            amount_cents=20000,
            shares_raw=200_000_000,
        ),
        _make_transaction(
            uuid="tx-buy-2",
            tx_type=0,
            portfolio="pf-1",
            security="sec-1",
            date="2024-01-20T00:00:00",
            currency="USD",
            amount_cents=12000,
            shares_raw=100_000_000,
        ),
        _make_transaction(
            uuid="tx-sell-1",
            tx_type=1,
            portfolio="pf-1",
            security="sec-1",
            date="2024-02-10T00:00:00",
            currency="USD",
            amount_cents=15_000,
            shares_raw=100_000_000,
        ),
    ]

    tx_units = {
        "tx-buy-1": {
            "fx_amount": 20000,
            "fx_currency_code": "USD",
            "entries": [
                {
                    "type": 0,
                    "amount": 20000,
                    "currency_code": "USD",
                    "fx_amount": 20000,
                    "fx_currency_code": "USD",
                }
            ],
        },
        "tx-buy-2": {
            "fx_amount": 12000,
            "fx_currency_code": "USD",
            "entries": [
                {
                    "type": 0,
                    "amount": 12000,
                    "currency_code": "USD",
                    "fx_amount": 12000,
                    "fx_currency_code": "USD",
                }
            ],
        },
    }

    metrics = securities.db_calculate_sec_purchase_value(
        transactions,
        db_path,
        tx_units=tx_units,
    )

    key = ("pf-1", "sec-1")
    assert key in metrics
    computation = metrics[key]

    # Native lot prices: [100, 120] after a 1-share sale → holdings=2
    expected_purchase_value = round((100 / rate) + (120 / rate), 2)
    assert computation.purchase_value == pytest.approx(
        expected_purchase_value, rel=0, abs=0.01
    )
    assert computation.avg_price_native == pytest.approx(110.0, rel=0, abs=1e-6)
    assert computation.security_currency_total == pytest.approx(
        220.0, rel=0, abs=1e-6
    )
    assert computation.account_currency_total == pytest.approx(
        220.0, rel=0, abs=1e-6
    )
    assert computation.avg_price_security == pytest.approx(110.0, rel=0, abs=1e-6)
    assert computation.avg_price_account == pytest.approx(110.0, rel=0, abs=1e-6)


def test_missing_native_data_yields_none(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """When native metadata is incomplete, the native average should stay ``None``."""
    _patch_fx(monkeypatch, 1.2)

    db_path = tmp_path / "fx.sqlite"
    transactions = [
        _make_transaction(
            uuid="tx-buy-1",
            tx_type=0,
            portfolio="pf-1",
            security="sec-1",
            date="2024-03-10T00:00:00",
            currency="USD",
            amount_cents=15000,
            shares_raw=150_000_000,
        ),
        _make_transaction(
            uuid="tx-buy-2",
            tx_type=0,
            portfolio="pf-1",
            security="sec-1",
            date="2024-04-10T00:00:00",
            currency="USD",
            amount_cents=18000,
            shares_raw=150_000_000,
        ),
    ]

    tx_units = {
        "tx-buy-1": {
            "fx_amount": 15000,
            "fx_currency_code": "USD",
            "entries": [
                {
                    "type": 0,
                    "amount": 15000,
                    "currency_code": "USD",
                    "fx_amount": 15000,
                    "fx_currency_code": "USD",
                }
            ],
        },
        # Second transaction lacks native metadata → avg_price_native should be None
    }

    metrics = securities.db_calculate_sec_purchase_value(
        transactions,
        db_path,
        tx_units=tx_units,
    )

    computation = metrics[("pf-1", "sec-1")]
    assert computation.avg_price_native is None
    # Purchase value still computed using EUR conversion
    expected_purchase_value = round((150 / 1.2) + (180 / 1.2), 2)
    assert computation.purchase_value == pytest.approx(
        expected_purchase_value, rel=0, abs=0.01
    )
    assert computation.security_currency_total == pytest.approx(
        330.0, rel=0, abs=1e-6
    )
    assert computation.account_currency_total == pytest.approx(
        330.0, rel=0, abs=1e-6
    )
    assert computation.avg_price_security == pytest.approx(110.0, rel=0, abs=1e-6)
    assert computation.avg_price_account == pytest.approx(110.0, rel=0, abs=1e-6)


def test_missing_fx_logged_once(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    """A missing exchange rate should trigger a single warning per currency/date pair."""
    _patch_fx_missing(monkeypatch)

    db_path = tmp_path / "fx.sqlite"
    transactions = [
        _make_transaction(
            uuid="tx-1",
            tx_type=0,
            portfolio="pf-1",
            security="sec-1",
            date="2024-05-10T00:00:00",
            currency="USD",
            amount_cents=10_000,
            shares_raw=100_000_000,
        ),
        _make_transaction(
            uuid="tx-2",
            tx_type=0,
            portfolio="pf-1",
            security="sec-2",
            date="2024-05-10T00:00:00",
            currency="USD",
            amount_cents=20_000,
            shares_raw=200_000_000,
        ),
    ]

    caplog.set_level(
        logging.WARNING, logger="custom_components.pp_reader.logic.securities"
    )

    securities.db_calculate_sec_purchase_value(transactions, db_path)

    warnings = [
        rec.getMessage()
        for rec in caplog.records
        if "Kein Wechselkurs" in rec.getMessage()
    ]
    assert len(warnings) == 1
