"""Module to update daily wealth for 'today' using live metrics."""

from __future__ import annotations

import logging
import sqlite3
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from custom_components.pp_reader.util.currency import cent_to_eur

if TYPE_CHECKING:
    from pathlib import Path



_LOGGER = logging.getLogger(__name__)


def update_today_wealth(db_path: Path, metric_run_uuid: str) -> None:
    """
    Update the 'daily_wealth' and 'daily_wealth_scopes' tables for the current day.

    Uses the just-calculated metrics (from metric_run_uuid) to update the Market Value
    (Total Wealth, Portfolio Value, Account Value) for the current day, while preserving
    cumulative flows (Invested Capital, Dividends, etc.) from the most recent previous
    record (or existing record for today).

    This ensures the 'Time Series' tab shows the same 'Total Wealth' as the 'Overview'
    tab immediately after a price update, without requiring a full backfill.
    """
    today_iso = datetime.now(UTC).date().isoformat()

    with sqlite3.connect(str(db_path)) as conn:
        # 1. Fetch Aggregates from Metrics
        try:
            cur = conn.execute(
                """
                SELECT
                    SUM(current_value_cents) as port_val,
                    SUM(purchase_value_cents) as port_inv
                    -- Note: This is purchase val, not invested cap
                FROM portfolio_metrics
                WHERE metric_run_uuid = ?
                """,
                (metric_run_uuid,),
            )
            port_row = cur.fetchone()
            port_val_cents = port_row[0] or 0

            cur = conn.execute(
                """
                SELECT SUM(balance_eur_cents)
                FROM account_metrics
                WHERE metric_run_uuid = ?
                """,
                (metric_run_uuid,),
            )
            acc_row = cur.fetchone()
            acc_val_cents = acc_row[0] or 0

        except sqlite3.Error:
            _LOGGER.exception("Failed to fetch metrics for live update")
            return

        port_val_eur = cent_to_eur(port_val_cents) or 0.0
        acc_val_eur = cent_to_eur(acc_val_cents) or 0.0
        total_wealth_eur = round(port_val_eur + acc_val_eur, 2)

        # 2. Fetch Latest Daily Wealth Record (for static fields)
        # We prefer a record for 'today' if it exists (to keep flows if backfill
        # ran today), otherwise 'yesterday' (or latest).
        try:
            conn.row_factory = sqlite3.Row
            cur = conn.execute(
                """
                SELECT * FROM daily_wealth
                ORDER BY date DESC
                LIMIT 1
                """
            )
            latest_row = cur.fetchone()
        except sqlite3.Error:
            _LOGGER.exception("Failed to fetch latest daily_wealth")
            return

        # Default static values if table is empty
        static_values = {
            "dividends_eur": 0.0,
            "interest_eur": 0.0,
            "inbound_transfers_eur": 0.0,
            "outbound_transfers_eur": 0.0,
            "performance_neutral_movements": 0.0,
            "fees_eur": 0.0,
            "taxes_eur": 0.0,
            "invested_capital_eur": 0.0,  # Fallback
            "stale_price": 0,
            "fx_coverage_ratio": 1.0,  # Approximate
            "price_coverage_ratio": 1.0,  # Approximate
        }

        if latest_row:
            # If we have a row, copy its cumulative/static fields
            # We assume flows (invested_capital, dividends) don't change by price update
            for key in static_values:
                if key in latest_row.keys():  # noqa: SIM118
                    static_values[key] = latest_row[key]

        # Calculate Unrealized Gains (Total Wealth - Invested Capital)
        # Note: invested_capital in daily_wealth is "Flows so far".
        # So Wealth - Flows = Gains (Realized + Unrealized usually, but here we
        # treat diff as mostly unrealized change)
        # 3. Upsert Daily Wealth
        try:
            upsert_sql = """
            INSERT INTO daily_wealth (
                date,
                total_wealth_eur,
                portfolio_wealth_eur,
                account_wealth_eur,
                dividends_eur,
                interest_eur,
                inbound_transfers_eur,
                outbound_transfers_eur,
                performance_neutral_movements,
                fees_eur,
                taxes_eur,
                invested_capital_eur,
                fx_coverage_ratio,
                price_coverage_ratio,
                stale_price,
                provenance,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(date) DO UPDATE SET
                total_wealth_eur=excluded.total_wealth_eur,
                portfolio_wealth_eur=excluded.portfolio_wealth_eur,
                account_wealth_eur=excluded.account_wealth_eur,
                provenance=excluded.provenance,
                updated_at=excluded.updated_at
            """
            # Note: We do NOT update flow columns in ON CONFLICT, preserving what
            # might have been there if 'today' already existed (e.g. from a backfill).
            # If 'latest_row' is 'yesterday', we are carrying forward yesterday's flows
            # to today. Safe (no file update).

            conn.execute(
                upsert_sql,
                (
                    today_iso,
                    total_wealth_eur,
                    round(port_val_eur, 2),
                    round(acc_val_eur, 2),
                    static_values["dividends_eur"],
                    static_values["interest_eur"],
                    static_values["inbound_transfers_eur"],
                    static_values["outbound_transfers_eur"],
                    static_values["performance_neutral_movements"],
                    static_values["fees_eur"],
                    static_values["taxes_eur"],
                    static_values["invested_capital_eur"],
                    static_values["fx_coverage_ratio"],
                    static_values["price_coverage_ratio"],
                    static_values["stale_price"],
                    "live_update",
                    datetime.now(UTC).date().isoformat(),
                ),
            )
        except sqlite3.Error:
            _LOGGER.exception("Failed to upsert daily_wealth")

        # 4. Update Scopes (Portfolios)
        _update_portfolio_scopes(conn, metric_run_uuid, today_iso)

        # 5. Update Scopes (Accounts)
        _update_account_scopes(conn, metric_run_uuid, today_iso)

        conn.commit()


