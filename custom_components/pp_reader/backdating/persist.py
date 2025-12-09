"""Persist backdating aggregates into daily wealth tables."""

from __future__ import annotations

import sqlite3
from collections import defaultdict
from typing import TYPE_CHECKING

from custom_components.pp_reader.data import db_access

if TYPE_CHECKING:
    from collections.abc import Mapping, Sequence
    from pathlib import Path

    from custom_components.pp_reader.backdating.accounts import DailyAccountSnapshot
    from custom_components.pp_reader.backdating.aggregate import DailyWealthAggregate
    from custom_components.pp_reader.backdating.holdings import DailyHoldingsSnapshot


def persist_daily_wealth(
    db_path: Path,
    aggregates: Sequence[DailyWealthAggregate],
    *,
    holdings_snapshots: Sequence[DailyHoldingsSnapshot] | None = None,
    account_snapshots: Sequence[DailyAccountSnapshot] | None = None,
    provenance: str | None = None,
) -> None:
    """Persist aggregated daily wealth and scope slices into the database."""
    if not aggregates:
        return

    conn = sqlite3.connect(str(db_path))
    try:
        _persist_daily_totals(db_path, conn, aggregates, provenance=provenance)
        _persist_daily_scopes(
            db_path,
            conn,
            aggregates,
            holdings_snapshots=holdings_snapshots or (),
            account_snapshots=account_snapshots or (),
            provenance=provenance,
        )
        conn.commit()
    finally:
        conn.close()


def _persist_daily_totals(
    db_path: Path,
    conn: sqlite3.Connection,
    aggregates: Sequence[DailyWealthAggregate],
    *,
    provenance: str | None,
) -> None:
    records = [
        db_access.DailyWealthRecord(
            date=aggregate.date,
            total_wealth_eur=aggregate.total_wealth_eur,
            portfolio_wealth_eur=aggregate.portfolio_wealth_eur,
            account_wealth_eur=aggregate.account_wealth_eur,
            dividends_eur=aggregate.dividends_eur,
            interest_eur=aggregate.interest_eur,
            inbound_transfers_eur=aggregate.inbound_transfers_eur,
            outbound_transfers_eur=aggregate.outbound_transfers_eur,
            performance_neutral_movements=aggregate.performance_neutral_movements,
            fees_eur=aggregate.fees_eur,
            taxes_eur=aggregate.taxes_eur,
            fx_coverage_ratio=aggregate.fx_coverage_ratio,
            price_coverage_ratio=aggregate.price_coverage_ratio,
            stale_price=aggregate.stale_price,
            provenance=aggregate.provenance or provenance,
        )
        for aggregate in aggregates
    ]
    db_access.upsert_daily_wealth(db_path, records, conn=conn)


def _persist_daily_scopes(  # noqa: PLR0913
    db_path: Path,
    conn: sqlite3.Connection,
    aggregates: Sequence[DailyWealthAggregate],
    *,
    holdings_snapshots: Sequence[DailyHoldingsSnapshot],
    account_snapshots: Sequence[DailyAccountSnapshot],
    provenance: str | None,
) -> None:
    if not aggregates:
        return

    holdings_by_date: Mapping[str, DailyHoldingsSnapshot] = {
        snap.date: snap for snap in holdings_snapshots
    }
    accounts_by_date: Mapping[str, DailyAccountSnapshot] = {
        snap.date: snap for snap in account_snapshots
    }

    portfolio_scope_records: list[db_access.DailyWealthScopeRecord] = []
    account_scope_records: list[db_access.DailyWealthScopeRecord] = []

    for aggregate in aggregates:
        date_iso = aggregate.date
        holdings_snap = holdings_by_date.get(date_iso)
        accounts_snap = accounts_by_date.get(date_iso)

        portfolio_scope_records.extend(
            _build_portfolio_scope_records(
                date_iso,
                holdings_snap,
                provenance=provenance,
            )
        )
        account_scope_records.extend(
            _build_account_scope_records(
                date_iso,
                accounts_snap,
                provenance=provenance,
            )
        )

    all_records = portfolio_scope_records + account_scope_records
    if all_records:
        db_access.upsert_daily_wealth_scopes(db_path, all_records, conn=conn)


def _build_portfolio_scope_records(
    date_iso: str,
    holdings_snap: DailyHoldingsSnapshot | None,
    *,
    provenance: str | None,
) -> list[db_access.DailyWealthScopeRecord]:
    if holdings_snap is None:
        return []

    per_portfolio: dict[str, dict[str, float | bool]] = defaultdict(
        lambda: {
            "total": 0.0,
            "stale": False,
            "covered_positions": 0,
            "total_positions": 0,
            "fx_covered": 0,
        }
    )

    for valuation in holdings_snap.holdings:
        value = valuation.value_eur or 0.0
        meta = per_portfolio[valuation.portfolio_uuid]
        meta["total"] += value
        meta["stale"] = bool(meta["stale"] or valuation.stale_price)
        meta["total_positions"] += 1
        if valuation.price_native is not None:
            meta["covered_positions"] += 1
        if valuation.currency == "EUR" or valuation.fx_rate:
            meta["fx_covered"] += 1

    records: list[db_access.DailyWealthScopeRecord] = []
    for portfolio_uuid, meta in per_portfolio.items():
        price_cov = (
            meta["covered_positions"] / meta["total_positions"]
            if meta["total_positions"]
            else 1.0
        )
        fx_cov = (
            meta["fx_covered"] / meta["total_positions"]
            if meta["total_positions"]
            else 1.0
        )
        records.append(
            db_access.DailyWealthScopeRecord(
                scope_type="portfolio",
                scope_id=portfolio_uuid,
                date=date_iso,
                scope_name=None,
                total_wealth_eur=round(meta["total"], 6),
                portfolio_wealth_eur=round(meta["total"], 6),
                account_wealth_eur=0.0,
                dividends_eur=0.0,
                interest_eur=0.0,
                inbound_transfers_eur=0.0,
                outbound_transfers_eur=0.0,
                performance_neutral_movements=0.0,
                fees_eur=0.0,
                taxes_eur=0.0,
                fx_coverage_ratio=round(fx_cov, 3),
                price_coverage_ratio=round(price_cov, 3),
                stale_price=bool(meta["stale"]),
                provenance=provenance,
            )
        )

    return records


def _build_account_scope_records(
    date_iso: str,
    accounts_snap: DailyAccountSnapshot | None,
    *,
    provenance: str | None,
) -> list[db_access.DailyWealthScopeRecord]:
    if accounts_snap is None:
        return []

    records: list[db_access.DailyWealthScopeRecord] = []
    for valuation in accounts_snap.accounts:
        balance_eur = valuation.balance_eur
        fx_cov = 1.0 if valuation.currency == "EUR" else 0.0
        if valuation.currency != "EUR" and valuation.fx_rate:
            fx_cov = 1.0
        records.append(
            db_access.DailyWealthScopeRecord(
                scope_type="account",
                scope_id=valuation.account_uuid,
                date=date_iso,
                scope_name=None,
                total_wealth_eur=balance_eur or 0.0,
                portfolio_wealth_eur=0.0,
                account_wealth_eur=balance_eur or 0.0,
                dividends_eur=0.0,
                interest_eur=0.0,
                inbound_transfers_eur=0.0,
                outbound_transfers_eur=0.0,
                performance_neutral_movements=0.0,
                fees_eur=0.0,
                taxes_eur=0.0,
                fx_coverage_ratio=round(fx_cov, 3),
                price_coverage_ratio=1.0,
                stale_price=False,
                provenance=provenance,
            )
        )

    return records
