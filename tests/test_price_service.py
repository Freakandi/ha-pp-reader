"""
Tests für den Preis-Orchestrator (_run_price_cycle).

Abgedeckte Szenarien (Item service_tests):
- Preisänderung → Events (portfolio_values) gesendet
- Keine Preisänderung → keine Events
- Overlap: laufender Lock → skipped_running
- Currency Drift Warn nur einmal (zweiter Lauf ohne erneute WARN)
- Fehlerzählung: wiederholte Zero-Quotes → Inkrement + WARN ab 3, danach Reset bei Erfolg

Hinweise:
- Revaluation & Positions-Fetch werden gepatcht (Dummy-Rückgabe), um
  Abhängigkeiten auf echte Portfolio-Aggregation zu vermeiden.
- Symbol-Autodiscovery wird umgangen: store['price_symbols'] und
  store['price_symbol_map'] direkt gesetzt.
- Keine Änderung produktiver Module.
"""

import asyncio
import logging
import re
import sqlite3
from pathlib import Path
from typing import Any

import pytest

from custom_components.pp_reader.const import DOMAIN
from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.prices import price_service
from custom_components.pp_reader.prices.price_service import (
    _run_price_cycle,
    initialize_price_state,
    load_and_map_symbols,
)
from custom_components.pp_reader.prices.provider_base import Quote
from custom_components.pp_reader.prices.yahooquery_provider import (
    CHUNK_SIZE,
    YahooQueryProvider,
)
from custom_components.pp_reader.util.currency import eur_to_cent, round_currency


@pytest.fixture
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


class FakeHass:
    def __init__(self):
        self.data = {DOMAIN: {}}

    def get_loop(self):
        return asyncio.get_running_loop()

    async def async_add_executor_job(self, func, *args):
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, func, *args)


