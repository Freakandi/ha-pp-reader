"""Streaming parser pipeline orchestrating ingestion stages."""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable, Iterable, Sequence
from dataclasses import dataclass
from functools import lru_cache, partial
from typing import TYPE_CHECKING, Any, Final, Literal, TypeVar

from custom_components.pp_reader.const import EVENT_PARSER_PROGRESS
from custom_components.pp_reader.models import parsed

from . import PortfolioParseError, PortfolioValidationError
from .portfolio_file import async_read_portfolio_bytes

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant
else:  # pragma: no cover - runtime fallback when Home Assistant not present
    HomeAssistant = Any  # type: ignore[assignment]

StageLiteral = Literal["accounts", "portfolios", "securities", "transactions"]

SUPPORTED_SECURITY_TYPES: Final = {
    "STOCK",
    "FUND",
    "ETF",
    "BOND",
    "CASH",
    "INDEX",
    "COMMODITY",
    "CRYPTO",
    "CERTIFICATE",
    "STRUCTURED_PRODUCT",
    "DERIVATIVE",
    "MUTUAL_FUND",
    "OTHER",
}

WriterT = TypeVar("WriterT")
ProgressCallback = Callable[["ParseProgress"], Awaitable[None] | None]

@dataclass(slots=True)
class ParseProgress:
    """Progress payload shared with callbacks during parsing."""

    stage: StageLiteral
    processed: int
    total: int


@dataclass(slots=True)
class StageBatch:
    """Container describing a parsing stage for downstream processing."""

    name: StageLiteral
    items: Sequence[Any]
    total: int


async def async_parse_portfolio(
    hass: HomeAssistant,
    path: str,
    writer: WriterT,
    progress_cb: ProgressCallback | None = None,
    *,
    fire_progress: bool = True,
) -> parsed.ParsedClient:
    """
    Parse the given Portfolio Performance archive into staged domain models.

    The pipeline streams entities in deterministic order, validates invariants,
    and forwards batches to the provided writer implementation. Returns the
    fully-parsed client container for downstream consumers.
    """
    raw_payload = await async_read_portfolio_bytes(path)
    proto_client = await _async_parse_proto_client(hass, raw_payload)

    parsed_client = await hass.async_add_executor_job(
        _build_parsed_client, proto_client
    )

    stages = [
        StageBatch("accounts", parsed_client.accounts, len(parsed_client.accounts)),
        StageBatch(
            "portfolios", parsed_client.portfolios, len(parsed_client.portfolios)
        ),
        StageBatch(
            "securities", parsed_client.securities, len(parsed_client.securities)
        ),
        StageBatch(
            "transactions", parsed_client.transactions, len(parsed_client.transactions)
        ),
    ]

    for batch in stages:
        await _process_stage(
            hass,
            writer,
            batch,
            progress_cb,
            fire_progress=fire_progress,
        )

    finalize = getattr(writer, "finalize", None)
    if finalize is not None:
        await _invoke_writer(
            hass,
            finalize,
            version=parsed_client.version,
            base_currency=parsed_client.base_currency,
            properties=parsed_client.properties,
        )

    return parsed_client


async def _async_parse_proto_client(hass: HomeAssistant, payload: bytes) -> Any:
    client_pb2, protobuf_message = _get_proto_runtime()

    def _decode() -> Any:
        client = client_pb2.PClient()
        client.ParseFromString(payload)
        return client

    try:
        return await hass.async_add_executor_job(_decode)
    except protobuf_message.DecodeError as err:
        msg = "failed to decode protobuf payload"
        raise PortfolioValidationError(msg) from err


@lru_cache(maxsize=1)
def _get_proto_runtime() -> tuple[Any, Any]:
    try:
        from custom_components.pp_reader.name.abuchen.portfolio import client_pb2
    except ModuleNotFoundError as err:
        msg = "protobuf schema not available"
        raise PortfolioParseError(msg) from err

    try:
        from google.protobuf import message as protobuf_message
    except ModuleNotFoundError as err:
        msg = "protobuf runtime not installed"
        raise PortfolioParseError(msg) from err

    return client_pb2, protobuf_message


def _build_parsed_client(proto_client: Any) -> parsed.ParsedClient:
    accounts = list(_iter_accounts(proto_client))
    portfolios = list(_iter_portfolios(proto_client))
    securities = list(_iter_securities(proto_client))
    transactions = list(_iter_transactions(proto_client))
    properties = _extract_properties(proto_client)

    return parsed.ParsedClient(
        version=int(getattr(proto_client, "version", 0)),
        base_currency=getattr(proto_client, "baseCurrency", None) or None,
        accounts=accounts,
        portfolios=portfolios,
        securities=securities,
        transactions=transactions,
        properties=properties,
    )


