from __future__ import annotations

from custom_components.pp_reader.data.event_push import _compact_event_data


def test_compact_portfolio_values_converts_cent_amounts() -> None:
    raw = [
        {
            "uuid": "portfolio-1",
            "current_value": 12345,
            "purchase_sum": 23456,
            "performance": {
                "gain_abs": 345.67,
                "gain_pct": 8.9,
            },
        },
        {
            "uuid": "portfolio-2",
            "current_value": True,
            "purchase_sum": None,
        },
    ]

    compacted = _compact_event_data("portfolio_values", raw)
    assert isinstance(compacted, list)
    assert len(compacted) == 2

    first = compacted[0]
    assert first["uuid"] == "portfolio-1"
    assert first["current_value"] == 123.45
    assert first["purchase_sum"] == 234.56
    assert first["gain_abs"] == 345.67
    assert first["gain_pct"] == 8.9

    second = compacted[1]
    assert second["uuid"] == "portfolio-2"
    assert second["current_value"] == 0.0
    assert second["purchase_sum"] == 0.0


def test_compact_portfolio_positions_sequence() -> None:
    raw = [
        {
            "portfolio_uuid": "portfolio-1",
            "positions": [
                {
                    "security_uuid": "sec-1",
                    "name": "Security A",
                    "current_holdings": 2,
                    "purchase_value_eur": 123.45,
                    "current_value": 45678,
                    "performance": {
                        "gain_abs": 333.33,
                        "gain_pct": 4.5,
                        "extra": "ignore",
                    },
                    "average_cost": {
                        "native": 11.5,
                        "security": 12.5,
                        "account": 13.5,
                    },
                    "aggregation": {
                        "purchase_total_security": 210.0,
                        "purchase_total_account": 211.0,
                        "avg_price_security": 10.0,
                        "avg_price_account": 10.5,
                    },
                    "unused": "value",
                }
            ],
            "unused": "drop",
        },
        {
            "portfolio_uuid": "portfolio-2",
            "positions": [],
            "error": "temporary",
        },
    ]

    compacted = _compact_event_data("portfolio_positions", raw)
    assert isinstance(compacted, list)
    assert len(compacted) == 2

    first = compacted[0]
    assert first["portfolio_uuid"] == "portfolio-1"
    assert "unused" not in first
    first_positions = first["positions"]
    assert isinstance(first_positions, list)
    assert len(first_positions) == 1

    normalized = first_positions[0]
    assert normalized["security_uuid"] == "sec-1"
    assert normalized["name"] == "Security A"
    assert normalized["current_holdings"] == 2
    assert normalized["purchase_value"] == 123.45
    assert normalized["current_value"] == 456.78
    assert "unused" not in normalized
    assert "aggregation" not in normalized
    # ensure aggregation values have been preserved in normalized form
    assert normalized["purchase_total_security"] == 210.0
    assert normalized["purchase_total_account"] == 211.0
    assert normalized["avg_price_security"] == 12.5
    assert normalized["avg_price_account"] == 13.5
    assert "performance" in normalized

    second = compacted[1]
    assert second["portfolio_uuid"] == "portfolio-2"
    assert second["positions"] == []
    assert second["error"] == "temporary"
