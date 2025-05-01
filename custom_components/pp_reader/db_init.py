import sqlite3
from pathlib import Path
import logging

from .db_schema import ALL_SCHEMAS

_LOGGER = logging.getLogger(__name__)

def initialize_database_schema(db_path: Path) -> None:
    """Initialisiert die SQLite Datenbank mit dem definierten Schema."""
    try:
        db_path.parent.mkdir(parents=True, exist_ok=True)
        
        if not db_path.exists():
            _LOGGER.info("📁 Erzeuge neue Datenbankdatei: %s", db_path)
            
        conn = sqlite3.connect(str(db_path))
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("BEGIN TRANSACTION")
        
        try:
            for ddl in ALL_SCHEMAS:
                conn.execute(ddl)
            conn.commit()
            _LOGGER.info("📦 Datenbank erfolgreich initialisiert: %s", db_path)
            
        except Exception as e:
            conn.rollback()
            _LOGGER.error("❌ Fehler beim Erstellen der Tabellen: %s", e)
            raise
            
        finally:
            conn.close()
            
    except Exception as e:
        _LOGGER.exception("❌ Kritischer Fehler bei DB-Initialisierung")
        raise
