"""Validation helpers for Portfolio Performance data."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, ClassVar

try:  # pragma: no cover - dependency optional for unit tests
    from custom_components.pp_reader.name.abuchen.portfolio import client_pb2
except ModuleNotFoundError:  # pragma: no cover - protobuf dependency missing
    client_pb2 = None  # type: ignore[assignment]

if TYPE_CHECKING:
    from custom_components.pp_reader.data.db_access import Transaction
    from custom_components.pp_reader.name.abuchen.portfolio import (
        client_pb2 as _client_pb2,
    )
else:  # pragma: no cover - runtime fallback for typing
    Transaction = Any  # type: ignore[assignment]
    _client_pb2 = Any  # type: ignore[assignment]

_LOGGER = logging.getLogger(__name__)

# The FQN of the Transaction class as it's actually instantiated and passed around.
# This is derived from your log message.
EXPECTED_DB_TRANSACTION_FQN = "custom_components.pp_reader.data.db_access.Transaction"

MIN_ACCOUNT_BALANCE = -1_000_000
MAX_SHARE_COUNT = 1_000_000
MAX_GAIN_FACTOR = 100


@dataclass
class ValidationResult:
    """Ergebnis einer Datenvalidierung."""

    is_valid: bool
    message: str
    details: dict[str, Any] = field(default_factory=dict)


class PPDataValidator:
    """Validiert Portfolio Performance Daten aus der DB."""

    VALID_TRANSACTION_TYPES: ClassVar[dict[int, str]] = {
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
            valid_types = list(self.VALID_TRANSACTION_TYPES)
            _LOGGER.debug(
                "Invalid transaction type ID: %s. Valid types: %s",
                type_id,
                valid_types,
            )
        return is_valid

    def _get_object_fqn(self, obj: Any) -> str | None:
        """Return the FQN of an object's class."""
        if (
            hasattr(obj, "__class__")
            and hasattr(obj.__class__, "__module__")
            and hasattr(obj.__class__, "__qualname__")
        ):
            return f"{obj.__class__.__module__}.{obj.__class__.__qualname__}"
        return None

    def validate_transaction(
        self, tx: dict | _client_pb2.PTransaction | Transaction
    ) -> ValidationResult:
        """Validiert eine einzelne Transaktion."""
        required_fields = ["uuid", "type", "date"]

        if client_pb2 and isinstance(tx, client_pb2.PTransaction):
            return self._validate_proto_transaction(tx)

        if isinstance(tx, dict):
            return self._validate_dict_transaction(tx, required_fields)

        actual_tx_fqn = self._get_object_fqn(tx)
        if actual_tx_fqn == EXPECTED_DB_TRANSACTION_FQN:
            return self._validate_db_transaction(tx, required_fields)

        return self._handle_unknown_transaction(tx, actual_tx_fqn)

    def _validate_proto_transaction(
        self, tx: _client_pb2.PTransaction
    ) -> ValidationResult:
        """Validate protobuf transaction data."""
        if not client_pb2:  # pragma: no cover - only hit when dependency missing
            msg = "protobuf runtime is required to validate protobuf transactions"
            raise RuntimeError(msg)
        _LOGGER.debug("Validating PTransaction")
        if not self._is_valid_transaction_type(tx.type):
            return ValidationResult(
                is_valid=False,
                message=f"Ungültiger Transaktionstyp (PTransaction): {tx.type}",
                details={"valid_types": list(self.VALID_TRANSACTION_TYPES.keys())},
            )
        if not tx.HasField("uuid") or not tx.HasField("date"):
            return ValidationResult(
                is_valid=False,
                message="Fehlende Pflichtfelder in PTransaction (uuid/date)",
                details={"tx_id": getattr(tx, "uuid", "UNKNOWN")},
            )

        try:
            tx_date = datetime.fromtimestamp(
                tx.date.seconds,
                tz=timezone.utc,  # noqa: UP017
            )
            now_utc = datetime.now(tz=timezone.utc)  # noqa: UP017
            if tx_date > now_utc:
                return ValidationResult(
                    is_valid=False,
                    message="Transaktionsdatum (PTransaction) in der Zukunft",
                    details={"date": tx_date.isoformat()},
                )
        except Exception as error:  # noqa: BLE001 - preserve broad exception handling
            _LOGGER.warning("Error converting PTransaction date: %s", error)
            return ValidationResult(
                is_valid=False,
                message="Fehler bei PTransaction Datumskonvertierung",
                details={"error": str(error)},
            )
        return ValidationResult(is_valid=True, message="PTransaction valid")

    def _validate_dict_transaction(
        self, tx: dict[str, Any], required_fields: list[str]
    ) -> ValidationResult:
        """Validate transaction data provided as dictionary."""
        _LOGGER.debug("Validating transaction as dict")
        missing = [f for f in required_fields if f not in tx or tx.get(f) is None]
        if missing:
            return ValidationResult(
                is_valid=False,
                message=f"Fehlende Pflichtfelder (dict): {', '.join(missing)}",
                details={"tx_id": tx.get("uuid", "UNKNOWN")},
            )

        tx_type_val = tx.get("type")
        if not self._is_valid_transaction_type(tx_type_val):
            return ValidationResult(
                is_valid=False,
                message=f"Ungültiger Transaktionstyp (dict): {tx_type_val}",
                details={"valid_types": list(self.VALID_TRANSACTION_TYPES.keys())},
            )

        # Future improvement: validate that the provided date is not in the future.

        return ValidationResult(is_valid=True, message="Dict Transaction valid")

    def _validate_db_transaction(
        self, tx: Transaction, required_fields: list[str]
    ) -> ValidationResult:
        """Validate database transaction objects."""
        missing = [
            field
            for field in required_fields
            if not hasattr(tx, field) or getattr(tx, field) is None
        ]
        if missing:
            missing_fields = ", ".join(missing)
            return ValidationResult(
                is_valid=False,
                message=f"Fehlende Pflichtfelder (DB Transaction): {missing_fields}",
                details={"tx_id": getattr(tx, "uuid", "UNKNOWN")},
            )

        if not hasattr(tx, "type"):
            return ValidationResult(
                is_valid=False,
                message="Fehlendes 'type' Feld in DB Transaktion",
                details={"tx_id": getattr(tx, "uuid", "UNKNOWN")},
            )

        tx_type_val = tx.type
        if not self._is_valid_transaction_type(tx_type_val):
            return ValidationResult(
                is_valid=False,
                message=f"Ungültiger Transaktionstyp (DB Transaction): {tx_type_val}",
                details={"valid_types": list(self.VALID_TRANSACTION_TYPES.keys())},
            )

        # Future improvement: validate that the provided date is not in the future.

        return ValidationResult(is_valid=True, message="DB Transaction valid")

    def _handle_unknown_transaction(
        self, tx: Any, actual_tx_fqn: str | None
    ) -> ValidationResult:
        """Provide a consistent response for unknown transaction types."""
        _LOGGER.warning(
            (
                "Transaction object type not recognized. Expected "
                "PTransaction, dict, or DB Transaction (FQN: %s). "
                "Actual FQN: '%s'. Actual object type: '%s'."
            ),
            EXPECTED_DB_TRANSACTION_FQN,
            actual_tx_fqn,
            type(tx).__name__,
        )
        type_name = type(tx).__name__
        return ValidationResult(
            is_valid=False,
            message=f"Ungültiger oder nicht erkannter Transaktionstyp: {type_name}",
            details={
                "expected_types_or_fqn": [
                    "dict",
                    "client_pb2.PTransaction",
                    EXPECTED_DB_TRANSACTION_FQN,
                ],
                "actual_type": type_name,
                "actual_fqn": actual_tx_fqn or "N/A",
            },
        )

    def validate_fx_rate(self, base: str, term: str, rate: float) -> ValidationResult:
        """Validiert Wechselkurse auf Plausibilität."""
        if rate <= 0:
            return ValidationResult(
                is_valid=False,
                message=f"Ungültiger Wechselkurs {rate} für {base}/{term}",
                details={"rate": rate, "base": base, "term": term},
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
                    is_valid=False,
                    message=f"Wechselkurs {rate} außerhalb typischer Spanne",
                    details={"expected_range": (min_rate, max_rate)},
                )

        return ValidationResult(is_valid=True, message="Wechselkurs valid")

    def validate_account_balance(
        self, balance: float, account_name: str
    ) -> ValidationResult:
        """Validiert einen Kontostand auf Plausibilität."""
        if balance < MIN_ACCOUNT_BALANCE:  # Beispielgrenze für Überziehung
            return ValidationResult(
                is_valid=False,
                message=f"Verdächtig hoher negativer Kontostand: {balance}€",
                details={"account": account_name, "balance": balance},
            )
        return ValidationResult(is_valid=True, message="Kontostand plausibel")

    def validate_normalized_value(self, value: float, type_: str) -> ValidationResult:
        """Validiert normalisierte Werte (Kurse/Stückzahlen)."""
        if value < 0:
            return ValidationResult(
                is_valid=False,
                message=f"Negativer {type_}: {value}",
                details={"value": value, "type": type_},
            )

        if type_ == "shares" and value > MAX_SHARE_COUNT:
            return ValidationResult(
                is_valid=False,
                message=f"Verdächtig hohe Stückzahl: {value}",
                details={"shares": value},
            )

        return ValidationResult(is_valid=True, message=f"Valider {type_}")

    def validate_calculation_inputs(
        self, current_value: float, purchase_sum: float
    ) -> ValidationResult:
        """Validiert Eingabewerte für Gewinnberechnungen."""
        if current_value < 0 or purchase_sum < 0:
            return ValidationResult(
                is_valid=False,
                message="Negative Werte in Gewinnberechnung",
                details={"current": current_value, "purchase": purchase_sum},
            )

        if purchase_sum > 0 and current_value / purchase_sum > MAX_GAIN_FACTOR:
            return ValidationResult(
                is_valid=False,
                message="Verdächtig hoher Kursgewinn",
                details={"gain_factor": current_value / purchase_sum},
            )

        return ValidationResult(is_valid=True, message="Valide Berechnungsgrundlage")
