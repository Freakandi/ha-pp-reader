#!/usr/bin/env python3
"""Force backdating rebuild on a specific database file."""

import asyncio
import logging
import sys
from pathlib import Path
from typing import Any

# Add project root to sys.path
sys.path.append(str(Path(__file__).parents[1]))

from custom_components.pp_reader.backdating.pipeline import async_run_backdating_rebuild

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# Mock Home Assistant
class MockHass:
    """Mock Home Assistant instance."""
    def __init__(self) -> None:
        self.loop = asyncio.get_event_loop()
        self.data = {}

    async def async_add_executor_job(self, target: Any, *args: Any) -> Any:
        return await self.loop.run_in_executor(None, target, *args)

async def main(db_path_str: str) -> None:
    db_path = Path(db_path_str).resolve()
    if not db_path.exists():
        logger.error("Database file not found: %s", db_path)
        sys.exit(1)

    logger.info("Starting backdating rebuild on %s...", db_path)
    hass = MockHass()

    try:
        # Run rebuild. This should read from existing metrics/history and populate daily_wealth
        result = await async_run_backdating_rebuild(
            hass, db_path, trigger="force_script", provenance="manual-force"
        )

        logger.info("Result status: %s", result.status)
        if result.error:
            logger.error("Error: %s", result.error)
        else:
            logger.info("Success! daily_wealth table should be updated.")

    except Exception:
        logger.exception("Backdating failed with exception")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 force_backdating.py <path_to_db>")
        sys.exit(1)

    asyncio.run(main(sys.argv[1]))
