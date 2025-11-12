"""Streaming ingestion writer persisting parsed portfolio data to staging tables."""

from __future__ import annotations

import asyncio
import json
import sqlite3
from collections.abc import Mapping, Sequence
from contextlib import asynccontextmanager
from pathlib import Path
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from custom_components.pp_reader.util.datetime import UTC

from .db_init import clear_ingestion_stage, ensure_ingestion_tables

if TYPE_CHECKING:
    from datetime import datetime

    from custom_components.pp_reader.models import parsed as parsed_models
else:  # pragma: no cover - runtime fallback for typing only
    parsed_models = None  # type: ignore[assignment]

PARSER_META_KEY = "__pp_reader__"


def _to_iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.isoformat()
    return dt.astimezone(UTC).isoformat()


def _json_dump(value: Mapping[str, Any] | None) -> str | None:
    if not value:
        return None
    if not isinstance(value, Mapping):  # Defensive: allow mapping-like inputs
        value = dict(value)
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def _serialize_watchlists(parsed_client: Any) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for watchlist in getattr(parsed_client, "watchlists", []) or []:
        result.append(
            {
                "name": getattr(watchlist, "name", None),
                "securities": list(getattr(watchlist, "securities", []) or []),
            }
        )
    return [item for item in result if item.get("name")]


def _serialize_plans(parsed_client: Any) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for plan in getattr(parsed_client, "plans", []) or []:
        result.append(
            {
                "name": getattr(plan, "name", None),
                "note": getattr(plan, "note", None),
                "security": getattr(plan, "security", None),
                "portfolio": getattr(plan, "portfolio", None),
                "account": getattr(plan, "account", None),
                "attributes": dict(getattr(plan, "attributes", {}) or {}),
                "auto_generate": bool(getattr(plan, "auto_generate", False)),
                "date": getattr(plan, "date", None),
                "interval": getattr(plan, "interval", None),
                "amount": getattr(plan, "amount", None),
                "fees": getattr(plan, "fees", None),
                "transactions": list(getattr(plan, "transactions", []) or []),
                "taxes": getattr(plan, "taxes", None),
                "plan_type": getattr(plan, "plan_type", None),
            }
        )
    return [item for item in result if item.get("name")]


def _serialize_taxonomies(parsed_client: Any) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for taxonomy in getattr(parsed_client, "taxonomies", []) or []:
        classifications: list[dict[str, Any]] = []
        for classification in getattr(taxonomy, "classifications", []) or []:
            assignments: list[dict[str, Any]] = []
            for assignment in getattr(classification, "assignments", []) or []:
                assignments.append(
                    {
                        "investment_vehicle": getattr(
                            assignment,
                            "investment_vehicle",
                            None,
                        ),
                        "weight": getattr(assignment, "weight", None),
                        "rank": getattr(assignment, "rank", None),
                        "data": dict(getattr(assignment, "data", {}) or {}),
                    }
                )
            classifications.append(
                {
                    "id": getattr(classification, "id", None),
                    "name": getattr(classification, "name", None),
                    "parent_id": getattr(classification, "parent_id", None),
                    "note": getattr(classification, "note", None),
                    "color": getattr(classification, "color", None),
                    "weight": getattr(classification, "weight", None),
                    "rank": getattr(classification, "rank", None),
                    "data": dict(getattr(classification, "data", {}) or {}),
                    "assignments": assignments,
                }
            )

        result.append(
            {
                "id": getattr(taxonomy, "id", None),
                "name": getattr(taxonomy, "name", None),
                "source": getattr(taxonomy, "source", None),
                "dimensions": list(getattr(taxonomy, "dimensions", []) or []),
                "classifications": classifications,
            }
        )
    return [item for item in result if item.get("id")]


def _serialize_dashboards(parsed_client: Any) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for dashboard in getattr(parsed_client, "dashboards", []) or []:
        columns: list[dict[str, Any]] = []
        for column in getattr(dashboard, "columns", []) or []:
            widgets: list[dict[str, Any]] = []
            for widget in getattr(column, "widgets", []) or []:
                widgets.append(
                    {
                        "type": getattr(widget, "type", None),
                        "label": getattr(widget, "label", None),
                        "configuration": dict(
                            getattr(widget, "configuration", {}) or {}
                        ),
                    }
                )
            columns.append(
                {
                    "weight": getattr(column, "weight", None),
                    "widgets": widgets,
                }
            )

        result.append(
            {
                "name": getattr(dashboard, "name", None),
                "configuration": dict(
                    getattr(dashboard, "configuration", {}) or {}
                ),
                "columns": columns,
                "dashboard_id": getattr(dashboard, "dashboard_id", None),
            }
        )
    return [item for item in result if item.get("name")]


