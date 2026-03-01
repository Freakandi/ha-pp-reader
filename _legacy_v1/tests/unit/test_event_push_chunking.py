from __future__ import annotations

from custom_components.pp_reader.data.event_push import (
    _chunk_positions_entry_payloads,
)


def test_chunk_positions_entry_payloads_split_by_size() -> None:
    """Positions updates are split into multiple chunks with metadata."""
    base_payload = {
        "domain": "pp_reader",
        "entry_id": "entry-1",
        "data_type": "portfolio_positions",
        "synced_at": "2025-01-01T00:00:00",
    }
    entry = {
        "portfolio_uuid": "pid-1",
        "positions": [{"name": f"pos-{i}", "current_holdings": i} for i in range(5)],
    }

    chunks = _chunk_positions_entry_payloads(base_payload, [entry], max_bytes=220)

    assert len(chunks) > 1
    for idx, chunk in enumerate(chunks, start=1):
        assert chunk["data"][0]["chunk_index"] == idx
        assert chunk["data"][0]["chunk_count"] == len(chunks)
