import sqlite3
from ..name.abuchen.portfolio import client_pb2
from google.protobuf.timestamp_pb2 import Timestamp
import logging
from typing import Optional
from datetime import datetime
from ..logic.accounting import db_calc_account_balance
from ..data.db_access import get_transactions

from homeassistant.core import callback
from functools import partial

DOMAIN = "pp_reader"

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

@callback
def _push_update(hass, entry_id, data_type, data):
    """Schickt ein Event ins HA-Event-Bus."""
    # Verwende call_soon_threadsafe, um sicherzustellen, dass async_fire im Event-Loop ausgeführt wird
    hass.loop.call_soon_threadsafe(
        partial(
            hass.bus.async_fire,
            f"{DOMAIN}_dashboard_updated",  # Event-Name
            {"entry_id": entry_id, "data_type": data_type, "data": data},
        )
    )

def sync_from_pclient(client: client_pb2.PClient, conn: sqlite3.Connection, hass=None, entry_id=None, last_file_update=None) -> None:
    """Synchronisiert Daten aus Portfolio Performance mit der lokalen SQLite DB."""
    cur = conn.cursor()
    stats = {
        "securities": 0,
        "transactions": 0,
        "fx_transactions": 0
    }

    # Flags für Änderungen in den jeweiligen Tabellen
    account_changes_detected = False
    transaction_changes_detected = False
    security_changes_detected = False
    portfolio_changes_detected = False
    last_file_update_change_detected = False

    updated_data = {"accounts": [], "securities": [], "portfolios": [], "transactions": []}

    try:
        conn.execute("BEGIN TRANSACTION")
        
        # Speichere das Änderungsdatum der Portfolio-Datei
        if last_file_update:
            cur.execute("""
                INSERT OR REPLACE INTO metadata (key, date) VALUES ('last_file_update', ?)
            """, (last_file_update,))
            _LOGGER.debug("sync_from_pclient: 📅 Änderungsdatum der Portfolio-Datei gespeichert: %s", last_file_update)

            # Setze das Flag für Änderungen
            last_file_update_change_detected = True

        # --- TRANSACTIONS ---
        _LOGGER.debug("sync_from_pclient: Synchronisiere Transaktionen...")
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
                transaction_changes_detected = True
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
        _LOGGER.debug("sync_from_pclient: Transaktionen in der DB bestätigt.")

        # --- ACCOUNTS ---
        _LOGGER.debug("sync_from_pclient: Synchronisiere Konten...")
        account_ids = {acc.uuid for acc in client.accounts}
        delete_missing_entries(conn, "accounts", "uuid", account_ids)

        # Berechne Transaktionen nur einmal, wenn Änderungen erkannt wurden
        all_transactions = []
        if transaction_changes_detected:
            _LOGGER.debug("sync_from_pclient: Transaktionen haben sich geändert, Kontostände werden neu berechnet.")
            _LOGGER.debug("sync_from_pclient: Lade Transaktionen aus der DB nach dem Einfügen...")
            all_transactions = get_transactions(conn=conn)  # Lade alle Transaktionen erneut

        for acc in client.accounts:
            cur.execute("""
                SELECT uuid, name, currency_code, note, is_retired, updated_at, balance FROM accounts WHERE uuid = ?
            """, (acc.uuid,))
            existing_account = cur.fetchone()

            # Einheitliche Darstellung von is_retired (immer 0 oder 1)
            is_retired = 1 if getattr(acc, "isRetired", False) else 0

            # Einheitliches Format für updated_at
            updated_at = to_iso8601(acc.updatedAt) if acc.HasField("updatedAt") else None

            new_account_data = (
                acc.uuid,
                acc.name,
                acc.currencyCode,
                acc.note if acc.HasField("note") else None,
                is_retired,  # Konsistente Darstellung
                updated_at   # Konsistentes Format
            )

            # Berechne den Kontostand nur, wenn Transaktionen geändert wurden
            if transaction_changes_detected:
                if is_retired:
                    balance = 0  # Retired-Konten haben immer Kontostand 0
                else:
                    account_transactions = [
                        tx for tx in all_transactions
                        if tx.account == acc.uuid or tx.other_account == acc.uuid
                    ]
                    balance = db_calc_account_balance(acc.uuid, account_transactions)
            else:
                # Behalte den bestehenden Kontostand bei, wenn keine Transaktionen geändert wurden
                balance = existing_account[-1] if existing_account else 0

            # Vergleiche die Daten, um Änderungen zu erkennen
            if not existing_account or existing_account[:-2] != new_account_data[:-2] or balance != (existing_account[-1] if existing_account else None):
                account_changes_detected = True
                updated_data["accounts"].append({"name": acc.name, "balance": balance, "is_retired": is_retired})

                cur.execute("""
                    INSERT OR REPLACE INTO accounts 
                    (uuid, name, currency_code, note, is_retired, updated_at, balance)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (*new_account_data, balance))

        # --- SECURITIES ---
        _LOGGER.debug("sync_from_pclient: Synchronisiere Wertpapiere...")
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
                security_changes_detected = True
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
                portfolio_changes_detected = True
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
        
    except Exception as e:
        conn.rollback()
        _LOGGER.error("sync_from_pclient: Fehler während der Synchronisation: %s", str(e))
        account_changes_detected = False
        transaction_changes_detected = False
        security_changes_detected = False
        last_file_update_change_detected = False
        raise
    finally:
        cur.close()
        _LOGGER.info(
            "sync_from_pclient: Import abgeschlossen: %d Wertpapiere, %d Transaktionen (%d mit Fremdwährung)",
            stats["securities"], stats["transactions"], stats["fx_transactions"]
        )

    # Sende Updates für geänderte Tabellen
    if hass and entry_id:
        if account_changes_detected:
            # Filtere nur aktive Konten (isRetired=False) und rechne Balance in Euro um
            updated_accounts = [
                {
                    "name": account["name"],
                    "balance": account["balance"] / 100.0  # Umrechnung von Cent in Euro
                }
                for account in updated_data["accounts"]
                if account.get("is_retired", False) is False
            ]
            if updated_accounts:
                _push_update(hass, entry_id, "accounts", updated_accounts)
                _LOGGER.debug("sync_from_pclient: 📡 Kontodaten-Update-Event gesendet: %s", updated_accounts)

        if last_file_update_change_detected:
            # Datum korrekt formatieren
            formatted_last_file_update = datetime.strptime(last_file_update, "%Y-%m-%dT%H:%M:%S").strftime("%d.%m.%Y, %H:%M")
            _push_update(hass, entry_id, "last_file_update", formatted_last_file_update)
            _LOGGER.debug("sync_from_pclient: 📡 last_file_update-Event gesendet: %s", formatted_last_file_update)

    else:
        # Logge die fehlenden Voraussetzungen
        _LOGGER.error(
            "❌ sync_from_pclient: send_dashboard_update wurde nicht aufgerufen. Gründe:\n"
            "  - changes_detected: %s\n"
            "  - hass: %s\n"
            "  - entry_id: %s\n"
            "  - updated_data: %s",
            changes_detected,
            hass,
            entry_id,
            updated_data
        )
