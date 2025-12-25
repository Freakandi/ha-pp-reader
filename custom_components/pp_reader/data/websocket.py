"""
WebSocket handlers for the pp_reader integration.

This module provides WebSocket commands to retrieve dashboard data,
account information, portfolio data, and file update timestamps.
"""

from __future__ import annotations

import asyncio
import logging
import sqlite3
from collections.abc import Callable, Iterable, Mapping
from dataclasses import dataclass
from datetime import UTC, date, datetime
from functools import partial, wraps
from pathlib import Path
from typing import TYPE_CHECKING, Any

import voluptuous as vol
from homeassistant.components import websocket_api

from custom_components.pp_reader.data.db_access import (
    fetch_daily_wealth,
    fetch_daily_wealth_scopes,
)
from custom_components.pp_reader.data.normalized_store import (
    SnapshotBundle,
    async_load_latest_snapshot_bundle,
)
from custom_components.pp_reader.logic.securities import (
    calculate_realized_performance,
)
from custom_components.pp_reader.metrics.period_calculations import (
    calculate_period_performance_series,
)
from custom_components.pp_reader.services.performance_calculator import (
    PerformanceCalculator,
)
from custom_components.pp_reader.util import async_run_executor_job
from custom_components.pp_reader.util.currency import round_currency, round_price

from .db_access import (
    get_accounts,
    get_last_file_update,
    get_portfolios,
    get_transactions,
)
from .normalization_pipeline import (
    async_fetch_security_history,
    async_normalize_security_snapshot,
    async_normalize_snapshot,
)

if TYPE_CHECKING:
    from homeassistant.components.websocket_api import ActiveConnection
    from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)
NEWS_PROMPT_PLACEHOLDER = "{TICKER}"
NEWS_PROMPT_PATH = Path(__file__).resolve().parent.parent / "util" / "search_news.md"
DOMAIN = "pp_reader"
_MAX_DAILY_WEALTH_RANGE_DAYS = 366
_DAILY_WEALTH_RANGE_SCHEMA = vol.Schema(
    {
        vol.Required("start"): str,
        vol.Required("end"): str,
    },
    extra=vol.PREVENT_EXTRA,
)
_DAILY_WEALTH_SCOPE_FILTER_SCHEMA = vol.Schema(
    {
        vol.Optional("accounts"): [str],
        vol.Optional("portfolios"): [str],
    },
    extra=vol.PREVENT_EXTRA,
)
_WS_GET_DAILY_WEALTH_SCHEMA = vol.All(
    vol.Schema(
        {
            vol.Required("type"): "pp_reader/get_daily_wealth",
            vol.Required("entry_id"): str,
            vol.Optional("date"): str,
            vol.Optional("range"): _DAILY_WEALTH_RANGE_SCHEMA,
            vol.Optional("include_slices", default=False): bool,
            vol.Optional("include_scopes"): bool,
            vol.Optional("scopes"): _DAILY_WEALTH_SCOPE_FILTER_SCHEMA,
            vol.Optional("limit"): vol.Coerce(int),
            vol.Optional("offset", default=0): vol.Coerce(int),
        },
        extra=vol.ALLOW_EXTRA,
    )
)


def _get_entry_data(hass: HomeAssistant, entry_id: str) -> dict[str, Any]:
    """Return the hass.data entry payload or raise LookupError."""
    domain_entries = hass.data.get(DOMAIN)
    entry_data = (
        domain_entries.get(entry_id) if isinstance(domain_entries, dict) else None
    )
    if entry_data is None:
        message = f"entry_id {entry_id} unknown"
        raise LookupError(message)

    return entry_data


def _resolve_db_path(entry_data: Mapping[str, Any]) -> Path:
    """Extract the db_path from a config entry payload."""
    db_path_raw = entry_data.get("db_path")
    if not db_path_raw:
        message = "db_path für den Config Entry fehlt"
        raise ValueError(message)
    return Path(db_path_raw)


