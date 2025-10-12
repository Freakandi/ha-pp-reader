"""Business logic helpers for Portfolio Performance account balances."""

import logging

from custom_components.pp_reader.data.db_access import Transaction
from custom_components.pp_reader.logic.validators import PPDataValidator
from custom_components.pp_reader.util.currency import cent_to_eur, round_currency

_LOGGER = logging.getLogger(__name__)


CASH_TRANSFER_TYPE = 5


def calculate_account_balance(
    account_uuid: str, transactions: list[Transaction]
) -> float:
    """Berechne den Kontostand eines Kontos anhand aller relevanten DB-Transaktionen."""
    validator = PPDataValidator()
    saldo = 0

    for tx in transactions:
        result = validator.validate_transaction(tx)
        if not result.is_valid:
            _LOGGER.warning(result.message)
            continue

        # Alle Felder kommen direkt aus der DB-Transaction
        if account_uuid not in (tx.account, tx.other_account):
            continue

        if tx.type == CASH_TRANSFER_TYPE:  # CASH_TRANSFER
            if tx.account == account_uuid:
                saldo -= tx.amount
            elif tx.other_account == account_uuid:
                saldo += tx.amount
            continue

        if tx.account != account_uuid:
            continue

        # Typen wie in updateBalance(Account account) aus Portfolio Performance
        if tx.type in (
            6,
            9,
            8,
            12,
            1,
            CASH_TRANSFER_TYPE,
            14,
        ):
            # DEPOSIT, INTEREST, DIVIDENDS, TAX_REFUND, SELL, TRANSFER_IN, FEES_REFUND
            saldo += tx.amount

        elif tx.type in (
            7,
            13,
            10,
            11,
            0,
            CASH_TRANSFER_TYPE,
        ):
            # REMOVAL, FEES, INTEREST_CHARGE, TAXES, BUY, TRANSFER_OUT
            saldo -= tx.amount

        # Hinweis: CASH_TRANSFER bereits oben separat behandelt

    final_balance = round_currency(
        cent_to_eur(saldo, default=0.0),
        default=0.0,
    )
    result = validator.validate_account_balance(final_balance, account_uuid)
    if not result.is_valid:
        _LOGGER.warning(result.message)

    return final_balance


def db_calc_account_balance(
    account_uuid: str,
    transactions: list[Transaction],
    accounts_currency_map: dict[str, str] | None = None,
    tx_units: dict[str, dict[str, int | str]] | None = None,
) -> int:
    """
    Berechnet den Kontostand (Cent) eines Kontos.

    Berücksichtigt bei CASH_TRANSFER (Typ 5) jetzt fx_amount für das Zielkonto,
    falls verfügbar (Cross-Currency-Transfer).
    """
    saldo = 0

    for tx in transactions:
        if account_uuid not in (tx.account, tx.other_account):
            continue

        if tx.type == CASH_TRANSFER_TYPE:  # CASH_TRANSFER
            if tx.account == account_uuid:
                # Quellkonto → immer Abfluss in Originalwährung
                saldo -= tx.amount
            elif tx.other_account == account_uuid:
                # Zielkonto → ggf. Fremdwährungsbetrag verwenden
                credit_amount = tx.amount
                if accounts_currency_map and tx_units:
                    dest_ccy = accounts_currency_map.get(account_uuid)
                    unit = tx_units.get(tx.uuid)
                    if (
                        unit
                        and unit.get("fx_amount") is not None
                        and unit.get("fx_currency_code") == dest_ccy
                    ):
                        credit_amount = unit["fx_amount"]  # Cent in Zielwährung
                saldo += credit_amount
            continue

        # Normale Logik (nur Hauptkonto-Seite)
        if tx.account != account_uuid:
            continue

        if tx.type in (
            6,
            9,
            8,
            12,
            1,
            CASH_TRANSFER_TYPE,
            14,
        ):
            # DEPOSIT, INTEREST, DIVIDENDS, TAX_REFUND, SELL,
            # (TRANSFER_IN handled above), FEES_REFUND
            saldo += tx.amount
        elif tx.type in (
            7,
            13,
            10,
            11,
            0,
            CASH_TRANSFER_TYPE,
        ):
            # REMOVAL, FEES, INTEREST_CHARGE, TAXES, BUY,
            # (TRANSFER_OUT handled above)
            saldo -= tx.amount

    return saldo
