"""Tests for the backup cleanup helper."""

from __future__ import annotations

import logging
from datetime import datetime

from custom_components.pp_reader.data.backup_db import cleanup_old_backups


def test_cleanup_skips_invalid_backups(tmp_path, caplog) -> None:
    """Ensure cleanup ignores backups with unexpected file names."""
    backup_dir = tmp_path / "backups"
    backup_dir.mkdir()

    # Create an invalid backup file that cannot be parsed.
    invalid_backup = backup_dir / "invalid.db"
    invalid_backup.write_text("not a real backup")

    # Create a valid backup using the current timestamp so it is never pruned.
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    valid_backup = backup_dir / f"S-Depot_{timestamp}.db"
    valid_backup.write_text("valid backup")

    # Run cleanup and capture warnings.
    with caplog.at_level(
        logging.WARNING, logger="custom_components.pp_reader.data.backup_db"
    ):
        cleanup_old_backups(backup_dir)

    # No warnings should have been emitted for the invalid backup.
    assert not caplog.records

    # The valid backup is kept and the invalid one is removed during cleanup.
    assert not invalid_backup.exists()
    assert valid_backup.exists()
