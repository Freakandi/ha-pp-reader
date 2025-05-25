from typing import List, Dict
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

def db_calc_account_balance(account_uuid: str, transactions: List[Transaction]) -> int:
    """
    Berechnet den Kontostand eines spezifischen Kontos basierend auf den Transaktionen.
    
    :param account_uuid: Die UUID des Kontos, dessen Kontostand berechnet werden soll.
    :param transactions: Liste der Transaktionen, die das Konto betreffen.
    :return: Berechneter Kontostand (in Cent) als Integer.
    """
    saldo = 0
    # _LOGGER.debug("Berechnung für Konto %s", account_uuid)

    for tx in transactions:
        # Prüfe, ob die Transaktion das Konto betrifft
        if tx.account != account_uuid and tx.other_account != account_uuid:
            continue

        # CASH_TRANSFER separat behandeln
        if tx.type == 5:  # CASH_TRANSFER
            if tx.account == account_uuid:
                saldo -= tx.amount
            elif tx.other_account == account_uuid:
                saldo += tx.amount
            continue

        # Berechnung für das Hauptkonto
        if tx.account == account_uuid:
            if tx.type in (6, 9, 8, 12, 1, 5, 14):  # Einzahlungen, Verkäufe, etc.
                saldo += tx.amount
            elif tx.type in (7, 13, 10, 11, 0, 5):  # Auszahlungen, Käufe, etc.
                saldo -= tx.amount

    return saldo

