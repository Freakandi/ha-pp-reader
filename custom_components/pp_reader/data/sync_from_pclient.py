"""
Module for synchronizing data from parsed .portfolio file.

This module provides functions to fill a local SQLite database,
handle transactions, accounts, securities, portfolios,
and other related data, ensuring consistency and updating the Home Assistant
event bus when changes are detected.
"""

import logging
import sqlite3
from datetime import datetime
from pathlib import (
    Path,
)
from zoneinfo import ZoneInfo

from google.protobuf.timestamp_pb2 import Timestamp
from homeassistant.const import EVENT_PANELS_UPDATED
from homeassistant.core import callback

from pp_reader.currencies.fx import (
    ensure_exchange_rates_for_dates_sync,
    load_latest_rates_sync,
)

from ..logic.accounting import db_calc_account_balance  # noqa: TID252
from ..logic.securities import (  # noqa: TID252
    db_calculate_current_holdings,
    db_calculate_holdings_value,
    db_calculate_sec_purchase_value,
)
from ..name.abuchen.portfolio import client_pb2  # noqa: TID252
from .db_access import (
    fetch_live_portfolios,  # NEU: Einheitliche Aggregationsquelle
    get_portfolio_positions,  # Für Push der Positionsdaten (lazy + change push)
    get_transactions,
)

DOMAIN = "pp_reader"

_LOGGER = logging.getLogger(__name__)


def to_iso8601(ts: Timestamp) -> str:
    """
    Convert a Google Protobuf Timestamp to an ISO 8601 formatted string.

    Parameters
    ----------
    ts : Timestamp
        The Google Protobuf Timestamp object to convert.

    Returns
    -------
    str
        The ISO 8601 formatted string representation of the timestamp,
        or None if the timestamp is invalid or has zero seconds.

    """
    return ts.ToDatetime().isoformat() if ts is not None and ts.seconds != 0 else None


def delete_missing_entries(
    conn: sqlite3.Connection, table: str, id_column: str, current_ids: set
) -> None:
    """Löscht veraltete Einträge aus einer Tabelle (Differenzabgleich)."""
    cur = conn.cursor()
    if not current_ids:
        # Wenn keine aktuellen IDs existieren, alles löschen
        _LOGGER.debug("Lösche alle Einträge aus %s (keine aktuellen IDs)", table)
        cur.execute(f"DELETE FROM {table}")
    else:
        placeholders = ",".join("?" for _ in current_ids)
        sql = f"DELETE FROM {table} WHERE {id_column} NOT IN ({placeholders})"
        cur.execute(sql, list(current_ids))
    conn.commit()


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
    value = int.from_bytes(pdecimal.value, byteorder="little", signed=True)
    return abs(value / (10**pdecimal.scale))


@callback
def _push_update(hass, entry_id, data_type, data):
    """Thread-sicheres Pushen eines Update-Events in den HA Event Loop."""
    if not hass or not entry_id:
        return
    payload = {
        "domain": DOMAIN,
        "entry_id": entry_id,
        "data_type": data_type,
        "data": data,
    }
    try:
        # Direkter thread-sicherer Aufruf der synchronen fire-Methode
        hass.loop.call_soon_threadsafe(hass.bus.fire, EVENT_PANELS_UPDATED, payload)
    except Exception:
        _LOGGER.exception("Fehler beim Schedulen des Events %s", data_type)


