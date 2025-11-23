"""
Queue management for historical price ingestion.

Coordinates creation of Yahoo history jobs backed by the `price_history_queue`
table and persists fetched candles into the canonical history store.
"""

from __future__ import annotations

import asyncio
import json
import sqlite3
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import TYPE_CHECKING, Any

__all__ = [
    "HistoryQueueManager",
    "SecurityHistoryTarget",
    "build_history_targets_from_parsed",
]


from custom_components.pp_reader.data.db_access import (
    NewPriceHistoryJob,
    complete_price_history_job,
    enqueue_price_history_job,
    get_price_history_jobs_by_status,
    mark_price_history_job_started,
    price_history_job_exists,
)

from .history_ingest import (
    DEFAULT_HISTORY_INTERVAL,
    HistoryCandle,
    HistoryJob,
    YahooHistoryFetcher,
    fetch_history_for_jobs,
)

if TYPE_CHECKING:  # pragma: no cover - typing only
    from custom_components.pp_reader.models import parsed as parsed_models

    ParsedSecurityType = parsed_models.ParsedSecurity
else:
    ParsedSecurityType = Any

_DEFAULT_LOOKBACK_DAYS = 365
_REFRESH_OVERLAP_DAYS = 30


def _normalize_symbol_token(value: str | None) -> str | None:
    if not value or not isinstance(value, str):
        return None
    token = value.strip()
    if not token:
        return None
    if "#" in token:
        token = token.split("#", 1)[1]
    elif ":" in token:
        token = token.split(":", 1)[-1]
    token = token.strip()
    return token.upper() if token else None


def _symbol_from_properties(properties: Mapping[str, Any]) -> tuple[str | None, str]:
    for key, value in properties.items():
        if not isinstance(key, str) or not isinstance(value, str):
            continue
        lowered = key.lower()
        if "symbol" in lowered or "ticker" in lowered or "yahoo" in lowered:
            normalized = _normalize_symbol_token(value)
            if normalized:
                return normalized, f"property:{key}"
    return None, ""


_PENDING_STATUSES = ("pending", "running")
_JOB_STATUS_COMPLETED = "done"
_JOB_STATUS_FAILED = "failed"


@dataclass(frozen=True, slots=True)
class SecurityHistoryTarget:
    """Metadata for scheduling history ingestion jobs."""

    security_uuid: str
    feed: str | None
    ticker_symbol: str | None
    online_id: str | None
    properties: Mapping[str, Any]
    name: str | None = None

    def resolve_symbol(self) -> tuple[str | None, str]:
        """Return preferred symbol and source identifier."""
        symbol_value, symbol_source = _symbol_from_properties(self.properties)
        if symbol_value:
            return symbol_value, symbol_source

        symbol_value = _normalize_symbol_token(self.online_id)
        if symbol_value:
            return symbol_value, "online_id"

        symbol_value = _normalize_symbol_token(self.ticker_symbol)
        if symbol_value:
            return symbol_value, "ticker_symbol"

        return None, ""


