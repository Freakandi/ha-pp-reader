from typing import List
from ..data.db_access import Transaction, get_transactions
from ..logic.validators import PPDataValidator
import logging

_LOGGER = logging.getLogger(__name__)

def calculate_account_balance(account_uuid: str, transactions: List[Transaction]) -> float:
    """Berechne den Kontostand eines Kontos anhand aller relevanten DB-Transaktionen."""
    validator = PPDataValidator()
    saldo = 0

    for tx in transactions:
        result = validator.validate_transaction(tx)
        if not result.is_valid:
            _LOGGER.warning(result.message)
            continue
            
        # Alle Felder kommen direkt aus der DB-Transaction
        if tx.account != account_uuid and tx.other_account != account_uuid:
            continue

        if tx.type == 5:  # CASH_TRANSFER
            if tx.account == account_uuid:
                saldo -= tx.amount
            elif tx.other_account == account_uuid:
                saldo += tx.amount
            continue

        if tx.account != account_uuid:
            continue

        # Typen wie in updateBalance(Account account) aus Portfolio Performance
        if tx.type in (6, 9, 8, 12, 1, 5, 14):  # DEPOSIT, INTEREST, DIVIDENDS, TAX_REFUND, SELL, TRANSFER_IN, FEES_REFUND
            saldo += tx.amount

        elif tx.type in (7, 13, 10, 11, 0, 5):  # REMOVAL, FEES, INTEREST_CHARGE, TAXES, BUY, TRANSFER_OUT
            saldo -= tx.amount

        # Hinweis: CASH_TRANSFER bereits oben separat behandelt

    final_balance = saldo / 100.0  # Cent → Euro
    result = validator.validate_account_balance(final_balance, account_uuid)
    if not result.is_valid:
        _LOGGER.warning(result.message)

    return final_balance

