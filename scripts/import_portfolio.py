"""Wrapper script invoking the pp_reader portfolio import CLI."""

from __future__ import annotations

import sys

from custom_components.pp_reader.cli import main


def run() -> int:
    """Execute the CLI with command line arguments."""
    return main(sys.argv[1:])


if __name__ == "__main__":
    sys.exit(run())

