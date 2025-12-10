#!/usr/bin/env python3
"""
Script to inject coverage gaps into the pp_reader database for testing purposes.

It updates 'daily_wealth' records to simulate missing FX or price data.
"""

import argparse
import logging
import sqlite3
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)


def find_db_path(base_dir: str | Path) -> Path | None:
    """Find the pp_reader database file in standard locations."""
    base_path = Path(base_dir)
    # Search patterns for dev env
    patterns = [
        base_path / "pp_reader_data" / "*.db",
        base_path / "config" / "pp_reader_data" / "*.db",
        base_path / ".storage" / "pp_reader_data" / "*.db",
    ]

    for pattern in patterns:
        # Sort by modification time to get the active one likely
        matches = sorted(
            Path(pattern.parent).glob(pattern.name),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if matches:
            return matches[0]

    return None


def inject_gaps(db_path: str | Path, days_ago: int = 15, duration: int = 5) -> None:
    """Inject coverage gaps into the specified SQLite database."""
    target_path = Path(db_path)
    if not target_path.exists():
        logger.error("Error: Database not found at %s", target_path)
        sys.exit(1)

    logger.info("Opening database: %s", target_path)
    conn = sqlite3.connect(target_path)
    cursor = conn.cursor()

    # Calculate date range
    end_date = datetime.now(tz=UTC)
    start_gap = end_date - timedelta(days=days_ago)
    end_gap = start_gap + timedelta(days=duration)

    start_str = start_gap.strftime("%Y-%m-%d")
    end_str = end_gap.strftime("%Y-%m-%d")

    logger.info("Injecting gaps between %s and %s...", start_str, end_str)

    # Update daily_wealth
    # We set fx_coverage_ratio = 0.5, price_coverage_ratio = 0.8
    # and stale_price = 1 (true) for good measure on some
    query = """
    UPDATE daily_wealth
    SET fx_coverage_ratio = 0.5,
        price_coverage_ratio = 0.8,
        stale_price = CASE WHEN date = ? THEN 1 ELSE 0 END,
        updated_at = ?
    WHERE date >= ? AND date <= ?
    """

    # Make one specific date stale
    stale_date = start_str
    now_iso = datetime.now(tz=UTC).isoformat()

    cursor.execute(query, (stale_date, now_iso, start_str, end_str))
    rows = cursor.rowcount

    conn.commit()
    conn.close()

    logger.info("Modified %d records in daily_wealth.", rows)
    if rows == 0:
        logger.warning(
            "Warning: No records found in that range. Ensure ingestion has run."
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Inject coverage gaps into PP Reader DB"
    )
    parser.add_argument("--db", help="Path to pp_reader.db", default=None)
    parser.add_argument("--days-ago", type=int, default=15, help="Start gap N days ago")
    parser.add_argument(
        "--duration", type=int, default=5, help="Duration of gap in days"
    )

    args = parser.parse_args()

    custom_db_path = args.db
    if not custom_db_path:
        # Try to guess
        repo_root = Path.cwd()
        found_path = find_db_path(repo_root)
        if not found_path:
            # Try user home relative if typical setup
            home = Path.expanduser(Path("~"))
            found_path = find_db_path(home / "coding/repos/ha-pp-reader")

        custom_db_path = found_path

    if not custom_db_path:
        logger.error("Could not locate pp_reader.db. Please specify with --db")
        sys.exit(1)

    inject_gaps(custom_db_path, args.days_ago, args.duration)
