"""Tests for Yahoo history ingestion helpers."""

from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace

import pytest

from custom_components.pp_reader.prices import history_ingest as ingest


class _StubFrame:
    """Minimal pandas-like frame for _normalize_history testing."""

    def __init__(self, rows: list[dict[str, object]]) -> None:
        self._rows = rows
        self.empty = not rows

    def reset_index(self):  # pragma: no cover - identical object returned
        return self

    def itertuples(self):
        for row in self._rows:
            yield SimpleNamespace(**row)


def test_normalize_history_dataframe_handles_rows() -> None:
    timestamp = datetime(2024, 3, 1, tzinfo=UTC)
    frame = _StubFrame(
        [
            {
                "symbol": "usd",
                "date": timestamp,
                "close": 1.1,
                "high": 1.2,
                "low": 1.0,
                "open": 1.05,
                "volume": 500,
            }
        ]
    )

    candles = ingest._normalize_history("USD", frame)  # pylint: disable=protected-access
    assert len(candles) == 1
    candle = candles[0]
    assert candle.symbol == "USD"
    assert candle.close == pytest.approx(1.1)
    assert candle.high == pytest.approx(1.2)
    assert candle.volume == pytest.approx(500)


def test_normalize_history_dict_multiindex() -> None:
    history = {
        ("USD", "2024-03-01"): {
            "close": 1.23,
            "high": 1.3,
            "low": 1.2,
            "open": 1.22,
            "volume": 1000,
        }
    }

    candles = ingest._normalize_history("USD", history)  # pylint: disable=protected-access
    assert len(candles) == 1
    candle = candles[0]
    assert candle.symbol == "USD"
    assert candle.close == pytest.approx(1.23)
    assert candle.high == pytest.approx(1.3)
    assert candle.volume == pytest.approx(1000)


@pytest.mark.asyncio
async def test_fetch_history_for_jobs_respects_fetcher(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    jobs = [
        ingest.HistoryJob(
            symbol="USD",
            start=datetime(2024, 3, 1, tzinfo=UTC),
            end=datetime(2024, 3, 2, tzinfo=UTC),
        ),
        ingest.HistoryJob(
            symbol="CHF",
            start=datetime(2024, 3, 1, tzinfo=UTC),
            end=datetime(2024, 3, 2, tzinfo=UTC),
        ),
    ]

    async def _fake_fetch(self, job):
        return [
            ingest.HistoryCandle(
                symbol=job.symbol,
                timestamp=job.end,
                close=1.0,
            )
        ]

    fetcher = ingest.YahooHistoryFetcher()
    monkeypatch.setattr(ingest.YahooHistoryFetcher, "fetch", _fake_fetch)

    results = await ingest.fetch_history_for_jobs(
        jobs, fetcher=fetcher, max_concurrency=1
    )
    assert len(results) == 2
    for candles in results.values():
        assert len(candles) == 1
        assert candles[0].close == 1.0


def test_chunk_history_jobs_batches_correctly() -> None:
    jobs = [
        ingest.HistoryJob(
            symbol=f"SYM{i}",
            start=datetime(2024, 3, 1, tzinfo=UTC),
            end=datetime(2024, 3, 2, tzinfo=UTC),
        )
        for i in range(5)
    ]

    batches = ingest.chunk_history_jobs(jobs, batch_size=2)
    assert len(batches) == 3
    assert len(batches[0]) == 2
    assert len(batches[-1]) == 1


@pytest.mark.asyncio
async def test_history_fetcher_normalizes_blocking(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    job = ingest.HistoryJob(
        symbol="USD",
        start=datetime(2024, 3, 1, tzinfo=UTC),
        end=datetime(2024, 3, 2, tzinfo=UTC),
    )

    def _fake_blocking(self, job_arg):
        assert job_arg.symbol == "USD"
        return {
            ("USD", "2024-03-01"): {"close": 1.11},
        }

    fetcher = ingest.YahooHistoryFetcher()
    monkeypatch.setattr(ingest.YahooHistoryFetcher, "_fetch_blocking", _fake_blocking)

    candles = await fetcher.fetch(job)
    assert len(candles) == 1
    assert candles[0].close == pytest.approx(1.11)