def _ensure_unique(seen: set[str], uuid: str, entity: str) -> None:
    if not uuid:
        msg = f"{entity} missing uuid"
        raise PortfolioValidationError(msg)
    if uuid in seen:
        msg = f"duplicate {entity} uuid '{uuid}'"
        raise PortfolioValidationError(msg)
    seen.add(uuid)


def _iter_accounts(proto_client: Any) -> Iterable[parsed.ParsedAccount]:
    seen: set[str] = set()
    for account in getattr(proto_client, "accounts", []):
        uuid = getattr(account, "uuid", "")
        _ensure_unique(seen, uuid, "account")
        yield parsed.ParsedAccount.from_proto(account)


def _iter_portfolios(proto_client: Any) -> Iterable[parsed.ParsedPortfolio]:
    seen: set[str] = set()
    for portfolio in getattr(proto_client, "portfolios", []):
        uuid = getattr(portfolio, "uuid", "")
        _ensure_unique(seen, uuid, "portfolio")
        yield parsed.ParsedPortfolio.from_proto(portfolio)


def _iter_securities(proto_client: Any) -> Iterable[parsed.ParsedSecurity]:
    seen: set[str] = set()
    for security in getattr(proto_client, "securities", []):
        uuid = getattr(security, "uuid", "")
        _ensure_unique(seen, uuid, "security")

        parsed_security = parsed.ParsedSecurity.from_proto(security)
        _validate_security_type(parsed_security)
        yield parsed_security


def _iter_transactions(proto_client: Any) -> Iterable[parsed.ParsedTransaction]:
    seen: set[str] = set()
    for transaction in getattr(proto_client, "transactions", []):
        uuid = getattr(transaction, "uuid", "")
        _ensure_unique(seen, uuid, "transaction")

        parsed_transaction = parsed.ParsedTransaction.from_proto(transaction)
        _validate_transaction_units(parsed_transaction)
        yield parsed_transaction


def _extract_properties(proto_client: Any) -> dict[str, str]:
    properties = getattr(proto_client, "properties", None)
    if properties is None:
        return {}

    try:
        return dict(properties)
    except TypeError:
        result: dict[str, str] = {}
        for key, value in properties.items():  # type: ignore[assignment]
            result[str(key)] = str(value)
        return result


def _validate_security_type(security: parsed.ParsedSecurity) -> None:
    sec_type = security.properties.get("type")
    if not sec_type:
        return
    if not isinstance(sec_type, str):
        msg = f"unsupported security type '{sec_type}'"
        raise PortfolioValidationError(msg)
    normalized = sec_type.upper()
    if normalized not in SUPPORTED_SECURITY_TYPES:
        msg = f"unsupported security type '{sec_type}'"
        raise PortfolioValidationError(msg)


def _validate_transaction_units(transaction: parsed.ParsedTransaction) -> None:
    for unit in transaction.units:
        if unit.type not in (0, 1, 2):
            msg = f"unsupported transaction unit type '{unit.type}'"
            raise PortfolioValidationError(msg)


async def _process_stage(
    hass: HomeAssistant,
    writer: WriterT,
    batch: StageBatch,
    progress_cb: ProgressCallback | None,
    *,
    fire_progress: bool,
) -> None:
    handler_name = f"write_{batch.name}"
    handler = getattr(writer, handler_name, None)
    if handler is not None and batch.items:
        await _invoke_writer(hass, handler, batch.items)

    if not fire_progress:
        return

    if batch.total == 0:
        await _notify_progress(
            hass,
            progress_cb,
            ParseProgress(batch.name, 0, 0),
        )
        return

    for processed, _ in enumerate(batch.items, start=1):
        await _notify_progress(
            hass,
            progress_cb,
            ParseProgress(batch.name, processed, batch.total),
        )


async def _invoke_writer(
    hass: HomeAssistant,
    handler: Callable[..., Any],
    *args: Any,
    **kwargs: Any,
) -> None:
    if asyncio.iscoroutinefunction(handler):
        await handler(*args, **kwargs)
        return

    callback = partial(handler, *args, **kwargs)
    await hass.async_add_executor_job(callback)


async def _notify_progress(
    hass: HomeAssistant,
    progress_cb: ProgressCallback | None,
    progress: ParseProgress,
) -> None:
    if progress_cb is None:
        callback_result = None
    else:
        callback_result = progress_cb(progress)
        if asyncio.iscoroutine(callback_result):
            await callback_result

    hass.bus.async_fire(
        EVENT_PARSER_PROGRESS,
        {
            "stage": progress.stage,
            "processed": progress.processed,
            "total": progress.total,
        },
    )