def _create_db_with_security(
    tmp_path: Path, uuid: str, ticker: str, currency: str | None, last_price: int | None
):
    db_path = tmp_path / "test.db"
    conn = sqlite3.connect(str(db_path))
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS securities (
            uuid TEXT PRIMARY KEY,
            name TEXT,
            isin TEXT,
            wkn TEXT,
            ticker_symbol TEXT,
            feed TEXT,
            type TEXT,
            currency_code TEXT,
            retired INTEGER,
            updated_at TEXT,
            last_price INTEGER,
            last_price_date INTEGER,
            last_price_source TEXT,
            last_price_fetched_at TEXT
        );
        """
    )
    conn.execute(
        "INSERT OR REPLACE INTO securities (uuid,name,ticker_symbol,currency_code,retired,last_price,last_price_source,last_price_fetched_at) "
        "VALUES (?,?,?,?,?,?,?,?)",
        (
            uuid,
            "SecName",
            ticker,
            currency,
            0,
            last_price,
            "yahoo" if last_price is not None else None,
            None,
        ),
    )
    conn.commit()
    conn.close()
    return db_path


def _init_store(
    hass: FakeHass, entry_id: str, db_path: Path, symbols_map: dict[str, list[str]]
):
    price_service.initialize_price_state(hass, entry_id)
    store = hass.data[DOMAIN][entry_id]
    store["db_path"] = db_path
    store["price_symbols"] = list(symbols_map.keys())
    store["price_symbol_map"] = symbols_map  # Legacy Name (bleibt für ältere Tests)
    store["price_symbol_to_uuids"] = symbols_map
    return store


def _make_quote(symbol: str, price: float, currency: str | None = None) -> Quote:
    return Quote(
        symbol=symbol,
        price=price,
        previous_close=None,
        currency=currency,
        volume=None,
        market_cap=None,
        high_52w=None,
        low_52w=None,
        dividend_yield=None,
        ts=0.0,
        source="yahoo",
    )


def _performance_payload(gain_abs: float, gain_pct: float) -> dict[str, Any]:
    return {
        "gain_abs": gain_abs,
        "gain_pct": gain_pct,
        "total_change_eur": gain_abs,
        "total_change_pct": gain_pct,
        "source": "calculated",
        "coverage_ratio": 1.0,
        "day_change": {
            "price_change_native": None,
            "price_change_eur": None,
            "change_pct": None,
            "source": "unavailable",
            "coverage_ratio": 0.0,
        },
    }


def _make_portfolio_value_entry(
    uuid: str,
    name: str,
    current_value: float,
    purchase_sum: float,
    position_count: int,
) -> dict[str, Any]:
    gain_abs = round(current_value - purchase_sum, 2)
    gain_pct = round((gain_abs / purchase_sum * 100) if purchase_sum else 0.0, 2)
    return {
        "uuid": uuid,
        "name": name,
        "current_value": current_value,
        "purchase_sum": purchase_sum,
        "performance": _performance_payload(gain_abs, gain_pct),
        "position_count": position_count,
        "missing_value_positions": 0,
    }


@pytest.mark.asyncio
async def test_change_triggers_events(monkeypatch, tmp_path):
    hass = FakeHass()
    entry_id = "e1"
    db_path = _create_db_with_security(
        tmp_path, "sec1", "AAPL", "USD", 100_000_000
    )  # 1.0
    _init_store(hass, entry_id, db_path, {"AAPL": ["sec1"]})

    events: list[tuple[str, list | dict]] = []

    def fake_push(hass_, entry, data_type, payload):
        events.append((data_type, payload))

    async def fake_reval(hass_, conn, uuids):
        return {
            "portfolio_values": {
                "pf1": _make_portfolio_value_entry("pf1", "Depot", 123.456, 100.0, 1)
            },
            "portfolio_positions": None,
        }

    async def fake_fetch(self, symbols):
        return {"AAPL": _make_quote("AAPL", 1.05, "USD")}

    monkeypatch.setattr(price_service, "_push_update", fake_push)
    monkeypatch.setattr(price_service, "revalue_after_price_updates", fake_reval)
    monkeypatch.setattr(price_service.YahooQueryProvider, "fetch", fake_fetch)

    meta = await price_service._run_price_cycle(hass, entry_id)

    assert meta["changed"] == 1
    # portfolio_values Event erwartet
    assert any(ev[0] == "portfolio_values" for ev in events)


def test_refresh_impacted_portfolio_securities_uses_currency_helpers(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """Portfolio security refresh should persist values using shared helpers."""

    class DummyPurchase:
        def __init__(
            self,
            purchase_value: float,
            avg_price_native: float,
            security_currency_total: float,
            account_currency_total: float,
            avg_price_account: float,
        ) -> None:
            self.purchase_value = purchase_value
            self.avg_price_native = avg_price_native
            self.security_currency_total = security_currency_total
            self.account_currency_total = account_currency_total
            self.avg_price_account = avg_price_account

    purchase_value = 123.4567
    current_value = 321.2345
    security_total = 200.9876
    account_total = 300.54321
    avg_price_native = 12.345678
    avg_price_account = 150.654321

    db_path = tmp_path / "portfolio.db"
    conn = sqlite3.connect(str(db_path))
    conn.execute(
        """
        CREATE TABLE portfolio_securities (
            portfolio_uuid TEXT PRIMARY KEY,
            security_uuid TEXT,
            current_holdings INTEGER,
            purchase_value INTEGER,
            avg_price_native INTEGER,
            security_currency_total INTEGER,
            account_currency_total INTEGER,
            avg_price_account INTEGER,
            current_value INTEGER
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE transactions (
            uuid TEXT,
            type INTEGER,
            account TEXT,
            portfolio TEXT,
            other_account TEXT,
            other_portfolio TEXT,
            date TEXT,
            currency_code TEXT,
            amount INTEGER,
            shares INTEGER,
            security TEXT
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE transaction_units (
            transaction_uuid TEXT,
            fx_amount INTEGER,
            fx_currency_code TEXT
        )
        """
    )
    conn.execute(
        """
        INSERT INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "tx-1",
            0,
            "acct-1",
            "pf-1",
            None,
            None,
            "2024-01-01T00:00:00",
            "EUR",
            10_000,
            100_000_000,
            "sec-1",
        ),
    )
    conn.commit()
    conn.close()

    dummy_purchase = DummyPurchase(
        purchase_value,
        avg_price_native,
        security_total,
        account_total,
        avg_price_account,
    )
    current_holdings = 3.0

    monkeypatch.setattr(
        price_service,
        "db_calculate_current_holdings",
        lambda _transactions: {("pf-1", "sec-1"): current_holdings},
    )

    monkeypatch.setattr(
        price_service,
        "db_calculate_sec_purchase_value",
        lambda _transactions, _db_path, tx_units=None: {
            ("pf-1", "sec-1"): dummy_purchase
        },
    )

    def _fake_holdings_value(
        _db_path: Path,
        _conn: sqlite3.Connection,
        _current_hold_pur: dict[tuple[str, str], dict[str, float]],
    ) -> dict[tuple[str, str], dict[str, float]]:
        return {
            ("pf-1", "sec-1"): {
                "current_holdings": current_holdings,
                "purchase_value": purchase_value,
                "current_value": current_value,
                "security_currency_total": security_total,
                "account_currency_total": account_total,
                "avg_price_native": avg_price_native,
            }
        }

    monkeypatch.setattr(
        price_service, "db_calculate_holdings_value", _fake_holdings_value
    )

    impacted = price_service._refresh_impacted_portfolio_securities(
        db_path, {"sec-1": 10100}
    )

    conn = sqlite3.connect(str(db_path))
    row = conn.execute(
        """
        SELECT
            current_holdings,
            purchase_value,
            avg_price_native,
            security_currency_total,
            account_currency_total,
            avg_price_account,
            current_value
        FROM portfolio_securities
        WHERE portfolio_uuid = ? AND security_uuid = ?
        """,
        ("pf-1", "sec-1"),
    ).fetchone()
    conn.close()

    assert impacted == {"pf-1"}
    assert row is not None
    (
        current_holdings_db,
        purchase_value_cents,
        avg_price_native_db,
        security_total_db,
        account_total_db,
        avg_price_account_db,
        current_value_cents,
    ) = row

    expected_purchase_eur = round_currency(purchase_value, default=0.0)
    assert current_holdings_db == pytest.approx(current_holdings)
    assert purchase_value_cents == eur_to_cent(expected_purchase_eur, default=0)
    assert avg_price_native_db == pytest.approx(avg_price_native, abs=1e-6)
    assert security_total_db == pytest.approx(
        round_currency(security_total, default=0.0)
    )
    assert account_total_db == pytest.approx(round_currency(account_total, default=0.0))
    assert avg_price_account_db is None
    expected_current_eur = round_currency(current_value, default=0.0)
    assert current_value_cents == eur_to_cent(expected_current_eur, default=0)


@pytest.mark.asyncio
async def test_no_change_no_events(monkeypatch, tmp_path):
    hass = FakeHass()
    entry_id = "e2"
    # last_price entspricht Quote (1.05)
    scaled = round(1.05 * 1e8)
    db_path = _create_db_with_security(tmp_path, "sec1", "AAPL", "USD", scaled)
    _init_store(hass, entry_id, db_path, {"AAPL": ["sec1"]})

    events: list = []

    def fake_push(hass_, entry, data_type, payload):
        events.append((data_type, payload))

    async def fake_reval(hass_, conn, uuids):
        return {"portfolio_values": {"pf1": {}}, "portfolio_positions": None}

    async def fake_fetch(self, symbols):
        return {"AAPL": _make_quote("AAPL", 1.05, "USD")}

    monkeypatch.setattr(price_service, "_push_update", fake_push)
    monkeypatch.setattr(price_service, "revalue_after_price_updates", fake_reval)
    monkeypatch.setattr(price_service.YahooQueryProvider, "fetch", fake_fetch)

    meta = await price_service._run_price_cycle(hass, entry_id)
    assert meta["changed"] == 0
    assert events == []  # keine Events


