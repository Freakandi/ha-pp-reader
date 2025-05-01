import sqlite3
from pathlib import Path
import logging
from dataclasses import dataclass
from typing import List, Optional, Dict

_LOGGER = logging.getLogger(__name__)

@dataclass
class Transaction:
    uuid: str
    type: int
    account: Optional[str]
    other_account: Optional[str]
    amount: int  # in Cent
    currency_code: str
    security: Optional[str]  # Security UUID
    shares: Optional[int]    # *10^8
    date: str               # ISO8601 Format

@dataclass
class Account:
    uuid: str
    name: str
    currency_code: str

@dataclass
class Security:
    uuid: str
    name: str
    currency_code: str
    latest_price: Optional[int] = None  # in 10^-8
    last_price_update: Optional[str] = None

@dataclass
class Portfolio:
    uuid: str
    name: str

def get_transactions(db_path: Path) -> List[Transaction]:
    """Lädt alle Transaktionen aus der DB."""
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.execute("""
            SELECT uuid, type, account, other_account, amount, 
                   currency_code, security, shares, date 
            FROM transactions
        """)
        return [Transaction(*row) for row in cur.fetchall()]
    finally:
        conn.close()

def get_account_by_name(db_path: Path, name: str) -> Optional[Account]:
    """Findet ein Konto anhand des Namens."""
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.execute(
            "SELECT uuid, name, currency_code FROM accounts WHERE name = ?",
            (name,)
        )
        row = cur.fetchone()
        return Account(*row) if row else None
    finally:
        conn.close()

def get_securities(db_path: Path) -> Dict[str, Security]:
    """Lädt alle Wertpapiere aus der DB."""
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.execute("""
            SELECT uuid, name, currency_code, latest_price, last_price_update 
            FROM securities
        """)
        return {row[0]: Security(*row) for row in cur.fetchall()}
    finally:
        conn.close()

def get_portfolio_by_name(db_path: Path, name: str) -> Optional[Portfolio]:
    """Findet ein Portfolio anhand des Namens."""
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.execute(
            "SELECT uuid, name FROM portfolios WHERE name = ?", 
            (name,)
        )
        row = cur.fetchone()
        return Portfolio(*row) if row else None
    finally:
        conn.close()