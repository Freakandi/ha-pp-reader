"""Command line entry point for ingesting Portfolio Performance archives."""

from __future__ import annotations

import argparse
import asyncio
import functools
import logging
import sys
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.data.ingestion_writer import async_ingestion_session
from custom_components.pp_reader.services import parser_pipeline

LOGGER = logging.getLogger("custom_components.pp_reader.cli.import_portfolio")


@dataclass(slots=True)
class _ProgressPrinter:
    """Track the latest progress state and render concise CLI updates."""

    def __init__(self) -> None:
        self.stages = {}

    def update(self, progress: parser_pipeline.ParseProgress) -> None:
        """Record the latest metrics for a stage."""
        self.stages[progress.stage] = (progress.processed, progress.total)
        LOGGER.info(
            "[%s] %d/%d",
            progress.stage,
            progress.processed,
            progress.total,
        )


class _CliEventBus:
    """Lightweight event bus forwarding parser events to the log."""

    def async_fire(self, event_type: str, data: dict[str, Any]) -> None:
        """Mirror Home Assistant bus interface."""
        LOGGER.debug("event fired: %s %s", event_type, data)


class _CliHomeAssistant:
    """Minimal Home Assistant stub supporting the parser pipeline."""

    def __init__(self, loop: asyncio.AbstractEventLoop) -> None:
        self.loop = loop
        self.bus = _CliEventBus()

    async def async_add_executor_job(
        self, func: Any, *args: Any, **kwargs: Any
    ) -> Any:
        """Execute blocking work in the default executor."""
        bound = functools.partial(func, *args, **kwargs)
        return await self.loop.run_in_executor(None, bound)


def _configure_logging(*, verbose: bool) -> None:
    """Initialise logging configuration for console usage."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )


def _build_parser() -> argparse.ArgumentParser:
    """Return the CLI argument parser instance."""
    parser = argparse.ArgumentParser(
        description="Parse a Portfolio Performance export using the staging pipeline.",
    )
    parser.add_argument("portfolio", type=Path, help="Path to the .portfolio archive")
    parser.add_argument(
        "--db-path",
        dest="db_path",
        type=Path,
        default=Path("config/pp_reader.db"),
        help="SQLite database that receives staging data (default: %(default)s)",
    )
    parser.add_argument(
        "--keep-staging",
        action="store_true",
        help="Skip clearing existing ingestion tables before the run.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging (includes event payloads).",
    )
    return parser


async def _async_run(
    portfolio_path: Path,
    db_path: Path,
    *,
    keep_staging: bool,
    printer: _ProgressPrinter,
) -> dict[str, Any]:
    """Execute the asynchronous parser pipeline run."""
    loop = asyncio.get_running_loop()
    hass = _CliHomeAssistant(loop)

    reset_stage = not keep_staging
    async with async_ingestion_session(
        db_path,
        reset_stage=reset_stage,
    ) as writer:
        parsed_client = await parser_pipeline.async_parse_portfolio(
            hass=hass,
            path=str(portfolio_path),
            writer=writer,
            progress_cb=lambda progress: printer.update(progress),
        )
        run_id = writer.finalize_ingestion(
            file_path=str(portfolio_path),
            parsed_at=datetime.now(UTC),
            pp_version=parsed_client.version,
            base_currency=parsed_client.base_currency,
            properties=dict(parsed_client.properties),
            parsed_client=parsed_client,
        )

    return {
        "run_id": run_id,
        "accounts": len(parsed_client.accounts),
        "portfolios": len(parsed_client.portfolios),
        "securities": len(parsed_client.securities),
        "transactions": len(parsed_client.transactions),
        "version": parsed_client.version,
        "base_currency": parsed_client.base_currency,
    }


def main(argv: list[str] | None = None) -> int:
    """CLI entry point used by scripts/import_portfolio.py."""
    parser = _build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)

    _configure_logging(verbose=args.verbose)

    portfolio_path: Path = args.portfolio
    db_path: Path = args.db_path
    keep_staging: bool = args.keep_staging

    if not portfolio_path.exists():
        LOGGER.error("Portfolio file does not exist: %s", portfolio_path)
        return 1

    if not db_path.parent.exists():
        db_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        initialize_database_schema(db_path)
    except Exception:  # pragma: no cover - defensive logging for CLI
        LOGGER.exception("Failed to initialize database schema at %s", db_path)
        return 1

    printer = _ProgressPrinter()

    try:
        summary = asyncio.run(
            _async_run(
                portfolio_path,
                db_path,
                keep_staging=keep_staging,
                printer=printer,
            )
        )
    except KeyboardInterrupt:
        LOGGER.warning("Import cancelled by user.")
        return 1
    except Exception:  # pragma: no cover - defensive logging for CLI
        LOGGER.exception("Import aborted")
        return 1

    LOGGER.info(
        (
            "Import complete: run_id=%s accounts=%d portfolios=%d "
            "securities=%d transactions=%d"
        ),
        summary["run_id"],
        summary["accounts"],
        summary["portfolios"],
        summary["securities"],
        summary["transactions"],
    )
    LOGGER.info(
        "Portfolio version=%s base_currency=%s database=%s",
        summary["version"],
        summary["base_currency"],
        db_path,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
