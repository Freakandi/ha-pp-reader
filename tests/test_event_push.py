from __future__ import annotations

from custom_components.pp_reader.data.event_push import _compact_event_data


def test_compact_portfolio_values_forwards_canonical_payload() -> None:
    raw = [
        {
            "uuid": "portfolio-1",
            "name": "Alpha Portfolio",
            "position_count": 3,
            "current_value": 123.45,
            "purchase_sum": 234.56,
            "performance": {
                "gain_abs": 345.67,
                "gain_pct": 8.9,
                "total_change_eur": 345.67,
                "total_change_pct": 8.9,
                "source": "calculated",
                "coverage_ratio": 1.0,
                "day_change": {
                    "price_change_native": None,
                    "price_change_eur": None,
                    "change_pct": None,
                    "source": "unavailable",
                    "coverage_ratio": 0.0,
                },
            },
            "missing_value_positions": 0,
        },
        {
            "uuid": "portfolio-2",
            "count": 1,
            "current_value": 10.0,
            "purchase_sum": 5.0,
            "performance": {
                "gain_abs": 5.0,
                "gain_pct": 50.0,
            },
        },
    ]

    compacted = _compact_event_data("portfolio_values", raw)

    assert isinstance(compacted, list)
    assert len(compacted) == 2
    assert compacted[0] == {
        "uuid": "portfolio-1",
        "name": "Alpha Portfolio",
        "position_count": 3,
        "current_value": 123.45,
        "purchase_sum": 234.56,
        "performance": raw[0]["performance"],
        "missing_value_positions": 0,
    }

    second = compacted[1]
    assert second["uuid"] == "portfolio-2"
    assert second["position_count"] == 1
    assert "count" not in second
    assert second["current_value"] == 10.0
    assert second["purchase_sum"] == 5.0
    assert "gain_abs" not in second
    assert "gain_pct" not in second


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
                    "current_value": 456.78,
                    "performance": {
                        "gain_abs": 333.33,
                        "gain_pct": 4.5,
                        "day_change": {
                            "price_change_native": 1.1,
                            "price_change_eur": 2.2,
                            "change_pct": 0.33,
                        },
                        "extra": "ignore",
                    },
                    "average_cost": {
                        "native": 11.5,
                        "security": 12.5,
                        "account": 13.5,
                        "eur": 6.7,
                        "source": "totals",
                        "coverage_ratio": 0.5,
                    },
                    "aggregation": {
                        "total_holdings": 2,
                        "positive_holdings": 2,
                        "purchase_value_cents": 12345,
                        "purchase_value_eur": 123.45,
                        "purchase_total_security": 210.0,
                        "purchase_total_account": 211.0,
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
    # structured aggregation payload is forwarded
    aggregation = normalized["aggregation"]
    assert aggregation["total_holdings"] == 2.0
    assert aggregation["positive_holdings"] == 2.0
    assert aggregation["purchase_value_cents"] == 12345
    assert aggregation["purchase_value_eur"] == 123.45
    assert aggregation["purchase_total_security"] == 210.0
    assert aggregation["purchase_total_account"] == 211.0
    assert "avg_price_security" not in aggregation
    assert "avg_price_account" not in aggregation
    assert "purchase_total_security" not in normalized
    assert "purchase_total_account" not in normalized
    assert "avg_price_security" not in normalized
    assert "avg_price_account" not in normalized
    average_cost = normalized["average_cost"]
    assert average_cost["native"] == 11.5
    assert average_cost["security"] == 12.5
    assert average_cost["account"] == 13.5
    assert average_cost["eur"] == 6.7
    assert average_cost["source"] == "totals"
    assert average_cost["coverage_ratio"] == 0.5
    performance = normalized["performance"]
    assert performance["gain_abs"] == 333.33
    assert performance["gain_pct"] == 4.5
    day_change = performance["day_change"]
    assert day_change["price_change_native"] == 1.1
    assert day_change["price_change_eur"] == 2.2
    assert day_change["change_pct"] == 0.33

    second = compacted[1]
    assert second["portfolio_uuid"] == "portfolio-2"
    assert second["positions"] == []
    assert second["error"] == "temporary"
