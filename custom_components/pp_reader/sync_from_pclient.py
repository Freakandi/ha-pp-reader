import sqlite3
from .name.abuchen.portfolio import client_pb2  # Korrigierter Import mit vorangestelltem .
from google.protobuf.timestamp_pb2 import Timestamp
import logging
from typing import Optional

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

def sync_from_pclient(client: client_pb2.PClient, conn: sqlite3.Connection) -> None:
    """Synchronisiert Daten aus Portfolio Performance mit der lokalen SQLite DB."""
    cur = conn.cursor()
    stats = {
        "securities": 0,
        "transactions": 0,
        "fx_transactions": 0
    }
    
    try:
        conn.execute("BEGIN TRANSACTION")
        
        # --- ACCOUNTS ---
        _LOGGER.debug("Synchronisiere Konten...")
        account_ids = {acc.uuid for acc in client.accounts}
        delete_missing_entries(conn, "accounts", "uuid", account_ids)

        for acc in client.accounts:
            # Direkte Attributzugriffe für nicht-optionale Felder
            cur.execute("""
                INSERT OR REPLACE INTO accounts 
                (uuid, name, currency_code, note, is_retired, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                acc.uuid,
                acc.name,
                acc.currencyCode,  # Kein HasField() mehr für currencyCode
                acc.note if acc.HasField("note") else None,
                1 if getattr(acc, "isRetired", False) else 0,
                to_iso8601(acc.updatedAt) if acc.HasField("updatedAt") else None
            ))

        # --- SECURITIES ---
        _LOGGER.debug("Synchronisiere Wertpapiere...")
        security_ids = {sec.uuid for sec in client.securities}
        delete_missing_entries(conn, "securities", "uuid", security_ids)

        for sec in client.securities:
            # Symbol aus dem korrekten Protobuf-Feld tickerSymbol lesen
            cur.execute("""
                INSERT OR REPLACE INTO securities (
                    uuid, name, currency_code, 
                    note, isin, wkn, symbol,
                    retired, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                sec.uuid,
                sec.name,
                sec.currencyCode,
                sec.note if sec.HasField("note") else None,
                sec.isin if sec.HasField("isin") else None,
                sec.wkn if sec.HasField("wkn") else None,
                sec.tickerSymbol if sec.HasField("tickerSymbol") else None,  # Korrigierter Feldname
                1 if getattr(sec, "isRetired", False) else 0,
                to_iso8601(sec.updatedAt) if sec.HasField("updatedAt") else None
            ))
            stats["securities"] += 1

            # Latest price speichern falls vorhanden
            if sec.HasField("latest") and sec.latest.HasField("close"):
                cur.execute("""
                    INSERT OR REPLACE INTO latest_prices 
                    (security_uuid, value, updated_at)
                    VALUES (?, ?, ?)
                """, (
                    sec.uuid,
                    sec.latest.close,
                    to_iso8601(sec.latest.time) if sec.latest.HasField("time") else None
                ))

        # --- PORTFOLIOS ---
        portfolio_ids = {p.uuid for p in client.portfolios}
        delete_missing_entries(conn, "portfolios", "uuid", portfolio_ids)

        for p in client.portfolios:
            cur.execute("""
                INSERT OR REPLACE INTO portfolios (uuid, name, note, reference_account, is_retired, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                p.uuid,
                p.name,
                p.note if p.HasField("note") else None,
                p.referenceAccount if p.HasField("referenceAccount") else None,
                int(p.isRetired),
                to_iso8601(p.updatedAt) if p.HasField("updatedAt") else None
            ))

        # --- TRANSACTIONS ---
        transaction_ids = {t.uuid for t in client.transactions}
        delete_missing_entries(conn, "transactions", "uuid", transaction_ids)

        for t in client.transactions:
            cur.execute("""
                INSERT OR REPLACE INTO transactions (
                    uuid, type, account, portfolio, other_account, other_portfolio,
                    other_uuid, other_updated_at, date, currency_code, amount,
                    shares, note, security, source, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                t.uuid,
                t.type,
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
                to_iso8601(t.updatedAt) if t.HasField("updatedAt") else None
            ))
            stats["transactions"] += 1

        conn.commit()
        _LOGGER.info("Synchronisation erfolgreich abgeschlossen")
        
    except Exception as e:
        conn.rollback()
        _LOGGER.error("Fehler während der Synchronisation: %s", str(e))
        raise
    finally:
        cur.close()

    # --- TRANSACTION_UNITS ---

    # Vor dem Einfügen: Alle bestehenden transaction_units löschen (volles Rebuild)
    cur.execute("DELETE FROM transaction_units")

    for t in client.transactions:
        for u in t.units:
            fx_rate = None
            if u.HasField("fxRateToBase"):
                # Korrigierte Wechselkurs-Extraktion
                scale = u.fxRateToBase.scale
                value = int.from_bytes(u.fxRateToBase.value, byteorder='little', signed=True)
                fx_rate = abs(value / (10 ** scale))  # Immer positiver Wert

            cur.execute("""
                INSERT INTO transaction_units (
                    transaction_uuid, type, amount, currency_code,
                    fx_amount, fx_currency_code, fx_rate_to_base
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                t.uuid,
                u.type,
                u.amount,  # Cent-Beträge bleiben erhalten
                u.currencyCode,
                u.fxAmount if u.HasField("fxAmount") else None,  # Auch hier Cent
                u.fxCurrencyCode if u.HasField("fxCurrencyCode") else None,
                fx_rate
            ))
            if u.HasField("fxAmount"):
                stats["fx_transactions"] += 1

    _LOGGER.info(
        "Import abgeschlossen: %d Wertpapiere, %d Transaktionen (%d mit Fremdwährung)",
        stats["securities"], stats["transactions"], stats["fx_transactions"]
    )