def _update_portfolio_scopes(
    conn: sqlite3.Connection,
    run_uuid: str,
    today_iso: str,
) -> None:
    """Update daily_wealth_scopes for portfolios."""
    # Get new values
    cur = conn.execute(
        """
        SELECT portfolio_uuid, current_value_cents
        FROM portfolio_metrics
        WHERE metric_run_uuid = ?
        """,
        (run_uuid,),
    )
    new_vals = {row[0]: (cent_to_eur(row[1]) or 0.0) for row in cur.fetchall()}

    # Get existing (or latest) static values for each portfolio
    # Complex query to get latest date per scope_id
    # We simplify: Just query for today or latest
    # If we don't find today, we fallback to latest.

    # Efficient strategy: Get latest Record for ALL portfolio scopes
    # SELECT * FROM daily_wealth_scopes WHERE scope_type='portfolio'
    # AND date = MAX(date)
    # But different portfolios might have different max dates if retired?
    # Assuming standard backfill keeps them aligned.

    # Just fetch ALL latest portfolio scopes.
    cur = conn.execute(
        """
        SELECT scope_id, invested_capital_eur, dividends_eur, interest_eur,
               fees_eur, taxes_eur, performance_neutral_movements,
               inbound_transfers_eur, outbound_transfers_eur, realized_gains_eur, date
        FROM daily_wealth_scopes
        WHERE scope_type = 'portfolio'
        ORDER BY date ASC
        """
    )
    # Use dict to keep only latest per scope_id
    latest_scopes: dict[str, dict[str, Any]] = {}
    for row in cur.fetchall():
        latest_scopes[row[0]] = {
            "invested": row[1],
            "div": row[2],
            "int": row[3],
            "fees": row[4],
            "taxes": row[5],
            "perf_neutral": row[6],
            "in": row[7],
            "out": row[8],
            "realized": row[9],
            "date": row[10],
        }

    # Upsert
    for port_uuid, raw_val in new_vals.items():
        scope_data = latest_scopes.get(port_uuid)

        # Defaults if new portfolio (unlikely in live update)
        invested = 0.0
        divs = 0.0
        intr = 0.0
        fees = 0.0
        taxes = 0.0
        perf_neutral = 0.0
        inbound = 0.0
        outbound = 0.0
        realized = 0.0

        if scope_data:
            invested = scope_data["invested"]
            divs = scope_data["div"]
            intr = scope_data["int"]
            fees = scope_data["fees"]
            taxes = scope_data["taxes"]
            perf_neutral = scope_data["perf_neutral"]
            inbound = scope_data["in"]
            outbound = scope_data["out"]
            realized = scope_data["realized"]

        current_val = round(raw_val, 2)
        unrealized = round(current_val - invested, 2)

        conn.execute(
            """
            INSERT INTO daily_wealth_scopes (
                scope_type, scope_id, date,
                total_wealth_eur, portfolio_wealth_eur, account_wealth_eur,
                unrealized_gains_eur, invested_capital_eur,
                dividends_eur, interest_eur, fees_eur, taxes_eur,
                performance_neutral_movements,
                inbound_transfers_eur,
                outbound_transfers_eur,
                realized_gains_eur,
                provenance,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(scope_type, scope_id, date) DO UPDATE SET
                total_wealth_eur=excluded.total_wealth_eur,
                portfolio_wealth_eur=excluded.portfolio_wealth_eur,
                unrealized_gains_eur=excluded.unrealized_gains_eur,
                provenance=excluded.provenance,
                updated_at=excluded.updated_at
            """,
            (
                "portfolio",
                port_uuid,
                today_iso,
                current_val,
                current_val,
                0.0,
                unrealized,
                invested,
                divs,
                intr,
                fees,
                taxes,
                perf_neutral,
                inbound,
                outbound,
                realized,
                "live_update",
                datetime.now(UTC).date().isoformat(),
            ),
        )


