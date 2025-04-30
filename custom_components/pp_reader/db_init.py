import sqlite3
from pathlib import Path
import logging

_LOGGER = logging.getLogger(__name__)

def initialize_database_schema(db_path: Path) -> None:
    try:
        db_path.parent.mkdir(parents=True, exist_ok=True)
        if not db_path.exists():
            _LOGGER.info("📁 Erzeuge neue Datenbankdatei: %s", db_path)
        conn = sqlite3.connect(str(db_path))
        conn.execute("""
            CREATE TABLE IF NOT EXISTS fx_rates (
                date TEXT NOT NULL,
                currency TEXT NOT NULL,
                rate REAL NOT NULL,
                PRIMARY KEY (date, currency)
            )
        """)
        conn.commit()
        conn.close()
        _LOGGER.info("📦 Datenbank initialisiert unter: %s", db_path)
    except Exception as e:
        _LOGGER.exception("❌ Fehler bei der DB-Initialisierung: %s", e)
        raise