def _parse_iso_date(value: str | None) -> date | None:
    """Parse an ISO date string (YYYY-MM-DD) into a date object."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value).date()
    except ValueError:
        return None


def _extract_scope_filters(
    scopes: Mapping[str, Any] | None,
) -> tuple[list[str], list[str]]:
    """Return scope filter lists for accounts and portfolios."""
    if not scopes:
        return [], []
    accounts_raw = scopes.get("accounts") if isinstance(scopes, Mapping) else None
    portfolios_raw = scopes.get("portfolios") if isinstance(scopes, Mapping) else None
    accounts = [item for item in accounts_raw or [] if isinstance(item, str)]
    portfolios = [item for item in portfolios_raw or [] if isinstance(item, str)]
    return accounts, portfolios


def _load_news_prompt_template() -> tuple[str, str]:
    """Return the news prompt link and template body."""
    if not NEWS_PROMPT_PATH.exists():
        message = f"Prompt-Template fehlt: {NEWS_PROMPT_PATH}"
        raise FileNotFoundError(message)

    content = NEWS_PROMPT_PATH.read_text(encoding="utf-8")
    link = ""
    body_lines: list[str] = []
    for line in content.splitlines():
        if not link and line.lower().startswith("link:"):
            link = line.split(":", 1)[-1].strip()
            continue
        body_lines.append(line)

    body = "\n".join(body_lines).strip()
    return link, body


def _serialise_security_snapshot(  # noqa: C901, PLR0912, PLR0915
    snapshot: Any,
) -> dict[str, Any]:
    """Coerce persisted security snapshots into JSON-serializable mappings."""
    if snapshot is None:
        return {}

    if isinstance(snapshot, dict):
        result = dict(snapshot)
    elif hasattr(snapshot, "_asdict"):
        result = dict(snapshot._asdict())  # type: ignore[attr-defined]
    else:
        try:
            result = dict(snapshot)
        except TypeError:
            result = snapshot.__dict__.copy()  # type: ignore[attr-defined]

    for key in ("average_cost", "aggregation", "performance"):
        value = result.get(key)
        if isinstance(value, dict):
            result[key] = dict(value)

    average_cost = result.get("average_cost")
    if not isinstance(average_cost, dict):
        average_cost = {}
        result["average_cost"] = average_cost

    if isinstance(average_cost, dict):
        if average_cost.get("eur") is None:
            purchase_value_eur = result.get("purchase_value_eur")
            total_holdings = result.get("total_holdings") or 0
            if purchase_value_eur is not None and total_holdings:
                average_cost["eur"] = round_currency(
                    purchase_value_eur / total_holdings,
                    decimals=6,
                    default=0.0,
                )
            elif total_holdings == 0:
                average_cost["eur"] = 0.0
        average_cost.setdefault("security", average_cost.get("security"))
        average_cost.setdefault("account", average_cost.get("account"))
        average_cost.setdefault("native", average_cost.get("security"))
        average_cost.setdefault("source", average_cost.get("source") or "totals")
        if average_cost.get("coverage_ratio") is None:
            total_holdings = result.get("total_holdings")
            average_cost["coverage_ratio"] = 1.0 if total_holdings is not None else None

    aggregation = result.get("aggregation")
    if not isinstance(aggregation, dict):
        aggregation = {}
        result["aggregation"] = aggregation

    total_holdings = result.get("total_holdings")
    if total_holdings is None:
        total_holdings = aggregation.get("total_holdings")
    if total_holdings is None:
        total_holdings = 0.0
        aggregation["total_holdings"] = total_holdings
    aggregation.setdefault(
        "positive_holdings",
        total_holdings if total_holdings > 0 else 0.0,
    )

    purchase_value_eur = result.get("purchase_value_eur")
    if purchase_value_eur is None:
        purchase_value_eur = aggregation.get("purchase_value_eur")
    if purchase_value_eur is not None:
        aggregation.setdefault("purchase_value_eur", purchase_value_eur)
        if aggregation.get("purchase_value_cents") is None:
            aggregation["purchase_value_cents"] = round(purchase_value_eur * 100)

    purchase_total_security = aggregation.get("purchase_total_security")
    if purchase_total_security is None:
        purchase_total_security = result.get("purchase_total_security")
        if purchase_total_security is not None:
            aggregation["purchase_total_security"] = purchase_total_security
    if aggregation.get("security_currency_total") is None:
        aggregation["security_currency_total"] = purchase_total_security

    purchase_total_account = aggregation.get("purchase_total_account")
    if purchase_total_account is None:
        purchase_total_account = result.get("purchase_total_account")
        if purchase_total_account is not None:
            aggregation["purchase_total_account"] = purchase_total_account
    if aggregation.get("account_currency_total") is None:
        aggregation["account_currency_total"] = purchase_total_account

    performance = result.get("performance")
    if not isinstance(performance, dict):
        performance = {}
        result["performance"] = performance

    market_value_eur = result.get("market_value_eur")
    purchase_value_eur = result.get("purchase_value_eur")
    if performance.get("gain_abs") is None and None not in (
        market_value_eur,
        purchase_value_eur,
    ):
        performance["gain_abs"] = round_currency(
            (market_value_eur or 0.0) - (purchase_value_eur or 0.0),
            default=0.0,
        )
    if (
        performance.get("total_change_eur") is None
        and performance.get("gain_abs") is not None
    ):
        performance["total_change_eur"] = performance["gain_abs"]
    if performance.get("gain_pct") is None and performance.get("gain_abs") is not None:
        denominator = purchase_value_eur or 0.0
        performance["gain_pct"] = (
            round_currency(
                (performance["gain_abs"] / denominator) * 100,
                default=0.0,
            )
            if denominator
            else 0.0
        )
    if (
        performance.get("total_change_pct") is None
        and performance.get("total_change_eur") is not None
    ):
        denominator = purchase_value_eur or 0.0
        performance["total_change_pct"] = (
            round_currency(
                (performance["total_change_eur"] / denominator) * 100,
                default=0.0,
            )
            if denominator
            else 0.0
        )

    day_change = performance.get("day_change")
    if not isinstance(day_change, dict):
        day_change = {}
        performance["day_change"] = day_change

    day_change.setdefault("price_change_native", None)
    day_change.setdefault("price_change_eur", None)
    day_change.setdefault("change_pct", None)
    day_change.setdefault("source", performance.get("source") or "metrics")
    day_change.setdefault("coverage_ratio", performance.get("coverage_ratio"))

    return result


def _resolve_entry_and_path(
    hass: HomeAssistant,
    entry_id: str,
    *,
    msg_id: int | None,
    connection: websocket_api.ActiveConnection,
) -> tuple[dict[str, Any], Path] | None:
    """Resolve hass.data entry metadata and db_path with shared error handling."""
    try:
        entry_data = _get_entry_data(hass, entry_id)
        db_path = _resolve_db_path(entry_data)
    except LookupError as err:
        connection.send_error(msg_id, "not_found", str(err))
        return None
    except ValueError as err:
        connection.send_error(msg_id, "db_error", str(err))
        return None
    except Exception:
        _LOGGER.exception(
            "WebSocket: Fehler beim Auflösen des Config Entries (%s)",
            entry_id,
        )
        connection.send_error(msg_id, "db_error", "entry_id Auflösung fehlgeschlagen")
        return None
    return entry_data, db_path


async def _load_snapshot_bundle(
    hass: HomeAssistant,
    db_path: Path,
    *,
    msg_id: int | None,
    connection: websocket_api.ActiveConnection,
) -> SnapshotBundle | None:
    """Load the latest snapshot bundle or notify the websocket client."""
    try:
        bundle = await async_load_latest_snapshot_bundle(hass, db_path)
    except Exception:
        _LOGGER.exception(
            "WebSocket: Fehler beim Laden der Snapshot-Bundles (db_path=%s)",
            db_path,
        )
        connection.send_error(
            msg_id,
            "db_error",
            "Fehler beim Laden der Snapshots",
        )
        return None

    if not bundle.metric_run_uuid or not bundle.snapshot_at:
        connection.send_error(
            msg_id,
            "data_unavailable",
            "Es liegen noch keine Normalisierungssnapshots vor.",
        )
        return None
    return bundle


def _clone_snapshot_entries(
    entries: Iterable[Mapping[str, Any]],
) -> list[dict[str, Any]]:
    """Make shallow copies of snapshot entries to avoid mutating shared caches."""
    payload: list[dict[str, Any]] = []
    for entry in entries:
        if isinstance(entry, Mapping):
            payload.append(dict(entry))
        else:
            payload.append(dict(entry.__dict__))  # pragma: no cover - defensive
    return payload


def _normalized_payload_from_bundle(
    bundle: SnapshotBundle,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    """Return normalized account/portfolio payloads plus dashboard metadata."""
    accounts = _clone_snapshot_entries(bundle.accounts)
    portfolios = _clone_snapshot_entries(bundle.portfolios)
    normalized_payload = {
        "generated_at": bundle.snapshot_at,
        "metric_run_uuid": bundle.metric_run_uuid,
        "accounts": accounts,
        "portfolios": portfolios,
    }
    return accounts, portfolios, normalized_payload


def _serialize_transactions(transactions: list[Any]) -> list[dict[str, Any]]:
    """Convert Transaction dataclasses into plain dictionaries for JSON."""
    return [
        {
            "uuid": getattr(tx, "uuid", None),
            "type": getattr(tx, "type", None),
            "account": getattr(tx, "account", None),
            "portfolio": getattr(tx, "portfolio", None),
            "other_account": getattr(tx, "other_account", None),
            "other_portfolio": getattr(tx, "other_portfolio", None),
            "date": getattr(tx, "date", None),
            "currency_code": getattr(tx, "currency_code", None),
            "amount": getattr(tx, "amount", None),
            "shares": getattr(tx, "shares", None),
            "security": getattr(tx, "security", None),
        }
        for tx in transactions
    ]


def _positions_payload(portfolio: Any) -> list[dict[str, Any]]:
    """Convert PositionSnapshot dataclasses to websocket payload entries."""
    entries: list[dict[str, Any]] = []
    for position in portfolio.positions:
        entry: dict[str, Any] = {
            "security_uuid": position.security_uuid,
            "name": position.name,
            "currency_code": position.currency_code,
            "current_holdings": round_currency(
                position.current_holdings,
                decimals=6,
                default=0.0,
            )
            or 0.0,
            "purchase_value": round_currency(
                position.purchase_value,
                default=0.0,
            )
            or 0.0,
            "current_value": round_currency(
                position.current_value,
                default=0.0,
            )
            or 0.0,
            "average_cost": dict(position.average_cost),
            "performance": dict(position.performance),
            "aggregation": dict(position.aggregation),
        }
        if position.coverage_ratio is not None:
            entry["coverage_ratio"] = position.coverage_ratio
        if position.provenance:
            entry["provenance"] = position.provenance
        if position.metric_run_uuid:
            entry["metric_run_uuid"] = position.metric_run_uuid
        if position.last_price_native is not None:
            entry["last_price_native"] = round_price(
                position.last_price_native,
                decimals=6,
            )
        if position.last_price_eur is not None:
            entry["last_price_eur"] = round_price(
                position.last_price_eur,
                decimals=6,
            )
        if position.last_close_native is not None:
            entry["last_close_native"] = round_price(
                position.last_close_native,
                decimals=6,
            )
        if position.last_close_eur is not None:
            entry["last_close_eur"] = round_price(
                position.last_close_eur,
                decimals=6,
            )
        if position.data_state.status != "ok" or position.data_state.message:
            entry["data_state"] = {
                "status": position.data_state.status,
                "message": position.data_state.message,
            }
        entries.append(entry)
    return entries


def _wrap_with_loop_fallback(
    handler: Callable[[HomeAssistant, ActiveConnection, dict[str, Any]], Any],
) -> Callable[[HomeAssistant, ActiveConnection, dict[str, Any]], Any]:
    """Ensure websocket handlers run in tests without a running event loop."""
    original = getattr(handler, "__wrapped__", None)
    if original is None:
        return handler

    def _resolve_loop(candidate: Any) -> asyncio.AbstractEventLoop | None:
        if isinstance(candidate, asyncio.AbstractEventLoop):
            return candidate
        return None

    def _drain_coroutine(
        coro: Any,
        loop: asyncio.AbstractEventLoop | None,
    ) -> None:
        if not asyncio.iscoroutine(coro):
            return

        if loop is not None:
            task = loop.create_task(coro)
            loop.run_until_complete(task)
            return

        temp_loop = asyncio.new_event_loop()
        try:
            asyncio.set_event_loop(temp_loop)
            temp_loop.run_until_complete(coro)
        finally:
            asyncio.set_event_loop(None)
            temp_loop.run_until_complete(temp_loop.shutdown_asyncgens())
            temp_loop.close()

    @wraps(handler)
    def wrapper(
        hass: HomeAssistant,
        connection: ActiveConnection,
        msg: dict[str, Any],
    ) -> Any:
        loop = _resolve_loop(getattr(hass, "loop", None))

        if loop is not None and not loop.is_running():
            _drain_coroutine(original(hass, connection, msg), loop)
            return None

        try:
            result = handler(hass, connection, msg)
        except RuntimeError as err:  # pragma: no cover - compatibility path
            if "no running event loop" not in str(err):
                raise
            loop = _resolve_loop(getattr(hass, "loop", None))
            _drain_coroutine(original(hass, connection, msg), loop)
            return None

        if asyncio.iscoroutine(result):
            try:
                asyncio.get_running_loop()
            except RuntimeError:
                loop = _resolve_loop(getattr(hass, "loop", None))
                _drain_coroutine(result, loop)
                return None

        return result

    wrapper.__wrapped__ = original  # type: ignore[attr-defined]
    return wrapper


def _serialize_daily_wealth(record: Any) -> dict[str, Any]:
    """Convert a DailyWealthRecord into a JSON-friendly mapping."""
    return {
        "date": record.date,
        "total_wealth_eur": record.total_wealth_eur,
        "portfolio_wealth_eur": record.portfolio_wealth_eur,
        "account_wealth_eur": record.account_wealth_eur,
        "dividends_eur": record.dividends_eur,
        "interest_eur": record.interest_eur,
        "inbound_transfers_eur": record.inbound_transfers_eur,
        "outbound_transfers_eur": record.outbound_transfers_eur,
        "performance_neutral_movements": record.performance_neutral_movements,
        "fees_eur": record.fees_eur,
        "taxes_eur": record.taxes_eur,
        "realized_gains_eur": 0.0,
        "unrealized_gains_eur": 0.0,
        "invested_capital_eur": record.invested_capital_eur,
        "fx_coverage_ratio": record.fx_coverage_ratio,
        "price_coverage_ratio": record.price_coverage_ratio,
        "stale_price": bool(record.stale_price),
        "provenance": record.provenance,
    }


def _serialize_daily_scope(record: Any) -> dict[str, Any]:
    """Convert a DailyWealthScopeRecord into a JSON-friendly mapping."""
    return {
        "scope_type": record.scope_type,
        "scope_id": record.scope_id,
        "scope_name": record.scope_name,
        "date": record.date,
        "total_wealth_eur": record.total_wealth_eur,
        "portfolio_wealth_eur": record.portfolio_wealth_eur,
        "account_wealth_eur": record.account_wealth_eur,
        "dividends_eur": record.dividends_eur,
        "interest_eur": record.interest_eur,
        "inbound_transfers_eur": record.inbound_transfers_eur,
        "outbound_transfers_eur": record.outbound_transfers_eur,
        "performance_neutral_movements": record.performance_neutral_movements,
        "fees_eur": record.fees_eur,
        "taxes_eur": record.taxes_eur,
        "realized_gains_eur": 0.0,
        "unrealized_gains_eur": 0.0,
        "invested_capital_eur": record.invested_capital_eur,
        "fx_coverage_ratio": record.fx_coverage_ratio,
        "price_coverage_ratio": record.price_coverage_ratio,
        "stale_price": bool(record.stale_price),
        "provenance": record.provenance,
    }


# === Dashboard Websocket Test-Command ===
@websocket_api.websocket_command(
    {
        vol.Required("type"): "pp_reader/get_dashboard_data",
        vol.Required("entry_id"): str,
    }
)
@websocket_api.async_response
async def ws_get_dashboard_data(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """
    Return the initial dashboard dataset for the configured entry.

    Änderung (Migration Schritt 2.b):
    - Accounts/Portfolios kommen direkt aus den persistierten Snapshots
      (`normalized_store`) und enthalten zusätzlich `normalized_payload`.
    - Transactions werden bei Bedarf aus SQLite gelesen.
    """
    entry_id = msg.get("entry_id")
    if not entry_id:
        connection.send_error(msg["id"], "invalid_format", "entry_id erforderlich")
        return

    resolved = _resolve_entry_and_path(
        hass,
        entry_id,
        msg_id=msg.get("id"),
        connection=connection,
    )
    if resolved is None:
        return
    _, db_path = resolved

    bundle = await _load_snapshot_bundle(
        hass,
        db_path,
        msg_id=msg.get("id"),
        connection=connection,
    )
    if bundle is None:
        return

    transactions = await async_run_executor_job(hass, get_transactions, db_path)
    last_file_update = await async_run_executor_job(
        hass,
        get_last_file_update,
        db_path,
    )
    accounts_payload, portfolios_payload, normalized_payload = (
        _normalized_payload_from_bundle(bundle)
    )

    connection.send_result(
        msg["id"],
        {
            "accounts": accounts_payload,
            "portfolios": portfolios_payload,
            "last_file_update": last_file_update,
            "transactions": _serialize_transactions(transactions),
            "normalized_payload": normalized_payload,
        },
    )


# === Websocket Accounts-Data ===
@websocket_api.websocket_command(
    {
        vol.Required("type"): "pp_reader/get_accounts",
        vol.Optional("entry_id"): str,
    }
)
@websocket_api.async_response
async def ws_get_accounts(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Return the latest canonical account snapshots for an entry."""
    try:
        entry_id = msg["entry_id"]
    except KeyError:
        connection.send_error(msg["id"], "invalid_format", "entry_id erforderlich")
        return

    resolved = _resolve_entry_and_path(
        hass,
        entry_id,
        msg_id=msg.get("id"),
        connection=connection,
    )
    if resolved is None:
        return
    _, db_path = resolved

    bundle = await _load_snapshot_bundle(
        hass,
        db_path,
        msg_id=msg.get("id"),
        connection=connection,
    )
    if bundle is None:
        return

    accounts_payload, _, normalized_payload = _normalized_payload_from_bundle(bundle)
    connection.send_result(
        msg["id"],
        {
            "accounts": accounts_payload,
            "normalized_payload": normalized_payload,
        },
    )