@pytest.mark.asyncio
async def test_fetch_uses_configured_timeout(monkeypatch, tmp_path):
    hass = FakeHass()
    entry_id = "timeout"
    db_path = _create_db_with_security(tmp_path, "sec1", "AAPL", "USD", None)
    _init_store(hass, entry_id, db_path, {"AAPL": ["sec1"]})

    async def fake_fetch(self, symbols):
        return {"AAPL": _make_quote("AAPL", 1.0, "USD")}

    async def fake_wait_for(awaitable, timeout_seconds, *, loop=None):
        assert timeout_seconds == price_service.PRICE_FETCH_TIMEOUT
        return await awaitable

    monkeypatch.setattr(price_service.YahooQueryProvider, "fetch", fake_fetch)
    monkeypatch.setattr(price_service.asyncio, "wait_for", fake_wait_for)

    meta = await price_service._run_price_cycle(hass, entry_id)

    assert meta["quotes_returned"] == 1


@pytest.mark.asyncio
async def test_overlap_skip(monkeypatch, tmp_path):
    hass = FakeHass()
    entry_id = "e3"
    db_path = _create_db_with_security(tmp_path, "sec1", "AAPL", "USD", None)
    store = _init_store(hass, entry_id, db_path, {"AAPL": ["sec1"]})

    # Lock manuell sperren
    await store["price_lock"].acquire()
    try:
        meta = await price_service._run_price_cycle(hass, entry_id)
    finally:
        store["price_lock"].release()

    assert meta["skipped_running"] is True
    assert meta["quotes_returned"] == 0
    assert meta["changed"] == 0


@pytest.mark.asyncio
async def test_currency_drift_warn_once(monkeypatch, tmp_path, caplog):
    hass = FakeHass()
    entry_id = "e4"
    db_path = _create_db_with_security(tmp_path, "sec1", "AAPL", "USD", None)
    _init_store(hass, entry_id, db_path, {"AAPL": ["sec1"]})

    async def fake_reval(hass_, conn, uuids):
        return {"portfolio_values": {}, "portfolio_positions": None}

    async def fake_fetch(self, symbols):
        # Quote currency abweichend (EUR vs USD in DB)
        return {"AAPL": _make_quote("AAPL", 1.11, "EUR")}

    monkeypatch.setattr(price_service, "revalue_after_price_updates", fake_reval)
    monkeypatch.setattr(price_service.YahooQueryProvider, "fetch", fake_fetch)
    monkeypatch.setattr(price_service, "_push_update", lambda *a, **k: None)

    caplog.clear()
    await price_service._run_price_cycle(hass, entry_id)
    first_warnings = [
        r
        for r in caplog.records
        if "Currency Drift" in r.message or "Currency Drift erkannt" in r.message
    ]
    assert len(first_warnings) == 1

    caplog.clear()
    # Zweiter Lauf – gleiche Drift sollte NICHT erneut loggen
    await price_service._run_price_cycle(hass, entry_id)
    second_warnings = [
        r
        for r in caplog.records
        if "Currency Drift" in r.message or "Currency Drift erkannt" in r.message
    ]
    assert len(second_warnings) == 0


@pytest.mark.asyncio
async def test_error_counter_increment_and_reset(monkeypatch, tmp_path, caplog):
    hass = FakeHass()
    entry_id = "e5"
    db_path = _create_db_with_security(tmp_path, "sec1", "AAPL", "USD", None)
    store = _init_store(hass, entry_id, db_path, {"AAPL": ["sec1"]})

    # Revaluation Dummy
    async def fake_reval(hass_, conn, uuids):
        return {"portfolio_values": {}, "portfolio_positions": None}

    # Zero-Quotes (leer)
    async def empty_fetch(self, symbols):
        return {}

    async def success_fetch(self, symbols):
        return {"AAPL": _make_quote("AAPL", 2.0, "USD")}

    monkeypatch.setattr(price_service, "revalue_after_price_updates", fake_reval)
    monkeypatch.setattr(price_service, "_push_update", lambda *a, **k: None)

    # Drei aufeinanderfolgende Fehl-Läufe (leer)
    caplog.clear()
    caplog.set_level(logging.INFO, logger=price_service.__name__)
    monkeypatch.setattr(price_service.YahooQueryProvider, "fetch", empty_fetch)
    await price_service._run_price_cycle(hass, entry_id)
    await price_service._run_price_cycle(hass, entry_id)
    await price_service._run_price_cycle(hass, entry_id)

    assert store["price_error_counter"] >= 3
    repeated_warn = any(
        "Wiederholte Fehlschläge" in r.message or "wiederholte" in r.message.lower()
        for r in caplog.records
    )
    assert repeated_warn, "Erwartete WARN bei wiederholten Fehlschlägen nicht gefunden"

    # Erfolgreicher Lauf → Reset
    caplog.clear()
    monkeypatch.setattr(price_service.YahooQueryProvider, "fetch", success_fetch)
    await price_service._run_price_cycle(hass, entry_id)

    assert store["price_error_counter"] == 0
    reset_logged = any(
        "Fehlerzähler zurückgesetzt" in r.message for r in caplog.records
    )
    assert reset_logged, "Reset-Log nicht gefunden"


@pytest.mark.asyncio
async def test_no_drift_none_currency(monkeypatch, tmp_path, caplog):
    """
    Verifiziert, dass bei fehlender Quote.currency KEINE Drift-WARN geloggt wird
    (Item: test_no_drift_none_currency).
    """
    hass = FakeHass()
    entry_id = "e6"
    # Security mit persistierter Currency (USD)
    db_path = _create_db_with_security(tmp_path, "sec1", "AAPL", "USD", None)
    store = _init_store(hass, entry_id, db_path, {"AAPL": ["sec1"]})

    async def fake_reval(hass_, conn, uuids):
        return {"portfolio_values": {}, "portfolio_positions": None}

    # Quote ohne currency (None) -> sollte von Drift-Prüfung ignoriert werden
    async def fetch_no_currency(self, symbols):
        return {"AAPL": _make_quote("AAPL", 3.0, None)}

    monkeypatch.setattr(price_service, "revalue_after_price_updates", fake_reval)
    monkeypatch.setattr(price_service.YahooQueryProvider, "fetch", fetch_no_currency)
    monkeypatch.setattr(price_service, "_push_update", lambda *a, **k: None)

    caplog.clear()
    await price_service._run_price_cycle(hass, entry_id)

    # Keine Drift-WARN erwartet
    drift_logs = [
        r
        for r in caplog.records
        if "Currency Drift" in r.message or "Currency Drift erkannt" in r.message
    ]
    assert not drift_logs, "Drift-WARN wurde trotz fehlender currency geloggt"

    # Cache darf nicht gefüllt sein
    assert store.get("price_currency_drift_logged") == set()


