import sqlite3
from ..name.abuchen.portfolio import client_pb2  # Korrigierter Import mit vorangestelltem .
from google.protobuf.timestamp_pb2 import Timestamp
import logging
from typing import Optional
from datetime import datetime
from ..data.websocket import send_dashboard_update
from ..logic.accounting import db_calc_account_balance
from ..data.db_access import get_transactions

_LOGGER = logging.getLogger(__name__)

def to_iso8601(ts: Timestamp) -> str:
    return ts.ToDatetime().isoformat() if ts is not None and ts.seconds != 0 else None

def delete_missing_entries(conn: sqlite3.Connection, table: str, id_column: str, current_ids: set):
    cur = conn.cursor()
    if not current_ids:
        cur.execute(f"DELETE FROM {table}")
    else:
        placeholders = ','.join(['?'] * len(current_ids))
        cur.execute(
            f"DELETE FROM {table} WHERE {id_column} NOT IN ({placeholders})",
            list(current_ids)
        )

def normalize_shares(shares: int) -> int:
    """Stellt sicher dass Shares als Integer gespeichert werden."""
    return int(shares) if shares is not None else None

def normalize_amount(amount: int) -> int:
    """Stellt sicher dass Beträge als Cent-Integer gespeichert werden."""
    return int(amount) if amount is not None else None

def extract_exchange_rate(pdecimal) -> float:
    """Extrahiert einen positiven Wechselkurs aus PDecimalValue."""
    if not pdecimal or not pdecimal.HasField("value"):
        return None
    value = int.from_bytes(pdecimal.value, byteorder='little', signed=True)
    return abs(value / (10 ** pdecimal.scale))

