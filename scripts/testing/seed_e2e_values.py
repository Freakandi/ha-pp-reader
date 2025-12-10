#!/usr/bin/env python3
"""Seed pp_reader database with known daily_wealth values for E2E testing."""

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
        # Fallback for HA dev container
        base_path.parent / ".storage" / "pp_reader_data" / "*.db",
    ]

    for pattern in patterns:
        path_pattern = Path(pattern)
        if not path_pattern.parent.exists():
            continue

        # Sort by modification time to get the active one likely
        matches = sorted(
            Path(pattern.parent).glob(pattern.name),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if matches:
            return matches[0]

    return None


def seed_values(db_path: str | Path, days: int = 30) -> None:
    """Inject known values into the daily_wealth table."""
    target_path = Path(db_path)
    if not target_path.exists():
        logger.error("Error: Database not found at %s", target_path)
        sys.exit(1)

    logger.info("Opening database: %s", target_path)
    conn = sqlite3.connect(target_path)
    cursor = conn.cursor()

    # Clear existing data in daily_wealth to avoid confusion
    logger.info("Clearing daily_wealth table...")
    cursor.execute("DELETE FROM daily_wealth")

    # Generate data
    end_date = datetime.now(tz=UTC)
    start_date = end_date - timedelta(days=days)

    logger.info(
        "Seeding data from %s to %s...",
        start_date.strftime("%Y-%m-%d"),
        end_date.strftime("%Y-%m-%d"),
    )

    # Base values
    base_wealth = 10000.0
    daily_increment = 100.0

    # Insert new rows
    data_rows = []

    current_date = start_date
    while current_date <= end_date:
        date_str = current_date.strftime("%Y-%m-%d")

        # Calculate distinct values for testing
        # We make wealth increase linearly so we can check it
        day_offset = (current_date - start_date).days
        total_wealth = base_wealth + (day_offset * daily_increment)

        # Split into components
        portfolio_wealth = total_wealth * 0.8
        account_wealth = total_wealth * 0.2

        # Delta: Just use the increment as "performance neutral" or "gain"
        # For simplicity, let's say it's all gain for now,
        # so performance_neutral_movements = 0

        data_rows.append(
            (
                date_str,
                total_wealth,
                portfolio_wealth,
                account_wealth,
                1.0,  # fx_coverage
                1.0,  # price_coverage
                0,  # stale_price
            )
        )

        current_date += timedelta(days=1)

    query = """
    INSERT INTO daily_wealth
    (date, total_wealth_eur, portfolio_wealth_eur, account_wealth_eur,
     fx_coverage_ratio, price_coverage_ratio, stale_price, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    """

    cursor.executemany(query, data_rows)
    rows = cursor.rowcount

    conn.commit()
    conn.close()

    logger.info("Seeded %d records in daily_wealth.", rows)
    logger.info("Final Total Wealth: %.2f", base_wealth + (days * daily_increment))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Seed PP Reader DB with known daily_wealth values"
    )
    parser.add_argument("--db", help="Path to pp_reader.db", default=None)
    parser.add_argument("--days", type=int, default=30, help="Number of days to seed")

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

    seed_values(custom_db_path, args.days)