async def test_metadata_log(hass, tmp_path, caplog, monkeypatch):
    """
    Verifiziert, dass der Orchestrator den vollständigen Metadata-INFO-Log mit allen
    erwarteten Schlüsseln schreibt.

    Erwartete Schlüssel (siehe Spezifikation):
      symbols=  batches=  returned=  changed=  errors=  duration=  skipped_running=
    """
    db_path = tmp_path / "meta_log.db"
    initialize_database_schema(db_path)

    # Minimalen Security-Datensatz einfügen (retired=0 + ticker_symbol nötig für Autodiscovery)
    with sqlite3.connect(str(db_path)) as conn:
        conn.execute(
            """
            INSERT INTO securities (uuid, name, ticker_symbol, currency_code, retired, last_price)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            ("sec1", "Test Security", "ABC", "EUR", 0, int(100 * 1e8)),
        )
        conn.commit()

    entry_id = "entry_meta"
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry_id] = {"db_path": db_path}

    initialize_price_state(hass, entry_id)
    load_and_map_symbols(hass, entry_id, db_path)

    # Monkeypatch Provider.fetch um deterministische Quote zu liefern
    async def _fake_fetch(self, symbols):
        return {
            "ABC": Quote(
                symbol="ABC",
                price=101.0,
                previous_close=100.0,
                currency="EUR",
                volume=None,
                market_cap=None,
                high_52w=None,
                low_52w=None,
                dividend_yield=None,
                ts=1234567890.0,
                source="yahoo",
            )
        }

    monkeypatch.setattr(YahooQueryProvider, "fetch", _fake_fetch)

    caplog.set_level(logging.INFO)
    await _run_price_cycle(hass, entry_id)

    log_text = caplog.text
    assert "prices_cycle symbols=" in log_text, "Metadata Log fehlt"
    for key in [
        "batches=",
        "returned=",
        "changed=",
        "errors=",
        "duration=",
        "skipped_running=",
    ]:
        assert key in log_text, f"Metadata Schlüssel {key} fehlt im Log"

    # Sicherstellen, dass kein skipped_running True war (normaler Lauf)
    assert "skipped_running=True" not in log_text


@pytest.mark.asyncio
async def test_normal_batch(monkeypatch, tmp_path):
    """
    Normaler Batch:
    - Zwei Symbole -> beide Preise ändern sich.
    - Persistenz (last_price, last_price_source, last_price_fetched_at) validiert.
    - Event-Reihenfolge: portfolio_values zuerst, danach portfolio_positions.
    - Skalierung 1e8 + Timestamp Format.
    """
    # DB + zwei Securities
    db_path = tmp_path / "normal_batch.db"
    initialize_database_schema(db_path)
    with sqlite3.connect(str(db_path)) as conn:
        conn.execute(
            """
            INSERT INTO securities (uuid, name, ticker_symbol, currency_code, retired, last_price)
            VALUES (?,?,?,?,0,?)
            """,
            ("secA", "Security A", "AAA", "EUR", int(100 * 1e8)),
        )
        conn.execute(
            """
            INSERT INTO securities (uuid, name, ticker_symbol, currency_code, retired, last_price)
            VALUES (?,?,?,?,0,?)
            """,
            ("secB", "Security B", "BBB", "EUR", int(200 * 1e8)),
        )
        conn.commit()

    # Fake hass
    hass = FakeHass()
    entry_id = "entry_normal"
    symbol_map = {"AAA": ["secA"], "BBB": ["secB"]}
    _init_store(hass, entry_id, db_path, symbol_map)

    # Deterministische Quotes
    async def _fake_fetch(self, symbols):
        return {
            "AAA": _make_quote("AAA", 101.23, "EUR"),
            "BBB": _make_quote("BBB", 199.99, "EUR"),
        }

    monkeypatch.setattr(YahooQueryProvider, "fetch", _fake_fetch)

    # Revaluation Patch (liefert konsistente Aggregation)
    async def _fake_revalue_after_price_updates(hass_, conn, updated_security_uuids):
        return {
            "portfolio_values": {
                "port1": _make_portfolio_value_entry("port1", "P1", 1234.56, 1111.11, 2)
            },
            "portfolio_positions": None,  # Positions kommen über separaten Fetch
        }

    monkeypatch.setattr(
        "custom_components.pp_reader.prices.revaluation.revalue_after_price_updates",
        _fake_revalue_after_price_updates,
    )

    # Positions-Fetch Patch
    def _fake_fetch_positions_for_portfolios(db_path_, portfolio_ids):
        return {
            "port1": [
                {
                    "security_uuid": "secA",
                    "security_name": "Security A",
                    "shares": 10.0,
                    "price": 101.23,
                    "value": 1012.30,
                },
                {
                    "security_uuid": "secB",
                    "security_name": "Security B",
                    "shares": 5.0,
                    "price": 199.99,
                    "value": 999.95,
                },
            ]
        }

    monkeypatch.setattr(
        "custom_components.pp_reader.prices.price_service.fetch_positions_for_portfolios",
        _fake_fetch_positions_for_portfolios,
    )

    # Event Capture
    pushed = []

    def _fake_push_update(hass_, entry_id_, data_type, data):
        pushed.append((data_type, data))

    monkeypatch.setattr(
        "custom_components.pp_reader.prices.price_service._push_update",
        _fake_push_update,
    )

    # Run cycle
    await _run_price_cycle(hass, entry_id)

    # Persistenz prüfen
    with sqlite3.connect(str(db_path)) as conn:
        cur = conn.execute(
            """
            SELECT uuid, last_price, last_price_source, last_price_fetched_at
            FROM securities WHERE uuid IN ('secA','secB')
            """
        )
        rows = {r[0]: r[1:] for r in cur.fetchall()}

    assert "secA" in rows and "secB" in rows
    # Skaliert
    assert rows["secA"][0] == round(101.23 * 1e8)
    assert rows["secB"][0] == round(199.99 * 1e8)
    # Source
    assert rows["secA"][1] == "yahoo"
    assert rows["secB"][1] == "yahoo"
    # Timestamp Format
    iso_re = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
    assert iso_re.match(rows["secA"][2])
    assert iso_re.match(rows["secB"][2])

    # Events: zuerst portfolio_values, danach >=1 portfolio_positions
    assert len(pushed) >= 2
    assert pushed[0][0] == "portfolio_values"
    # Nachfolgende nur portfolio_positions
    for kind, _payload in pushed[1:]:
        assert kind == "portfolio_positions"

    # Keine doppelten portfolio_values
    assert sum(1 for k, _ in pushed if k == "portfolio_values") == 1


@pytest.mark.asyncio
async def test_price_update_refreshes_portfolio_gains(monkeypatch, tmp_path):
    """A price change updates portfolio gains alongside the value payload."""
    db_path = tmp_path / "portfolio_refresh.db"
    initialize_database_schema(db_path)

    with sqlite3.connect(str(db_path)) as conn:
        conn.execute(
            "INSERT INTO portfolios (uuid, name) VALUES (?, ?)",
            ("pf-refresh", "Refresh Depot"),
        )
        conn.execute(
            """
            INSERT INTO securities (
                uuid, name, ticker_symbol, currency_code, retired, last_price,
                last_price_source
            ) VALUES (?, ?, ?, ?, 0, ?, ?)
            """,
            (
                "sec-refresh",
                "Refresh Equity",
                "REF",
                "EUR",
                int(100 * 1e8),
                "yahoo",
            ),
        )
        conn.execute(
            """
            INSERT INTO transactions (
                uuid, type, portfolio, date, currency_code, amount, shares, security
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "tx-refresh",
                0,
                "pf-refresh",
                "2024-01-01",
                "EUR",
                100_000,
                int(10 * 1e8),
                "sec-refresh",
            ),
        )
        conn.execute(
            """
            INSERT INTO portfolio_securities (
                portfolio_uuid, security_uuid, current_holdings, purchase_value, current_value
            ) VALUES (?, ?, ?, ?, ?)
            """,
            ("pf-refresh", "sec-refresh", 10.0, 100_000, 100_000),
        )
        conn.commit()

    hass = FakeHass()
    entry_id = "entry_refresh"
    _init_store(hass, entry_id, db_path, {"REF": ["sec-refresh"]})

    async def _fake_revaluation(hass_, conn, updated_security_uuids):
        return {"portfolio_values": None, "portfolio_positions": None}

    monkeypatch.setattr(
        "custom_components.pp_reader.prices.revaluation.revalue_after_price_updates",
        _fake_revaluation,
    )

    def _fake_fetch_positions_for_portfolios(db_path_, portfolio_ids):
        return {}

    monkeypatch.setattr(
        "custom_components.pp_reader.prices.price_service.fetch_positions_for_portfolios",
        _fake_fetch_positions_for_portfolios,
    )

    pushed: list[tuple[str, Any]] = []

    def _fake_push_update(hass_, entry_id_, data_type, payload):
        pushed.append((data_type, payload))

    monkeypatch.setattr(price_service, "_push_update", _fake_push_update)

    async def _fake_fetch(self, symbols):
        assert symbols == ["REF"]
        return {"REF": _make_quote("REF", 120.0, "EUR")}

    monkeypatch.setattr(YahooQueryProvider, "fetch", _fake_fetch)

    await _run_price_cycle(hass, entry_id)

    with sqlite3.connect(str(db_path)) as conn:
        cur = conn.execute(
            """
            SELECT current_value FROM portfolio_securities
            WHERE portfolio_uuid=? AND security_uuid=?
            """,
            ("pf-refresh", "sec-refresh"),
        )
        updated_current_value = cur.fetchone()[0]

    assert updated_current_value == 120_000

    pv_events = [payload for kind, payload in pushed if kind == "portfolio_values"]
    assert pv_events, "portfolio_values Event erwartet"

    payload = pv_events[0]
    assert isinstance(payload, list)
    refresh_entry = next(item for item in payload if item["uuid"] == "pf-refresh")
    assert refresh_entry["current_value"] == pytest.approx(1200.0)
    assert refresh_entry["purchase_sum"] == pytest.approx(1000.0)
    assert "gain_abs" not in refresh_entry
    assert "gain_pct" not in refresh_entry
    performance = refresh_entry.get("performance")
    assert performance is not None
    assert performance["gain_abs"] == pytest.approx(200.0)
    assert performance["gain_pct"] == pytest.approx(20.0)
    assert performance["total_change_eur"] == pytest.approx(200.0)
    assert performance["total_change_pct"] == pytest.approx(20.0)


