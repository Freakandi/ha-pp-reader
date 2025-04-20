# accounting.py

def calculate_account_balance(account_uuid, transactions):
    """Berechne den Kontostand eines Kontos anhand aller relevanten Transaktionen."""

    saldo = 0

    for tx in transactions:
        if tx.account != account_uuid and tx.otherAccount != account_uuid:
            continue

        # CASH_TRANSFER → Quelle = negativ, Ziel = positiv
        if tx.type == 5:  # CASH_TRANSFER
            if tx.account == account_uuid:
                saldo -= tx.amount
            elif tx.otherAccount == account_uuid:
                saldo += tx.amount
            continue

        if tx.account != account_uuid:
            continue

        # Transaktionen mit tx.amount als bereits "bereinigtem" Netto-Wert
        if tx.type in (1, 8, 9, 12, 14):  # SALE, DIVIDEND, INTEREST, TAX_REFUND, FEE_REFUND
            saldo += tx.amount

        elif tx.type in (0, 6, 11, 13):  # PURCHASE, DEPOSIT, TAX, FEE
            saldo -= tx.amount

        elif tx.type == 10:  # INTEREST_CHARGE
            saldo -= tx.amount

        elif tx.type == 7:  # REMOVAL
            saldo -= tx.amount

    return saldo / 100.0  # Cent → Euro