def sync_from_pclient(client: client_pb2.PClient, conn: sqlite3.Connection, hass=None, entry_id=None, last_file_update=None) -> None:
    """Synchronisiert Daten aus Portfolio Performance mit der lokalen SQLite DB."""
    cur = conn.cursor()
    stats = {
        "securities": 0,
        "transactions": 0,
        "fx_transactions": 0
    }
    changes_detected = False  # Flag, um Änderungen zu verfolgen
    updated_data = {"accounts": [], "securities": [], "portfolios": [], "transactions": []}

    try:
        conn.execute("BEGIN TRANSACTION")
        
        # Speichere das Änderungsdatum der Portfolio-Datei
        if last_file_update:
            cur.execute("""
                INSERT OR REPLACE INTO metadata (key, date) VALUES ('last_file_update', ?)
            """, (last_file_update,))
            _LOGGER.debug("📅 Änderungsdatum der Portfolio-Datei gespeichert: %s", last_file_update)

            # Setze changes_detected auf True, wenn sich das Änderungsdatum geändert hat
            changes_detected = True

        # --- TRANSACTIONS ---
        _LOGGER.debug("Synchronisiere Transaktionen...")
        transaction_ids = {t.uuid for t in client.transactions}
        delete_missing_entries(conn, "transactions", "uuid", transaction_ids)

        for t in client.transactions:
            cur.execute("""
                SELECT * FROM transactions WHERE uuid = ?
            """, (t.uuid,))
            existing_transaction = cur.fetchone()

            new_transaction_data = (
                t.uuid,
                int(t.type),
                t.account if t.HasField("account") else None,
                t.portfolio if t.HasField("portfolio") else None,
                t.otherAccount if t.HasField("otherAccount") else None,
                t.otherPortfolio if t.HasField("otherPortfolio") else None,
                t.otherUuid if t.HasField("otherUuid") else None,
                to_iso8601(t.otherUpdatedAt) if t.HasField("otherUpdatedAt") else None,
                to_iso8601(t.date),
                t.currencyCode,
                normalize_amount(t.amount),
                normalize_shares(t.shares) if t.HasField("shares") else None,
                t.note if t.HasField("note") else None,
                t.security if t.HasField("security") else None,
                t.source if t.HasField("source") else None,
                to_iso8601(t.updatedAt)
            )

            if not existing_transaction or existing_transaction != new_transaction_data:
                changes_detected = True
                updated_data["transactions"].append(t.uuid)

                cur.execute("""
                    INSERT OR REPLACE INTO transactions (
                        uuid, type, account, portfolio, other_account, other_portfolio,
                        other_uuid, other_updated_at, date, currency_code, amount,
                        shares, note, security, source, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, new_transaction_data)
            stats["transactions"] += 1

        # Transaktionen nach dem Einfügen bestätigen
        conn.commit()  # Beende die Transaktion, um die Sperre aufzuheben
        _LOGGER.debug("Transaktionen in der DB bestätigt.")

        # Transaktionen nach dem Einfügen erneut laden
        _LOGGER.debug("Lade Transaktionen aus der DB nach dem Einfügen...")
        all_transactions = get_transactions(conn=conn)  # Lade alle Transaktionen erneut

        # --- ACCOUNTS ---
        _LOGGER.debug("Synchronisiere Konten...")
        account_ids = {acc.uuid for acc in client.accounts}
        delete_missing_entries(conn, "accounts", "uuid", account_ids)

        for acc in client.accounts:
            cur.execute("""
                SELECT uuid, name, currency_code, note, is_retired, updated_at FROM accounts WHERE uuid = ?
            """, (acc.uuid,))
            existing_account = cur.fetchone()

            new_account_data = (
                acc.uuid,
                acc.name,
                acc.currencyCode,
                acc.note if acc.HasField("note") else None,
                1 if getattr(acc, "isRetired", False) else 0,
                to_iso8601(acc.updatedAt) if acc.HasField("updatedAt") else None
            )

            if not existing_account or existing_account != new_account_data:
                changes_detected = True
                updated_data["accounts"].append(acc.uuid)

                # Prüfe, ob das Konto "retired" ist
                if getattr(acc, "isRetired", False):
                    balance = 0  # Retired-Konten haben immer Kontostand 0
                    _LOGGER.debug("Gesetzter Kontostand für inaktives Konto %s: %d", acc.uuid, balance)
                else:
                    # Filtere Transaktionen, die das Konto betreffen
                    _LOGGER.debug("Verarbeite Konto: %s", acc.uuid)
                    account_transactions = [
                        tx for tx in all_transactions
                        if tx.account == acc.uuid or tx.other_account == acc.uuid
                    ]
                    balance = db_calc_account_balance(acc.uuid, account_transactions)
                    _LOGGER.debug("Berechneter Kontostand für Konto %s: %d", acc.uuid, balance)

                cur.execute("""
                    INSERT OR REPLACE INTO accounts 
                    (uuid, name, currency_code, note, is_retired, updated_at, balance)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (*new_account_data, balance))

        # --- SECURITIES ---
        _LOGGER.debug("Synchronisiere Wertpapiere...")
        security_ids = {sec.uuid for sec in client.securities}
        delete_missing_entries(conn, "securities", "uuid", security_ids)

        for sec in client.securities:
            cur.execute("""
                SELECT * FROM securities WHERE uuid = ?
            """, (sec.uuid,))
            existing_security = cur.fetchone()

            new_security_data = (
                sec.uuid,
                sec.name,
                sec.currencyCode,
                sec.note if sec.HasField("note") else None,
                sec.isin if sec.HasField("isin") else None,
                sec.wkn if sec.HasField("wkn") else None,
                sec.tickerSymbol if sec.HasField("tickerSymbol") else None,
                1 if getattr(sec, "isRetired", False) else 0,
                to_iso8601(sec.updatedAt) if sec.HasField("updatedAt") else None
            )

            if not existing_security or existing_security != new_security_data:
                changes_detected = True
                updated_data["securities"].append(sec.uuid)

                cur.execute("""
                    INSERT OR REPLACE INTO securities (
                        uuid, name, currency_code, 
                        note, isin, wkn, ticker_symbol,
                        retired, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, new_security_data)
            stats["securities"] += 1

            # Latest price speichern falls vorhanden
            if sec.HasField("latest"):
                cur.execute("""
                    INSERT OR REPLACE INTO latest_prices 
                    (security_uuid, value, date)
                    VALUES (?, ?, ?)
                """, (
                    sec.uuid,
                    sec.latest.close,
                    sec.latest.date  # Unix Timestamp direkt aus Protobuf verwenden
                ))

        # --- PORTFOLIOS ---
        portfolio_ids = {p.uuid for p in client.portfolios}
        delete_missing_entries(conn, "portfolios", "uuid", portfolio_ids)

        for p in client.portfolios:
            cur.execute("""
                SELECT * FROM portfolios WHERE uuid = ?
            """, (p.uuid,))
            existing_portfolio = cur.fetchone()

            new_portfolio_data = (
                p.uuid,
                p.name,
                p.note if p.HasField("note") else None,
                p.referenceAccount if p.HasField("referenceAccount") else None,
                int(p.isRetired),
                to_iso8601(p.updatedAt) if p.HasField("updatedAt") else None
            )

            if not existing_portfolio or existing_portfolio != new_portfolio_data:
                changes_detected = True
                updated_data["portfolios"].append(p.uuid)

                cur.execute("""
                    INSERT OR REPLACE INTO portfolios (uuid, name, note, reference_account, is_retired, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, new_portfolio_data)

        # --- TRANSACTION_UNITS ---
# Vor dem Einfügen: Alle bestehenden transaction_units löschen (volles Rebuild)
        cur.execute("DELETE FROM transaction_units")

        for t in client.transactions:
            for u in t.units:
                # fxRateToBase ist optional im Protobuf
                fx_rate = None
                if u.HasField("fxRateToBase"):
                    scale = u.fxRateToBase.scale
                    value = int.from_bytes(u.fxRateToBase.value, byteorder='little', signed=True)
                    fx_rate = abs(value / (10 ** scale))

                cur.execute("""
                    INSERT INTO transaction_units (
                        transaction_uuid, type, amount, currency_code,
                        fx_amount, fx_currency_code, fx_rate_to_base
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    t.uuid,
                    u.type,
                    u.amount,
                    u.currencyCode,
                    u.fxAmount if u.HasField("fxAmount") else None,
                    u.fxCurrencyCode if u.HasField("fxCurrencyCode") else None,
                    fx_rate  # Kann nun None sein
                ))
                if u.HasField("fxAmount"):
                    stats["fx_transactions"] += 1

        conn.commit()
        _LOGGER.info(
            "Import abgeschlossen: %d Wertpapiere, %d Transaktionen (%d mit Fremdwährung)",
            stats["securities"], stats["transactions"], stats["fx_transactions"]
        )

        # Sende das Update-Event, wenn Änderungen erkannt wurden
        _LOGGER.debug("Sende Dashboard-Update mit entry_id: %s", entry_id)
        if changes_detected and hass and entry_id:
            send_dashboard_update(hass, entry_id, updated_data)
            _LOGGER.debug("📡 Update-Event gesendet: %s", updated_data)
        else:
            # Logge die fehlenden Voraussetzungen
            _LOGGER.error(
                "❌ send_dashboard_update wurde nicht aufgerufen. Gründe:\n"
                "  - changes_detected: %s\n"
                "  - hass: %s\n"
                "  - entry_id: %s\n"
                "  - updated_data: %s",
                changes_detected,
                hass,
                entry_id,
                updated_data
            )

    except Exception as e:
        conn.rollback()
        _LOGGER.error("Fehler während der Synchronisation: %s", str(e))
        raise
    finally:
        cur.close()