def sync_from_pclient(
    client: client_pb2.PClient,
    conn: sqlite3.Connection,
    hass=None,
    entry_id=None,
    last_file_update=None,
    db_path=None,
) -> None:
    """Synchronisiere Daten aus Portfolio Performance mit der lokalen SQLite DB."""
    cur = conn.cursor()
    stats = {"securities": 0, "transactions": 0, "fx_transactions": 0}

    # Flags für Änderungen in den jeweiligen Tabellen
    account_changes_detected = False
    transaction_changes_detected = False
    security_changes_detected = False
    portfolio_changes_detected = False
    last_file_update_change_detected = False
    sec_port_changes_detected = False
    # Neu: Track geänderte Portfolios (optional – falls granularer Versand gewünscht)
    changed_portfolios: set[str] = set()

    updated_data = {
        "accounts": [],
        "securities": [],
        "portfolios": [],
        "transactions": [],
    }

    try:
        conn.execute("BEGIN TRANSACTION")

        # Speichere das Änderungsdatum der Portfolio-Datei
        if last_file_update:
            cur.execute(
                """
                INSERT OR REPLACE INTO metadata (
                    key, date
                ) VALUES (
                    'last_file_update', ?
                )
            """,
                (last_file_update,),
            )

            # Setze das Flag für Änderungen
            last_file_update_change_detected = True

        # --- TRANSACTIONS ---
        # _LOGGER.debug(
        #     "sync_from_pclient: Synchronisiere Transaktionen..."  # noqa: ERA001
        # )  # noqa: ERA001, RUF100
        transaction_ids = {t.uuid for t in client.transactions}
        delete_missing_entries(conn, "transactions", "uuid", transaction_ids)

        for t in client.transactions:
            cur.execute(
                """
                SELECT * FROM transactions WHERE uuid = ?
            """,
                (t.uuid,),
            )
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
                to_iso8601(t.updatedAt),
            )

            if not existing_transaction or existing_transaction != new_transaction_data:
                transaction_changes_detected = True
                updated_data["transactions"].append(t.uuid)

                cur.execute(
                    """
                    INSERT OR REPLACE INTO transactions (
                        uuid, type, account, portfolio, other_account, other_portfolio,
                        other_uuid, other_updated_at, date, currency_code, amount,
                        shares, note, security, source, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    new_transaction_data,
                )
            stats["transactions"] += 1

        # Transaktionen nach dem Einfügen bestätigen
        conn.commit()  # Beende die Transaktion, um die Sperre aufzuheben
        # _LOGGER.debug(
        #     "sync_from_pclient: Transaktionen in der DB bestätigt."  # noqa: ERA001
        # )  # noqa: ERA001, RUF100

        # --- TRANSACTION_UNITS (vor Accounts, damit FX bei CASH_TRANSFER korrekt ist) ---
        cur.execute("DELETE FROM transaction_units")
        for t in client.transactions:
            for u in t.units:
                fx_rate = None
                if u.HasField("fxRateToBase"):
                    scale = u.fxRateToBase.scale
                    value = int.from_bytes(
                        u.fxRateToBase.value, byteorder="little", signed=True
                    )
                    fx_rate = abs(value / (10**scale))
                cur.execute(
                    """
                    INSERT INTO transaction_units (
                        transaction_uuid, type, amount, currency_code,
                        fx_amount, fx_currency_code, fx_rate_to_base
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        t.uuid,
                        u.type,
                        u.amount,
                        u.currencyCode,
                        u.fxAmount if u.HasField("fxAmount") else None,
                        u.fxCurrencyCode if u.HasField("fxCurrencyCode") else None,
                        fx_rate,
                    ),
                )
                if u.HasField("fxAmount"):
                    stats["fx_transactions"] += 1

        # FX-Units jetzt aktuell verfügbar für Kontostände
        cur.execute(
            """
            SELECT transaction_uuid, fx_amount, fx_currency_code
            FROM transaction_units
            WHERE fx_amount IS NOT NULL
            """
        )
        tx_units = {}
        for tx_uuid, fx_amount, fx_ccy in cur.fetchall():
            if fx_amount is not None and fx_ccy:
                tx_units.setdefault(
                    tx_uuid,
                    {
                        "fx_amount": fx_amount,
                        "fx_currency_code": fx_ccy,
                    },
                )

        # Alle Transaktionen einmal laden (wird für Account-Balances und später für portfolio_securities wiederverwendet)
        try:
            all_transactions = get_transactions(conn=conn)
        except Exception:
            all_transactions = []
            _LOGGER.exception(
                "sync_from_pclient: Konnte Transaktionen nicht laden (all_transactions leer)."
            )

        # --- ACCOUNTS ---
        account_ids = {acc.uuid for acc in client.accounts}
        delete_missing_entries(conn, "accounts", "uuid", account_ids)

        # Mapping vorhandener Accounts aus DB laden (kann durch Löschung eben geleert sein)
        cur.execute("SELECT uuid, currency_code FROM accounts")
        accounts_currency_map = {row[0]: row[1] or "EUR" for row in cur.fetchall()}

        for acc in client.accounts:
            # Sicherstellen, dass jede Account-Währung im Mapping ist (auch für neue Accounts)
            accounts_currency_map.setdefault(acc.uuid, acc.currencyCode or "EUR")
            cur.execute(
                """
                SELECT uuid, name, currency_code, note, is_retired, updated_at, balance
                FROM accounts
                WHERE uuid = ?
                """,
                (acc.uuid,),
            )
            existing_account = cur.fetchone()

            # Einheitliche Darstellung von is_retired (immer 0 oder 1)
            is_retired = 1 if getattr(acc, "isRetired", False) else 0

            # Einheitliches Format für updated_at
            updated_at = (
                to_iso8601(acc.updatedAt) if acc.HasField("updatedAt") else None
            )

            new_account_data = (
                acc.uuid,
                acc.name,
                acc.currencyCode,
                acc.note if acc.HasField("note") else None,
                is_retired,  # Konsistente Darstellung
                updated_at,  # Konsistentes Format
            )

            # Berechne den Kontostand nur, wenn Transaktionen geändert wurden
            if transaction_changes_detected:
                if is_retired:
                    balance = 0  # Retired-Konten haben immer Kontostand 0
                else:
                    account_transactions = [
                        tx
                        for tx in all_transactions
                        if tx.account == acc.uuid or tx.other_account == acc.uuid
                    ]
                    balance = db_calc_account_balance(
                        acc.uuid,
                        account_transactions,
                        accounts_currency_map=accounts_currency_map,
                        tx_units=tx_units,
                    )
            else:
                # Behalte den bestehenden Kontostand bei,
                # wenn keine Transaktionen geändert wurden
                balance = existing_account[-1] if existing_account else 0

            # Vergleiche die Daten, um Änderungen zu erkennen
            if (
                not existing_account
                or existing_account[1:6] != new_account_data[1:]  # name..updated_at
                or balance
                != (existing_account[6] if existing_account else None)  # balance
            ):
                account_changes_detected = True
                updated_data["accounts"].append(
                    {
                        "name": acc.name,
                        "balance": balance,  # Cent in Original-Währung
                        "currency_code": acc.currencyCode,
                        "is_retired": is_retired,
                    }
                )

                cur.execute(
                    """
                    INSERT OR REPLACE INTO accounts
                    (uuid, name, currency_code, note, is_retired, updated_at, balance)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                    (*new_account_data, balance),
                )

        # --- SECURITIES ---
        _LOGGER.debug("sync_from_pclient: Synchronisiere Wertpapiere...")
        security_ids = {sec.uuid for sec in client.securities}
        delete_missing_entries(conn, "securities", "uuid", security_ids)

        for sec in client.securities:
            # Einheitliche Darstellung retired (0/1)
            retired = 1 if getattr(sec, "isRetired", False) else 0
            updated_at = (
                to_iso8601(sec.updatedAt) if sec.HasField("updatedAt") else None
            )

            # Wir persistieren KEINE 'note' Spalte für securities (bewusste Entscheidung).
            # Falls spätere Schema-Erweiterung erforderlich wäre, muss DDL + ALL_SCHEMAS + Migration ergänzt werden.
            # Relevante Vergleichsdaten (geordnet):
            new_security_attrs = (
                sec.name,
                sec.isin if sec.HasField("isin") else None,
                sec.wkn if sec.HasField("wkn") else None,
                sec.tickerSymbol if sec.HasField("tickerSymbol") else None,
                sec.currencyCode,
                retired,
                updated_at,
            )

            cur.execute(
                """
                SELECT name, isin, wkn, ticker_symbol, currency_code, retired, updated_at
                FROM securities
                WHERE uuid = ?
                """,
                (sec.uuid,),
            )
            existing_attr_row = cur.fetchone()

            if not existing_attr_row:
                # Neu anlegen – feed behalten wir (None) als Platzhalter für mögliche spätere Quellen
                cur.execute(
                    """
                    INSERT INTO securities (
                        uuid, name, isin, wkn, ticker_symbol, feed,
                        currency_code, retired, updated_at
                    ) VALUES (?,?,?,?,?,?,?,?,?)
                    """,
                    (
                        sec.uuid,
                        new_security_attrs[0],
                        new_security_attrs[1],
                        new_security_attrs[2],
                        new_security_attrs[3],
                        None,  # feed (nicht belegt)
                        new_security_attrs[4],
                        new_security_attrs[5],
                        new_security_attrs[6],
                    ),
                )
                security_changes_detected = True
                updated_data["securities"].append(sec.uuid)
            elif existing_attr_row != new_security_attrs:
                # Nur selektives UPDATE statt REPLACE → erhält last_price / source / fetched_at
                cur.execute(
                    """
                    UPDATE securities
                    SET name=?, isin=?, wkn=?, ticker_symbol=?, currency_code=?, retired=?, updated_at=?
                    WHERE uuid=?
                    """,
                    (*new_security_attrs, sec.uuid),
                )
                security_changes_detected = True
                updated_data["securities"].append(sec.uuid)

            # Historische Preise (unverändert, aber robust gegen PHistoricalPrice ohne high/low/volume)
            if sec.prices:
                for price in sec.prices:
                    # PHistoricalPrice hat nur (date, close); PFullHistoricalPrice zusätzlich high/low/volume
                    descriptor = getattr(price, "DESCRIPTOR", None)
                    fields = descriptor.fields_by_name if descriptor else {}

                    def _opt(field: str):
                        # Liefert Wert nur, wenn Feld existiert; sonst None
                        return getattr(price, field, None) if field in fields else None

                    cur.execute(
                        """
                        INSERT OR REPLACE INTO historical_prices (
                            security_uuid, date, close, high, low, volume
                        ) VALUES (?,?,?,?,?,?)
                        """,
                        (
                            sec.uuid,
                            price.date,
                            price.close,
                            _opt("high"),
                            _opt("low"),
                            _opt("volume"),
                        ),
                    )

                # Letzten Preis (aus Datei) in securities setzen – behält live-price Felder falls später überschrieben
                latest_price = max(sec.prices, key=lambda p: p.date)
                latest_price_date_iso = to_iso8601(
                    Timestamp(seconds=latest_price.date * 86400)
                )
                cur.execute(
                    """
                    UPDATE securities
                    SET last_price = ?, last_price_date = ?
                    WHERE uuid = ?
                    """,
                    (latest_price.close, latest_price_date_iso, sec.uuid),
                )

            stats["securities"] += 1

        # --- PORTFOLIOS ---
        portfolio_ids = {p.uuid for p in client.portfolios}
        delete_missing_entries(conn, "portfolios", "uuid", portfolio_ids)

        for p in client.portfolios:
            cur.execute(
                """
                SELECT * FROM portfolios WHERE uuid = ?
            """,
                (p.uuid,),
            )
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
                updated_at,  # Konsistentes Format
            )

            if not existing_portfolio or existing_portfolio != new_portfolio_data:
                portfolio_changes_detected = True
                updated_data["portfolios"].append(p.uuid)

                cur.execute(
                    """
                    INSERT OR REPLACE INTO portfolios (
                        uuid, name, note, reference_account, is_retired, updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                """,
                    new_portfolio_data,
                )

        # --- TRANSACTION_UNITS ---
        # Vor dem Einfügen: Alle bestehenden transaction_units löschen (volles Rebuild)
        cur.execute("DELETE FROM transaction_units")

        for t in client.transactions:
            for u in t.units:
                # fxRateToBase ist optional im Protobuf
                fx_rate = None
                if u.HasField("fxRateToBase"):
                    scale = u.fxRateToBase.scale
                    value = int.from_bytes(
                        u.fxRateToBase.value, byteorder="little", signed=True
                    )
                    fx_rate = abs(value / (10**scale))

                cur.execute(
                    """
                    INSERT INTO transaction_units (
                        transaction_uuid, type, amount, currency_code,
                        fx_amount, fx_currency_code, fx_rate_to_base
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        t.uuid,
                        u.type,
                        u.amount,
                        u.currencyCode,
                        u.fxAmount if u.HasField("fxAmount") else None,
                        u.fxCurrencyCode if u.HasField("fxCurrencyCode") else None,
                        fx_rate,  # Kann nun None sein
                    ),
                )
                if u.HasField("fxAmount"):
                    stats["fx_transactions"] += 1

        conn.commit()  # Beende die Transaktion, um die Sperre aufzuheben
        # _LOGGER.debug(
        #     "sync_from_pclient: Transaktionen, Wertpapiere und "  # noqa: ERA001
        #     "Portfolios "  # noqa: ERA001
        #     "in der DB bestätigt."
        # )  # noqa: ERA001, RUF100

        # --- NEUE LOGIK: Befüllen der Tabelle portfolio_securities ---
        if transaction_changes_detected or security_changes_detected:
            _LOGGER.debug(
                "sync_from_pclient: Berechne und synchronisiere portfolio_securities..."
            )

            # all_transactions ist bereits zuvor geladen; kein erneutes get_transactions nötig
            current_holdings = db_calculate_current_holdings(all_transactions)
            purchase_values = db_calculate_sec_purchase_value(all_transactions, db_path)

            current_hold_pur = {}  # Dictionary für aktuelle Bestände und Kaufwerte

            # Füge purchase_value zu current_holdings hinzu
            for key, purchase_value in purchase_values.items():
                if key in current_holdings:
                    current_hold_pur[key] = {
                        "current_holdings": current_holdings[key],
                        "purchase_value": purchase_value,
                    }

            # Berechne den aktuellen Wert (current_value)
            current_holdings_values = db_calculate_holdings_value(
                db_path, conn, current_hold_pur
            )

            # NEU: Zähler statt Spam pro Eintrag
            portfolio_sec_processed = 0

            # Iteriere über die berechneten Werte und vergleiche mit der DB
            for (
                portfolio_uuid,
                security_uuid,
            ), data in current_holdings_values.items():
                current_holdings = data.get("current_holdings", 0)
                purchase_value = data.get("purchase_value", 0)
                current_value = data.get("current_value", 0)

                # Lade den aktuellen Eintrag aus der Tabelle portfolio_securities
                cur.execute(
                    """
                    SELECT current_holdings, purchase_value, current_value
                    FROM portfolio_securities
                    WHERE portfolio_uuid = ? AND security_uuid = ?
                """,
                    (portfolio_uuid, security_uuid),
                )
                existing_entry = cur.fetchone()

                # Vergleiche mit den berechneten Werten
                if not existing_entry or existing_entry != (
                    current_holdings,
                    int(purchase_value * 100),
                    int(current_value * 100),
                ):
                    sec_port_changes_detected = True

                    # Aktualisiere oder füge den Eintrag in die Tabelle ein
                    cur.execute(
                        """
                        INSERT OR REPLACE INTO portfolio_securities (
                            portfolio_uuid,
                            security_uuid,
                            current_holdings,
                            purchase_value,
                            current_value
                        ) VALUES (?, ?, ?, ?, ?)
                        """,
                        (
                            portfolio_uuid,
                            security_uuid,
                            current_holdings,
                            int(purchase_value * 100),  # EUR -> Cent
                            int(current_value * 100),  # EUR -> Cent
                        ),
                    )
                    portfolio_sec_processed += 1  # NEU: zählen statt pro Zeile loggen

                    # NEU (Requirement: Immer Positions- & Portfolio-Events bei Wertänderungen):
                    # Auch reine Wert-/Preisänderungen ohne Positionsanzahl-Änderung sollen
                    # ein Positions-Event auslösen → Portfolio markieren.
                    changed_portfolios.add(portfolio_uuid)

            # Entferne veraltete Einträge aus portfolio_securities
            portfolio_security_keys = set(current_holdings_values.keys())
            cur.execute(
                "SELECT portfolio_uuid, security_uuid FROM portfolio_securities"
            )
            existing_keys = set(cur.fetchall())  # Alle vorhandenen Schlüssel

            # Bestimme die veralteten Schlüssel
            keys_to_delete = existing_keys - portfolio_security_keys

            if keys_to_delete:
                # Lösche nur die veralteten Einträge
                cur.executemany(
                    """
                    DELETE FROM portfolio_securities
                    WHERE portfolio_uuid = ? AND security_uuid = ?
                """,
                    keys_to_delete,
                )
                if cur.rowcount > 0:
                    sec_port_changes_detected = True
                    # Alle gelöschten Keys zu changed_portfolios hinzufügen
                    for pk, _sk in keys_to_delete:
                        changed_portfolios.add(pk)

            # NEU: Zusammenfassendes Debug statt vieler Einzelzeilen
            _LOGGER.debug(
                "sync_from_pclient: portfolio_securities upsert summary: upserts=%d deletions=%d changes_flag=%s",
                portfolio_sec_processed,
                len(keys_to_delete),
                sec_port_changes_detected,
            )

            conn.commit()
        # else:  # noqa: ERA001
        # _LOGGER.debug(
        #     "sync_from_pclient: Keine Änderungen an "  # noqa: ERA001
        #     "portfolio_securities erforderlich."
        # )  # noqa: ERA001, RUF100

    except Exception:
        conn.rollback()
        _LOGGER.exception("sync_from_pclient: Fehler während der Synchronisation")
        account_changes_detected = False
        transaction_changes_detected = False
        security_changes_detected = False
        last_file_update_change_detected = False
        sec_port_changes_detected = False
        raise

    # Sende Updates für geänderte Tabellen
    if hass and entry_id:
        if account_changes_detected:
            # Lade alle aktiven Konten aus der DB (vollständige Liste fürs Frontend)
            cur.execute(
                """
                SELECT name, currency_code, balance
                FROM accounts
                WHERE is_retired = 0
                ORDER BY name
                """
            )
            db_accounts = [
                {
                    "name": row[0],
                    "currency_code": row[1] or "EUR",
                    "raw_balance": row[2],  # Cent in Original-Währung
                }
                for row in cur.fetchall()
            ]

            # Bestimme benötigte Fremdwährungen
            fx_currencies = {
                acc["currency_code"]
                for acc in db_accounts
                if acc["currency_code"] and acc["currency_code"] != "EUR"
            }

            fx_rates = {}
            if fx_currencies:
                try:
                    today = datetime.now()
                    ensure_exchange_rates_for_dates_sync(
                        [today], fx_currencies, db_path
                    )
                    fx_rates = load_latest_rates_sync(today, db_path)
                except Exception:
                    _LOGGER.exception(
                        "FX: Fehler beim Laden der Wechselkurse – Fremdwährungskonten werden mit EUR=0 gesendet."
                    )

            # Transformiere Accounts: orig_balance (Original), balance (EUR)
            updated_accounts = []
            for acc in db_accounts:
                currency = acc["currency_code"]
                orig_balance = acc["raw_balance"] / 100.0  # Cent -> Original-Betrag
                if currency != "EUR":
                    rate = fx_rates.get(currency)
                    if rate:
                        eur_balance = orig_balance / rate
                    else:
                        eur_balance = 0.0
                        _LOGGER.warning(
                            "FX: Kein Kurs für %s – setze EUR-Wert=0", currency
                        )
                else:
                    eur_balance = orig_balance

                updated_accounts.append(
                    {
                        "name": acc["name"],
                        "currency_code": currency,
                        "orig_balance": round(orig_balance, 2),
                        "balance": round(eur_balance, 2),  # EUR-Wert für Frontend
                    }
                )

            if updated_accounts:
                _push_update(hass, entry_id, "accounts", updated_accounts)
                _LOGGER.debug(
                    "sync_from_pclient: 📡 Kontodaten-Update-Event gesendet: %s",
                    updated_accounts,
                )

        if last_file_update_change_detected:
            # Datum korrekt formatieren
            formatted_last_file_update = (
                datetime.strptime(last_file_update, "%Y-%m-%dT%H:%M:%S")
                .replace(tzinfo=ZoneInfo("Europe/Berlin"))
                .strftime("%d.%m.%Y, %H:%M")
            )
            _push_update(hass, entry_id, "last_file_update", formatted_last_file_update)
            _LOGGER.debug(
                "sync_from_pclient: 📡 last_file_update-Event gesendet: %s",
                formatted_last_file_update,
            )

            # NEU (Single Source of Truth via fetch_live_portfolios):
            portfolio_values_payload: list[dict] = []
            portfolio_values_sent = False
            try:
                live_portfolios = fetch_live_portfolios(db_path)
                portfolio_values_payload = [
                    {
                        "uuid": p.get("uuid"),
                        "name": p.get("name", "Unbekannt"),
                        "position_count": int(p.get("position_count") or 0),
                        "current_value": round(
                            ((p.get("current_value") or 0) / 100), 2
                        ),
                        "purchase_sum": round(((p.get("purchase_sum") or 0) / 100), 2),
                    }
                    for p in live_portfolios
                    if p and p.get("uuid")
                ]
            except Exception:
                _LOGGER.exception(
                    "Fehler beim Aggregieren der Portfolio-Werte via fetch_live_portfolios"
                )

            if portfolio_values_payload:
                _push_update(
                    hass,
                    entry_id,
                    "portfolio_values",
                    portfolio_values_payload,
                )
                portfolio_values_sent = True
            else:
                _LOGGER.debug(
                    "sync_from_pclient: Keine Portfolio-Werte für Event vorhanden (fetch_live_portfolios lieferte keine Daten)"
                )

            # Neu: Positionsdaten-Push für geänderte Portfolios (granular)
            if not portfolio_values_sent:
                _LOGGER.debug(
                    "sync_from_pclient: Überspringe portfolio_positions Push – portfolio_values Event wurde nicht gesendet."
                )
            else:
                try:
                    # changed_portfolios wurde bereits befüllt (nur UUIDs behalten)
                    valid_changed = {
                        pid
                        for pid in changed_portfolios
                        if isinstance(pid, str) and len(pid) >= 8 and "-" in pid
                    }

                    # Schritt 23: Erweiterte Debug-Logs zur Nachverfolgung
                    if changed_portfolios and not valid_changed:
                        _LOGGER.debug(
                            "sync_from_pclient: changed_portfolios vorhanden (%d), aber keine gültigen UUIDs nach Filter: %s",
                            len(changed_portfolios),
                            list(changed_portfolios)[:10],
                        )
                    else:
                        _LOGGER.debug(
                            "sync_from_pclient: Kandidaten für portfolio_positions Push (valid_changed=%d): %s",
                            len(valid_changed),
                            list(valid_changed)[:10],
                        )

                    if not valid_changed:
                        _LOGGER.debug(
                            "sync_from_pclient: Keine gültigen changed_portfolios → Überspringe portfolio_positions Push."
                        )
                    else:
                        # Lädt alle Positionslisten (1 DB Query pro Depot – akzeptabel bei kleiner Anzahl)
                        positions_map = fetch_positions_for_portfolios(
                            db_path, valid_changed
                        )

                        # Schritt 24: Verbesserte Fehler-/Leere-Diagnostik vor Versand
                        empty_lists = [
                            pid for pid, pos in positions_map.items() if not pos
                        ]
                        if empty_lists:
                            _LOGGER.debug(
                                "sync_from_pclient: %d Portfolios ohne Positionen (werden trotzdem gesendet): %s",
                                len(empty_lists),
                                empty_lists[:10],
                            )

                        # Einzelnes Event pro Depot (bewusst granular für gezieltes UI-Update ohne großen Payload)
                        for pid, positions in positions_map.items():
                            try:
                                _push_update(
                                    hass,
                                    entry_id,
                                    "portfolio_positions",
                                    {
                                        "portfolio_uuid": pid,
                                        "positions": positions,
                                    },
                                )
                                _LOGGER.debug(
                                    "sync_from_pclient: 📡 portfolio_positions-Event für %s gesendet (%d Positionen)",
                                    pid,
                                    len(positions),
                                )
                            except Exception:
                                _LOGGER.exception(
                                    "sync_from_pclient: Fehler beim Senden des portfolio_positions Events für %s",
                                    pid,
                                )
                except Exception:
                    _LOGGER.exception(
                        "sync_from_pclient: Allgemeiner Fehler beim Push der portfolio_positions Events"
                    )
    else:
        # Aggregierten Änderungsstatus berechnen (nur für Debug)
        changes_detected = any(
            [
                account_changes_detected,
                transaction_changes_detected,
                security_changes_detected,
                portfolio_changes_detected,
                last_file_update_change_detected,
                sec_port_changes_detected,
            ]
        )
        _LOGGER.error(
            "❌ sync_from_pclient: Kein Event gesendet. Gründe:\n"
            "  - changes_detected: %s\n"
            "  - hass vorhanden: %s\n"
            "  - entry_id vorhanden: %s\n"
            "  - updated_data(accounts=%d, securities=%d, portfolios=%d, transactions=%d)",
            changes_detected,
            bool(hass),
            bool(entry_id),
            len(updated_data["accounts"]),
            len(updated_data["securities"]),
            len(updated_data["portfolios"]),
            len(updated_data["transactions"]),
        )

    # Schließe den Cursor und logge den Abschluss der Synchronisation
    cur.close()
    _LOGGER.info(
        "sync_from_pclient: Import abgeschlossen: %d Wertpapiere, "
        "%d Transaktionen (%d mit Fremdwährung)",
        stats["securities"],
        stats["transactions"],
        stats["fx_transactions"],
    )


def fetch_positions_for_portfolios(
    db_path: Path, portfolio_ids: set[str]
) -> dict[str, list[dict]]:
    """
    Hilfsfunktion: Lädt Positionslisten für mehrere Portfolios.
    Gibt Dict { portfolio_uuid: [ {position...}, ... ] } zurück.

    Hinweise:
      - Reihenfolge der Positionen ist jetzt alphabetisch nach Name (ORDER BY s.name ASC),
        siehe SQL in db_access.get_portfolio_positions (früher: aktueller Wert DESC).
      - Werte sind bereits in EUR normalisiert und auf 2 Nachkommastellen gerundet.
    """
    result: dict[str, list[dict]] = {}
    for pid in portfolio_ids:
        try:
            result[pid] = get_portfolio_positions(db_path, pid)
        except Exception:
            _LOGGER.exception(
                "fetch_positions_for_portfolios: Fehler beim Laden der Positionen für %s",
                pid,
            )
            result[pid] = []
    return result


# (Sicherstellen, dass am Modulende kein ausführbarer Code steht – nur Funktions-/Konstantendefinitionen)
# Entferne ggf. versehentlich hinzugefügte Debug- oder Testaufrufe wie:
# sync_from_pclient(...), print(...), o.Ä.