@pytest.mark.asyncio
async def test_filter_invalid_price(monkeypatch, tmp_path):
    """
    Null-/0-Preis Filter:
    - Zwei Securities (AAA, BBB)
    - Provider liefert AAA mit price=None (oder 0) => darf NICHT persistiert werden
      und darf keine Beteiligung an Events auslösen.
    - BBB hat gültigen Preis und wird übernommen.
    Prüft:
      - last_price von secA bleibt unverändert
      - last_price von secB aktualisiert (Skalierung 1e8)
      - Events werden (wegen einer Änderung) gesendet
      - Event-Reihenfolge: portfolio_values zuerst, danach portfolio_positions
    """
    db_path = tmp_path / "invalid_price.db"
    initialize_database_schema(db_path)

    with sqlite3.connect(str(db_path)) as conn:
        conn.execute(
            """
            INSERT INTO securities (uuid, name, ticker_symbol, currency_code, retired, last_price)
            VALUES (?,?,?,?,0,?)
            """,
            ("secA", "Security A", "AAA", "EUR", int(50 * 1e8)),
        )
        conn.execute(
            """
            INSERT INTO securities (uuid, name, ticker_symbol, currency_code, retired, last_price)
            VALUES (?,?,?,?,0,?)
            """,
            ("secB", "Security B", "BBB", "EUR", int(75 * 1e8)),
        )
        conn.commit()

    # Minimal hass / state setup (analog vorhandener Tests)
    hass = FakeHass()
    entry_id = "entry_invalid_price"
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry_id] = {"db_path": db_path}
    initialize_price_state(hass, entry_id)
    load_and_map_symbols(hass, entry_id, db_path)

    # Monkeypatch Provider: AAA ungültig (price=None), BBB gültig
    async def _fake_fetch(self, symbols):
        return {
            "AAA": Quote(
                symbol="AAA",
                price=None,  # invalid
                previous_close=None,
                currency="EUR",
                volume=None,
                market_cap=None,
                high_52w=None,
                low_52w=None,
                dividend_yield=None,
                ts=1111111111.0,
                source="yahoo",
            ),
            "BBB": Quote(
                symbol="BBB",
                price=80.25,  # valid
                previous_close=79.0,
                currency="EUR",
                volume=None,
                market_cap=None,
                high_52w=None,
                low_52w=None,
                dividend_yield=None,
                ts=1111111112.0,
                source="yahoo",
            ),
        }

    monkeypatch.setattr(YahooQueryProvider, "fetch", _fake_fetch)

    # Revaluation Patch: nur secB Änderung führt zu einem betroffenen Portfolio
    async def _fake_revalue_after_price_updates(hass_, conn, updated_security_uuids):
        assert "secB" in updated_security_uuids
        assert "secA" not in updated_security_uuids
        return {
            "portfolio_values": {
                "portX": _make_portfolio_value_entry(
                    "portX", "Portfolio X", 999.99, 500.0, 2
                )
            },
            "portfolio_positions": None,
        }

    monkeypatch.setattr(
        "custom_components.pp_reader.prices.revaluation.revalue_after_price_updates",
        _fake_revalue_after_price_updates,
    )

    # Positions Loader Patch
    def _fake_fetch_positions_for_portfolios(db_path_, portfolio_ids):
        return {
            "portX": [
                {
                    "security_uuid": "secB",
                    "security_name": "Security B",
                    "shares": 10.0,
                    "price": 80.25,
                    "value": 802.5,
                }
            ]
        }

    monkeypatch.setattr(
        "custom_components.pp_reader.prices.price_service.fetch_positions_for_portfolios",
        _fake_fetch_positions_for_portfolios,
    )

    pushed = []

    def _fake_push_update(hass_, entry_id_, data_type, data):
        pushed.append((data_type, data))

    monkeypatch.setattr(
        "custom_components.pp_reader.prices.price_service._push_update",
        _fake_push_update,
    )

    # Run
    await _run_price_cycle(hass, entry_id)

    # DB prüfen
    with sqlite3.connect(str(db_path)) as conn:
        cur = conn.execute(
            """
            SELECT uuid, last_price, last_price_source
            FROM securities WHERE uuid IN ('secA','secB')
            """
        )
        rows = {r[0]: r[1:] for r in cur.fetchall()}

    # secA unverändert
    assert rows["secA"][0] == int(50 * 1e8)
    # secB aktualisiert
    assert rows["secB"][0] == round(80.25 * 1e8)
    assert rows["secB"][1] == "yahoo"

    # Events: Erwartet mindestens 2 (values + positions)
    assert len(pushed) >= 2
    assert pushed[0][0] == "portfolio_values"
    assert any(kind == "portfolio_positions" for kind, _ in pushed[1:])

    # Keine Spur von secA in Positionsdaten (nur secB geändert)
    for kind, payload in pushed:
        if kind == "portfolio_positions":
            for port_payload in payload:
                for pos in port_payload.get("positions", []):
                    assert pos.get("security_uuid") != "secA"


