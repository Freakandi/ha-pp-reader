"""Helpers for loading staging data from the ingestion pipeline."""

from __future__ import annotations

import json
import sqlite3
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from custom_components.pp_reader.models import parsed

PARSER_META_KEY = "__pp_reader__"

SqliteRow = tuple[Any, ...]
PriceRow = tuple[int, int | None, int | None, int | None, int | None]
UnitRow = tuple[int, int, int | None, str | None, int | None, str | None, float | None]
_INGESTION_REQUIRED_TABLES = (
    "ingestion_metadata",
    "ingestion_accounts",
    "ingestion_portfolios",
    "ingestion_securities",
)


@dataclass(slots=True)
class IngestionSnapshot:
    """Aggregated ingestion payload constructed from staging tables."""

    metadata: dict[str, Any]
    client: parsed.ParsedClient

    @property
    def run_id(self) -> str | None:
        """Return the staging run identifier if available."""
        return self.metadata.get("run_id")

    @property
    def parsed_at(self) -> datetime | None:
        """Return the timestamp of the ingestion run."""
        return self.metadata.get("parsed_at")

    @property
    def base_currency(self) -> str | None:
        """Shortcut to the parsed client's base currency."""
        return self.client.base_currency


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    sanitized = f"{value[:-1]}+00:00" if value.endswith("Z") else value
    try:
        return datetime.fromisoformat(sanitized)
    except ValueError:
        return None


def _load_json(value: str | None) -> dict[str, Any]:
    if not value:
        return {}
    try:
        data = json.loads(value)
    except json.JSONDecodeError:
        return {}
    if isinstance(data, dict):
        return data
    return {}


def _split_metadata_properties(
    raw: Mapping[str, Any] | None,
) -> tuple[dict[str, str], dict[str, Any]]:
    if not raw:
        return {}, {}

    if PARSER_META_KEY in raw:
        meta = raw.get(PARSER_META_KEY) or {}
        if isinstance(meta, Mapping):
            props = meta.get("properties", {})
            if isinstance(props, Mapping):
                prop_map = {str(key): str(value) for key, value in props.items()}
            else:
                prop_map = {}
            extra = {key: value for key, value in meta.items() if key != "properties"}
            return prop_map, extra

    prop_map = {str(key): str(value) for key, value in dict(raw).items()}
    return prop_map, {}


def _ingestion_schema_available(conn: sqlite3.Connection) -> bool:
    """Return True when the staging tables exist in the database."""
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master "
            "WHERE type='table' AND name LIKE 'ingestion_%'"
        )
        names = {row[0] for row in cursor.fetchall()}
    except sqlite3.Error:
        return False
    return all(table in names for table in _INGESTION_REQUIRED_TABLES)


def load_metadata(conn: sqlite3.Connection) -> dict[str, Any]:
    """Return the latest ingestion metadata row."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT run_id, file_path, parsed_at, pp_version, base_currency, properties
        FROM ingestion_metadata
        ORDER BY parsed_at DESC
        LIMIT 1
        """
    )
    row = cursor.fetchone()
    if not row:
        return {}

    run_id, file_path, parsed_at, pp_version, base_currency, properties = row
    raw_properties = _load_json(properties)
    prop_map, extra_sections = _split_metadata_properties(raw_properties)
    return {
        "run_id": run_id,
        "file_path": file_path,
        "parsed_at": _parse_datetime(parsed_at),
        "pp_version": int(pp_version) if pp_version is not None else None,
        "base_currency": base_currency,
        "properties": prop_map,
        "extra_sections": extra_sections,
    }


def load_accounts(conn: sqlite3.Connection) -> list[parsed.ParsedAccount]:
    """Load all accounts from the staging layer."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT uuid, name, currency_code, note, is_retired, attributes, updated_at
        FROM ingestion_accounts
        ORDER BY rowid
        """
    )

    accounts: list[parsed.ParsedAccount] = []
    for row in cursor.fetchall():
        uuid, name, currency_code, note, is_retired, attributes, updated_at = row
        accounts.append(
            parsed.ParsedAccount(
                uuid=uuid,
                name=name or "",
                currency_code=currency_code,
                note=note,
                is_retired=bool(is_retired),
                attributes=_load_json(attributes),
                updated_at=_parse_datetime(updated_at),
            )
        )
    return accounts


