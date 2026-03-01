"""CLI entry point for backfilling historical FX rates."""

from __future__ import annotations

import argparse
import asyncio
import logging
from pathlib import Path

from custom_components.pp_reader.data.fx_backfill import backfill_fx

LOGGER = logging.getLogger("custom_components.pp_reader.scripts.backfill_fx")
DEFAULT_DB_PATH = Path("config/pp_reader_data/pp_reader.db")


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Backfill historical FX rates into the pp_reader database."
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_DB_PATH,
        help=f"Path to pp_reader.db (default: {DEFAULT_DB_PATH})",
    )
    parser.add_argument(
        "-c",
        "--currency",
        action="append",
        help="Currency code to backfill (may be repeated). Default: all detected.",
    )
    parser.add_argument(
        "--start",
        help=(
            "Override start date (YYYY-MM-DD). Defaults to earliest transaction "
            "date per currency."
        ),
    )
    parser.add_argument(
        "--end",
        help="Override end date (YYYY-MM-DD). Defaults to today.",
    )
    parser.add_argument(
        "--limit",
        dest="limit_days",
        type=int,
        help="Process only the last N days (per currency).",
    )
    parser.add_argument(
        "--max-days",
        dest="max_days",
        type=int,
        help="Abort a currency when missing days exceed this number.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report missing dates without fetching/persisting rates.",
    )
    return parser.parse_args()


async def _async_main(args: argparse.Namespace) -> int:
    summary = await backfill_fx(
        db_path=args.db,
        currencies=args.currency,
        start=args.start,
        end=args.end,
        limit_days=args.limit_days,
        dry_run=args.dry_run,
        max_days=args.max_days,
    )

    if args.dry_run:
        total_missing = sum(summary.values())
        LOGGER.info(
            "Dry-run complete. Currencies processed: %d, total missing days: %d",
            len(summary),
            total_missing,
        )
        for currency, count in summary.items():
            LOGGER.info("  %s missing: %d", currency, count)
    else:
        total_inserted = sum(summary.values())
        LOGGER.info(
            "Backfill complete. Currencies processed: %d, total rows inserted: %d",
            len(summary),
            total_inserted,
        )
        for currency, count in summary.items():
            LOGGER.info("  %s inserted: %d", currency, count)

    return 0


def main() -> int:
    """Run the FX backfill CLI."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    args = _parse_args()

    try:
        return asyncio.run(_async_main(args))
    except KeyboardInterrupt:
        LOGGER.warning("Aborted by user")
        return 130
    except Exception:  # pragma: no cover - CLI guardrail
        LOGGER.exception("Backfill failed")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