# === Websocket FileUpdate-Timestamp ===
@websocket_api.websocket_command(
    {
        vol.Required("type"): "pp_reader/get_last_file_update",
        vol.Optional("entry_id"): str,  # Erwartet die entry_id
    }
)
@websocket_api.async_response
async def ws_get_last_file_update(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Handle WebSocket command to get the last file update timestamp."""
    msg_id = msg.get("id")

    try:
        domain_entries: dict[str, dict[str, Any]] | None = hass.data.get(DOMAIN)
        if not domain_entries:
            connection.send_error(
                msg_id, "not_found", "Keine pp_reader Config Entries registriert"
            )
            return

        entry_id = msg.get("entry_id")
        entry_data: dict[str, Any] | None = None

        if entry_id:
            entry_data = domain_entries.get(entry_id)
            if not entry_data:
                connection.send_error(
                    msg_id, "not_found", f"entry_id {entry_id} unknown"
                )
                return
        elif len(domain_entries) == 1:
            entry_id, entry_data = next(iter(domain_entries.items()))
        else:
            connection.send_error(
                msg_id,
                "not_found",
                "entry_id erforderlich, wenn mehrere Config Entries aktiv sind",
            )
            return

        db_path_raw = entry_data.get("db_path") if entry_data else None
        if not db_path_raw:
            connection.send_error(
                msg_id,
                "db_error",
                "db_path für den Config Entry fehlt",
            )
            return

        db_path = Path(db_path_raw)

        last_file_update_raw = await async_run_executor_job(
            hass, get_last_file_update, db_path
        )

        if last_file_update_raw:
            try:
                parsed_update = datetime.strptime(
                    last_file_update_raw,
                    "%Y-%m-%dT%H:%M:%S",
                ).replace(tzinfo=UTC)
                last_file_update = parsed_update.strftime("%d.%m.%Y, %H:%M")
            except ValueError:
                _LOGGER.exception("Fehler beim Parsen des Zeitstempels")
                last_file_update = "Unbekannt"
        else:
            last_file_update = "Unbekannt"

        connection.send_result(
            msg_id,
            {
                "last_file_update": last_file_update,
            },
        )
    except Exception as e:
        _LOGGER.exception("Fehler beim Abrufen von last_file_update")
        connection.send_error(msg_id, "db_error", str(e))


# === Websocket Portfolio-Data ===
@websocket_api.websocket_command(
    {
        vol.Required("type"): "pp_reader/get_portfolio_data",
        vol.Required("entry_id"): str,
    }
)
@websocket_api.async_response
async def ws_get_portfolio_data(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return canonical portfolio aggregates from the latest snapshot bundle."""
    entry_id = msg.get("entry_id")
    if not entry_id:
        connection.send_error(msg["id"], "invalid_format", "entry_id erforderlich")
        return

    resolved = _resolve_entry_and_path(
        hass,
        entry_id,
        msg_id=msg.get("id"),
        connection=connection,
    )
    if resolved is None:
        return
    _, db_path = resolved

    bundle = await _load_snapshot_bundle(
        hass,
        db_path,
        msg_id=msg.get("id"),
        connection=connection,
    )
    if bundle is None:
        return

    _, portfolios_payload, normalized_payload = _normalized_payload_from_bundle(bundle)

    connection.send_result(
        msg["id"],
        {
            "portfolios": portfolios_payload,
            "normalized_payload": normalized_payload,
        },
    )


ws_get_portfolio_data_handler = _wrap_with_loop_fallback(ws_get_portfolio_data)


async def ws_get_portfolio_data_async(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Async wrapper so tests can await the WebSocket handler directly."""
    loop = asyncio.get_running_loop()
    before = set(asyncio.all_tasks(loop))
    result = ws_get_portfolio_data_handler(hass, connection, msg)
    if asyncio.iscoroutine(result):  # pragma: no cover - defensive guard
        await result
    after = set(asyncio.all_tasks(loop))
    pending = [task for task in after - before if not task.done()]
    if pending:
        await asyncio.gather(*pending)


ws_get_portfolio_data = ws_get_portfolio_data_async


@websocket_api.websocket_command(
    {
        vol.Required("type"): "pp_reader/get_security_history",
        vol.Required("entry_id"): str,
        vol.Required("security_uuid"): str,
        vol.Optional("start_date"): vol.Any(None, vol.Coerce(int)),
        vol.Optional("end_date"): vol.Any(None, vol.Coerce(int)),
    }
)
@websocket_api.async_response
async def ws_get_security_history(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return historical close prices for a security."""
    msg_id = msg.get("id")
    entry_id = msg.get("entry_id")

    if not entry_id:
        connection.send_error(msg_id, "invalid_format", "entry_id erforderlich")
        return

    try:
        entry_data = _get_entry_data(hass, entry_id)
        db_path = _resolve_db_path(entry_data)
    except LookupError as err:
        connection.send_error(msg_id, "not_found", str(err))
        return
    except ValueError as err:
        connection.send_error(msg_id, "db_error", str(err))
        return

    security_uuid = msg.get("security_uuid")
    start_date = msg.get("start_date")
    end_date = msg.get("end_date")

    try:
        history_payload = await async_fetch_security_history(
            hass,
            db_path,
            security_uuid,
            start_date=start_date,
            end_date=end_date,
        )
    except (TypeError, ValueError) as err:
        connection.send_error(msg_id, "invalid_format", str(err))
        return
    except Exception:
        _LOGGER.exception(
            "WebSocket: Fehler beim Laden historischer Preise (security_uuid=%s)",
            security_uuid,
        )
        connection.send_error(
            msg_id,
            "db_error",
            "Fehler beim Laden historischer Preise",
        )
        return

    prices: list[dict[str, Any]]
    transactions: list[dict[str, Any]]
    if isinstance(history_payload, Mapping):
        prices = list(history_payload.get("prices") or [])
        transactions = list(history_payload.get("transactions") or [])
    else:  # pragma: no cover - defensive fallback for legacy return shapes
        prices = list(history_payload or [])
        transactions = []

    response: dict[str, Any] = {
        "security_uuid": security_uuid,
        "prices": prices,
    }
    if transactions:
        response["transactions"] = transactions
    if start_date is not None:
        response["start_date"] = start_date
    if end_date is not None:
        response["end_date"] = end_date

    connection.send_result(msg_id, response)


ws_get_security_history = _wrap_with_loop_fallback(ws_get_security_history)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "pp_reader/get_security_snapshot",
        vol.Required("entry_id"): str,
        vol.Required("security_uuid"): str,
    }
)
@websocket_api.async_response
async def ws_get_security_snapshot(  # noqa: PLR0911
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return aggregated holdings and price snapshot for a security."""
    msg_id = msg.get("id")
    entry_id = msg.get("entry_id")
    security_uuid = msg.get("security_uuid")

    if not entry_id:
        connection.send_error(msg_id, "invalid_format", "entry_id erforderlich")
        return

    if not security_uuid:
        connection.send_error(
            msg_id,
            "invalid_format",
            "security_uuid erforderlich",
        )
        return

    try:
        entry_data = _get_entry_data(hass, entry_id)
        db_path = _resolve_db_path(entry_data)
    except LookupError as err:
        connection.send_error(msg_id, "not_found", str(err))
        return
    except ValueError as err:
        connection.send_error(msg_id, "db_error", str(err))
        return

    try:
        snapshot = await async_normalize_security_snapshot(
            hass,
            db_path,
            security_uuid,
        )
    except LookupError as err:
        connection.send_error(msg_id, "not_found", str(err))
        return
    except ValueError as err:
        connection.send_error(msg_id, "invalid_format", str(err))
        return
    except Exception:
        _LOGGER.exception(
            "WebSocket: Fehler beim Laden des Snapshots (security_uuid=%s)",
            security_uuid,
        )
        connection.send_error(
            msg_id,
            "db_error",
            "Fehler beim Laden des Snapshots",
        )
        return

    serialized_snapshot = _serialise_security_snapshot(snapshot)
    connection.send_result(
        msg_id,
        {
            "security_uuid": security_uuid,
            "snapshot": serialized_snapshot,
        },
    )


ws_get_security_snapshot = _wrap_with_loop_fallback(ws_get_security_snapshot)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "pp_reader/get_news_prompt",
        vol.Required("entry_id"): str,
    }
)
@websocket_api.async_response
async def ws_get_news_prompt(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return the latest news prompt template for chat interactions."""
    msg_id = msg.get("id")
    entry_id = msg.get("entry_id")

    if not entry_id:
        connection.send_error(msg_id, "invalid_format", "entry_id erforderlich")
        return

    try:
        _get_entry_data(hass, entry_id)
    except LookupError as err:
        connection.send_error(msg_id, "not_found", str(err))
        return
    except Exception:
        _LOGGER.exception(
            "WebSocket: Fehler beim Validieren des entry_id für News-Prompt"
        )
        connection.send_error(
            msg_id, "db_error", "News-Prompt konnte nicht geladen werden"
        )
        return

    try:
        link, template = await async_run_executor_job(hass, _load_news_prompt_template)
    except FileNotFoundError as err:
        connection.send_error(msg_id, "not_found", str(err))
        return
    except Exception:
        _LOGGER.exception("WebSocket: Fehler beim Laden des News-Prompt-Templates")
        connection.send_error(
            msg_id, "file_error", "News-Prompt konnte nicht geladen werden"
        )
        return

    connection.send_result(
        msg_id,
        {
            "link": link,
            "prompt_template": template,
            "placeholder": NEWS_PROMPT_PLACEHOLDER,
        },
    )


ws_get_news_prompt = _wrap_with_loop_fallback(ws_get_news_prompt)


# Registrierung neuer WS-Command (am Ende der bestehenden Registrierungen
# oder analog zu anderen)
def _serialize_realized_performance(results: list[Any]) -> list[dict[str, Any]]:
    """Convert RealizedPerformanceResult objects into plain dictionaries."""
    serialized = []
    for res in results:
        lots = [
            {
                "date": lot.date,
                "shares": lot.shares,
                "sell_price": lot.sell_price,
                "sell_price_native": lot.sell_price_native,
                "purchase_value_gross": lot.purchase_value_gross,
                "sales_value_gross": lot.sales_value_gross,
                "sales_value_net": lot.sales_value_net,
                "result_abs": lot.result_abs,
                "result_pct": lot.result_pct,
                "since_sell_abs": lot.since_sell_abs,
                "since_sell_pct": lot.since_sell_pct,
            }
            for lot in res.lots
        ]
        serialized.append(
            {
                "security_uuid": res.security_uuid,
                "name": res.name,
                "currency_code": res.currency_code,
                "ticker_symbol": res.ticker_symbol,
                "current_price": res.current_price,
                "current_holdings": res.current_holdings,
                "last_sell_price": res.last_sell_price,
                "last_sell_price_native": res.last_sell_price_native,
                "purchase_value_gross": res.purchase_value_gross,
                "sales_value_gross": res.sales_value_gross,
                "sales_value_net": res.sales_value_net,
                "result_abs": res.result_abs,
                "result_pct": res.result_pct,
                "lots": lots,
                "total_sold_shares": res.total_sold_shares,
                "last_sell_date": res.last_sell_date,
                "since_sell_abs": res.since_sell_abs,
                "since_sell_pct": res.since_sell_pct,
            }
        )
    return serialized


@websocket_api.websocket_command(
    {
        vol.Required("type"): "pp_reader/get_trades",
        vol.Required("entry_id"): str,
    }
)
@websocket_api.async_response
async def ws_get_trades(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return realized performance for all sold positions."""
    entry_id = msg.get("entry_id")
    if not entry_id:
        connection.send_error(msg["id"], "invalid_format", "entry_id erforderlich")
        return

    resolved = _resolve_entry_and_path(
        hass,
        entry_id,
        msg_id=msg.get("id"),
        connection=connection,
    )
    if resolved is None:
        return
    _, db_path = resolved

    try:
        transactions = await async_run_executor_job(hass, get_transactions, db_path)
        realized_performance = await async_run_executor_job(
            hass,
            partial(
                calculate_realized_performance,
                transactions,
                db_path,
                tx_units=None,
            ),
        )

    except Exception:
        _LOGGER.exception(
            "WebSocket: Fehler beim Berechnen der realisierten Performance"
        )
        connection.send_error(
            msg["id"],
            "calculation_failed",
            "Realisierte Performance konnte nicht berechnet werden.",
        )
        return

    connection.send_result(
        msg["id"],
        {"trades": _serialize_realized_performance(realized_performance)},
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): "pp_reader/get_portfolio_positions",
        vol.Required("entry_id"): str,
        vol.Required("portfolio_uuid"): str,
    }
)
@websocket_api.async_response
async def ws_get_portfolio_positions(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """
    Liefert die Wertpapier-Positionen eines Depots.

    Die Daten werden lazy geladen, sobald das Frontend ein Depot aufklappt.
    Bei Fehler oder unbekanntem Depot wird ein "error" Feld zurückgegeben.
    """
    entry_id = msg.get("entry_id")
    portfolio_uuid = msg.get("portfolio_uuid")

    if not entry_id:
        connection.send_error(msg["id"], "invalid_format", "entry_id erforderlich")
        return
    if not portfolio_uuid:
        connection.send_error(
            msg["id"],
            "invalid_format",
            "portfolio_uuid erforderlich",
        )
        return

    try:
        entry_data = _get_entry_data(hass, entry_id)
        db_path = _resolve_db_path(entry_data)
    except LookupError as err:
        connection.send_error(msg["id"], "not_found", str(err))
        return
    except ValueError as err:
        connection.send_error(msg["id"], "db_error", str(err))
        return

    try:
        snapshot = await async_normalize_snapshot(
            hass,
            db_path,
            include_positions=True,
        )
    except Exception:
        _LOGGER.exception(
            "WebSocket: Fehler beim Laden der Positionen für Portfolio %s",
            portfolio_uuid,
        )
        connection.send_result(
            msg["id"],
            {
                "portfolio_uuid": portfolio_uuid,
                "positions": [],
                "error": "Fehler beim Laden der Positionsdaten.",
            },
        )
        return

    portfolio = next(
        (item for item in snapshot.portfolios if item.uuid == portfolio_uuid),
        None,
    )
    if portfolio is None:
        connection.send_result(
            msg["id"],
            {
                "portfolio_uuid": portfolio_uuid,
                "positions": [],
                "error": "Unbekanntes Depot oder nicht (mehr) vorhanden.",
            },
        )
        return

    connection.send_result(
        msg["id"],
        {
            "portfolio_uuid": portfolio_uuid,
            "positions": _positions_payload(portfolio),
        },
    )


@dataclass(slots=True)
class DailyWealthRequestParams:
    """Parsed and validated request parameters."""

    entry_id: str
    start_date: date
    end_date: date
    include_slices: bool
    limit: int | None
    offset: int | None
    account_filters: list[str] | None
    portfolio_filters: list[str] | None


def _validate_daily_wealth_request(  # noqa: PLR0911, PLR0912
    msg: dict[str, Any],
) -> tuple[DailyWealthRequestParams | None, tuple[str, str] | None]:
    """Validate the WebSocket request payload."""
    entry_id = msg.get("entry_id")
    if not entry_id:
        return None, ("invalid_format", "entry_id erforderlich")

    requested_date = msg.get("date")
    requested_range = msg.get("range")

    if requested_date and requested_range:
        return None, ("invalid_format", "date und range schließen sich aus")
    if not requested_date and not requested_range:
        return None, ("invalid_format", "date oder range erforderlich")

    if requested_range is not None and not isinstance(requested_range, Mapping):
        return None, ("invalid_format", "range muss start/end enthalten")

    try:
        validated_range = (
            _DAILY_WEALTH_RANGE_SCHEMA(requested_range)
            if requested_range is not None
            else None
        )
    except vol.Invalid:
        return None, ("invalid_format", "Ungültiger range")

    if requested_date is not None and not isinstance(requested_date, str):
        return None, ("invalid_format", "Ungültiges Datum")

    if validated_range:
        start_date_raw = validated_range.get("start")
        end_date_raw = validated_range.get("end") or start_date_raw
    else:
        start_date_raw = requested_date
        end_date_raw = requested_date

    start_date = _parse_iso_date(start_date_raw)
    end_date = _parse_iso_date(end_date_raw)

    if start_date is None or end_date is None:
        return None, ("invalid_format", "Ungültiges Datum")
    if end_date < start_date:
        return None, ("invalid_format", "end_date < start_date")
    if (end_date - start_date).days > _MAX_DAILY_WEALTH_RANGE_DAYS:
        return None, ("range_too_large", "Datumsbereich zu groß")

    limit_raw = msg.get("limit")
    offset_raw = msg.get("offset", 0)

    if limit_raw is not None and (not isinstance(limit_raw, int) or limit_raw <= 0):
        return None, ("invalid_format", "limit ungültig")
    if not isinstance(offset_raw, int) or offset_raw < 0:
        return None, ("invalid_format", "offset ungültig")
    if offset_raw and limit_raw is None:
        return None, ("invalid_format", "offset erfordert limit")

    limit = (
        min(limit_raw, _MAX_DAILY_WEALTH_RANGE_DAYS) if limit_raw is not None else None
    )
    offset = offset_raw if (limit is not None or offset_raw) else None

    requested_scopes = msg.get("scopes")
    validated_scopes = None
    if requested_scopes is not None:
        if not isinstance(requested_scopes, Mapping):
            return None, ("invalid_format", "scopes ungültig")
        try:
            validated_scopes = _DAILY_WEALTH_SCOPE_FILTER_SCHEMA(requested_scopes)
        except vol.Invalid:
            return None, ("invalid_format", "scopes ungültig")

    include_slices = bool(msg.get("include_slices", msg.get("include_scopes", False)))
    if validated_scopes and not include_slices:
        return None, ("invalid_format", "scopes erfordern include_slices")

    account_filters, portfolio_filters = _extract_scope_filters(validated_scopes)

    return DailyWealthRequestParams(
        entry_id=entry_id,
        start_date=start_date,
        end_date=end_date,
        include_slices=include_slices,
        limit=limit,
        offset=offset,
        account_filters=account_filters,
        portfolio_filters=portfolio_filters,
    ), None


async def _fetch_daily_wealth_slices(
    hass: HomeAssistant,
    db_path: Path | str,
    params: DailyWealthRequestParams,
    totals: list[Any],
) -> tuple[list[Any], list[Any]]:
    """Fetch per-scope slices if requested."""
    if not params.include_slices:
        return [], []

    slice_start = totals[0].date if totals else params.start_date.isoformat()
    slice_end = totals[-1].date if totals else params.end_date.isoformat()

    db_path_obj = Path(db_path)

    account_slices = await async_run_executor_job(
        hass,
        lambda: fetch_daily_wealth_scopes(
            db_path_obj,
            scope_type="account",
            scope_ids=params.account_filters or None,
            start_date=slice_start,
            end_date=slice_end,
        ),
    )
    portfolio_slices = await async_run_executor_job(
        hass,
        lambda: fetch_daily_wealth_scopes(
            db_path_obj,
            scope_type="portfolio",
            scope_ids=params.portfolio_filters or None,
            start_date=slice_start,
            end_date=slice_end,
        ),
    )
    return account_slices, portfolio_slices


@websocket_api.websocket_command(_WS_GET_DAILY_WEALTH_SCHEMA)
@websocket_api.async_response
async def ws_get_daily_wealth(  # noqa: PLR0912, PLR0915
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return aggregated daily wealth records (and optional per-scope slices)."""
    msg_id = msg.get("id")

    params, error = _validate_daily_wealth_request(msg)
    if error:
        code, message = error
        connection.send_error(msg_id, code, message)
        return

    # params is guaranteed to be not None here due to error check
    assert params is not None  # noqa: S101

    try:
        entry_data = _get_entry_data(hass, params.entry_id)
        db_path = _resolve_db_path(entry_data)
    except LookupError as err:
        connection.send_error(msg_id, "not_found", str(err))
        return
    except ValueError as err:
        connection.send_error(msg_id, "db_error", str(err))
        return

    start_iso = params.start_date.isoformat()
    end_iso = params.end_date.isoformat()

    try:
        totals = await async_run_executor_job(
            hass,
            lambda: fetch_daily_wealth(
                db_path,
                start_iso,
                end_iso,
                limit=params.limit,
                offset=params.offset,
            ),
        )
        if not totals:
            message = f"Keine daily_wealth Daten im Zeitraum {start_iso}-{end_iso}"
            connection.send_error(msg_id, "no_data", message)
            return

        account_slices, portfolio_slices = await _fetch_daily_wealth_slices(
            hass, db_path, params, totals
        )

        # Load all known accounts and portfolios directly from DB to ensure coverage
        # even for entities not in the latest snapshot (e.g. retired or historical)
        def _load_scope_maps() -> tuple[dict[str, str], dict[str, str]]:
            all_accounts = get_accounts(Path(db_path))
            all_portfolios = get_portfolios(Path(db_path))
            return (
                {a.uuid: a.name for a in all_accounts},
                {p.uuid: p.name for p in all_portfolios},
            )

        account_map, portfolio_map = await hass.async_add_executor_job(_load_scope_maps)

        for slice_record in account_slices:
            if slice_record.scope_id in account_map:
                slice_record.scope_name = account_map[slice_record.scope_id]

        for slice_record in portfolio_slices:
            if slice_record.scope_id in portfolio_map:
                slice_record.scope_name = portfolio_map[slice_record.scope_id]
    except Exception:  # pragma: no cover - defensive logging
        _LOGGER.exception("WebSocket: Fehler beim Laden der daily_wealth Daten")
        connection.send_error(
            msg_id,
            "db_error",
            "Fehler beim Laden der daily_wealth Daten",
        )
        return

    records = [_serialize_daily_wealth(rec) for rec in totals]

    # --- Period-Specific Realized Gains Calculation ---
    # Standard daily_wealth stores absolute realized gains (Buy->Sell).
    # For Period views, we need gains relative to the Period Start Value.
    metrics_payload = None
    if params.start_date and params.end_date:
        try:
            _LOGGER.debug(
                "Calculating period performance for %s to %s",
                params.start_date,
                params.end_date,
            )
            period_metrics = await async_run_executor_job(
                hass,
                calculate_period_performance_series,
                db_path,
                params.start_date,
                params.end_date,
            )
            _LOGGER.debug("Calculated metrics for %d days", len(period_metrics))
            # Inject into records
            for rec in records:
                iso = rec["date"]
                if iso in period_metrics:
                    pm = period_metrics[iso]
                    rec["realized_gains_eur"] = pm.realized_gains_eur
                    rec["unrealized_gains_eur"] = pm.unrealized_gains_eur
                else:
                    # No metrics found for this day (no trades + no holdings?)
                    rec["realized_gains_eur"] = 0.0
                    rec["unrealized_gains_eur"] = 0.0

            # Calculate Aggregate Performance Metrics (Phase C)
            def _calc_metrics() -> dict[str, float]:
                with sqlite3.connect(db_path) as conn:
                    calc = PerformanceCalculator(conn)
                    perf = calc.calculate(
                        params.start_date,
                        params.end_date,
                        account_ids=params.account_filters,
                        portfolio_ids=params.portfolio_filters,
                    )
                    return {
                        "absolute_performance": perf.absolute_performance,
                        "realized_gains": perf.realized_gains,
                        "unrealized_gains": perf.unrealized_gains,
                        "fx_gains_cash": perf.fx_gains_cash,
                    }

            metrics_payload = await async_run_executor_job(hass, _calc_metrics)

        except Exception:
            _LOGGER.exception("Failed to calculate period performance")

    # PP Alignment: "Start Date" wealth is the baseline (End of Day).
    # Flows occurring ON the start date should be excluded from period summation.
    # Exception: Single Day view (start == end) includes flows.
    if (
        params.start_date != params.end_date
        and records
        and records[0]["date"] == start_iso
    ):
        for key in (
            "dividends_eur",
            "interest_eur",
            "inbound_transfers_eur",
            "outbound_transfers_eur",
            "fees_eur",
            "taxes_eur",
            "realized_gains_eur",
            "unrealized_gains_eur",
            "performance_neutral_movements",
        ):
            # Mutate the dictionary in place to zero out the start date values
            records[0][key] = 0.0

    payload: dict[str, Any] = {
        "range": {"start": start_iso, "end": end_iso},
        "records": records,
    }
    if metrics_payload:
        payload["metrics"] = metrics_payload

    if params.include_slices:
        acc_records = [_serialize_daily_scope(rec) for rec in account_slices]
        port_records = [_serialize_daily_scope(rec) for rec in portfolio_slices]

        if params.start_date != params.end_date:
            # Apply same exclusion logic to slices
            for rec_list in (acc_records, port_records):
                # Slices might be multiple per day, need to filter all matching
                # start_date
                for rec in rec_list:
                    if rec["date"] == start_iso:
                        for key in (
                            "dividends_eur",
                            "interest_eur",
                            "inbound_transfers_eur",
                            "outbound_transfers_eur",
                            "performance_neutral_movements",
                            "fees_eur",
                            "taxes_eur",
                            "realized_gains_eur",
                            "unrealized_gains_eur",
                        ):
                            rec[key] = 0.0

        payload["slices"] = {
            "accounts": acc_records,
            "portfolios": port_records,
        }

    connection.send_result(msg_id, payload)


ws_get_daily_wealth = _wrap_with_loop_fallback(ws_get_daily_wealth)


def async_register_commands(hass: HomeAssistant) -> None:
    """Registriert alle WebSocket-Commands dieses Modules."""
    websocket_api.async_register_command(hass, ws_get_trades)
    websocket_api.async_register_command(hass, ws_get_portfolio_positions)
    websocket_api.async_register_command(hass, ws_get_security_history)
    websocket_api.async_register_command(hass, ws_get_security_snapshot)
    websocket_api.async_register_command(hass, ws_get_daily_wealth)
