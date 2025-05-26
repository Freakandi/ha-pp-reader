import sqlite3
from ..name.abuchen.portfolio import client_pb2
from google.protobuf.timestamp_pb2 import Timestamp
import logging
from typing import Optional
from datetime import datetime
from ..logic.accounting import db_calc_account_balance
from ..logic.securities import db_calculate_current_holdings, db_calculate_sec_purchase_value, db_calculate_holdings_value
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

def sync_from_pclient(client: client_pb2.PClient, conn: sqlite3.Connection, hass=None, entry_id=None, last_file_update=None, db_path=None) -> None:
    """Synchronisiere Daten aus Portfolio Performance mit der lokalen SQLite DB."""
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
    sec_port_changes_detected = False
    
    updated_data = {"accounts": [], "securities": [], "portfolios": [], "transactions": []}

    try:
        conn.execute("BEGIN TRANSACTION")
        
        # Speichere das Änderungsdatum der Portfolio-Datei
        if last_file_update:
            cur.execute("""
                INSERT OR REPLACE INTO metadata (key, date) VALUES ('last_file_update', ?)
            """, (last_file_update,))

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
        account_ids = {acc.uuid for acc in client.accounts}
        delete_missing_entries(conn, "accounts", "uuid", account_ids)

        # Berechne Transaktionen nur einmal, wenn Änderungen erkannt wurden
        all_transactions = []
        if transaction_changes_detected:
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
            # Lade den bestehenden Eintrag aus der Tabelle securities
            cur.execute("""
                SELECT * FROM securities WHERE uuid = ?
            """, (sec.uuid,))
            existing_security = cur.fetchone()

            # Einheitliche Darstellung von retired (immer 0 oder 1)
            retired = 1 if getattr(sec, "isRetired", False) else 0

            # Einheitliches Format für updated_at
            updated_at = to_iso8601(sec.updatedAt) if sec.HasField("updatedAt") else None

            # Neue Daten für das Wertpapier
            new_security_data = (
                sec.uuid,
                sec.name,
                sec.currencyCode,
                sec.note if sec.HasField("note") else None,
                sec.isin if sec.HasField("isin") else None,
                sec.wkn if sec.HasField("wkn") else None,
                sec.tickerSymbol if sec.HasField("tickerSymbol") else None,
                retired,  # Konsistente Darstellung
                updated_at  # Konsistentes Format
            )

            # Aktualisiere die Tabelle securities, wenn sich die Daten geändert haben
            if not existing_security or existing_security[:-2] != new_security_data:
                security_changes_detected = True
                updated_data["securities"].append(sec.uuid)

                cur.execute("""
                    INSERT OR REPLACE INTO securities (
                        uuid, name, currency_code, 
                        note, isin, wkn, ticker_symbol,
                        retired, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, new_security_data)

            # Aktualisiere die Tabelle historical_prices
            if sec.prices:
                for price in sec.prices:
                    # Konvertiere das Datum aus epoch day in ISO-8601
                    price_date_iso = to_iso8601(Timestamp(seconds=price.date * 86400))  # epoch day -> seconds -> ISO-8601
                    cur.execute("""
                        INSERT OR REPLACE INTO historical_prices (
                            security_uuid, date, close, high, low, volume
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        sec.uuid,
                        price_date_iso,  # Datum im ISO-8601-Format
                        price.close,  # Schlusskurs
                        price.high if hasattr(price, "high") else None,  # Höchstkurs
                        price.low if hasattr(price, "low") else None,  # Tiefstkurs
                        price.volume if hasattr(price, "volume") else None  # Handelsvolumen
                    ))

            # Aktualisiere den letzten Preis und das Datum in der Tabelle securities
            if sec.prices:
                security_changes_detected = True
                latest_price = max(sec.prices, key=lambda p: p.date)
                latest_price_date_iso = to_iso8601(Timestamp(seconds=latest_price.date * 86400))  # epoch day -> seconds -> ISO-8601
                cur.execute("""
                    UPDATE securities
                    SET last_price = ?, last_price_date = ?
                    WHERE uuid = ?
                """, (
                    latest_price.close,  # Letzter Preis
                    latest_price_date_iso,  # Datum des letzten Preises im ISO-8601-Format
                    sec.uuid
                ))

            stats["securities"] += 1

        # --- PORTFOLIOS ---
        portfolio_ids = {p.uuid for p in client.portfolios}
        delete_missing_entries(conn, "portfolios", "uuid", portfolio_ids)

        for p in client.portfolios:
            cur.execute("""
                SELECT * FROM portfolios WHERE uuid = ?
            """, (p.uuid,))
            existing_portfolio = cur.fetchone()

            # Einheitliche Darstellung von is_retired (immer 0 oder 1)
            is_retired = 1 if getattr(p, "isRetired", False) else 0

            # Einheitliches Format für updated_at
            updated_at = to_iso8601(p.updatedAt) if p.HasField("updatedAt") else None

            new_portfolio_data = (
                p.uuid,
                p.name,
                p.note if p.HasField("note") else None,
                p.referenceAccount if p.HasField("referenceAccount") else None,
                is_retired,  # Konsistente Darstellung
                updated_at   # Konsistentes Format
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

        conn.commit()  # Beende die Transaktion, um die Sperre aufzuheben
        _LOGGER.debug("sync_from_pclient: Transaktionen, Wertpapiere und Portfolios in der DB bestätigt.")

        # --- NEUE LOGIK: Befüllen der Tabelle portfolio_securities ---
        if transaction_changes_detected or security_changes_detected:
            _LOGGER.debug("sync_from_pclient: Berechne und synchronisiere portfolio_securities...")

            # Lade alle Transaktionen aus der DB
            all_transactions = get_transactions(conn=conn)

            # Berechne current_holdings und purchase_value
            current_holdings = db_calculate_current_holdings(all_transactions)
            purchase_values = db_calculate_sec_purchase_value(all_transactions, db_path)

            current_hold_pur = {}  # Dictionary für aktuelle Bestände und Kaufwerte

            # Füge purchase_value zu current_holdings hinzu
            for key, purchase_value in purchase_values.items():
                if key in current_holdings:
                    current_hold_pur[key] = {
                        "current_holdings": current_holdings[key],
                        "purchase_value": purchase_value
                    }

            # Berechne den aktuellen Wert (current_value)
            current_holdings_values = db_calculate_holdings_value(db_path, conn, current_hold_pur)

            # Iteriere über die berechneten Werte und vergleiche mit der DB
            for (portfolio_uuid, security_uuid), data in current_holdings_values.items():
                current_holdings = data.get("current_holdings", 0)
                purchase_value = data.get("purchase_value", 0)
                current_value = data.get("current_value", 0)

                # Lade den aktuellen Eintrag aus der Tabelle portfolio_securities
                cur.execute("""
                    SELECT current_holdings, purchase_value, current_value 
                    FROM portfolio_securities
                    WHERE portfolio_uuid = ? AND security_uuid = ?
                """, (portfolio_uuid, security_uuid))
                existing_entry = cur.fetchone()

                # Debug-Log für Vergleich
                _LOGGER.debug(
                    "Vergleiche existing_entry=%s mit (current_holdings=%f, purchase_value=%d, current_value=%d)",
                    existing_entry, current_holdings, int(purchase_value * 100), int(current_value * 100)
                )

                # Vergleiche mit den berechneten Werten
                if not existing_entry or existing_entry != (
                    current_holdings, 
                    int(purchase_value * 100),  # EUR -> Cent
                    int(current_value * 100)   # EUR -> Cent
                ):
                    sec_port_changes_detected = True

                    # Aktualisiere oder füge den Eintrag in die Tabelle ein
                    cur.execute("""
                        INSERT OR REPLACE INTO portfolio_securities (
                            portfolio_uuid, security_uuid, current_holdings, purchase_value, current_value
                        ) VALUES (?, ?, ?, ?, ?)
                    """, (
                        portfolio_uuid, 
                        security_uuid, 
                        current_holdings, 
                        int(purchase_value * 100),  # EUR -> Cent
                        int(current_value * 100)   # EUR -> Cent
                    ))
                    _LOGGER.debug("sync_from_pclient: portfolio_securities Daten eingefügt oder aktualisiert.")

            # Entferne veraltete Einträge aus portfolio_securities
            portfolio_security_keys = list(current_holdings_values.keys())  # Konvertiere die Menge in eine Liste
            if portfolio_security_keys:
                # Lösche Einträge, die nicht mehr in den aktuellen Werten enthalten sind
                cur.executemany("""
                    DELETE FROM portfolio_securities
                    WHERE portfolio_uuid = ? AND security_uuid = ?
                """, portfolio_security_keys)
                if cur.rowcount > 0:  # Wenn Einträge gelöscht wurden
                    sec_port_changes_detected = True
                    _LOGGER.debug("sync_from_pclient: Veraltete Einträge aus portfolio_securities entfernt.")
            else:
                _LOGGER.debug("sync_from_pclient: Keine veralteten Einträge in portfolio_securities gefunden.")

            conn.commit()
            _LOGGER.debug("sync_from_pclient: portfolio_securities erfolgreich synchronisiert.")
        else:
            _LOGGER.debug("sync_from_pclient: Keine Änderungen an portfolio_securities erforderlich.")

    except Exception as e:
        conn.rollback()
        _LOGGER.error("sync_from_pclient: Fehler während der Synchronisation: %s", str(e))
        account_changes_detected = False
        transaction_changes_detected = False
        security_changes_detected = False
        last_file_update_change_detected = False
        sec_port_changes_detected = False
        raise

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

        if sec_port_changes_detected:
            # Bereite die Daten für das Update vor
            portfolio_data = {}

            # Iteriere über die berechneten Werte in current_holdings_values
            for (portfolio_uuid, security_uuid), data in current_holdings_values.items():
                current_value = data.get("current_value", 0)
                purchase_value = data.get("purchase_value", 0)

                # Initialisiere das Portfolio, falls es noch nicht im Dictionary ist
                if portfolio_uuid not in portfolio_data:
                    portfolio_data[portfolio_uuid] = {
                        "name": None,  # Der Name des Portfolios wird später gesetzt
                        "position_count": 0,
                        "current_value": 0.0,
                        "purchase_sum": 0.0,
                    }

                # Aktualisiere die Werte für das Portfolio
                portfolio_data[portfolio_uuid]["position_count"] += 1
                portfolio_data[portfolio_uuid]["current_value"] += current_value
                portfolio_data[portfolio_uuid]["purchase_sum"] += purchase_value

            # Setze die Namen der Portfolios
            cur.execute("SELECT uuid, name FROM portfolios")
            portfolio_names = {row[0]: row[1] for row in cur.fetchall()}
            for portfolio_uuid in portfolio_data:
                portfolio_data[portfolio_uuid]["name"] = portfolio_names.get(portfolio_uuid, "Unbekannt")

            # Konvertiere die Werte in das gewünschte Format
            portfolio_values = [
                {
                    "name": data["name"],
                    "position_count": data["position_count"],
                    "current_value": round(data["current_value"], 2),
                    "purchase_sum": round(data["purchase_sum"], 2),
                }
                for data in portfolio_data.values()
            ]

            # Sende das Event für portfolio_values
            _push_update(hass, entry_id, "portfolio_values", portfolio_values)
            _LOGGER.debug("sync_from_pclient: 📡 portfolio_values-Update-Event gesendet: %s", portfolio_values)
    else:
        # Logge die fehlenden Voraussetzungen
        _LOGGER.error(
            "❌ sync_from_pclient: send_dashboard_update wurde nicht aufgerufen. Gründe:\n"
            "  - changes_detected: %s\n"
            "  - hass: %s\n"
            "  - entry_id: %s\n"
            "  - updated_data: %s",
            hass,
            entry_id,
            updated_data
        )

    # Schließe den Cursor und logge den Abschluss der Synchronisation
    cur.close()
    _LOGGER.info(
        "sync_from_pclient: Import abgeschlossen: %d Wertpapiere, %d Transaktionen (%d mit Fremdwährung)",
        stats["securities"], stats["transactions"], stats["fx_transactions"]
    )
