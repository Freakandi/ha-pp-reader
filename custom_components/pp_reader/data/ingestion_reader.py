"""Helpers for loading staging data from the ingestion pipeline."""

from __future__ import annotations

import json
import sqlite3
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from custom_components.pp_reader.models import parsed

try:  # pragma: no cover - optional dependency
    from google.protobuf.timestamp_pb2 import Timestamp as _ProtoTimestamp
except ModuleNotFoundError:  # pragma: no cover - protobuf optional
    _ProtoTimestamp = None

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


def _copy_timestamp(destination: Any, value: datetime | None) -> None:
    if _ProtoTimestamp is None or value is None:
        return
    proto_ts = _ProtoTimestamp()
    proto_ts.FromDatetime(value)
    destination.CopyFrom(proto_ts)


def _copy_any_map(container: Any, data: dict[str, Any]) -> None:
    for key, value in data.items():
        if hasattr(container, "add"):
            entry = container.add()
            entry.key = str(key)
            entry.value.string = str(value)
        else:  # Map containers
            container[str(key)] = str(value)


def _apply_accounts_proto(
    client: Any, accounts: Sequence[parsed.ParsedAccount]
) -> None:
    for account in accounts:
        dest = client.accounts.add()
        dest.uuid = account.uuid
        dest.name = account.name
        if account.currency_code:
            dest.currencyCode = account.currency_code
        if account.note:
            dest.note = account.note
        dest.isRetired = account.is_retired
        _copy_any_map(dest.attributes, account.attributes)
        _copy_timestamp(dest.updatedAt, account.updated_at)


def _apply_portfolios_proto(
    client: Any, portfolios: Sequence[parsed.ParsedPortfolio]
) -> None:
    for portfolio in portfolios:
        dest = client.portfolios.add()
        dest.uuid = portfolio.uuid
        dest.name = portfolio.name
        if portfolio.note:
            dest.note = portfolio.note
        if portfolio.reference_account:
            dest.referenceAccount = portfolio.reference_account
        dest.isRetired = portfolio.is_retired
        _copy_any_map(dest.attributes, portfolio.attributes)
        _copy_timestamp(dest.updatedAt, portfolio.updated_at)


def _apply_securities_proto(  # noqa: PLR0912
    client: Any, securities: Sequence[parsed.ParsedSecurity]
) -> None:
    for security in securities:
        dest = client.securities.add()
        dest.uuid = security.uuid
        dest.name = security.name
        if security.currency_code:
            dest.currencyCode = security.currency_code
        if security.target_currency_code:
            dest.targetCurrencyCode = security.target_currency_code
        if security.isin:
            dest.isin = security.isin
        if security.ticker_symbol:
            dest.tickerSymbol = security.ticker_symbol
        if security.wkn:
            dest.wkn = security.wkn
        if security.note:
            dest.note = security.note
        if security.online_id:
            dest.onlineId = security.online_id
        if security.feed:
            dest.feed = security.feed
        if security.feed_url:
            dest.feedURL = security.feed_url
        if security.latest_feed:
            dest.latestFeed = security.latest_feed
        if security.latest_feed_url:
            dest.latestFeedURL = security.latest_feed_url
        dest.isRetired = security.is_retired
        _copy_any_map(dest.attributes, security.attributes)
        _copy_any_map(dest.properties, security.properties)
        _copy_timestamp(dest.updatedAt, security.updated_at)

        if security.latest:
            latest = dest.latest
            latest.date = int(security.latest.date)
            if security.latest.close is not None:
                latest.close = int(security.latest.close)
            if security.latest.high is not None:
                latest.high = int(security.latest.high)
            if security.latest.low is not None:
                latest.low = int(security.latest.low)
            if security.latest.volume is not None:
                latest.volume = int(security.latest.volume)

        for price in security.prices:
            price_proto = dest.prices.add()
            price_proto.date = int(price.date)
            if price.close is not None:
                price_proto.close = int(price.close)
            if price.high is not None:
                price_proto.high = int(price.high)
            if price.low is not None:
                price_proto.low = int(price.low)
            if price.volume is not None:
                price_proto.volume = int(price.volume)


def _apply_transactions_proto(  # noqa: PLR0912
    client: Any, transactions: Sequence[parsed.ParsedTransaction]
) -> None:
    for transaction in transactions:
        dest = client.transactions.add()
        dest.uuid = transaction.uuid
        dest.type = int(transaction.type)
        if transaction.account:
            dest.account = transaction.account
        if transaction.portfolio:
            dest.portfolio = transaction.portfolio
        if transaction.other_account:
            dest.otherAccount = transaction.other_account
        if transaction.other_portfolio:
            dest.otherPortfolio = transaction.other_portfolio
        if transaction.other_uuid:
            dest.otherUuid = transaction.other_uuid
        _copy_timestamp(dest.otherUpdatedAt, transaction.other_updated_at)
        _copy_timestamp(dest.date, transaction.date)
        if transaction.currency_code:
            dest.currencyCode = transaction.currency_code
        if transaction.amount is not None:
            dest.amount = int(transaction.amount)
        if transaction.shares is not None:
            dest.shares = int(transaction.shares)
        if transaction.note:
            dest.note = transaction.note
        if transaction.security:
            dest.security = transaction.security
        if transaction.source:
            dest.source = transaction.source
        _copy_timestamp(dest.updatedAt, transaction.updated_at)

        for unit in transaction.units:
            unit_proto = dest.units.add()
            unit_proto.type = int(unit.type)
            if unit.amount is not None:
                unit_proto.amount = int(unit.amount)
            if unit.currency_code:
                unit_proto.currencyCode = unit.currency_code
            if unit.fx_amount is not None:
                unit_proto.fxAmount = int(unit.fx_amount)
            if unit.fx_currency_code:
                unit_proto.fxCurrencyCode = unit.fx_currency_code
            if unit.fx_rate_to_base is not None:
                rate = abs(unit.fx_rate_to_base)
                decimal = unit_proto.fxRateToBase
                scale = 8
                scaled_value = round(rate * (10**scale))
                decimal.scale = scale
                decimal.precision = 0
                decimal.value = int(scaled_value).to_bytes(
                    8, byteorder="little", signed=True
                )