@pytest.mark.asyncio
async def test_missing_symbol(monkeypatch, tmp_path):
    """
    Fehlendes Symbol:
    - Zwei aktive Securities (AAA, BBB)
    - Provider liefert NUR BBB (AAA fehlt komplett im Resultat)
    Erwartung:
      - last_price von secB aktualisiert (Skalierung 1e8, source 'yahoo')
      - last_price von secA unverändert
      - Events gesendet (wegen Änderung) -> Reihenfolge portfolio_values vor portfolio_positions
      - Keine Positionsdaten für unveränderte secA
    """
    db_path = tmp_path / "missing_symbol.db"
    initialize_database_schema(db_path)

    with sqlite3.connect(str(db_path)) as conn:
        conn.execute(
            "INSERT INTO securities (uuid,name,ticker_symbol,currency_code,retired,last_price) VALUES (?,?,?,?,0,?)",
            ("secA", "Security A", "AAA", "EUR", int(10 * 1e8)),
        )
        conn.execute(
            "INSERT INTO securities (uuid,name,ticker_symbol,currency_code,retired,last_price) VALUES (?,?,?,?,0,?)",
            ("secB", "Security B", "BBB", "EUR", int(20 * 1e8)),
        )
        conn.commit()

    hass = FakeHass()
    entry_id = "entry_missing_symbol"
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry_id] = {"db_path": db_path}

    initialize_price_state(hass, entry_id)
    load_and_map_symbols(hass, entry_id, db_path)

    # Provider liefert nur BBB (AAA fehlt)
    async def _fake_fetch(self, symbols):
        assert set(symbols) == {"AAA", "BBB"}
        return {
            "BBB": Quote(
                symbol="BBB",
                price=21.75,
                previous_close=21.0,
                currency="EUR",
                volume=None,
                market_cap=None,
                high_52w=None,
                low_52w=None,
                dividend_yield=None,
                ts=1234567000.0,
                source="yahoo",
            )
        }

    monkeypatch.setattr(YahooQueryProvider, "fetch", _fake_fetch)

    # Revaluation Patch – nur secB Änderung -> ein Portfolio
    async def _fake_revalue_after_price_updates(hass_, conn, updated_security_uuids):
        assert "secB" in updated_security_uuids
        assert "secA" not in updated_security_uuids
        return {
            "portfolio_values": {
                "portZ": _make_portfolio_value_entry(
                    "portZ", "Portfolio Z", 555.55, 444.44, 1
                )
            },
            "portfolio_positions": None,
        }

    monkeypatch.setattr(
        "custom_components.pp_reader.prices.revaluation.revalue_after_price_updates",
        _fake_revalue_after_price_updates,
    )

    # Positionsdaten nur für secB
    def _fake_fetch_positions_for_portfolios(db_path_, portfolio_ids):
        return {
            "portZ": [
                {
                    "security_uuid": "secB",
                    "security_name": "Security B",
                    "shares": 5.0,
                    "price": 21.75,
                    "value": 108.75,
                }
            ]
        }

    monkeypatch.setattr(
        "custom_components.pp_reader.prices.price_service.fetch_positions_for_portfolios",
        _fake_fetch_positions_for_portfolios,
    )

    pushed: list[tuple[str, list | dict]] = []

    def _fake_push_update(hass_, entry_id_, data_type, data):
        pushed.append((data_type, data))

    monkeypatch.setattr(
        "custom_components.pp_reader.prices.price_service._push_update",
        _fake_push_update,
    )

    await _run_price_cycle(hass, entry_id)

    # DB prüfen
    with sqlite3.connect(str(db_path)) as conn:
        cur = conn.execute(
            "SELECT uuid,last_price,last_price_source FROM securities WHERE uuid IN ('secA','secB')"
        )
        rows = {r[0]: r[1:] for r in cur.fetchall()}

    # secA unverändert (10 * 1e8)
    assert rows["secA"][0] == int(10 * 1e8)
    # secB aktualisiert
    assert rows["secB"][0] == round(21.75 * 1e8)
    assert rows["secB"][1] == "yahoo"

    # Events vorhanden & Reihenfolge
    assert len(pushed) >= 2
    assert pushed[0][0] == "portfolio_values"
    assert any(kind == "portfolio_positions" for kind, _ in pushed[1:])

    # Positionspayload darf secA nicht enthalten
    for kind, payload in pushed:
        if kind == "portfolio_positions":
            for port_payload in payload:
                for pos in port_payload.get("positions", []):
                    assert pos.get("security_uuid") != "secA"


