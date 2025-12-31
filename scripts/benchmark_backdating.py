#!/usr/bin/env python3
"""Benchmark the backdating pipeline."""

import asyncio
import logging
import sqlite3
import sys
import time
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

# Add project root to sys.path
sys.path.append(str(Path(__file__).parents[1]))

from custom_components.pp_reader.backdating.pipeline import async_run_backdating_rebuild
from custom_components.pp_reader.data.db_init import initialize_database_schema

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


# Mock Home Assistant
class MockHass:
    """Mock Home Assistant instance for benchmarking."""

    def __init__(self) -> None:
        """Initialize the mock."""
        self.loop = asyncio.get_event_loop()
        self.data = {}

    async def async_add_executor_job(self, target: Any, *args: Any) -> Any:
        """Mock executor job runner."""
        return await self.loop.run_in_executor(None, target, *args)


def seed_database(db_path: Path, years: int = 2) -> None:
    """Seed the database with transactions, prices, and fx rates."""
    logger.info("Seeding database with %d years of data...", years)
    initialize_database_schema(db_path)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    end_date = datetime.now(tz=UTC).date()
    start_date = end_date - timedelta(days=365 * years)

    # Define some entities
    security_uuid = "sec-1"
    portfolio_uuid = "port-1"
    account_uuid = "acc-1"

    # Prereqs: Accounts, Portfolios, Securities
    cursor.execute(
        "INSERT INTO accounts (uuid, name, currency_code) VALUES (?, ?, ?)",
        (account_uuid, "Test Account", "EUR"),
    )
    cursor.execute(
        "INSERT INTO portfolios (uuid, name) VALUES (?, ?)",
        (portfolio_uuid, "Test Portfolio"),
    )
    cursor.execute(
        "INSERT INTO securities (uuid, name, currency_code, updated_at) "
        "VALUES (?, ?, ?, ?)",
        (security_uuid, "Test Security", "EUR", "2023-01-01"),
    )

    # 1. Transactions: Buy every month
    transactions = []
    current_date = start_date
    while current_date <= end_date:
        transactions.append(
            (
                str(uuid.uuid4()),  # uuid
                current_date.isoformat(),  # date
                4,  # Type Buy
                100.0,  # amount
                10000.0,  # shares (scaled)
                security_uuid,  # security
                portfolio_uuid,  # portfolio
                account_uuid,  # account
                "EUR",  # currency_code
            )
        )
        current_date += timedelta(days=30)

    cursor.executemany(
        """
        INSERT INTO transactions (
            uuid, date, type, amount, shares,
            security, portfolio, account, currency_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
        transactions,
    )

    # 2. Prices: Daily price for security
    scale_factor = 100000000
    prices = []
    current_date = start_date
    price = 100.0
    while current_date <= end_date:
        prices.append(
            (
                security_uuid,
                current_date.toordinal(),  # epoch day
                int(price * scale_factor),
            )
        )
        price += 0.1
        current_date += timedelta(days=1)

    cursor.executemany(
        """
        INSERT INTO historical_prices (security_uuid, date, close)
        VALUES (?, ?, ?)
    """,
        prices,
    )

    conn.commit()
    conn.close()
    logger.info(
        "Seeded %d transactions and %d price records.", len(transactions), len(prices)
    )


async def run_benchmark(years: int, *, debug: bool) -> None:
    """Run the backdating benchmark."""
    db_path = Path("benchmark_backdating.db")
    if db_path.exists():
        db_path.unlink()

    seed_database(db_path, years)

    hass = MockHass()

    logger.info("Starting backdating rebuild...")
    start_time = time.time()

    try:
        result = await async_run_backdating_rebuild(
            hass, db_path, trigger="benchmark", provenance="benchmark-run"
        )

        duration = time.time() - start_time
        logger.info("Backdating completed in %.2f seconds.", duration)
        logger.info("Result status: %s", result.status)

        if result.status == "failed":
            logger.error("Error: %s", result.error)
            sys.exit(1)

    except Exception:
        logger.exception("Benchmark failed with exception")
        sys.exit(1)
    finally:
        if not debug and db_path.exists():
            db_path.unlink()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--years", type=int, default=2, help="Years of history to backdate"
    )
    parser.add_argument("--debug", action="store_true", help="Keep DB file after run")
    args = parser.parse_args()

    asyncio.run(run_benchmark(args.years, debug=args.debug))
