"""Share-level helpers for Portfolio Performance integrations."""

from __future__ import annotations


def normalize_shares(raw_shares: int) -> float:
    """Convert raw shares with eight decimal places into a float quantity."""

    return raw_shares / 10**8
