import os
import shutil
import sqlite3
import logging
from datetime import datetime, timedelta
from pathlib import Path

from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers.event import async_track_time_interval

_LOGGER = logging.getLogger(__name__)

BACKUP_SUBDIR = "backups"

# === Public Entry Point ===

async def setup_backup_system(hass: HomeAssistant, db_path: Path):
    """Initialisiere zyklische Backups innerhalb von Home Assistant."""

    interval = timedelta(hours=6)

    async def _periodic_backup(now):
        await hass.async_add_executor_job(run_backup_cycle, db_path)

    async_track_time_interval(hass, _periodic_backup, interval)

    async def async_trigger_debug_backup(call: ServiceCall):
        await hass.async_add_executor_job(run_backup_cycle, db_path)

    async def register_backup_service(event=None):
        try:
            hass.services.async_register(
                "pp_reader",
                "trigger_backup_debug",
                async_trigger_debug_backup
            )
            _LOGGER.info("✅ Backup-Service registriert: pp_reader.trigger_backup_debug")
        except Exception as e:
            _LOGGER.exception("❌ Fehler bei Service-Registrierung:")
            raise

    # 🧠 Hier innerhalb der Funktion prüfen und reagieren
    if hass.is_running:
        await register_backup_service()
    else:
        hass.bus.async_listen_once("homeassistant_started", register_backup_service)


# === Core Logic ===

def run_backup_cycle(db_path: Path):

    if not db_path.exists():
        _LOGGER.warning("⚠️ Datenbankpfad existiert nicht: %s", db_path)
        return

    if not is_sqlite_integrity_ok(str(db_path)):
        _LOGGER.error("❌ SQLite-Integritätscheck fehlgeschlagen. Versuche Wiederherstellung...")
        restore_from_latest_backup(db_path)
        return

    create_backup_if_valid(db_path)
    cleanup_old_backups(db_path.parent / BACKUP_SUBDIR)

# === SQLite-Prüfung ===

def is_sqlite_integrity_ok(db_path: str) -> bool:
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.execute("PRAGMA integrity_check")
        result = cursor.fetchone()
        conn.close()
        return result[0].lower() == "ok"
    except Exception as e:
        _LOGGER.error("❌ Fehler beim Prüfen der DB-Integrität: %s", e)
        return False

# === Backup-Erstellung ===

def create_backup_if_valid(db_path: Path):
    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = db_path.parent / BACKUP_SUBDIR
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup_path = backup_dir / f"{db_path.stem}_{now}.db"
    shutil.copy2(db_path, backup_path)
    _LOGGER.info("✅ Backup erstellt: %s", backup_path.name)

# === Wiederherstellung ===

def restore_from_latest_backup(db_path: Path) -> bool:
    backup_dir = db_path.parent / BACKUP_SUBDIR
    backups = sorted(backup_dir.glob("*.db"), key=os.path.getmtime, reverse=True)
    for backup in backups:
        if is_sqlite_integrity_ok(str(backup)):
            shutil.copy2(backup, db_path)
            _LOGGER.warning("🛠️ Wiederherstellung aus Backup: %s", backup.name)
            return True
    _LOGGER.error("❌ Kein gültiges Backup zur Wiederherstellung gefunden")
    return False

# === Aufbewahrung ===

def cleanup_old_backups(backup_dir: Path):
    backups = sorted(backup_dir.glob("*.db"))
    keep = set()
    now = datetime.now()

    # Gruppiere nach Tag
    daily = {}
    weekly = {}

    for b in backups:
        try:
            dt_str = "_".join(b.stem.split("_")[-2:])  # 20250430_1430
            dt = datetime.strptime(dt_str, "%Y%m%d_%H%M%S")
        except Exception:
            continue

        key = dt.date()
        age = (now - dt).days  # Alter des Backups in Tagen berechnen

        if key == now.date():
            keep.add(b)
            continue
        elif age <= 7:
            daily[key] = max(daily.get(key, b), b, key=os.path.getmtime)
        elif age <= 28:
            year, week, _ = dt.isocalendar()
            week_key = f"{year}-W{week}"
            weekly[week_key] = max(weekly.get(week_key, b), b, key=os.path.getmtime)

    keep.update(daily.values())
    keep.update(weekly.values())

    for b in backups:
        if b not in keep:
            b.unlink()
            _LOGGER.info("🗑️ Backup gelöscht: %s", b.name)
