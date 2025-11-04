"""Allow `python -m custom_components.pp_reader.cli` to run the import CLI."""

from __future__ import annotations

import sys

from . import main


def run() -> int:
    """Execute the CLI entrypoint."""
    return main()


if __name__ == "__main__":
    sys.exit(run())

