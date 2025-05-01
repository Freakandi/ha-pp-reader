import sqlite3
from pathlib import Path
import logging
from dataclasses import dataclass
from typing import List, Optional, Dict

_LOGGER = logging.getLogger(__name__)

@dataclass
class Transaction:
    """Repräsentiert eine Transaktion in der Datenbank."""
    uuid: str
    type: int  
    account: Optional[str]
    portfolio: Optional[str]
    other_account: Optional[str]
    other_portfolio: Optional[str]
    date: str               # ISO8601 Format
    currency_code: str
    amount: int            # Cent-Betrag
    shares: Optional[int]   # *10^8 für Genauigkeit
    security: Optional[str] # Security UUID

@dataclass
class Security:
    """Repräsentiert ein Wertpapier in der Datenbank."""
    uuid: str
    name: str
    currency_code: str
    latest_price: Optional[int] = None     # Preis in 10^-8 Einheiten
    last_price_update: Optional[str] = None # ISO8601 Zeitstempel

@dataclass  
class Account:
    """Repräsentiert ein Konto in der Datenbank."""
    uuid: str
    name: str
    currency_code: str
    note: Optional[str] = None
    is_retired: bool = False

@dataclass
class Portfolio:
    """Repräsentiert ein Portfolio in der Datenbank."""
    uuid: str
    name: str 
    note: Optional[str] = None
    reference_account: Optional[str] = None
    is_retired: bool = False

def get_transactions(db_path: Path) -> List[Transaction]:
    """Lädt alle Transaktionen aus der DB."""
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.execute("""
            SELECT uuid, type, account, portfolio, 
                   other_account, other_portfolio,
                   date, currency_code, amount, 
                   shares, security
            FROM transactions
            ORDER BY date
        """)
        return [Transaction(*row) for row in cur.fetchall()]
    except sqlite3.Error as e:
        _LOGGER.error("Fehler beim Laden der Transaktionen: %s", str(e))
        return []
    finally:
        conn.close()

def get_securities(db_path: Path) -> Dict[str, Security]:
    """Lädt alle Wertpapiere aus der DB."""
    conn = sqlite3.connect(str(db_path))
    try:
        # Join mit latest_prices für aktuelle Kursdaten
        cur = conn.execute("""
            SELECT s.uuid, s.name, s.currency_code, 
                   p.value as latest_price,
                   p.updated_at as last_price_update
            FROM securities s
            LEFT JOIN latest_prices p ON s.uuid = p.security_uuid
            ORDER BY s.name
        """)
        return {row[0]: Security(*row) for row in cur.fetchall()}
    except sqlite3.Error as e:
        _LOGGER.error("Fehler beim Laden der Wertpapiere: %s", str(e))
        return {}
    finally:
        conn.close()

def get_portfolio_by_name(db_path: Path, name: str) -> Optional[Portfolio]:
    """Findet ein Portfolio anhand des Namens."""
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.execute("""
            SELECT uuid, name, note, reference_account, is_retired
            FROM portfolios 
            WHERE name = ?
        """, (name,))
        row = cur.fetchone()
        return Portfolio(*row) if row else None
    finally:
        conn.close()

def get_accounts(db_path: Path) -> List[Account]:
    """Lädt alle Konten aus der DB."""
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.execute("""
            SELECT uuid, name, currency_code, note, COALESCE(is_retired, 0) 
            FROM accounts 
            ORDER BY name
        """)
        return [Account(*row) for row in cur.fetchall()]
    except sqlite3.Error as e:
        _LOGGER.error("Fehler beim Laden der Konten: %s", str(e))
        return []
    finally:
        conn.close()

def get_portfolios(db_path: Path) -> List[Portfolio]:
    """Lädt alle Portfolios aus der DB."""
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.execute("""
            SELECT uuid, name, note, reference_account, COALESCE(is_retired, 0)
            FROM portfolios 
            ORDER BY name
        """)
        return [Portfolio(*row) for row in cur.fetchall()]
    except sqlite3.Error as e:
        _LOGGER.error("Fehler beim Laden der Portfolios: %s", str(e))
        return []
    finally:
        conn.close()