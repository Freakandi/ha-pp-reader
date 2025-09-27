"""Helper functions to derive portfolio statistics from Portfolio Performance data."""

import logging
from datetime import datetime
from pathlib import Path

from custom_components.pp_reader.currencies.fx import (
    ensure_exchange_rates_for_dates,
    load_latest_rates,
)
from custom_components.pp_reader.data.db_access import (
    Security,
    Transaction,
    get_portfolio_by_uuid,
    get_portfolio_securities,
    get_securities_by_id,
    get_transactions,
)

_LOGGER = logging.getLogger(__name__)

PURCHASE_TYPES = (0, 2)
SALE_TYPES = (1, 3)


def normalize_price(raw_price: int) -> float:
    """Convert a raw price with 8 decimal places to a float."""
    return raw_price / 10**8


def normalize_shares(raw_shares: int) -> float:
    """Convert raw shares with 8 decimal places to a float."""
    return raw_shares / 10**8


def calculate_holdings(transactions: list[Transaction]) -> dict[str, float]:
    """Berechnet aktuelle Bestände aus Transaktionen."""
    holdings: dict[str, float] = {}
    for tx in transactions:
        if not tx.security:
            continue
        shares = normalize_shares(tx.shares) if tx.shares else 0

        if tx.type in (0, 2):  # PURCHASE, INBOUND_DELIVERY
            holdings[tx.security] = holdings.get(tx.security, 0) + shares
        elif tx.type in (1, 3):  # SALE, OUTBOUND_DELIVERY
            holdings[tx.security] = holdings.get(tx.security, 0) - shares

    return holdings


async def calculate_portfolio_value(
    portfolio_uuid: str, reference_date: datetime, db_path: Path
) -> tuple[float, int]:
    """Berechnet den aktuellen Portfolio-Wert und die Anzahl aktiver Positionen."""
    portfolio = get_portfolio_by_uuid(db_path, portfolio_uuid)
    if not portfolio:
        _LOGGER.error("Portfolio nicht gefunden: %s", portfolio_uuid)
        return 0.0, 0

    transactions = get_transactions(db_path)
    securities_by_id = get_securities_by_id(db_path)

    # Nur Transaktionen des Portfolios
    portfolio_transactions = [
        tx for tx in transactions if tx.portfolio == portfolio.uuid
    ]

    # Bestände berechnen
    holdings = calculate_holdings(portfolio_transactions)
    active_securities = {sid: qty for sid, qty in holdings.items() if qty > 0}

    # Währungen ermitteln
    currencies = set()
    for sid in active_securities:
        sec = securities_by_id.get(sid)
        if sec and sec.currency_code != "EUR":
            currencies.add(sec.currency_code)

    # Wechselkurse sicherstellen und laden
    await ensure_exchange_rates_for_dates([reference_date], currencies, db_path)
    fx_rates = await load_latest_rates(reference_date, db_path)

    # Depotwert berechnen
    total_value = 0.0
    for sid, qty in active_securities.items():
        sec = securities_by_id.get(sid)
        if not sec or not sec.last_price:
            continue

        kurs = normalize_price(sec.last_price)
        if sec.currency_code != "EUR":
            rate = fx_rates.get(sec.currency_code)
            if rate:
                kurs = kurs / rate
            else:
                _LOGGER.warning(
                    "⚠️ Kein Wechselkurs für %s (%s)", sec.name, sec.currency_code
                )
                continue

        total_value += qty * kurs

    return round(total_value, 2), len(active_securities)