def _update_account_scopes(
    conn: sqlite3.Connection,
    run_uuid: str,
    today_iso: str,
) -> None:
    """Update daily_wealth_scopes for accounts."""
    cur = conn.execute(
        """
        SELECT account_uuid, balance_eur_cents
        FROM account_metrics
        WHERE metric_run_uuid = ?
        """,
        (run_uuid,),
    )
    new_vals = {row[0]: (cent_to_eur(row[1]) or 0.0) for row in cur.fetchall()}



    # Fetch latest scopes for static data preservation (though accounts usually have
    # 0 invested cap in wealth model?)
    cur = conn.execute(
        """
        SELECT scope_id, invested_capital_eur
        FROM daily_wealth_scopes
        WHERE scope_type = 'account'
        ORDER BY date ASC
        """
    )
    latest_scopes = {row[0]: {"invested": row[1]} for row in cur.fetchall()}

    for acc_uuid, raw_bal in new_vals.items():
        balance = round(raw_bal, 2)
        invested = 0.0
        if acc_uuid in latest_scopes:
            invested = latest_scopes[acc_uuid]["invested"]

        conn.execute(
            """
            INSERT INTO daily_wealth_scopes (
                scope_type, scope_id, date,
                total_wealth_eur, portfolio_wealth_eur, account_wealth_eur,
                unrealized_gains_eur, invested_capital_eur,
                provenance, updated_at
                -- Assuming other fields 0 for accounts as per engine_pandas
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(scope_type, scope_id, date) DO UPDATE SET
                total_wealth_eur=excluded.total_wealth_eur,
                account_wealth_eur=excluded.account_wealth_eur,
                provenance=excluded.provenance,
                updated_at=excluded.updated_at
            """,
            (
                "account",
                acc_uuid,
                today_iso,
                balance,
                0.0,
                balance,
                0.0,
                invested,
                "live_update",
                datetime.now(UTC).date().isoformat(),
            ),
        )