def _serialize_settings(parsed_client: Any) -> dict[str, Any] | None:
    settings = getattr(parsed_client, "settings", None)
    if settings is None:
        return None

    bookmarks = [
        {"label": getattr(bookmark, "label", None), "pattern": getattr(bookmark, "pattern", None)}
        for bookmark in getattr(settings, "bookmarks", []) or []
    ]
    attribute_types = [
        {
            "id": getattr(attr, "id", None),
            "name": getattr(attr, "name", None),
            "column_label": getattr(attr, "column_label", None),
            "source": getattr(attr, "source", None),
            "target": getattr(attr, "target", None),
            "type": getattr(attr, "type", None),
            "converter_class": getattr(attr, "converter_class", None),
            "properties": dict(getattr(attr, "properties", {}) or {}),
        }
        for attr in getattr(settings, "attribute_types", []) or []
    ]
    configuration_sets = [
        {
            "key": getattr(config, "key", None),
            "uuid": getattr(config, "uuid", None),
            "name": getattr(config, "name", None),
            "data": getattr(config, "data", None),
        }
        for config in getattr(settings, "configuration_sets", []) or []
    ]

    payload = {
        "bookmarks": [item for item in bookmarks if item.get("label")],
        "attribute_types": [item for item in attribute_types if item.get("id")],
        "configuration_sets": [
            item for item in configuration_sets if item.get("key")
        ],
    }
    if any(payload.values()):
        return payload
    return None


def _serialize_extra_sections(parsed_client: Any | None) -> dict[str, Any]:
    if parsed_client is None:
        return {}

    extra: dict[str, Any] = {}

    watchlists = _serialize_watchlists(parsed_client)
    if watchlists:
        extra["watchlists"] = watchlists

    plans = _serialize_plans(parsed_client)
    if plans:
        extra["plans"] = plans

    taxonomies = _serialize_taxonomies(parsed_client)
    if taxonomies:
        extra["taxonomies"] = taxonomies

    dashboards = _serialize_dashboards(parsed_client)
    if dashboards:
        extra["dashboards"] = dashboards

    settings = _serialize_settings(parsed_client)
    if settings:
        extra["settings"] = settings

    return extra


def _build_metadata_blob(
    properties: Mapping[str, Any] | None,
    parsed_client: Any | None,
) -> dict[str, Any] | None:
    props_dict: dict[str, Any] = {}
    if properties:
        props_dict = {str(key): str(value) for key, value in dict(properties).items()}

    extra_sections = _serialize_extra_sections(parsed_client)
    if not props_dict and not extra_sections:
        return None

    payload: dict[str, Any] = {
        PARSER_META_KEY: {
            "properties": props_dict,
        }
    }
    if extra_sections:
        payload[PARSER_META_KEY].update(extra_sections)
    return payload