async def calculate_purchase_sum(portfolio_uuid: str, db_path: Path) -> float:
    """Berechnet die Kaufsumme für aktive Positionen (FIFO)."""
    portfolio = get_portfolio_by_uuid(db_path, portfolio_uuid)
    if not portfolio:
        _LOGGER.error("Portfolio nicht gefunden: %s", portfolio_uuid)
        return 0.0

    transactions = get_transactions(db_path)
    securities_by_id = get_securities_by_id(db_path)
    portfolio_transactions = _filter_portfolio_transactions(
        transactions, portfolio.uuid
    )

    await _ensure_fx_rates_for_transactions(
        portfolio_transactions, securities_by_id, db_path
    )

    holdings = await _build_fifo_holdings(
        portfolio_transactions, securities_by_id, db_path
    )
    return _calculate_purchase_total(holdings)


def _filter_portfolio_transactions(
    transactions: list[Transaction], portfolio_uuid: str
) -> list[Transaction]:
    """Filter transactions for a portfolio and sort them chronologically."""
    return sorted(
        (tx for tx in transactions if tx.portfolio == portfolio_uuid and tx.security),
        key=lambda tx: datetime.fromisoformat(tx.date),
    )


async def _ensure_fx_rates_for_transactions(
    transactions: list[Transaction],
    securities_by_id: dict[str, Security],
    db_path: Path,
) -> None:
    """Ensure that all FX rates required by the transactions are available."""
    fx_requirements = {
        (
            datetime.fromisoformat(tx.date),
            sec.currency_code,
        )
        for tx in transactions
        if (sec := securities_by_id.get(tx.security)) and sec.currency_code != "EUR"
    }

    if not fx_requirements:
        return

    fx_dates = {date for date, _ in fx_requirements}
    fx_currencies = {currency for _, currency in fx_requirements}
    await ensure_exchange_rates_for_dates(list(fx_dates), fx_currencies, db_path)


async def _build_fifo_holdings(
    transactions: list[Transaction],
    securities_by_id: dict[str, Security],
    db_path: Path,
) -> dict[str, list[tuple[float, float, datetime]]]:
    """Create a FIFO holdings map for the provided transactions."""
    holdings: dict[str, list[tuple[float, float, datetime]]] = {}
    for tx in transactions:
        sec = securities_by_id.get(tx.security)
        if not sec or not tx.shares:
            continue

        shares = normalize_shares(tx.shares)
        if shares <= 0:
            continue

        tx_date = datetime.fromisoformat(tx.date)

        if tx.type in PURCHASE_TYPES:
            amount = tx.amount / 100  # Cent -> EUR
            rate = await _resolve_fx_rate(sec.currency_code, tx_date, db_path)
            if rate is None:
                _LOGGER.warning(
                    "⚠️ Kein Wechselkurs für %s am %s",
                    sec.currency_code,
                    tx_date.date(),
                )
                continue

            price_per_share = amount / shares
            _append_fifo_purchase(
                holdings,
                tx.security,
                shares,
                price_per_share / rate,
                tx_date,
            )
            continue

        if tx.type in SALE_TYPES:
            _apply_fifo_sale(holdings, tx.security, shares)

    return holdings


async def _resolve_fx_rate(
    currency_code: str, tx_date: datetime, db_path: Path
) -> float | None:
    """Return the FX rate for a currency at the given date."""
    if currency_code == "EUR":
        return 1.0

    fx_rates = await load_latest_rates(tx_date, db_path)
    return fx_rates.get(currency_code)


def _append_fifo_purchase(
    holdings: dict[str, list[tuple[float, float, datetime]]],
    security_id: str,
    shares: float,
    price_per_share_eur: float,
    tx_date: datetime,
) -> None:
    """Append a purchase entry to the FIFO holdings."""
    holdings.setdefault(security_id, []).append((shares, price_per_share_eur, tx_date))


def _apply_fifo_sale(
    holdings: dict[str, list[tuple[float, float, datetime]]],
    security_id: str,
    shares_to_sell: float,
) -> None:
    """Reduce holdings for a sale using FIFO logic."""
    if shares_to_sell <= 0:
        return

    remaining_to_sell = shares_to_sell
    updated_positions: list[tuple[float, float, datetime]] = []

    for qty, price, date in holdings.get(security_id, []):
        if remaining_to_sell <= 0:
            updated_positions.append((qty, price, date))
            continue

        if qty > remaining_to_sell:
            updated_positions.append((qty - remaining_to_sell, price, date))
            remaining_to_sell = 0
        else:
            remaining_to_sell -= qty

    holdings[security_id] = updated_positions


