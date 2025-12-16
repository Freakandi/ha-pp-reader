from datetime import date

from custom_components.pp_reader.backdating.holdings import (
    _apply_transaction_update,
)

# Constants for testing
PORTFOLIO = "port-1"
SECURITY = "sec-1"
CURRENCY = "EUR"
FX_RATES = {"EUR": 1.0, "USD": 2.0}  # 1 EUR = 2.0 USD (Foreign per EUR)


def test_fifo_buy_creates_lot():
    holdings = {}
    tx_date = date(2023, 1, 1)

    # Buy 10 shares @ 100 EUR each (Total 1000 EUR)
    # Amount is in cents: 100000
    _apply_transaction_update(
        PORTFOLIO,
        SECURITY,
        delta_shares=10.0,
        amount=100000,
        currency="EUR",
        tx_type=0,  # Buy
        fees=0,
        taxes=0,
        fx_rates=FX_RATES,
        holdings=holdings,
        tx_date=tx_date,
    )

    entry = holdings[(PORTFOLIO, SECURITY)]
    assert entry["shares"] == 10.0
    assert entry["purchase_value_eur"] == 1000.0
    assert len(entry["lots"]) == 1

    lot = entry["lots"][0]
    assert lot.original_shares == 10.0
    assert lot.shares == 10.0
    assert lot.cost_per_share_eur == 100.0
    assert lot.date == tx_date


def test_fifo_sell_consumes_oldest_lot():
    holdings = {}

    # Lot 1: Buy 10 @ 10 EUR
    _apply_transaction_update(
        PORTFOLIO,
        SECURITY,
        10.0,
        10000,
        "EUR",
        0,
        0,
        0,
        FX_RATES,
        holdings,
        date(2023, 1, 1),
    )

    # Lot 2: Buy 10 @ 20 EUR
    _apply_transaction_update(
        PORTFOLIO,
        SECURITY,
        10.0,
        20000,
        "EUR",
        0,
        0,
        0,
        FX_RATES,
        holdings,
        date(2023, 1, 2),
    )

    entry = holdings[(PORTFOLIO, SECURITY)]
    assert len(entry["lots"]) == 2
    assert entry["purchase_value_eur"] == 300.0  # 100 + 200

    # Sell 15 shares @ 30 EUR (Total 450 EUR)
    # Cost Basis Expectation:
    # 10 from Lot 1 @ 10 EUR = 100 EUR
    # 5 from Lot 2 @ 20 EUR = 100 EUR
    # Total Cost Basis = 200 EUR
    # Proceeds = 450 EUR
    # Realized Gain = 450 - 200 = 250 EUR

    gain, _ = _apply_transaction_update(
        PORTFOLIO,
        SECURITY,
        delta_shares=-15.0,
        amount=45000,  # 450 EUR
        currency="EUR",
        tx_type=1,  # Sell
        fees=0,
        taxes=0,
        fx_rates=FX_RATES,
        holdings=holdings,
        tx_date=date(2023, 2, 1),
    )

    assert gain == 250.0

    # Check remaining state
    assert entry["shares"] == 5.0
    # Remaining Cost: 5 shares from Lot 2 @ 20 EUR = 100 EUR
    assert entry["purchase_value_eur"] == 100.0

    assert len(entry["lots"]) == 1
    remaining_lot = entry["lots"][0]
    assert remaining_lot.date == date(2023, 1, 2)  # Lot 2
    assert remaining_lot.shares == 5.0


def test_fifo_sell_exact_lot():
    holdings = {}
    # Buy 10 @ 10
    _apply_transaction_update(
        PORTFOLIO,
        SECURITY,
        10.0,
        10000,
        "EUR",
        0,
        0,
        0,
        FX_RATES,
        holdings,
        date(2023, 1, 1),
    )

    # Sell 10 @ 20
    gain, _ = _apply_transaction_update(
        PORTFOLIO,
        SECURITY,
        -10.0,
        20000,
        "EUR",
        1,
        0,
        0,
        FX_RATES,
        holdings,
        date(2023, 2, 1),
    )

    assert gain == 100.0  # 200 - 100
    assert (PORTFOLIO, SECURITY) not in holdings  # Should be removed (dust)


def test_fifo_fx_conversion():
    holdings = {}

    # Buy 10 @ 100 USD (FX 2.0) -> 50 EUR Cost (100 / 2.0)
    # Cost per share = 5 EUR
    _apply_transaction_update(
        PORTFOLIO,
        SECURITY,
        10.0,
        10000,
        "USD",
        0,
        0,
        0,
        FX_RATES,
        holdings,
        date(2023, 1, 1),
    )

    entry = holdings[(PORTFOLIO, SECURITY)]
    assert entry["purchase_value_eur"] == 50.0
    assert entry["lots"][0].cost_per_share_eur == 5.0

    # Sell 10 @ 200 USD (FX 2.0) -> 100 EUR Proceeds (200 / 2.0)
    # Gain = 100 - 50 = 50 EUR
    gain, _ = _apply_transaction_update(
        PORTFOLIO,
        SECURITY,
        -10.0,
        20000,
        "USD",
        1,
        0,
        0,
        FX_RATES,
        holdings,
        date(2023, 2, 1),
    )

    assert gain == 50.0