def _epoch_day(ts: datetime) -> int:
    return int(ts.replace(tzinfo=UTC).timestamp() // 86400)


def _scale_price(value: float | None) -> int | None:
    if value in (None, 0):
        return None
    return round(float(value) * 1e8)


def _load_latest_history_epoch(
    conn: sqlite3.Connection,
    security_uuid: str,
) -> int | None:
    cur = conn.execute(
        """
        SELECT MAX(date) FROM historical_prices WHERE security_uuid = ?
        """,
        (security_uuid,),
    )
    row = cur.fetchone()
    if not row:
        return None
    return row[0]


def _latest_epoch_to_date(epoch: int) -> date:
    return datetime.fromtimestamp(epoch * 86400, tz=UTC).date()


def build_history_targets_from_parsed(
    securities: Sequence[ParsedSecurityType],
) -> list[SecurityHistoryTarget]:
    """Derive queue targets from parsed securities using feed metadata."""
    targets: list[SecurityHistoryTarget] = []
    for security in securities:
        feed_value = security.feed if isinstance(security.feed, str) else None
        feed_normalized = feed_value.strip().upper() if feed_value else None
        if feed_normalized not in (None, "YAHOO"):
            continue

        properties: Mapping[str, Any]
        if isinstance(security.properties, Mapping):
            properties = dict(security.properties)
        else:
            properties = {}

        target = SecurityHistoryTarget(
            security_uuid=security.uuid,
            feed=feed_normalized,
            ticker_symbol=security.ticker_symbol,
            online_id=security.online_id,
            properties=properties,
            name=security.name,
        )
        symbol, _ = target.resolve_symbol()
        if not symbol:
            continue
        targets.append(target)
    return targets


class HistoryQueueManager:
    """Coordinate queue planning and execution for Yahoo history jobs."""

    def __init__(
        self,
        db_path: str | Path,
        *,
        fetcher: YahooHistoryFetcher | None = None,
    ) -> None:
        """Initialise the queue manager with database path and optional fetcher."""
        self._db_path = Path(db_path)
        self._fetcher = fetcher or YahooHistoryFetcher()

    async def plan_jobs(
        self,
        targets: Sequence[SecurityHistoryTarget],
        *,
        lookback_days: int = _DEFAULT_LOOKBACK_DAYS,
        interval: str = DEFAULT_HISTORY_INTERVAL,
    ) -> int:
        """Enqueue jobs for securities that lack historical coverage."""
        if lookback_days <= 0:
            message = "lookback_days muss größer 0 sein"
            raise ValueError(message)

        if not targets:
            return 0

        def _plan_jobs_sync() -> int:
            today = datetime.now(UTC).date()
            start_floor = today - timedelta(days=lookback_days - 1)
            enqueued = 0

            conn = sqlite3.connect(str(self._db_path))
            try:
                for target in targets:
                    if not target.security_uuid:
                        continue

                    if price_history_job_exists(
                        self._db_path,
                        target.security_uuid,
                        statuses=_PENDING_STATUSES,
                    ):
                        continue

                    latest_epoch = _load_latest_history_epoch(
                        conn, target.security_uuid
                    )
                    if latest_epoch is None:
                        job_start_date = start_floor
                    else:
                        latest_date = _latest_epoch_to_date(latest_epoch)
                        overlap = min(_REFRESH_OVERLAP_DAYS, lookback_days)
                        job_start_date = max(
                            start_floor,
                            latest_date - timedelta(days=overlap - 1),
                        )

                    if job_start_date > today:
                        continue

                    job_end_date = today
                    start_dt = datetime(
                        job_start_date.year,
                        job_start_date.month,
                        job_start_date.day,
                        tzinfo=UTC,
                    )
                    end_dt = datetime(
                        job_end_date.year,
                        job_end_date.month,
                        job_end_date.day,
                        tzinfo=UTC,
                    )

                    symbol, symbol_source = target.resolve_symbol()
                    if not symbol:
                        continue

                    job = HistoryJob(
                        symbol=symbol,
                        start=start_dt,
                        end=end_dt,
                        interval=interval,
                    )

                    provenance_payload = json.dumps(
                        {
                            "symbol": job.symbol,
                            "start": job.start.isoformat(),
                            "end": job.end.isoformat(),
                            "interval": job.interval,
                            "symbol_source": symbol_source or "unknown",
                            "feed": target.feed,
                            "online_id": target.online_id,
                            "ticker_symbol": target.ticker_symbol,
                            "name": target.name,
                        }
                    )

                    new_job = NewPriceHistoryJob(
                        security_uuid=target.security_uuid,
                        requested_date=_epoch_day(job.end),
                        status="pending",
                        priority=0,
                        scheduled_at=datetime.now(UTC).strftime(
                            "%Y-%m-%dT%H:%M:%SZ",
                        ),
                        data_source=(target.feed.lower() if target.feed else "yahoo"),
                        provenance=provenance_payload,
                    )
                    enqueue_price_history_job(self._db_path, new_job)
                    enqueued += 1
            finally:
                conn.close()

            return enqueued

        return await asyncio.to_thread(_plan_jobs_sync)

    async def process_pending_jobs(
        self,
        *,
        limit: int = 10,
    ) -> dict[int, list[HistoryCandle]]:
        """Fetch pending jobs, download history, and persist results."""
        entries = get_price_history_jobs_by_status(
            self._db_path,
            "pending",
            limit=limit,
        )
        if not entries:
            return {}

        entries_by_id = {entry.id: entry for entry in entries}
        job_map: dict[int, HistoryJob] = {}
        provenance_by_id: dict[int, dict[str, Any]] = {}
        unresolved: dict[int, str] = {}

        for entry in entries:
            provenance_data: dict[str, Any] = {}
            if entry.provenance:
                try:
                    provenance_data = json.loads(entry.provenance)
                except json.JSONDecodeError:
                    unresolved[entry.id] = "ungültige Provenienz"
                    continue

            symbol = provenance_data.get("symbol")
            start_iso = provenance_data.get("start")
            end_iso = provenance_data.get("end")
            interval = provenance_data.get("interval", DEFAULT_HISTORY_INTERVAL)

            if not symbol or not start_iso or not end_iso:
                unresolved[entry.id] = "unvollständige Provenienz"
                continue

            try:
                history_job = HistoryJob(
                    symbol=symbol,
                    start=start_iso,
                    end=end_iso,
                    interval=interval,
                )
            except (TypeError, ValueError) as exc:
                unresolved[entry.id] = str(exc)
                continue

            mark_price_history_job_started(self._db_path, entry.id)
            job_map[entry.id] = history_job
            provenance_by_id[entry.id] = provenance_data

        results: dict[int, list[HistoryCandle]] = {}

        if job_map:
            history_results = await fetch_history_for_jobs(
                job_map.values(),
                fetcher=self._fetcher,
            )

            for job_id, history_job in job_map.items():
                candles = history_results.get(history_job, [])
                results[job_id] = candles

                entry = entries_by_id[job_id]

                prov = provenance_by_id.get(job_id, {})
                result_info = {"candles": len(candles), "symbol": history_job.symbol}
                symbol_source = (
                    prov.get("symbol_source") if isinstance(prov, dict) else None
                )
                if symbol_source:
                    result_info["symbol_source"] = symbol_source

                if candles:
                    await asyncio.to_thread(
                        _persist_candles,
                        self._db_path,
                        entry.security_uuid,
                        candles,
                    )
                    complete_price_history_job(
                        self._db_path,
                        job_id,
                        status=_JOB_STATUS_COMPLETED,
                        provenance_updates={"last_result": result_info},
                    )
                else:
                    complete_price_history_job(
                        self._db_path,
                        job_id,
                        status=_JOB_STATUS_COMPLETED,
                        provenance_updates={"last_result": result_info},
                    )

        for job_id, error in unresolved.items():
            complete_price_history_job(
                self._db_path,
                job_id,
                status=_JOB_STATUS_FAILED,
                last_error=error,
            )

        return results


def _persist_candles(
    db_path: Path,
    security_uuid: str,
    candles: Sequence[HistoryCandle],
) -> None:
    if not candles:
        return

    rows = [
        (
            security_uuid,
            _epoch_day(candle.timestamp),
            _scale_price(candle.close),
            _scale_price(candle.high),
            _scale_price(candle.low),
            int(candle.volume) if candle.volume is not None else None,
            candle.timestamp.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
            candle.data_source,
            candle.data_source,
            json.dumps({"symbol": candle.symbol}),
        )
        for candle in candles
    ]

    conn = sqlite3.connect(str(db_path))
    try:
        conn.executemany(
            """
            INSERT OR REPLACE INTO historical_prices (
                security_uuid,
                date,
                close,
                high,
                low,
                volume,
                fetched_at,
                data_source,
                provider,
                provenance
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )
        conn.commit()
    finally:
        conn.close()