def _calculate_purchase_total(
    holdings: dict[str, list[tuple[float, float, datetime]]],
) -> float:
    """Calculate the purchase value for the remaining holdings."""
    total_purchase = sum(
        qty * price
        for positions in holdings.values()
        for qty, price, _ in positions
        if qty > 0
    )
    return round(total_purchase, 2)


def calculate_unrealized_gain(current_value: float, purchase_sum: float) -> float:
    """Return the unrealized gain based on current value and purchase sum."""
    return round(current_value - purchase_sum, 2)


def calculate_unrealized_gain_pct(current_value: float, purchase_sum: float) -> float:
    """Return the unrealized gain in percent based on the purchase sum."""
    if purchase_sum == 0:
        return 0.0
    return round(((current_value - purchase_sum) / purchase_sum) * 100, 2)


def db_calculate_portfolio_value_and_count(
    portfolio_uuid: str, db_path: Path
) -> tuple[float, int]:
    """
    Berechnet Depotwert und Anzahl enthaltener Wertpapiere.

    Args:
        portfolio_uuid (str): Die UUID des Depots.
        db_path (Path): Pfad zur SQLite-Datenbank.

    Returns:
        tuple[float, int]: Der aktuelle Wert (in EUR) und die Anzahl der Wertpapiere.

    """
    # Lade die Wertpapiere des Depots aus der Tabelle portfolio_securities
    portfolio_securities = get_portfolio_securities(db_path, portfolio_uuid)

    total_value = 0.0
    active_securities_count = 0

    for ps in portfolio_securities:
        if ps.current_value and ps.current_value > 0:
            total_value += ps.current_value / 100  # Cent -> EUR
            active_securities_count += 1

    return round(total_value, 2), active_securities_count


def db_calculate_portfolio_value_only(portfolio_uuid: str, db_path: Path) -> float:
    """
    Berechnet nur den aktuellen Wert eines Depots.

    Args:
        portfolio_uuid (str): Die UUID des Depots.
        db_path (Path): Pfad zur SQLite-Datenbank.

    Returns:
        float: Der aktuelle Wert des Depots (in EUR).

    """
    total_value, _ = db_calculate_portfolio_value_and_count(portfolio_uuid, db_path)
    return total_value


def db_calculate_portfolio_securities_count(portfolio_uuid: str, db_path: Path) -> int:
    """
    Berechnet nur die Anzahl der Wertpapiere in einem Depot.

    Args:
        portfolio_uuid (str): Die UUID des Depots.
        db_path (Path): Pfad zur SQLite-Datenbank.

    Returns:
        int: Die Anzahl der Wertpapiere im Depot.

    """
    _, securities_count = db_calculate_portfolio_value_and_count(
        portfolio_uuid, db_path
    )
    return securities_count


def db_calculate_portfolio_purchase_sum(portfolio_uuid: str, db_path: Path) -> float:
    """
    Berechnet die Kaufsumme eines Depots basierend auf Kaufpreisen.

    Args:
        portfolio_uuid (str): Die UUID des Depots.
        db_path (Path): Pfad zur SQLite-Datenbank.

    Returns:
        float: Die Kaufsumme des Depots (in EUR).

    """
    # Lade die Wertpapiere des Depots aus der Tabelle portfolio_securities
    portfolio_securities = get_portfolio_securities(db_path, portfolio_uuid)

    total_purchase_sum = 0.0
    for ps in portfolio_securities:
        if ps.purchase_value and ps.purchase_value > 0:
            total_purchase_sum += ps.purchase_value / 100  # Cent -> EUR

    return round(total_purchase_sum, 2)
