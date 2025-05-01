import sqlite3
from pathlib import Path
import logging

from .db_schema import ALL_SCHEMAS

_LOGGER = logging.getLogger(__name__)

def initialize_database_schema(db_path: Path) -> None:
    try:
        db_path.parent.mkdir(parents=True, exist_ok=True)
        if not db_path.exists():
            _LOGGER.info("📁 Erzeuge neue Datenbankdatei: %s", db_path)
        conn = sqlite3.connect(str(db_path))
        for ddl in ALL_SCHEMAS:
            conn.execute(ddl)
        conn.commit()
        conn.close()
        _LOGGER.info("📦 Datenbank initialisiert unter: %s", db_path)
    except Exception as e:
        _LOGGER.exception("❌ Fehler bei der DB-Initialisierung: %s", e)
        raise
