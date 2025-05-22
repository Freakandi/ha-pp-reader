import sqlite3
from pathlib import Path
import logging
from dataclasses import dataclass
from typing import List, Optional, Dict

_LOGGER = logging.getLogger(__name__)

@dataclass
class MetaData:
    """Metadaten der DB"""
    key: str
    date: str  
    
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
    note: Optional[str] = None
    isin: Optional[str] = None
    wkn: Optional[str] = None
    ticker_symbol: Optional[str] = None
    retired: bool = False
    updated_at: Optional[str] = None
    latest_price: Optional[int] = None  # Preis in 10^-8 Einheiten
    latest_price_date: Optional[int] = None  # Unix Timestamp aus Protobuf

@dataclass  
class Account:
    """Repräsentiert ein Konto in der Datenbank."""
    uuid: str
    name: str
    currency_code: str
    note: Optional[str] = None
    is_retired: bool = False
    balance: int = 0  # Cent-Betrag

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
                   s.note, s.isin, s.wkn, s.ticker_symbol,
                   s.retired, s.updated_at,
                   p.value as latest_price,
                   p.date as latest_price_date
            FROM securities s
            LEFT JOIN latest_prices p ON s.uuid = p.security_uuid
            ORDER BY s.name
        """)
        return {row[0]: Security(
            uuid=row[0],
            name=row[1],
            currency_code=row[2],
            note=row[3],
            isin=row[4],
            wkn=row[5],
            ticker_symbol=row[6],
            retired=bool(row[7]),
            updated_at=row[8],
            latest_price=row[9],
            latest_price_date=row[10]
        ) for row in cur.fetchall()}
    except sqlite3.Error as e:
        _LOGGER.error("Fehler beim Laden der Wertpapiere: %s", str(e))
        return {}
    finally:
        conn.close()

def get_securities_by_id(db_path: Path) -> Dict[str, Security]:
    """Lädt alle Wertpapiere aus der DB und gibt sie als UUID-Dictionary zurück."""
    return get_securities(db_path)  # get_securities gibt bereits ein Dict zurück

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

def get_portfolio_by_uuid(db_path: Path, uuid: str) -> Optional[Portfolio]:
    """Lädt ein Portfolio anhand seiner UUID aus der DB."""
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.execute("""
            SELECT uuid, name, note, reference_account, COALESCE(is_retired, 0)
            FROM portfolios 
            WHERE uuid = ?
        """, (uuid,))
        row = cur.fetchone()
        return Portfolio(*row) if row else None
    finally:
        conn.close()

def get_accounts(db_path: Path) -> List[Account]:
    """Lädt alle Konten aus der DB."""
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.execute("""
            SELECT uuid, name, currency_code, note, COALESCE(is_retired, 0), balance 
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

def get_account_update_timestamp(db_path: Path, account_uuid: str) -> Optional[str]:
    """Holt den letzten Update-Zeitstempel eines Kontos aus der DB."""
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.execute(
            "SELECT updated_at FROM accounts WHERE uuid = ?",
            (account_uuid,)
        )
        result = cur.fetchone()
        return result[0] if result else None
    except sqlite3.Error as e:
        _LOGGER.error("DB-Fehler beim Lesen des Timestamps: %s", e)
        return None
    finally:
        conn.close()