@pytest.mark.asyncio
async def test_chunk_failure_partial(monkeypatch, tmp_path):
    """
    Chunk Fehler → andere verarbeitet:

    Setup:
      - (CHUNK_SIZE + 1) Securities -> Orchestrator bildet 2 Batches (Batchgröße=CHUNK_SIZE).
      - Erster Batch wirft Exception → kompletter Chunk verworfen.
      - Zweiter Batch (1 Symbol) liefert gültige Quote -> Persistenz + Events.

    Erwartet:
      - Nur Security des zweiten Batches (letztes Symbol) aktualisiert.
      - Alle ersten CHUNK_SIZE Securities unverändert.
      - Events gesendet (portfolio_values zuerst, danach portfolio_positions).
      - Fehlerzähler nach Zyklus > 0 (Chunk-Fehler gezählt).
    """
    db_path = tmp_path / "chunk_failure.db"
    initialize_database_schema(db_path)

    with sqlite3.connect(str(db_path)) as conn:
        for i in range(CHUNK_SIZE + 1):
            sym = f"SYM{i}"
            conn.execute(
                """
                INSERT INTO securities (uuid, name, ticker_symbol, currency_code, retired, last_price)
                VALUES (?,?,?,?,0,?)
                """,
                (f"sec{i}", f"Security {i}", sym, "EUR", int((100 + i) * 1e8)),
            )
        conn.commit()

    hass = FakeHass()
    entry_id = "entry_chunk_failure"
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry_id] = {"db_path": db_path}

    initialize_price_state(hass, entry_id)
    load_and_map_symbols(hass, entry_id, db_path)

    call_count = {"n": 0}

    async def _fake_fetch(self, symbols):
        # Zwei Aufrufe erwartet: 1. Batch (10 Symbole), 2. Batch (1 Symbol)
        call_count["n"] += 1
        if call_count["n"] == 1:
            # Simulierter Chunk-Fehler
            raise Exception("Simulierter Chunkfehler")
        # Zweiter Aufruf -> letztes Symbol
        assert len(symbols) == 1 and symbols[0] == f"SYM{CHUNK_SIZE}"
        return {
            f"SYM{CHUNK_SIZE}": Quote(
                symbol=f"SYM{CHUNK_SIZE}",
                price=999.99,
                previous_close=500.0,
                currency="EUR",
                volume=None,
                market_cap=None,
                high_52w=None,
                low_52w=None,
                dividend_yield=None,
                ts=1231231231.0,
                source="yahoo",
            )
        }

    monkeypatch.setattr(YahooQueryProvider, "fetch", _fake_fetch)

    # Revaluation nur für geänderte sec10
    async def _fake_revalue_after_price_updates(hass_, conn, updated_security_uuids):
        assert updated_security_uuids == {"sec10"}
        return {
            "portfolio_values": {
                "portCF": _make_portfolio_value_entry(
                    "portCF", "Portfolio CF", 12345.67, 11111.11, 5
                )
            },
            "portfolio_positions": None,
        }

    monkeypatch.setattr(
        "custom_components.pp_reader.prices.revaluation.revalue_after_price_updates",
        _fake_revalue_after_price_updates,
    )

    def _fake_fetch_positions_for_portfolios(db_path_, portfolio_ids):
        return {
            "portCF": [
                {
                    "security_uuid": "sec10",
                    "security_name": "Security 10",
                    "shares": 2.0,
                    "price": 999.99,
                    "value": 1999.98,
                }
            ]
        }

    monkeypatch.setattr(
        "custom_components.pp_reader.prices.price_service.fetch_positions_for_portfolios",
        _fake_fetch_positions_for_portfolios,
    )

    pushed = []

    def _fake_push_update(hass_, entry_id_, data_type, data):
        pushed.append((data_type, data))

    monkeypatch.setattr(
        "custom_components.pp_reader.prices.price_service._push_update",
        _fake_push_update,
    )

    await _run_price_cycle(hass, entry_id)

    # DB prüfen
    with sqlite3.connect(str(db_path)) as conn:
        cur = conn.execute(
            """
            SELECT uuid,last_price,last_price_source FROM securities
            WHERE uuid IN (%s)
            """
            % ",".join(["?"] * 11),
            tuple(f"sec{i}" for i in range(11)),
        )
        rows = {r[0]: r[1:] for r in cur.fetchall()}

    # Erste 10 Securities unverändert
    for i in range(10):
        assert rows[f"sec{i}"][0] == int((100 + i) * 1e8), (
            f"sec{i} wurde unerwartet geändert"
        )
    # Letzte Security aktualisiert
    assert rows["sec10"][0] == round(999.99 * 1e8)
    assert rows["sec10"][1] == "yahoo"

    # Events: portfolio_values zuerst, danach portfolio_positions
    assert len(pushed) >= 2
    assert pushed[0][0] == "portfolio_values"
    assert any(kind == "portfolio_positions" for kind, _ in pushed[1:])

    # Fehlerzähler (Chunk-Fehler) > 0
    store = hass.data[DOMAIN][entry_id]
    assert store.get("price_error_counter", 0) > 0


