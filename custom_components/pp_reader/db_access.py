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

def get_transactions(db_path: Path) -> List[Transaction