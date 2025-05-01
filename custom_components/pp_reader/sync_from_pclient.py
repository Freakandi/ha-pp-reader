import sqlite3
from name.abuchen.portfolio import client_pb2
from google.protobuf.timestamp_pb2 import Timestamp

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

def sync_from_pclient(client: client_pb2.PClient, conn: sqlite3.Connection) -> None:
    cur = conn.cursor()

    # --- ACCOUNTS ---
    account_ids = {acc.uuid for acc in client.accounts}
    delete_missing_entries(conn, "accounts", "uuid", account_ids)

    for acc in client.accounts:
        cur.execute("""
            INSERT OR REPLACE INTO accounts (uuid, name, currency_code, note, is_retired, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            acc.uuid,
            acc.name,
            acc.currencyCode,
            acc.note if acc.HasField("note") else None,
            int(acc.isRetired),
            to_iso8601(acc.updatedAt) if acc.HasField("updatedAt") else None
        ))

    # --- SECURITIES ---
    security_ids = {sec.uuid for sec in client.securities}
    delete_missing_entries(conn, "securities", "uuid", security_ids)

    for sec in client.securities:
        latest = sec.latest if sec.HasField("latest") else None
        cur.execute("""
            INSERT OR REPLACE INTO securities (
                uuid, name, currency_code, target_currency_code, note,
                isin, ticker_symbol, wkn, calendar, feed, feed_url,
                latest_feed, latest_feed_url, latest_close, latest_high,
                latest_low, latest_volume, is_retired, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            sec.uuid,
            sec.name,
            sec.currencyCode if sec.HasField("currencyCode") else None,
            sec.targetCurrencyCode if sec.HasField("targetCurrencyCode") else None,
            sec.note if sec.HasField("note") else None,
            sec.isin if sec.HasField("isin") else None,
            sec.tickerSymbol if sec.HasField("tickerSymbol") else None,
            sec.wkn if sec.HasField("wkn") else None,
            sec.calendar if sec.HasField("calendar") else None,
            sec.feed if sec.HasField("feed") else None,
            sec.feedURL if sec.HasField("feedURL") else None,
            sec.latestFeed if sec.HasField("latestFeed") else None,
            sec.latestFeedURL if sec.HasField("latestFeedURL") else None,
            latest.close if latest else None,
            latest.high if latest else None,
            latest.low if latest else None,
            latest.volume if latest else None,
            int(sec.isRetired),
            to_iso8601(sec.updatedAt) if sec.HasField("updatedAt") else None
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
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            t.amount,
            t.shares if t.HasField("shares") else None,
            t.note if t.HasField("note") else None,
            t.security if t.HasField("security") else None,
            t.source if t.HasField("source") else None,
            to_iso8601(t.updatedAt) if t.HasField("updatedAt") else None
        ))

    conn.commit()

    # --- TRANSACTION_UNITS ---

    # Vor dem Einfügen: Alle bestehenden transaction_units löschen (volles Rebuild)
    cur.execute("DELETE FROM transaction_units")

    for t in client.transactions:
        for u in t.units:
            fx_rate = None
            if u.HasField("fxRateToBase"):
                # Umrechnen aus PDecimalValue: value = int.from_bytes(), mit scale
                scale = u.fxRateToBase.scale
                value = int.from_bytes(u.fxRateToBase.value, byteorder='big', signed=False)
                fx_rate = value / (10 ** scale)

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
                fx_rate
            ))