@pytest.mark.asyncio
async def test_zero_quotes_warn_and_error_counter_increment(
    hass, caplog, tmp_path: Path, monkeypatch
):
    """
    Szenario: Alle Batches liefern 0 Quotes.
    Erwartet:
      - WARN Log (Substring 'zero-quotes detected') einmal (nicht gedrosselt beim Erstfall).
      - Fehlerzähler > 0 (mindestens 1 durch Total-Fehlschlag; ggf. + Chunk-Fehler).
    """
    db_path = tmp_path / "portfolio.db"

    # Minimal-Schema initialisieren (nur securities Tabelle nötig)
    conn = sqlite3.connect(str(db_path))
    conn.execute("""
        CREATE TABLE securities (
            uuid TEXT PRIMARY KEY,
            name TEXT,
            ticker_symbol TEXT,
            type TEXT,
            retired INTEGER DEFAULT 0,
            last_price INTEGER,
            last_price_date INTEGER,
            last_price_source TEXT,
            last_price_fetched_at TEXT,
            currency_code TEXT
        )
    """)
    # Ein aktives Wertpapier mit Symbol einfügen
    conn.execute("""
        INSERT INTO securities (uuid, name, ticker_symbol, retired, currency_code)
        VALUES ('sec-1', 'Test Security', 'ABC.DE', 0, 'EUR')
    """)
    conn.commit()
    conn.close()

    entry_id = "test_entry"
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry_id] = {
        "db_path": db_path,
        # Symbol-Mapping vorbereiten, damit Orchestrator nicht skippt
        "price_symbols": ["ABC.DE"],
        "price_symbol_map": {"ABC.DE": ["sec-1"]},
    }

    initialize_price_state(hass, entry_id)

    # Provider.fetch → leeres Dict (Total-Fehlschlag)
    async def _fake_fetch(self, symbols):
        return {}

    monkeypatch.setattr(YahooQueryProvider, "fetch", _fake_fetch)

    with caplog.at_level("WARNING"):
        meta = await _run_price_cycle(hass, entry_id)

    store = hass.data[DOMAIN][entry_id]
    # Meta-Objekt sollte quotes_returned == 0 widerspiegeln
    assert meta["quotes_returned"] == 0
    # Fehlerzähler > 0 (Total-Fehlschlag zählt als Fehler)
    assert store["price_error_counter"] > 0
    # WARN Log aufgetreten
    warn_matches = [r for r in caplog.records if "zero-quotes detected" in r.message]
    assert warn_matches, "Erwartete WARN Meldung für zero-quotes nicht gefunden"


@pytest.mark.asyncio
async def test_total_chunk_failure_counts_as_error(hass, tmp_path, monkeypatch, caplog):
    """
    Total-Fehlschlag Szenario:
      - Provider.fetch wirft für den einzigen Batch eine Exception.
      - Erwartung: 0 Quotes, Fehlerzähler >=1, changed=0, keine Events.
    """
    from custom_components.pp_reader.prices import price_service  # noqa: PLC0415

    entry_id = "fail1"
    db_path = _create_db_with_security(tmp_path, "secX", "FAILSYM", "EUR", None)
    _init_store(hass, entry_id, db_path, {"FAILSYM": ["secX"]})

    # Events sammeln (soll leer bleiben)
    pushed = []

    def fake_push(hass_, entry, data_type, payload):
        pushed.append((data_type, payload))

    monkeypatch.setattr(price_service, "_push_update", fake_push)

    # Revaluation stub (wird nicht aufgerufen da keine Änderungen)
    async def fake_reval(hass_, conn, uuids):
        return {"portfolio_values": None, "portfolio_positions": None}

    monkeypatch.setattr(price_service, "revalue_after_price_updates", fake_reval)

    # Provider.fetch → Exception (Chunk-Fehlschlag)
    async def failing_fetch(self, symbols):
        raise RuntimeError("Simulierter Chunk Fehler")

    monkeypatch.setattr(YahooQueryProvider, "fetch", failing_fetch)

    caplog.set_level(logging.WARNING)
    meta = await _run_price_cycle(hass, entry_id)

    assert meta["quotes_returned"] == 0, "Es dürfen keine Quotes zurückkehren"
    assert meta["changed"] == 0, "Keine Preisänderungen erwartet"
    assert meta["errors"] >= 1, "Fehlerzähler muss mindestens 1 sein (Chunk-Fehlschlag)"
    assert not pushed, "Es dürfen keine Events bei fehlenden Änderungen gesendet werden"

    # Sicherstellen, dass WARN für Chunk-Fehler geloggt wurde
    assert (
        "Chunk Fetch Fehler" in caplog.text
        or "Chunk-Fetch Fehler" in caplog.text
        or "Chunk Fetch" in caplog.text
    )
