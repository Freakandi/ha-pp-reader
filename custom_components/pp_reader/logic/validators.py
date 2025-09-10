from dataclasses import dataclass, field
from decimal import Decimal
from datetime import (
    datetime,
    timezone,
)  # Ensure timezone is imported if used for future date checks
import logging
from typing import Optional, Dict, Any, Union, Tuple
from pp_reader.name.abuchen.portfolio import client_pb2
from pp_reader.data.db_access import (
    Transaction,
)  # This import remains for the type hint

_LOGGER = logging.getLogger(__name__)

# The FQN of the Transaction class as it's actually instantiated and passed around.
# This is derived from your log message.
EXPECTED_DB_TRANSACTION_FQN = "custom_components.pp_reader.data.db_access.Transaction"


@dataclass
class ValidationResult:
    """Ergebnis einer Datenvalidierung."""

    is_valid: bool
    message: str
    details: dict[str, Any] = field(default_factory=dict)


class PPDataValidator:
    """Validiert Portfolio Performance Daten aus der DB."""

    VALID_TRANSACTION_TYPES = {
        0: "PURCHASE",
        1: "SALE",
        2: "INBOUND_DELIVERY",
        3: "OUTBOUND_DELIVERY",
        4: "SECURITY_TRANSFER",
        5: "CASH_TRANSFER",
        6: "DEPOSIT",
        7: "REMOVAL",
        8: "DIVIDEND",
        9: "INTEREST",
        10: "INTEREST_CHARGE",
        11: "TAX",
        12: "TAX_REFUND",
        13: "FEE",
        14: "FEE_REFUND",
    }

    def _is_valid_transaction_type(self, type_id: int) -> bool:
        """Prüft ob der Transaktionstyp gültig ist."""
        is_valid = type_id in self.VALID_TRANSACTION_TYPES
        if not is_valid:
            _LOGGER.debug(
                f"Invalid transaction type ID: {type_id}. Valid types: {self.VALID_TRANSACTION_TYPES.keys()}"
            )
        return is_valid

    def _get_object_fqn(self, obj: Any) -> Optional[str]:
        """Helper to get the FQN of an object's class."""
        if (
            hasattr(obj, "__class__")
            and hasattr(obj.__class__, "__module__")
            and hasattr(obj.__class__, "__qualname__")
        ):
            return f"{obj.__class__.__module__}.{obj.__class__.__qualname__}"
        return None

    def validate_transaction(
        self, tx: Union[dict, client_pb2.PTransaction, Transaction]
    ) -> ValidationResult:
        """Validiert eine einzelne Transaktion."""
        required_fields = ["uuid", "type", "date"]
        # now_utc = datetime.now(timezone.utc) # For future date checks if re-added

        # 1. Protobuf Transaction validieren
        if isinstance(tx, client_pb2.PTransaction):
            _LOGGER.debug("Validating PTransaction")
            if not self._is_valid_transaction_type(tx.type):
                return ValidationResult(
                    False,
                    f"Ungültiger Transaktionstyp (PTransaction): {tx.type}",
                    {"valid_types": list(self.VALID_TRANSACTION_TYPES.keys())},
                )
            if not tx.HasField("uuid") or not tx.HasField("date"):
                return ValidationResult(
                    False,
                    "Fehlende Pflichtfelder in PTransaction (uuid/date)",
                    {"tx_id": getattr(tx, "uuid", "UNKNOWN")},
                )

            try:
                tx_date = datetime.fromtimestamp(
                    tx.date.seconds
                )  # Consider timezone: datetime.fromtimestamp(tx.date.seconds, timezone.utc)
                if tx_date > datetime.now():  # Consider timezone: if tx_date > now_utc:
                    return ValidationResult(
                        False,
                        "Transaktionsdatum (PTransaction) in der Zukunft",
                        {"date": tx_date.isoformat()},
                    )
            except Exception as e:
                _LOGGER.warning(f"Error converting PTransaction date: {e}")
                return ValidationResult(
                    False,
                    "Fehler bei PTransaction Datumskonvertierung",
                    {"error": str(e)},
                )
            return ValidationResult(True, "PTransaction valid")

        # 2. Dictionary validieren
        elif isinstance(tx, dict):
            _LOGGER.debug("Validating transaction as dict")
            missing = [f for f in required_fields if f not in tx or tx.get(f) is None]
            if missing:
                return ValidationResult(
                    False,
                    f"Fehlende Pflichtfelder (dict): {', '.join(missing)}",
                    {"tx_id": tx.get("uuid", "UNKNOWN")},
                )

            tx_type_val = tx.get("type")
            if not self._is_valid_transaction_type(tx_type_val):
                return ValidationResult(
                    False,
                    f"Ungültiger Transaktionstyp (dict): {tx_type_val}",
                    {"valid_types": list(self.VALID_TRANSACTION_TYPES.keys())},
                )

            # Optional: Add future date check for dicts here if needed
            # tx_date_val = tx.get("date")
            # ... parsing and checking tx_date_val > now_utc ...

            return ValidationResult(True, "Dict Transaction valid")

        # 3. DB-Transaction (via FQN) validieren
        else:
            actual_tx_fqn = self._get_object_fqn(tx)
            if actual_tx_fqn == EXPECTED_DB_TRANSACTION_FQN:
                _LOGGER.debug(f"Validating DB Transaction by FQN: {actual_tx_fqn}")
                missing = [
                    f
                    for f in required_fields
                    if not hasattr(tx, f) or getattr(tx, f) is None
                ]
                if missing:
                    return ValidationResult(
                        False,
                        f"Fehlende Pflichtfelder (DB Transaction): {', '.join(missing)}",
                        {"tx_id": getattr(tx, "uuid", "UNKNOWN")},
                    )

                # Ensure tx.type is accessed correctly
                if not hasattr(tx, "type"):
                    return ValidationResult(
                        False,
                        "Fehlendes 'type' Feld in DB Transaktion",
                        {"tx_id": getattr(tx, "uuid", "UNKNOWN")},
                    )

                tx_type_val = tx.type
                if not self._is_valid_transaction_type(tx_type_val):
                    return ValidationResult(
                        False,
                        f"Ungültiger Transaktionstyp (DB Transaction): {tx_type_val}",
                        {"valid_types": list(self.VALID_TRANSACTION_TYPES.keys())},
                    )

                # Optional: Add future date check for DB Transactions here if needed
                # if hasattr(tx, 'date') and isinstance(tx.date, str): # Assuming date is ISO string
                #     try:
                #         db_tx_date = datetime.fromisoformat(tx.date).replace(tzinfo=timezone.utc) # Or handle naive
                #         if db_tx_date > now_utc:
                #             return ValidationResult(False, "Transaktionsdatum (DB Transaction) in der Zukunft", {"date": db_tx_date.isoformat()})
                #     except ValueError:
                #         return ValidationResult(False, "Ungültiges Datumsformat in DB Transaktion", {"date_str": tx.date})

                return ValidationResult(True, "DB Transaction valid")
            else:
                # Fallback for unknown type
                _LOGGER.warning(
                    f"Transaction object type not recognized. Expected PTransaction, dict, or DB Transaction (FQN: {EXPECTED_DB_TRANSACTION_FQN}). "
                    f"Actual FQN: '{actual_tx_fqn}'. Actual object type: '{type(tx).__name__}'."
                )
                return ValidationResult(
                    False,
                    f"Ungültiger oder nicht erkannter Transaktionstyp: {type(tx).__name__}",
                    {
                        "expected_types_or_fqn": [
                            "dict",
                            "client_pb2.PTransaction",
                            EXPECTED_DB_TRANSACTION_FQN,
                        ],
                        "actual_type": type(tx).__name__,
                        "actual_fqn": actual_tx_fqn or "N/A",
                    },
                )

    def validate_fx_rate(self, base: str, term: str, rate: float) -> ValidationResult:
        """Validiert Wechselkurse auf Plausibilität."""
        if rate <= 0:
            return ValidationResult(
                False,
                f"Ungültiger Wechselkurs {rate} für {base}/{term}",
                {"rate": rate, "base": base, "term": term},
            )

        # Typische Spannen für Hauptwährungen
        ranges = {
            ("EUR", "USD"): (0.8, 1.6),
            ("EUR", "GBP"): (0.65, 0.95),
            ("EUR", "JPY"): (100, 150),
        }

        if (base, term) in ranges:
            min_rate, max_rate = ranges[(base, term)]
            if not min_rate <= rate <= max_rate:
                return ValidationResult(
                    False,
                    f"Wechselkurs {rate} außerhalb typischer Spanne",
                    {"expected_range": (min_rate, max_rate)},
                )

        return ValidationResult(True, "Wechselkurs valid")

    def validate_account_balance(
        self, balance: float, account_name: str
    ) -> ValidationResult:
        """Validiert einen Kontostand auf Plausibilität."""
        if balance < -1_000_000:  # Beispielgrenze für Überziehung
            return ValidationResult(
                False,
                f"Verdächtig hoher negativer Kontostand: {balance}€",
                {"account": account_name, "balance": balance},
            )
        return ValidationResult(True, "Kontostand plausibel")

    def validate_normalized_value(
        self, value: Union[int, float], type_: str
    ) -> ValidationResult:
        """Validiert normalisierte Werte (Kurse/Stückzahlen)."""
        if value < 0:
            return ValidationResult(
                False, f"Negativer {type_}: {value}", {"value": value, "type": type_}
            )

        if type_ == "shares" and value > 1_000_000:
            return ValidationResult(
                False, f"Verdächtig hohe Stückzahl: {value}", {"shares": value}
            )

        return ValidationResult(True, f"Valider {type_}")

    def validate_calculation_inputs(
        self, current_value: float, purchase_sum: float
    ) -> ValidationResult:
        """Validiert Eingabewerte für Gewinnberechnungen."""
        if current_value < 0 or purchase_sum < 0:
            return ValidationResult(
                False,
                "Negative Werte in Gewinnberechnung",
                {"current": current_value, "purchase": purchase_sum},
            )

        if purchase_sum > 0 and current_value / purchase_sum > 100:
            return ValidationResult(
                False,
                "Verdächtig hoher Kursgewinn",
                {"gain_factor": current_value / purchase_sum},
            )

        return ValidationResult(True, "Valide Berechnungsgrundlage")
