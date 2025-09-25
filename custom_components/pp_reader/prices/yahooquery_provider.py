"""
YahooQuery Provider für Live-Preise.

Implementiert das PriceProvider-Protokoll mittels `yahooquery` (blocking API).
Eigenschaften:
- CHUNK_SIZE=50 (Orchestrator chunked Symbole vor Aufruf; doppelte Sicherheit).
- Lazy Import von `yahooquery` im Executor (ImportError wird geloggt und führt zu leerem Resultat).
- Filter: Nur Quotes mit `regularMarketPrice > 0`.
- Fehlertolerant: Fehler im Batch → WARN + Rückgabe {} (Chunk komplett verworfen).
- Keine Persistenz / DB-Logik hier. Reine Quote-Erhebung & Mapping.

Feld-Mapping:
    regularMarketPrice            -> price
    regularMarketPreviousClose    -> previous_close
    currency                      -> currency
    regularMarketVolume           -> volume
    marketCap                     -> market_cap
    fiftyTwoWeekHigh              -> high_52w
    fiftyTwoWeekLow               -> low_52w
    trailingAnnualDividendYield   -> dividend_yield

Nicht vorhandene Felder -> None.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Dict, List

from .provider_base import Quote, PriceProvider

_LOGGER = logging.getLogger(__name__)

CHUNK_SIZE = 50  # Sicherheitskonstante (primär durch Orchestrator genutzt)
_YAHOOQUERY_IMPORT_ERROR = False  # Merkt einmaligen Importfehler (kein Spam)


def has_import_error() -> bool:
    """Expose globalen Importfehler-Status für Orchestrator (Feature-Deaktivierung)."""
    return _YAHOOQUERY_IMPORT_ERROR


def _fetch_quotes_blocking(symbols: List[str]) -> dict:
    """
    Blocking Helper für Executor.

    Führt Import und Fetch synchron aus. Gibt das rohe .quotes Dict zurück
    oder wirft eine Exception weiter.
    """
    global _YAHOOQUERY_IMPORT_ERROR  # noqa: PLW0603
    try:
        from yahooquery import Ticker  # type: ignore
    except Exception as exc:  # ImportError oder andere
        # Anpassung (qa_single_import_error):
        # Spezifikation verlangt genau EIN ERROR-Log für den Importfehler (beim Disable im Orchestrator).
        # Deshalb hier nur DEBUG (früher ERROR) + Setzen des Flags.
        if not _YAHOOQUERY_IMPORT_ERROR:
            _LOGGER.debug(
                "YahooQuery Import fehlgeschlagen (wird deaktiviert): %s", exc
            )
            _YAHOOQUERY_IMPORT_ERROR = True
        # Leeres Dict signalisiert totalen Chunk-Fehlschlag
        return {}
    # Defensive Begrenzung (falls Orchestrator nicht chunked)
    if len(symbols) > CHUNK_SIZE:
        symbols = symbols[:CHUNK_SIZE]
    try:
        tk = Ticker(symbols, asynchronous=False)
        return getattr(tk, "quotes", {}) or {}
    except Exception as exc:
        _LOGGER.warning("YahooQuery Chunk-Fetch Fehler: %s", exc)
        return {}


class YahooQueryProvider(PriceProvider):
    """Implementierung des YahooQuery PriceProviders."""

    source = "yahoo"

    async def fetch(self, symbols: List[str]) -> Dict[str, Quote]:
        """
        Lädt Quotes für übergebene Symbole.

        Rückgabe:
            Dict[symbol, Quote] – nur für akzeptierte (price > 0) Einträge.
            Bei Fehler im gesamten Chunk: leeres Dict (Caller wertet als Fehler).
        """
        if not symbols:
            return {}

        loop = asyncio.get_running_loop()
        try:
            raw_quotes: dict = await loop.run_in_executor(
                None, _fetch_quotes_blocking, symbols
            )
        except Exception:
            _LOGGER.warning(
                "Unerwarteter Fehler beim YahooQuery Executor-Aufruf", exc_info=True
            )
            return {}

        if not raw_quotes:
            # Leerer Chunk → schon geloggt im Blocking-Helper (Import oder Fetch Problem)
            return {}

        result: Dict[str, Quote] = {}
        now_ts = time.time()

        for sym in symbols:
            data = raw_quotes.get(sym)
            if not data:
                _LOGGER.debug(
                    "YahooQuery: skip symbol=%s (keine Daten im Resultat)", sym
                )
                continue

            price = data.get("regularMarketPrice")
            if price is None or price <= 0:
                _LOGGER.debug("Verwerfe Symbol %s: ungültiger Preis=%s", sym, price)
                continue

            quote = Quote(
                symbol=sym,
                price=price,
                previous_close=data.get("regularMarketPreviousClose"),
                currency=data.get("currency"),
                volume=data.get("regularMarketVolume"),
                market_cap=data.get("marketCap"),
                high_52w=data.get("fiftyTwoWeekHigh"),
                low_52w=data.get("fiftyTwoWeekLow"),
                dividend_yield=data.get("trailingAnnualDividendYield"),
                ts=now_ts,
                source=self.source,
            )
            result[sym] = quote
            _LOGGER.debug(
                "YahooQuery: accept symbol=%s price=%s currency=%s",
                sym,
                price,
                quote.currency,
            )

        if _LOGGER.isEnabledFor(logging.DEBUG):
            skipped = [s for s in symbols if s not in result]
            if skipped:
                _LOGGER.debug(
                    "YahooQuery: summary skipped=%s accepted=%s/%s",
                    skipped,
                    len(result),
                    len(symbols),
                )

        return result