class IngestionWriter:
    """Persist parsed portfolio entities into staging tables."""

    def __init__(self, conn: sqlite3.Connection) -> None:
        """Store connection reference for subsequent writes."""
        self._conn = conn

    def write_accounts(
        self, accounts: Sequence[parsed_models.ParsedAccount]
    ) -> None:
        """Persist parsed accounts into the staging layer."""
        if not accounts:
            return
        rows = [
            (
                account.uuid,
                account.name,
                account.currency_code,
                account.note,
                int(account.is_retired),
                _json_dump(account.attributes),
                _to_iso(account.updated_at),
            )
            for account in accounts
        ]
        self._conn.executemany(
            """
            INSERT OR REPLACE INTO ingestion_accounts (
                uuid, name, currency_code, note, is_retired, attributes, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )

    def write_portfolios(
        self, portfolios: Sequence[parsed_models.ParsedPortfolio]
    ) -> None:
        """Persist parsed portfolios into the staging layer."""
        if not portfolios:
            return
        rows = [
            (
                portfolio.uuid,
                portfolio.name,
                portfolio.note,
                portfolio.reference_account,
                int(portfolio.is_retired),
                _json_dump(portfolio.attributes),
                _to_iso(portfolio.updated_at),
            )
            for portfolio in portfolios
        ]
        self._conn.executemany(
            """
            INSERT OR REPLACE INTO ingestion_portfolios (
                uuid, name, note, reference_account, is_retired, attributes, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )

    def write_securities(
        self, securities: Sequence[parsed_models.ParsedSecurity]
    ) -> None:
        """Persist parsed securities and their price payloads."""
        if not securities:
            return

        security_rows: list[tuple[Any, ...]] = []
        price_payload: list[
            tuple[str, Sequence[parsed_models.ParsedHistoricalPrice]]
        ] = []

        for security in securities:
            latest = security.latest
            security_rows.append(
                (
                    security.uuid,
                    security.name,
                    security.currency_code,
                    security.target_currency_code,
                    security.isin,
                    security.ticker_symbol,
                    security.wkn,
                    security.note,
                    security.online_id,
                    security.feed,
                    security.feed_url,
                    security.latest_feed,
                    security.latest_feed_url,
                    latest.date if latest else None,
                    latest.close if latest else None,
                    latest.high if latest else None,
                    latest.low if latest else None,
                    latest.volume if latest else None,
                    int(security.is_retired),
                    _json_dump(security.attributes),
                    _json_dump(security.properties),
                    _to_iso(security.updated_at),
                )
            )
            if security.prices:
                price_payload.append((security.uuid, security.prices))

        self._conn.executemany(
            """
            INSERT OR REPLACE INTO ingestion_securities (
                uuid, name, currency_code, target_currency_code, isin, ticker_symbol,
                wkn, note, online_id, feed, feed_url, latest_feed, latest_feed_url,
                latest_date, latest_close, latest_high, latest_low, latest_volume,
                is_retired, attributes, properties, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
            """,
            security_rows,
        )

        if price_payload:
            self.write_historical_prices(price_payload)

    def write_transactions(
        self, transactions: Sequence[parsed_models.ParsedTransaction]
    ) -> None:
        """Persist parsed transactions and associated unit details."""
        if not transactions:
            return

        txn_rows: list[tuple[Any, ...]] = []
        unit_payload: list[
            tuple[str, Sequence[parsed_models.ParsedTransactionUnit]]
        ] = []

        for txn in transactions:
            txn_rows.append(
                (
                    txn.uuid,
                    txn.type,
                    txn.account,
                    txn.portfolio,
                    txn.other_account,
                    txn.other_portfolio,
                    txn.other_uuid,
                    _to_iso(txn.other_updated_at),
                    _to_iso(txn.date),
                    txn.currency_code,
                    txn.amount,
                    txn.shares,
                    txn.note,
                    txn.security,
                    txn.source,
                    _to_iso(txn.updated_at),
                )
            )
            if txn.units:
                unit_payload.append((txn.uuid, txn.units))

        self._conn.executemany(
            """
            INSERT OR REPLACE INTO ingestion_transactions (
                uuid, type, account, portfolio, other_account, other_portfolio,
                other_uuid, other_updated_at, date, currency_code, amount, shares,
                note, security, source, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
            """,
            txn_rows,
        )

        if unit_payload:
            self.write_transaction_units(unit_payload)

    def write_transaction_units(
        self,
        payload: Sequence[tuple[str, Sequence[parsed_models.ParsedTransactionUnit]]],
    ) -> None:
        """Persist transaction unit records linked to their parent transaction."""
        rows: list[tuple[Any, ...]] = []
        for txn_uuid, units in payload:
            for idx, unit in enumerate(units):
                rows.append(
                    (
                        txn_uuid,
                        idx,
                        unit.type,
                        unit.amount,
                        unit.currency_code,
                        unit.fx_amount,
                        unit.fx_currency_code,
                        unit.fx_rate_to_base,
                    )
                )

        if not rows:
            return

        self._conn.executemany(
            """
            INSERT OR REPLACE INTO ingestion_transaction_units (
                transaction_uuid, unit_index, type, amount, currency_code,
                fx_amount, fx_currency_code, fx_rate_to_base
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )

    def write_historical_prices(
        self,
        payload: Sequence[tuple[str, Sequence[parsed_models.ParsedHistoricalPrice]]],
    ) -> None:
        """Persist historical price series for provided securities."""
        rows = [
            (
                security_uuid,
                price.date,
                price.close,
                price.high,
                price.low,
                price.volume,
            )
            for security_uuid, prices in payload
            for price in prices
        ]

        if not rows:
            return

        self._conn.executemany(
            """
            INSERT OR REPLACE INTO ingestion_historical_prices (
                security_uuid, date, close, high, low, volume
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            rows,
        )

    def finalize_ingestion(
        self,
        *,
        file_path: str | None,
        parsed_at: datetime | None,
        pp_version: int | None,
        base_currency: str | None,
        properties: Mapping[str, Any] | None,
        parsed_client: Any | None = None,
    ) -> str:
        """Insert ingestion metadata and return the generated run identifier."""
        run_id = uuid4().hex
        metadata_blob = _build_metadata_blob(properties, parsed_client)
        self._conn.execute(
            """
            INSERT OR REPLACE INTO ingestion_metadata (
                run_id, file_path, parsed_at, pp_version, base_currency, properties
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                file_path,
                _to_iso(parsed_at),
                pp_version,
                base_currency,
                _json_dump(metadata_blob),
            ),
        )
        return run_id


@asynccontextmanager
async def async_ingestion_session(
    db_path: str | Path,
    *,
    enable_wal: bool = True,
    reset_stage: bool = True,
) -> IngestionWriter:
    """Async context manager yielding an ingestion writer on a SQLite connection."""
    db_path = Path(db_path)

    def _open_connection() -> sqlite3.Connection:
        conn = sqlite3.connect(str(db_path), check_same_thread=False)
        conn.execute("PRAGMA foreign_keys = ON")
        if enable_wal:
            conn.execute("PRAGMA journal_mode=WAL")
        return conn

    conn = await asyncio.to_thread(_open_connection)
    try:
        await asyncio.to_thread(ensure_ingestion_tables, conn)
        await asyncio.to_thread(conn.execute, "BEGIN")
        if reset_stage:
            await asyncio.to_thread(clear_ingestion_stage, conn)

        writer = IngestionWriter(conn)
        try:
            yield writer
            await asyncio.to_thread(conn.commit)
        except Exception:
            await asyncio.to_thread(conn.rollback)
            raise
    finally:
        await asyncio.to_thread(conn.close)