def _apply_plans_proto(
    client: Any,
    plans: Sequence[parsed.ParsedInvestmentPlan],
) -> None:
    for plan in plans:
        dest = client.plans.add()
        dest.name = plan.name
        if plan.note:
            dest.note = plan.note
        if plan.security:
            dest.security = plan.security
        if plan.portfolio:
            dest.portfolio = plan.portfolio
        if plan.account:
            dest.account = plan.account
        _copy_any_map(dest.attributes, plan.attributes)
        dest.autoGenerate = bool(plan.auto_generate)
        if plan.date is not None:
            dest.date = int(plan.date)
        if plan.interval is not None:
            dest.interval = int(plan.interval)
        if plan.amount is not None:
            dest.amount = int(plan.amount)
        if plan.fees is not None:
            dest.fees = int(plan.fees)
        dest.transactions.extend(plan.transactions)
        if plan.taxes is not None:
            dest.taxes = int(plan.taxes)
        if plan.plan_type is not None:
            dest.type = int(plan.plan_type)


def _apply_watchlists_proto(
    client: Any,
    watchlists: Sequence[parsed.ParsedWatchlist],
) -> None:
    for watchlist in watchlists:
        dest = client.watchlists.add()
        dest.name = watchlist.name
        dest.securities.extend(watchlist.securities)


def _apply_taxonomies_proto(
    client: Any,
    taxonomies: Sequence[parsed.ParsedTaxonomy],
) -> None:
    for taxonomy in taxonomies:
        dest = client.taxonomies.add()
        dest.id = taxonomy.id
        dest.name = taxonomy.name
        if taxonomy.source:
            dest.source = taxonomy.source
        dest.dimensions.extend(taxonomy.dimensions)

        for classification in taxonomy.classifications:
            class_proto = dest.classifications.add()
            class_proto.id = classification.id
            class_proto.name = classification.name
            if classification.parent_id:
                class_proto.parentId = classification.parent_id
            if classification.note:
                class_proto.note = classification.note
            if classification.color:
                class_proto.color = classification.color
            if classification.weight is not None:
                class_proto.weight = int(classification.weight)
            if classification.rank is not None:
                class_proto.rank = int(classification.rank)
            _copy_any_map(class_proto.data, classification.data)

            for assignment in classification.assignments:
                assign_proto = class_proto.assignments.add()
                assign_proto.investmentVehicle = assignment.investment_vehicle
                if assignment.weight is not None:
                    assign_proto.weight = int(assignment.weight)
                if assignment.rank is not None:
                    assign_proto.rank = int(assignment.rank)
                _copy_any_map(assign_proto.data, assignment.data)


def _apply_dashboard_configuration(container: Any, data: Mapping[str, Any]) -> None:
    for key, value in data.items():
        entry = container.add()
        entry.key = str(key)
        entry.value = "" if value is None else str(value)


def _apply_dashboards_proto(
    client: Any, dashboards: Sequence[parsed.ParsedDashboard]
) -> None:
    for dashboard in dashboards:
        dest = client.dashboards.add()
        dest.name = dashboard.name
        _apply_dashboard_configuration(dest.configuration, dashboard.configuration)
        if dashboard.dashboard_id:
            dest.id = dashboard.dashboard_id

        for column in dashboard.columns:
            column_proto = dest.columns.add()
            if column.weight is not None:
                column_proto.weight = int(column.weight)

            for widget in column.widgets:
                widget_proto = column_proto.widgets.add()
                widget_proto.type = widget.type
                if widget.label:
                    widget_proto.label = widget.label
                _apply_dashboard_configuration(
                    widget_proto.configuration,
                    widget.configuration,
                )


def _apply_settings_proto(client: Any, settings: parsed.ParsedSettings | None) -> None:
    if settings is None:
        return

    dest = client.settings
    for bookmark in settings.bookmarks:
        bookmark_proto = dest.bookmarks.add()
        bookmark_proto.label = bookmark.label
        bookmark_proto.pattern = bookmark.pattern

    for attr in settings.attribute_types:
        attr_proto = dest.attributeTypes.add()
        attr_proto.id = attr.id
        attr_proto.name = attr.name
        if attr.column_label:
            attr_proto.columnLabel = attr.column_label
        if attr.source:
            attr_proto.source = attr.source
        attr_proto.target = attr.target
        attr_proto.type = attr.type
        if attr.converter_class:
            attr_proto.converterClass = attr.converter_class
        _copy_any_map(attr_proto.properties, attr.properties)

    for config in settings.configuration_sets:
        config_proto = dest.configurationSets.add()
        config_proto.key = config.key
        if config.uuid:
            config_proto.uuid = config.uuid
        if config.name:
            config_proto.name = config.name
        if config.data:
            config_proto.data = config.data
