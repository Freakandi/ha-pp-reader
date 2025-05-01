# accounting.py

def calculate_account_balance(account_uuid, transactions):
    """Berechne den Kontostand eines Kontos anhand aller relevanten Transaktionen."""

    validator = PPDataValidator()
    saldo = 0

    for tx in transactions:
        result = validator.validate_transaction(tx)
        if not result.is_valid:
            _LOGGER.warning(result.message)
            continue

        if tx.account != account_uuid and tx.otherAccount != account_uuid:
            continue

        # CASH_TRANSFER → Quelle = negativ, Ziel = positiv
        if tx.type == 5:  # CASH_TRANSFER
            if tx.account == account_uuid:
                saldo -= tx.amount  # TRANSFER_OUT
            elif tx.otherAccount == account_uuid:
                saldo += tx.amount  # TRANSFER_IN
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