def load_portfolios(conn: sqlite3.Connection) -> list[parsed.ParsedPortfolio]:
    """Load all portfolios from the staging layer."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT uuid, name, note, reference_account, is_retired, attributes, updated_at
        FROM ingestion_portfolios
        ORDER BY rowid
        """
    )

    portfolios: list[parsed.ParsedPortfolio] = []
    for row in cursor.fetchall():
        (
            uuid,
            name,
            note,
            reference_account,
            is_retired,
            attributes,
            updated_at,
        ) = row
        portfolios.append(
            parsed.ParsedPortfolio(
                uuid=uuid,
                name=name or "",
                note=note,
                reference_account=reference_account,
                is_retired=bool(is_retired),
                attributes=_load_json(attributes),
                updated_at=_parse_datetime(updated_at),
            )
        )
    return portfolios


def _load_price_rows(conn: sqlite3.Connection) -> dict[str, list[SqliteRow]]:
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT security_uuid, date, close, high, low, volume
        FROM ingestion_historical_prices
        ORDER BY security_uuid, date
        """
    )

    price_rows: dict[str, list[SqliteRow]] = {}
    for row in cursor.fetchall():
        security_uuid = row[0]
        price_rows.setdefault(security_uuid, []).append(row)
    return price_rows


def load_securities(conn: sqlite3.Connection) -> list[parsed.ParsedSecurity]:
    """Load all securities (including price history) from the staging layer."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT uuid, name, currency_code, target_currency_code, isin, ticker_symbol,
               wkn, note, online_id, feed, feed_url, latest_feed, latest_feed_url,
               latest_date, latest_close, latest_high, latest_low, latest_volume,
               is_retired, attributes, properties, updated_at
        FROM ingestion_securities
        ORDER BY rowid
        """
    )

    price_rows = _load_price_rows(conn)
    securities: list[parsed.ParsedSecurity] = []

    for row in cursor.fetchall():
        (
            uuid,
            name,
            currency_code,
            target_currency_code,
            isin,
            ticker_symbol,
            wkn,
            note,
            online_id,
            feed,
            feed_url,
            latest_feed,
            latest_feed_url,
            latest_date,
            latest_close,
            latest_high,
            latest_low,
            latest_volume,
            is_retired,
            attributes,
            properties,
            updated_at,
        ) = row

        latest_price = None
        if latest_date is not None:
            latest_price = parsed.ParsedHistoricalPrice(
                date=int(latest_date),
                close=int(latest_close) if latest_close is not None else None,
                high=int(latest_high) if latest_high is not None else None,
                low=int(latest_low) if latest_low is not None else None,
                volume=int(latest_volume) if latest_volume is not None else None,
            )

        prices: list[parsed.ParsedHistoricalPrice] = []
        for _, date, close, high, low, volume in price_rows.get(uuid, []):
            prices.append(
                parsed.ParsedHistoricalPrice(
                    date=int(date),
                    close=int(close) if close is not None else None,
                    high=int(high) if high is not None else None,
                    low=int(low) if low is not None else None,
                    volume=int(volume) if volume is not None else None,
                )
            )

            securities.append(
                parsed.ParsedSecurity(
                    uuid=uuid,
                    name=name or "",
                    currency_code=currency_code,
                    target_currency_code=target_currency_code,
                    isin=isin,
                    ticker_symbol=ticker_symbol,
                    wkn=wkn,
                    note=note,
                    online_id=online_id,
                    feed=feed,
                    feed_url=feed_url,
                    latest_feed=latest_feed,
                    latest_feed_url=latest_feed_url,
                    calendar=None,
                    prices=prices,
                    latest=latest_price,
                    is_retired=bool(is_retired),
                    attributes=_load_json(attributes),
                    properties=_load_json(properties),
                    updated_at=_parse_datetime(updated_at),
                )
            )

    return securities


def _load_transaction_units(
    rows: Iterable[SqliteRow],
) -> dict[str, list[parsed.ParsedTransactionUnit]]:
    unit_map: dict[str, list[parsed.ParsedTransactionUnit]] = {}
    for (
        txn_uuid,
        unit_index,
        unit_type,
        amount,
        currency_code,
        fx_amount,
        fx_currency_code,
        fx_rate,
    ) in rows:
        unit = parsed.ParsedTransactionUnit(
            type=int(unit_type),
            amount=int(amount) if amount is not None else None,
            currency_code=currency_code,
            fx_amount=int(fx_amount) if fx_amount is not None else None,
            fx_currency_code=fx_currency_code,
            fx_rate_to_base=fx_rate if fx_rate is not None else None,
        )
        unit_map.setdefault(txn_uuid, []).append((int(unit_index), unit))

    ordered: dict[str, list[parsed.ParsedTransactionUnit]] = {}
    for txn_uuid, entries in unit_map.items():
        ordered[txn_uuid] = [
            unit for _, unit in sorted(entries, key=lambda item: item[0])
        ]
    return ordered


def _deserialize_watchlists(
    payload: Sequence[Mapping[str, Any]] | None,
) -> list[parsed.ParsedWatchlist]:
    result: list[parsed.ParsedWatchlist] = []
    if not payload:
        return result
    for item in payload:
        name = item.get("name")
        if not name:
            continue
        securities = list(item.get("securities", []) or [])
        result.append(parsed.ParsedWatchlist(name=name, securities=securities))
    return result


def _deserialize_plans(
    payload: Sequence[Mapping[str, Any]] | None,
) -> list[parsed.ParsedInvestmentPlan]:
    result: list[parsed.ParsedInvestmentPlan] = []
    if not payload:
        return result
    for item in payload:
        name = item.get("name")
        if not name:
            continue
        result.append(
            parsed.ParsedInvestmentPlan(
                name=name,
                note=item.get("note"),
                security=item.get("security"),
                portfolio=item.get("portfolio"),
                account=item.get("account"),
                attributes=dict(item.get("attributes", {}) or {}),
                auto_generate=bool(item.get("auto_generate", False)),
                date=item.get("date"),
                interval=item.get("interval"),
                amount=item.get("amount"),
                fees=item.get("fees"),
                transactions=list(item.get("transactions", []) or []),
                taxes=item.get("taxes"),
                plan_type=item.get("plan_type"),
            )
        )
    return result


def _deserialize_taxonomies(
    payload: Sequence[Mapping[str, Any]] | None,
) -> list[parsed.ParsedTaxonomy]:
    result: list[parsed.ParsedTaxonomy] = []
    if not payload:
        return result
    for item in payload:
        taxonomy_id = item.get("id")
        if not taxonomy_id:
            continue
        classifications: list[parsed.ParsedTaxonomyClassification] = []
        for classification in item.get("classifications", []) or []:
            class_id = classification.get("id")
            if not class_id:
                continue
            assignment_rows = classification.get("assignments", []) or []
            assignments = [
                parsed.ParsedTaxonomyAssignment(
                    investment_vehicle=assignment.get("investment_vehicle", ""),
                    weight=assignment.get("weight"),
                    rank=assignment.get("rank"),
                    data=dict(assignment.get("data", {}) or {}),
                )
                for assignment in assignment_rows
            ]
            classifications.append(
                parsed.ParsedTaxonomyClassification(
                    id=class_id,
                    name=classification.get("name", ""),
                    parent_id=classification.get("parent_id"),
                    note=classification.get("note"),
                    color=classification.get("color"),
                    weight=classification.get("weight"),
                    rank=classification.get("rank"),
                    data=dict(classification.get("data", {}) or {}),
                    assignments=assignments,
                )
            )

        result.append(
            parsed.ParsedTaxonomy(
                id=taxonomy_id,
                name=item.get("name", ""),
                source=item.get("source"),
                dimensions=list(item.get("dimensions", []) or []),
                classifications=classifications,
            )
        )
    return result


def _deserialize_dashboards(
    payload: Sequence[Mapping[str, Any]] | None,
) -> list[parsed.ParsedDashboard]:
    result: list[parsed.ParsedDashboard] = []
    if not payload:
        return result
    for item in payload:
        name = item.get("name")
        if not name:
            continue
        columns: list[parsed.ParsedDashboardColumn] = []
        for column in item.get("columns", []) or []:
            widget_rows = column.get("widgets", []) or []
            widgets = [
                parsed.ParsedDashboardWidget(
                    type=widget.get("type", ""),
                    label=widget.get("label"),
                    configuration=dict(widget.get("configuration", {}) or {}),
                )
                for widget in widget_rows
            ]
            columns.append(
                parsed.ParsedDashboardColumn(
                    weight=column.get("weight"),
                    widgets=widgets,
                )
            )
        result.append(
            parsed.ParsedDashboard(
                name=name,
                configuration=dict(item.get("configuration", {}) or {}),
                columns=columns,
                dashboard_id=item.get("dashboard_id"),
            )
        )
    return result


def _deserialize_settings(
    payload: Mapping[str, Any] | None,
) -> parsed.ParsedSettings | None:
    if not payload:
        return None

    bookmarks = [
        parsed.ParsedBookmark(
            label=bookmark.get("label", ""),
            pattern=bookmark.get("pattern", ""),
        )
        for bookmark in payload.get("bookmarks", []) or []
        if bookmark.get("label")
    ]
    attribute_types = [
        parsed.ParsedAttributeType(
            id=attr.get("id", ""),
            name=attr.get("name", ""),
            column_label=attr.get("column_label"),
            source=attr.get("source"),
            target=attr.get("target", ""),
            type=attr.get("type", ""),
            converter_class=attr.get("converter_class"),
            properties=dict(attr.get("properties", {}) or {}),
        )
        for attr in payload.get("attribute_types", []) or []
        if attr.get("id")
    ]
    configuration_sets = [
        parsed.ParsedConfigurationSet(
            key=config.get("key", ""),
            uuid=config.get("uuid"),
            name=config.get("name"),
            data=config.get("data"),
        )
        for config in payload.get("configuration_sets", []) or []
        if config.get("key")
    ]

    if not (bookmarks or attribute_types or configuration_sets):
        return None

    return parsed.ParsedSettings(
        bookmarks=bookmarks,
        attribute_types=attribute_types,
        configuration_sets=configuration_sets,
    )


def _deserialize_extra_sections(extra: Mapping[str, Any] | None) -> dict[str, Any]:
    if not extra:
        return {}

    plans = _deserialize_plans(extra.get("plans"))
    watchlists = _deserialize_watchlists(extra.get("watchlists"))
    taxonomies = _deserialize_taxonomies(extra.get("taxonomies"))
    dashboards = _deserialize_dashboards(extra.get("dashboards"))
    settings = _deserialize_settings(extra.get("settings"))

    return {
        "plans": plans,
        "watchlists": watchlists,
        "taxonomies": taxonomies,
        "dashboards": dashboards,
        "settings": settings,
    }


def load_transactions(conn: sqlite3.Connection) -> list[parsed.ParsedTransaction]:
    """Load transactions (including units) from the staging layer."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT transaction_uuid, unit_index, type, amount, currency_code,
               fx_amount, fx_currency_code, fx_rate_to_base
        FROM ingestion_transaction_units
        ORDER BY transaction_uuid, unit_index
        """
    )
    unit_map = _load_transaction_units(cursor.fetchall())

    cursor.execute(
        """
        SELECT uuid, type, account, portfolio, other_account, other_portfolio,
               other_uuid, other_updated_at, date, currency_code, amount, shares,
               note, security, source, updated_at
        FROM ingestion_transactions
        ORDER BY rowid
        """
    )

    transactions: list[parsed.ParsedTransaction] = []
    for row in cursor.fetchall():
        (
            uuid,
            txn_type,
            account,
            portfolio,
            other_account,
            other_portfolio,
            other_uuid,
            other_updated_at,
            date_value,
            currency_code,
            amount,
            shares,
            note,
            security,
            source,
            updated_at,
        ) = row

        transactions.append(
            parsed.ParsedTransaction(
                uuid=uuid,
                type=int(txn_type),
                account=account,
                portfolio=portfolio,
                other_account=other_account,
                other_portfolio=other_portfolio,
                other_uuid=other_uuid,
                other_updated_at=_parse_datetime(other_updated_at),
                date=_parse_datetime(date_value),
                currency_code=currency_code,
                amount=int(amount) if amount is not None else None,
                shares=int(shares) if shares is not None else None,
                note=note,
                security=security,
                source=source,
                updated_at=_parse_datetime(updated_at),
                units=unit_map.get(uuid, []),
            )
        )

    return transactions


def load_ingestion_snapshot(conn: sqlite3.Connection) -> IngestionSnapshot | None:
    """Return a parsed snapshot containing metadata and entity dataclasses."""
    metadata = load_metadata(conn)
    if not metadata:
        return None

    accounts = load_accounts(conn)
    portfolios = load_portfolios(conn)
    securities = load_securities(conn)
    transactions = load_transactions(conn)
    extras = _deserialize_extra_sections(metadata.get("extra_sections"))

    client = parsed.ParsedClient(
        version=metadata.get("pp_version") or 0,
        base_currency=metadata.get("base_currency"),
        accounts=accounts,
        portfolios=portfolios,
        securities=securities,
        transactions=transactions,
        plans=extras.get("plans", []),
        watchlists=extras.get("watchlists", []),
        taxonomies=extras.get("taxonomies", []),
        dashboards=extras.get("dashboards", []),
        settings=extras.get("settings"),
        properties=metadata.get("properties") or {},
    )
    return IngestionSnapshot(metadata=metadata, client=client)
