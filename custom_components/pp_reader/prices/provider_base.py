"""
Basis-Abstraktionen für Live-Preis Provider (YahooQuery Integration).

Dieses Modul definiert:
- Quote: Dataclass für eine einzelne Marktpreis-Quote (nur Runtime Felder,
  persistiert werden später ausschließlich last_price, last_price_source,
  last_price_fetched_at in der securities Tabelle).
- PriceProvider Protocol: Schnittstelle für konkrete Provider (initial YahooQuery).

Spezifikation (siehe .docs/nextGoals.md / DEV_PRICE_TODO):
- Nur Quotes mit price > 0 werden vom konkreten Provider akzeptiert.
- Fehlende Felder → None.
- Keine Exceptions pro Symbol (Provider filtert / lässt aus).
- Skalierung & Persistenz erfolgen NICHT hier (Change Detection Layer).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, Dict, List, Optional
import logging

_LOGGER = logging.getLogger(__name__)

__all__ = ["Quote", "PriceProvider"]


@dataclass(slots=True)
class Quote:
    """
    Repräsentiert eine einzelne Markt-Quote (Runtime-Objekt).

    Attribute:
        symbol: Ursprüngliches Symbol aus Autodiscovery (keine Normalisierung).
        price: Letzter Preis (float, ungefiltert; Provider garantiert >0 bei gültigen Quotes).
        previous_close: Vorheriger Schlusskurs.
        currency: Währungscode der Quote (für Drift-Prüfung, wird nicht persistiert).
        volume: Handelsvolumen (optional).
        market_cap: Marktkapitalisierung (optional).
        high_52w / low_52w: 52-Wochen Hoch/Tief.
        dividend_yield: Laufende oder trailing Dividendenrendite (raw).
        ts: Epoch Sekunden (float) Zeitpunkt der Quote-Erhebung (Provider-Vergabe).
        source: Kennzeichnung des Providers (z.B. 'yahoo').

    Hinweis:
        Persistenz findet nur für ausgewählte Felder in einem separaten Schritt statt.
    """

    symbol: str
    price: Optional[float]
    previous_close: Optional[float]
    currency: Optional[str]
    volume: Optional[int]
    market_cap: Optional[int]
    high_52w: Optional[float]
    low_52w: Optional[float]
    dividend_yield: Optional[float]
    ts: float
    source: str

    def is_price_valid(self) -> bool:
        """Hilfsfunktion für Aufrufer (Orchestrator): Preis > 0 vorhanden."""
        return self.price is not None and self.price > 0


class PriceProvider(Protocol):
    """
    Schnittstelle für Preis-Provider.

    Implementierer müssen:
      - Alle Symbole (Batch oder Teil-Batches) versuchen zu laden.
      - Nur gültige Quotes (price > 0) zurückgeben.
      - Fehler pro Symbol intern isolieren (Symbol ggf. auslassen).
      - Ein Dict mit originalen Symbol-Keys liefern.

    Rückgabe:
        Dict[symbol, Quote]
    """

    async def fetch(self, symbols: List[str]) -> Dict[str, Quote]:
        """Lädt Quotes für übergebene Symbole."""
        ...
