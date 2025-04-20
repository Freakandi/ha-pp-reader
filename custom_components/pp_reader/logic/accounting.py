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

        if tx.type in (1, 8, 9, 12, 14):  # SALE, DIVIDEND, INTEREST, TAX_REFUND, FEE_REFUND
            gross = sum(u.amount for u in tx.units if u.type == 0)
            tax = sum(u.amount for u in tx.units if u.type == 1)
            fee = sum(u.amount for u in tx.units if u.type == 2)
            saldo += gross - tax - fee

        elif tx.type in (0, 6, 11, 13):  # PURCHASE, DEPOSIT, TAX, FEE
            total = sum(u.amount for u in tx.units)
            saldo -= total

        elif tx.type == 10:  # INTEREST_CHARGE
            total = sum(u.amount for u in tx.units)
            saldo -= total

        elif tx.type == 7:  # REMOVAL
            saldo -= tx.amount

    return saldo / 100.0  # Cent → Euro
