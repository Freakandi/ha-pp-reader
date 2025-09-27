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
            # Ausführen aller DDL-Statements aus allen Schema-Arrays
            for schema_group in ALL_SCHEMAS:
                # Jedes Schema ist ein Array von SQL-Statements
                if isinstance(schema_group, list):
                    for ddl in schema_group:
                        conn.execute(ddl)
                else:
                    # Falls einzelnes Statement
                    conn.execute(schema_group)
            
            # Initialen Eintrag für das Änderungsdatum hinzufügen
            conn.execute("""
                INSERT OR IGNORE INTO metadata (key, date) VALUES ('last_file_update', NULL)
            """)
            
            conn.commit()
            
        except Exception as e:
            conn.rollback()
            _LOGGER.error("❌ Fehler beim Erstellen der Tabellen: %s", e)
            raise
            
        finally:
            conn.close()
            _LOGGER.info("📦 Datenbank erfolgreich initialisiert: %s", db_path)
            
    except Exception as e:
        _LOGGER.exception("❌ Kritischer Fehler bei DB-Initialisierung")
        raise
