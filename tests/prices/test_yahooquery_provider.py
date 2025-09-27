"""
Tests für YahooQueryProvider (Mapping & Filterlogik).

Abgedeckte Szenarien:
- Gültiger Preis (>0) wird akzeptiert (Quote-Objekt erstellt).
- Preis None / 0 / <=0 wird verworfen.
- Fehlende Symboldaten (kein Key im Raw Dict) → kein Quote.
- Executor-/Chunk-Fehler (Exception im Blocking-Helper) → leeres Resultat.

Der echte yahooquery Import wird NICHT benötigt; wir patchen den
internen Blocking-Helper `_fetch_quotes_blocking`.
"""

import pytest

from custom_components.pp_reader.prices import yahooquery_provider
from custom_components.pp_reader.prices.yahooquery_provider import (
    Quote,
    YahooQueryProvider,
)


@pytest.mark.asyncio
async def test_accepts_positive_price(monkeypatch):
    """Ein Symbol mit gültigem Preis wird akzeptiert und korrekt gemappt."""

    def fake_blocking(symbols):
        assert symbols == ["AAPL"]
        return {
            "AAPL": {
                "regularMarketPrice": 185.12,
                "regularMarketPreviousClose": 184.0,
                "currency": "USD",
                "regularMarketVolume": 123456,
                "marketCap": 999999999,
                "fiftyTwoWeekHigh": 200.0,
                "fiftyTwoWeekLow": 150.0,
                "trailingAnnualDividendYield": 0.005,
            }
        }

    monkeypatch.setattr(yahooquery_provider, "_fetch_quotes_blocking", fake_blocking)
    provider = YahooQueryProvider()
    result = await provider.fetch(["AAPL"])
    assert "AAPL" in result
    quote = result["AAPL"]
    assert isinstance(quote, Quote)
    assert quote.price == 185.12
    assert quote.previous_close == 184.0
    assert quote.currency == "USD"
    assert quote.volume == 123456
    assert quote.high_52w == 200.0
    assert quote.low_52w == 150.0
    assert quote.dividend_yield == 0.005
    assert quote.source == "yahoo"


@pytest.mark.asyncio
async def test_filters_invalid_price(monkeypatch):
    """Symbole mit Preis None oder <=0 werden verworfen."""

    def fake_blocking(symbols):
        return {
            "SYM0": {"regularMarketPrice": 0},
            "SYMNEG": {"regularMarketPrice": -1},
            "SYMNONE": {"regularMarketPrice": None},
        }

    monkeypatch.setattr(yahooquery_provider, "_fetch_quotes_blocking", fake_blocking)
    provider = YahooQueryProvider()
    result = await provider.fetch(["SYM0", "SYMNEG", "SYMNONE"])
    assert result == {}  # alle verworfen


@pytest.mark.asyncio
async def test_missing_symbol_data(monkeypatch):
    """Wenn das Raw Dict keinen Eintrag für das angefragte Symbol enthält → kein Quote."""

    def fake_blocking(symbols):
        # Angefragtes Symbol 'MISS' fehlt im Resultat absichtlich
        return {"OTHER": {"regularMarketPrice": 10.0}}

    monkeypatch.setattr(yahooquery_provider, "_fetch_quotes_blocking", fake_blocking)
    provider = YahooQueryProvider()
    result = await provider.fetch(["MISS"])
    assert result == {}


@pytest.mark.asyncio
async def test_chunk_failure_exception(monkeypatch):
    """Exception im Blocking Helper führt zu leerem Dict (Fehlerpfad)."""

    def failing_blocking(symbols):
        raise RuntimeError("Simulierter Fetch-Fehler")

    monkeypatch.setattr(yahooquery_provider, "_fetch_quotes_blocking", failing_blocking)
    provider = YahooQueryProvider()
    result = await provider.fetch(["A", "B"])
    assert result == {}  # Fehler → leer (toleranter Pfad)
