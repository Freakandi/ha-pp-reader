from dataclasses import dataclass, field
from decimal import Decimal
from datetime import datetime
import logging
from typing import Optional, Dict, Any, Union, Tuple
from ..name.abuchen.portfolio import client_pb2  # Relativer Import aus dem custom_components Ordner
from ..data.db_access import Transaction

_LOGGER = logging.getLogger(__name__)

@dataclass
class ValidationResult:
    """Ergebnis einer Datenvalidierung."""
    is_valid: bool
    message: str
    details: Dict[str, Any] = field(default_factory=dict)

class PPDataValidator:
    """Validiert Portfolio Performance Daten aus der DB."""
    
    VALID_TRANSACTION_TYPES = {
        0: "BUY",
        1: "SELL",
        2: "INBOUND_DELIVERY",
        3: "OUTBOUND_DELIVERY",
        5: "CASH_TRANSFER",
        6: "DEPOSIT",
        7: "REMOVAL",
        8: "DIVIDENDS",
        9: "INTEREST",
        10: "INTEREST_CHARGE",
        11: "TAXES",
        12: "TAX_REFUND",
        13: "FEES",
        14: "FEES_REFUND"
    }

    def validate_fx_rate(self, base: str, term: str, rate: float) -> ValidationResult:
        """Validiert Wechselkurse auf Plausibilität."""
        if rate <= 0:
            return ValidationResult(
                False,
                f"Ungültiger Wechselkurs {rate} für {base}/{term}",
                {"rate": rate, "base": base, "term": term}
            )

        # Typische Spannen für Hauptwährungen
        ranges = {
            ("EUR", "USD"): (0.8, 1.6),
            ("EUR", "GBP"): (0.65, 0.95),
            ("EUR", "JPY"): (100, 150)
        }
        
        if (base, term) in ranges:
            min_rate, max_rate = ranges[(base, term)]
            if not min_rate <= rate <= max_rate:
                return ValidationResult(
                    False,
                    f"Wechselkurs {rate} außerhalb typischer Spanne",
                    {"expected_range": (min_rate, max_rate)}
                )
        
        return ValidationResult(True, "Wechselkurs valid")

    def validate_transaction(self, tx: Union[dict, client_pb2.PTransaction, Transaction]) -> ValidationResult:
        """Validiert eine einzelne Transaktion."""
        
        # Protobuf Transaction validieren
        if isinstance(tx, client_pb2.PTransaction):
            if not self._is_valid_transaction_type(tx.type):
                return ValidationResult(
                    False,
                    f"Ungültiger Transaktionstyp: {tx.type}",
                    {"valid_types": list(self.VALID_TRANSACTION_TYPES.keys())}
                )
            
            if not tx.HasField("uuid") or not tx.HasField("date"):
                return ValidationResult(
                    False,
                    "Fehlende Pflichtfelder in Transaktion",
                    {"tx_id": getattr(tx, "uuid", "UNKNOWN")}
                )
            
            # Datumsvalidierung für Protobuf
            tx_date = datetime.fromtimestamp(tx.date.seconds)
            if tx_date > datetime.now():
                return ValidationResult(
                    False,
                    "Transaktionsdatum in der Zukunft",
                    {"date": tx_date.isoformat()}
                )
                
            return ValidationResult(True, "Transaktion valid")
            
        # Dictionary oder DB-Transaction validieren
        elif isinstance(tx, (dict, Transaction)):
            required_fields = ["uuid", "type", "date"]
            
            # Bei Transaction-Objekt: Attribute statt Dict-Keys prüfen
            if isinstance(tx, Transaction):
                missing = [f for f in required_fields if not hasattr(tx, f)]
            else:
                missing = [f for f in required_fields if f not in tx]
            
            if missing:
                return ValidationResult(
                    False,
                    f"Fehlende Pflichtfelder: {', '.join(missing)}",
                    {"tx_id": getattr(tx, "uuid", tx.get("uuid", "UNKNOWN"))}
                )
            
            # Typ-Validierung
            tx_type = tx.type if isinstance(tx, Transaction) else tx["type"]
            if not self._is_valid_transaction_type(tx_type):
                return ValidationResult(
                    False,
                    f"Ungültiger Transaktionstyp: {tx_type}",
                    {"valid_types": list(self.VALID_TRANSACTION_TYPES.keys())}
                )
                
            return ValidationResult(True, "Transaktion valid")
            
        else:
            return ValidationResult(
                False,
                f"Ungültiger Transaktionstyp: {type(tx)}",
                {"expected": ["dict", "PTransaction", "Transaction"]}
            )
            
    def _is_valid_transaction_type(self, type_id: int) -> bool:
        """Prüft ob der Transaktionstyp gültig ist."""
        return type_id in self.VALID_TRANSACTION_TYPES

    def validate_account_balance(self, balance: float, account_name: str) -> ValidationResult:
        """Validiert einen Kontostand auf Plausibilität."""
        if balance < -1_000_000:  # Beispielgrenze für Überziehung
            return ValidationResult(
                False,
                f"Verdächtig hoher negativer Kontostand: {balance}€",
                {"account": account_name, "balance": balance}
            )
        return ValidationResult(True, "Kontostand plausibel")

    def validate_normalized_value(
        self, 
        value: Union[int, float], 
        type_: str
    ) -> ValidationResult:
        """Validiert normalisierte Werte (Kurse/Stückzahlen)."""
        if value < 0:
            return ValidationResult(
                False,
                f"Negativer {type_}: {value}",
                {"value": value, "type": type_}
            )
            
        if type_ == "shares" and value > 1_000_000:
            return ValidationResult(
                False,
                f"Verdächtig hohe Stückzahl: {value}",
                {"shares": value}
            )
            
        return ValidationResult(True, f"Valider {type_}")

    def validate_calculation_inputs(
        self, 
        current_value: float,
        purchase_sum: float
    ) -> ValidationResult:
        """Validiert Eingabewerte für Gewinnberechnungen."""
        if current_value < 0 or purchase_sum < 0:
            return ValidationResult(
                False,
                "Negative Werte in Gewinnberechnung",
                {"current": current_value, "purchase": purchase_sum}
            )
            
        if purchase_sum > 0 and current_value / purchase_sum > 100:
            return ValidationResult(
                False,
                "Verdächtig hoher Kursgewinn",
                {"gain_factor": current_value / purchase_sum}
            )
            
        return ValidationResult(True, "Valide Berechnungsgrundlage")