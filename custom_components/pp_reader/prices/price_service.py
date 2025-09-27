"""
Preis-Orchestrator Basiszustand.

Dieses Modul legt ausschließlich die benötigten In-Memory State-Variablen für
den späteren Preis-Service an. Keine Fetch-/Cycle-Logik in diesem Schritt.

State-Variablen (hass.data[DOMAIN][entry_id]):
    price_lock: asyncio.Lock                -- Verhindert Overlap von Zyklen
    price_task_cancel: Callable | None      -- Cancel-Handle des Intervall-Tasks
    price_error_counter: int                -- Fehlerschläge in Folge
    price_currency_drift_logged: set[str]   -- Symbole mit bereits geloggter Drift-WARN

Weitere Variablen (z.B. für einmalige INFO Logs oder Watchdog) folgen in späteren Items.
"""

from __future__ import annotations

import asyncio
import logging
import sqlite3
import time
from collections import defaultdict
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from homeassistant.exceptions import HomeAssistantError

from custom_components.pp_reader.const import DOMAIN
from custom_components.pp_reader.data.db_access import get_transactions
from custom_components.pp_reader.data.sync_from_pclient import (
    _push_update,
    fetch_positions_for_portfolios,
)
from custom_components.pp_reader.logic.portfolio import (
    db_calculate_portfolio_purchase_sum,
    db_calculate_portfolio_value_and_count,
)
from custom_components.pp_reader.logic.securities import (
    db_calculate_current_holdings,
    db_calculate_holdings_value,
    db_calculate_sec_purchase_value,
)
from custom_components.pp_reader.prices.revaluation import revalue_after_price_updates
from custom_components.pp_reader.prices.yahooquery_provider import (
    CHUNK_SIZE,
    YahooQueryProvider,
    has_import_error,
)

if TYPE_CHECKING:
    from pathlib import Path

    from homeassistant.core import HomeAssistant

    from custom_components.pp_reader.prices.provider_base import Quote

WATCHDOG_DURATION_THRESHOLD_MS = 25_000
CONSECUTIVE_ERROR_THRESHOLD = 3
INVALID_SCALED_PRICE_ERROR = (
    "Ungültiger skalierten Preis (ensure_no_extra_persist Guard)"
)
ZERO_QUOTES_WARN_INTERVAL = 1_800
# Yahoo Finance benötigt teils >10s für große Chunks –
# 20s verhindern False-Timeouts.
PRICE_FETCH_TIMEOUT = 20

_LOGGER = logging.getLogger(__name__)


def initialize_price_state(hass: HomeAssistant, entry_id: str) -> None:
    """
    Initialisiert alle In-Memory State-Variablen für den Preis-Service.

    Legt keine Hintergrund-Tasks an (Scheduling erfolgt in __init__.py).
    Mehrfachaufruf (z.B. Reload) ist idempotent.
    """
    store = hass.data.setdefault(DOMAIN, {}).setdefault(entry_id, {})
    if "price_lock" not in store or not isinstance(
        store.get("price_lock"), asyncio.Lock
    ):
        store["price_lock"] = asyncio.Lock()
    # Cancel-Handle (Intervall) erst nach Scheduling gesetzt
    store.setdefault("price_task_cancel", None)
    store.setdefault("price_error_counter", 0)
    store.setdefault("price_currency_drift_logged", set())
    # Einmaliges INFO bei leerer Symbol-Liste pro Laufzeit
    store.setdefault("price_empty_symbols_logged", False)
    # Neu: Skip-INFO nur einmal (separat vom Discovery-INFO)
    store.setdefault("price_empty_symbols_skip_logged", False)
    # Optional: zuletzt verwendete Symbol-Mappings (Debug / Diagnose)
    store.setdefault("price_last_symbol_count", 0)
    store.setdefault("price_last_cycle_meta", {})


def build_symbol_mapping(db_path: Path) -> tuple[list[str], dict[str, list[str]]]:
    """
    Erzeugt ein Symbol-Mapping für aktive Securities.

    Returns
    -------
    (unique_symbols_sorted, mapping)

    """
    symbols_map: dict[str, list[str]] = defaultdict(list)
    unique_symbols: set[str] = set()
    with sqlite3.connect(str(db_path)) as conn:
        cur = conn.execute(
            """
            SELECT uuid, ticker_symbol
            FROM securities
            WHERE retired = 0
              AND ticker_symbol IS NOT NULL
              AND TRIM(ticker_symbol) != ''
            """
        )
        for uuid, ticker in cur.fetchall():
            ticker_norm = ticker.strip()
            if not ticker_norm:
                continue
            symbols_map[ticker_norm].append(uuid)
            unique_symbols.add(ticker_norm)

    symbols = sorted(unique_symbols)
    # Optional: Dedup (sollte bereits eindeutig sein)
    return symbols, dict(symbols_map)


def load_and_map_symbols(
    hass: HomeAssistant, entry_id: str, db_path: Path
) -> tuple[list[str], dict[str, list[str]]]:
    """Erzeuge das Symbolmapping und protokolliere leere Listen einmalig als INFO."""
    try:
        symbols, mapping = build_symbol_mapping(db_path)
    except (sqlite3.Error, ValueError):
        _LOGGER.warning("prices_cycle: Fehler beim Laden der Symbole", exc_info=True)
        return [], {}

    store = hass.data[DOMAIN][entry_id]
    if not symbols and not store.get("price_empty_symbols_logged"):
        message = (
            "prices_cycle: Keine aktiven Symbole gefunden - Preis-Service wartet "
            "(einmaliges Log)"
        )
        _LOGGER.info(message)
        store["price_empty_symbols_logged"] = True
    elif symbols:
        # Reset Flag falls nach Reload später doch Symbole existieren
        store["price_empty_symbols_logged"] = False

    store["price_last_symbol_count"] = len(symbols)
    return symbols, mapping


def _maybe_reset_error_counter(
    hass: HomeAssistant, entry_id: str, meta: dict[str, Any]
) -> None:
    """
    Setzt den Fehlerzähler nach einem erfolgreichen Zyklus zurück.

    Loggt einmalig den Reset.
    """
    store = hass.data[DOMAIN][entry_id]
    if meta.get("quotes_returned", 0) > 0:
        prev = store.get("price_error_counter", 0)
        if prev > 0:
            message = (
                "prices_cycle: Fehlerzähler nach erfolgreichem Zyklus zurückgesetzt "
                "(vorher=%s)"
            )
            _LOGGER.info(message, prev)
        store["price_error_counter"] = 0


# --- Change Detection Helpers -------------------------------------------------
def _utc_now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _load_old_prices(conn: sqlite3.Connection) -> dict[str, int]:
    """Lädt vorhandene last_price Werte für Change Detection."""
    cur = conn.execute(
        "SELECT uuid, last_price FROM securities WHERE last_price IS NOT NULL"
    )
    return {uuid: lp for uuid, lp in cur.fetchall() if lp is not None}


def _load_security_currencies(conn: sqlite3.Connection) -> dict[str, str | None]:
    cur = conn.execute("SELECT uuid, currency_code FROM securities")
    return dict(cur.fetchall())


def _detect_price_changes(
    quotes: list[Quote],
    symbol_map: dict[str, list[str]],
    existing_prices: dict[str, int],
) -> tuple[dict[str, int], set[str]]:
    """
    Ermittelt skalierte Preisänderungen (1e8) pro Security UUID.

    Rückgabe:
        (updates_dict, set_changed_uuids)
    """
    updates: dict[str, int] = {}
    changed: set[str] = set()

    # Gruppierung: Quote.symbol -> Quote Objekt
    # Erwartung: Jedes Symbol erscheint höchstens einmal.
    for q in quotes:
        sym = getattr(q, "symbol", None)
        if sym is None:
            continue
        target_uuids = symbol_map.get(sym, [])
        if not target_uuids:
            continue
        try:
            scaled_value = round(q.price * 1e8)
        except (ArithmeticError, TypeError, ValueError):
            continue
        if isinstance(scaled_value, int):
            scaled = scaled_value
        else:
            try:
                scaled = int(scaled_value)
            except (TypeError, ValueError):
                continue
        if scaled <= 0:
            # Defensive: sollte bereits vorher gefiltert sein
            continue

        for sec_uuid in target_uuids:
            prev = existing_prices.get(sec_uuid)
            if prev != scaled:
                updates[sec_uuid] = scaled
                changed.add(sec_uuid)

    return updates, changed


def _apply_price_updates(
    db_path: Path,
    updates: dict[str, int],
    fetched_at: str | None = None,
    source: str | None = None,
) -> int:
    """
    Persistiert nur geänderte Preise (transaktional).

    WICHTIG (ensure_no_extra_persist):
    Diese Funktion ist der einzige Persistenz-Pfad für Live-Quotes und DARF
    ausschließlich die drei freigegebenen Spalten der Tabelle 'securities'
    schreiben:
        - last_price (int, 1e8 skaliert)
        - last_price_source (TEXT)
        - last_price_fetched_at (UTC ISO8601, YYYY-MM-DDTHH:MM:SSZ)

    Keine weiteren Quote-Felder (volume, market_cap, 52W, dividend_yield,
    previous_close, currency etc.) werden hier oder an anderer Stelle
    persistiert. Ein zukünftiger Verstoß (z.B. Erweiterung des SQL) wäre ein
    Breaking Change für die bestätigte Spezifikation (.docs/nextGoals.md §23).

    Defensiver Schutz:
    - Assertions prüfen Typ & Wertebereich der übergebenen skalierten Preise.
    - SQL Statement listet explizit nur erlaubte Spalten (kein '*').

    Parameters
    ----------
    db_path : Path
        Datenbankpfad für die Verbindung.
    updates : dict[security_uuid, scaled_price]
        Zu persistierende, skalierte Preise.
    fetched_at : str | None
        Optionaler Timestamp für last_price_fetched_at (ISO UTC).
    source : str | None
        Optionaler Quellname für last_price_source.

    Returns
    -------
    int
        Anzahl aktualisierter Zeilen.

    """
    if not updates:
        return 0

    # Defensive Absicherung (nicht im Hot Path kritisch - geringe Anzahl Updates)
    for _sec, _val in updates.items():
        if not isinstance(_val, int) or _val <= 0:
            message = f"{INVALID_SCALED_PRICE_ERROR} uuid={_sec} value={_val!r}"
            raise ValueError(message)

    fetched_at = fetched_at or _utc_now_iso()
    source = source or "yahoo"
    updated_rows = 0
    with sqlite3.connect(str(db_path)) as conn:
        try:
            conn.execute("BEGIN")
            stmt = """
                UPDATE securities
                SET last_price=?, last_price_source=?, last_price_fetched_at=?
                WHERE uuid=? AND (last_price IS NULL OR last_price <> ?)
            """
            for sec_uuid, scaled in updates.items():
                cur = conn.execute(stmt, (scaled, source, fetched_at, sec_uuid, scaled))
                if cur.rowcount > 0:
                    updated_rows += 1
            conn.commit()
        except sqlite3.Error:
            conn.rollback()
            _LOGGER.warning(
                "prices_cycle: Fehler beim Persistieren der Preis-Updates",
                exc_info=True,
            )
            return 0
    return updated_rows


def _recalculate_portfolio_security_rows(
    db_path: Path, security_updates: dict[str, int]
) -> set[str]:
    """Recompute portfolio_securities rows for portfolios affected by updates."""

    impacted_securities = {sec for sec in security_updates if sec}
    if not impacted_securities:
        return set()

    try:
        with sqlite3.connect(str(db_path)) as conn:
            placeholders = ",".join("?" for _ in impacted_securities)
            query = (
                "SELECT portfolio_uuid, security_uuid "
                "FROM portfolio_securities "
                "WHERE security_uuid IN ("
                + placeholders
                + ")"
            )
            cur = conn.execute(query, tuple(impacted_securities))
            impacted_pairs = {
                (row[0], row[1])
                for row in cur.fetchall()
                if row[0] and row[1]
            }

            if not impacted_pairs:
                return set()

            impacted_portfolios = {pid for pid, _ in impacted_pairs}

            transactions = get_transactions(conn=conn)
            relevant_transactions = [
                tx
                for tx in transactions
                if tx.security in impacted_securities
                and tx.portfolio is not None
                and (tx.portfolio, tx.security) in impacted_pairs
            ]

            if not relevant_transactions:
                return impacted_portfolios

            current_holdings = db_calculate_current_holdings(relevant_transactions)
            purchase_values = db_calculate_sec_purchase_value(
                relevant_transactions, db_path
            )

            current_hold_pur: dict[tuple[str, str], dict[str, float]] = {}
            for key, holdings in current_holdings.items():
                purchase_val = purchase_values.get(key)
                if purchase_val is None:
                    continue
                current_hold_pur[key] = {
                    "current_holdings": holdings,
                    "purchase_value": purchase_val,
                }

            if not current_hold_pur:
                return impacted_portfolios

            holdings_values = db_calculate_holdings_value(
                db_path, conn, current_hold_pur
            )

            if not holdings_values:
                return impacted_portfolios

            try:
                conn.execute("BEGIN")
                for (portfolio_uuid, security_uuid), data in holdings_values.items():
                    current_holdings_val = data.get("current_holdings", 0)
                    purchase_value = float(data.get("purchase_value", 0) or 0)
                    current_value = float(data.get("current_value", 0) or 0)

                    conn.execute(
                        """
                        INSERT OR REPLACE INTO portfolio_securities (
                            portfolio_uuid,
                            security_uuid,
                            current_holdings,
                            purchase_value,
                            current_value
                        ) VALUES (?, ?, ?, ?, ?)
                        """,
                        (
                            portfolio_uuid,
                            security_uuid,
                            current_holdings_val,
                            int(round(purchase_value * 100)),
                            int(round(current_value * 100)),
                        ),
                    )
                conn.commit()
            except sqlite3.Error:
                conn.rollback()
                raise

            return impacted_portfolios
    except Exception:
        _LOGGER.warning(
            "prices_cycle: Fehler bei Aktualisierung von portfolio_securities",
            exc_info=True,
        )
        return set()


def _filter_invalid_updates(updates: dict[str, int]) -> dict[str, int]:
    """Entfernt Updates mit None oder <=0 (defensive Filterung)."""
    if not updates:
        return {}
    return {k: v for k, v in updates.items() if isinstance(v, int) and v > 0}


def _process_currency_drift_skip_none(
    _hass: HomeAssistant,
    _entry_id: str,
    _quotes: list[Quote],
    _symbol_map: dict[str, list[str]],
    _security_currencies: dict[str, str | None],
) -> None:
    """Filtert Quotes ohne Currency aus Drift-Prüfung heraus (kein Logging)."""
    # Einfacher Durchlauf - Funktion dient Klarheit / ToDO-Referenz
    # Keine Mutation; Rückgabe nicht notwendig (Selektion erfolgt im zweiten Schritt)
    return


def _process_currency_drift_mismatches(
    hass: HomeAssistant,
    entry_id: str,
    quotes: list[Quote],
    symbol_map: dict[str, list[str]],
    security_currencies: dict[str, str | None],
) -> None:
    """
    Loggt Currency Drift Warnungen genau einmal pro Symbol.

    Vergleich: Quote.currency vs persistierte currency_code (pro Security).
    """
    store = hass.data[DOMAIN][entry_id]
    drift_logged: set[str] = store.get("price_currency_drift_logged", set())

    for q in quotes:
        sym = getattr(q, "symbol", None)
        if sym is None or sym in drift_logged:
            continue
        quote_ccy = getattr(q, "currency", None)
        if quote_ccy is None:
            # Wird upstream nicht geprüft (skip_none_currency)
            continue

        # Prüfe alle Securities zum Symbol - falls irgendeine abweicht -> WARN
        mismatch = False
        sec_ccys: set[str] = set()
        for sec_uuid in symbol_map.get(sym, []):
            db_ccy = security_currencies.get(sec_uuid)
            if db_ccy:
                sec_ccys.add(db_ccy)
                if db_ccy != quote_ccy:
                    mismatch = True

        if mismatch:
            _LOGGER.warning(
                "prices_cycle: Currency Drift erkannt für Symbol %s "
                "(persistiert=%s, quote=%s)",
                sym,
                ",".join(sorted(sec_ccys)) or "unbekannt",
                quote_ccy,
            )
            drift_logged.add(sym)

    store["price_currency_drift_logged"] = drift_logged


def _build_portfolio_values_payload(pv_dict: dict[str, dict]) -> list[dict]:
    """
    Transformiert das Dict-Format der Revaluation in die erwartete Event-Payload.

    (Identisch zur File-Sync Struktur.)
    """
    payload: list[dict] = []
    for pid, data in pv_dict.items():
        try:
            value = round(float(data.get("value", 0.0) or 0.0), 2)
            purchase_sum = round(float(data.get("purchase_sum", 0.0) or 0.0), 2)
            gain_abs = round(value - purchase_sum, 2)
            gain_pct = round((gain_abs / purchase_sum * 100) if purchase_sum else 0.0, 2)
            payload.append(
                {
                    "uuid": pid,
                    "name": data.get("name", pid),
                    "position_count": data.get("count", 0) or 0,
                    "current_value": value,
                    "purchase_sum": purchase_sum,
                    "gain_abs": gain_abs,
                    "gain_pct": gain_pct,
                }
            )
        except (TypeError, ValueError):
            _LOGGER.debug(
                (
                    "prices_cycle: Fehler beim Aufbau der portfolio_values Zeile "
                    "pid=%s data=%r"
                ),
                pid,
                data,
                exc_info=True,
            )
    return payload


async def _run_price_cycle(hass: HomeAssistant, entry_id: str) -> dict[str, Any]:  # noqa: C901, PLR0912, PLR0915
    cycle_start_ts = time.time()
    store = hass.data[DOMAIN][entry_id]
    lock: asyncio.Lock = store.get("price_lock")  # type: ignore[assignment]
    if lock.locked():
        _LOGGER.debug(
            "prices_cycle: skip overlap (laufender Zyklus) entry_id=%s", entry_id
        )
        return {
            "symbols_total": 0,
            "batches": 0,
            "quotes_returned": 0,
            "changed": 0,
            "errors": store.get("price_error_counter", 0),
            "duration_ms": int((time.time() - cycle_start_ts) * 1000),
            "skipped_running": True,
        }

    async with lock:
        try:  # --- OUTER RESILIENCE GUARD ---
            db_path = store.get("db_path")
            symbols = store.get("price_symbols")

            # On-demand Autodiscovery
            if (not symbols) and db_path:
                symbols, symbol_map = load_and_map_symbols(hass, entry_id, db_path)
                store["price_symbols"] = symbols
                store["price_symbol_to_uuids"] = symbol_map

            if (not db_path) or (not symbols):
                # Zusatz-INFO beim ersten tatsächlichen Skip wegen leerer Liste
                if (
                    (not symbols)
                    and store.get("price_empty_symbols_logged")
                    and not store.get("price_empty_symbols_skip_logged")
                ):
                    skip_msg = (
                        "prices_cycle: Skip - keine Symbole vorhanden "
                        "(kein Fetch ausgeführt)"
                    )
                    _LOGGER.info(skip_msg)
                    store["price_empty_symbols_skip_logged"] = True
                _LOGGER.debug(
                    (
                        "prices_cycle: Skip (keine Symbole oder db_path fehlt) "
                        "entry_id=%s symbols=%s db=%s"
                    ),
                    entry_id,
                    len(symbols) if symbols else 0,
                    bool(db_path),
                )
                return {
                    "symbols_total": 0,
                    "batches": 0,
                    "quotes_returned": 0,
                    "changed": 0,
                    "errors": 0,
                    "duration_ms": int((time.time() - cycle_start_ts) * 1000),
                    "skipped_running": True,
                }

            prev_error_counter = store.get("price_error_counter", 0)
            store["price_error_counter"] = 0

            # --- Batch Bildung mit Provider-Konstante ---
            batches = [
                symbols[i : i + CHUNK_SIZE] for i in range(0, len(symbols), CHUNK_SIZE)
            ]
            batches_count = len(batches)

            provider = YahooQueryProvider()
            all_quotes: list[Quote] = []
            skipped_running = False
            chunk_failure_count = 0

            for idx, batch_symbols in enumerate(batches, start=1):
                _LOGGER.debug(
                    "prices_cycle: batch_start idx=%s/%s size=%s symbols=%s",
                    idx,
                    batches_count,
                    len(batch_symbols),
                    batch_symbols,
                )
                try:
                    quotes_dict = await asyncio.wait_for(
                        provider.fetch(batch_symbols), timeout=PRICE_FETCH_TIMEOUT
                    )
                except TimeoutError:
                    chunk_failure_count += 1
                    error_msg = (
                        "prices_cycle: Chunk Fetch Fehler (timeout) batch_size=%s "
                        "idx=%s"
                    )
                    _LOGGER.warning(
                        error_msg,
                        len(batch_symbols),
                        idx,
                        exc_info=True,
                    )
                    continue
                except Exception:  # noqa: BLE001 - Resilienz für unerwartete Providerfehler
                    chunk_failure_count += 1
                    error_msg = (
                        "prices_cycle: Chunk Fetch Fehler (exception) batch_size=%s "
                        "idx=%s"
                    )
                    _LOGGER.warning(
                        error_msg,
                        len(batch_symbols),
                        idx,
                        exc_info=True,
                    )
                    continue
                if not quotes_dict:
                    chunk_failure_count += 1
                    _LOGGER.debug(
                        "prices_cycle: batch_end idx=%s accepted=0 (leer/fehler)", idx
                    )
                    continue
                all_quotes.extend(quotes_dict.values())
                _LOGGER.debug(
                    "prices_cycle: batch_end idx=%s accepted=%s cumulative=%s",
                    idx,
                    len(quotes_dict),
                    len(all_quotes),
                )

            if chunk_failure_count:
                store["price_error_counter"] = (
                    store.get("price_error_counter", 0) + chunk_failure_count
                )
                _LOGGER.debug(
                    "prices_cycle: chunk_failures=%s error_counter=%s",
                    chunk_failure_count,
                    store["price_error_counter"],
                )

            if len(all_quotes) == 0:
                store["price_error_counter"] = store.get("price_error_counter", 0) + 1
                now_ts = time.time()
                last_warn = store.get("price_zero_quotes_warn_ts")
                if (
                    last_warn is None
                    or (now_ts - last_warn) >= ZERO_QUOTES_WARN_INTERVAL
                ):
                    warn_msg = (
                        "prices_cycle: Keine Quotes erhalten (total=0) - "
                        "Fehlerzähler=%s"
                    )
                    _LOGGER.warning(warn_msg, store["price_error_counter"])
                    store["price_zero_quotes_warn_ts"] = now_ts
                else:
                    _LOGGER.debug(
                        (
                            "prices_cycle: zero-quotes detected (WARN gedrosselt) -> "
                            "error_counter=%s"
                        ),
                        store["price_error_counter"],
                    )

            # --- Load existing prices and currencies ---
            existing_prices: dict[str, int] = {}
            security_currencies: dict[str, str | None] = {}
            try:
                with sqlite3.connect(str(db_path)) as conn:
                    existing_prices = _load_old_prices(conn)
                    security_currencies = _load_security_currencies(conn)
            except sqlite3.Error:
                warn_msg = (
                    "prices_cycle: Unerwarteter Fehler beim Laden bestehender Preise / "
                    "Währungen"
                )
                _LOGGER.warning(warn_msg, exc_info=True)

            # Drift
            _process_currency_drift_skip_none(
                hass,
                entry_id,
                all_quotes,
                store.get("price_symbol_to_uuids", {}),
                security_currencies,
            )
            _process_currency_drift_mismatches(
                hass,
                entry_id,
                all_quotes,
                store.get("price_symbol_to_uuids", {}),
                security_currencies,
            )

            # Change Detection
            scaled_updates, changed_security_uuids = _detect_price_changes(
                all_quotes, store.get("price_symbol_to_uuids", {}), existing_prices
            )
            detected_changes = len(changed_security_uuids)

            if scaled_updates and db_path:
                scaled_updates = _filter_invalid_updates(scaled_updates)
                if not scaled_updates:
                    changed_count = 0
                else:
                    fetched_at = _utc_now_iso()
                    updated_rows = _apply_price_updates(
                        db_path, scaled_updates, fetched_at=fetched_at, source="yahoo"
                    )
                    if updated_rows > 0:
                        refreshed = await hass.async_add_executor_job(
                            _recalculate_portfolio_security_rows,
                            db_path,
                            scaled_updates,
                        )
                        if refreshed and _LOGGER.isEnabledFor(logging.DEBUG):
                            _LOGGER.debug(
                                "prices_cycle: portfolio_securities aktualisiert (portfolios=%d)",
                                len(refreshed),
                            )
                    if updated_rows != detected_changes:
                        debug_msg = (
                            "prices_cycle: update_result mismatch detected=%s "
                            "updated=%s"
                        )
                        _LOGGER.debug(
                            debug_msg,
                            detected_changes,
                            updated_rows,
                        )
                    changed_count = updated_rows
            else:
                changed_count = 0

            revaluation_result = {"portfolio_values": None, "portfolio_positions": None}
            if changed_count > 0:
                updated_security_uuids_final = (
                    set(scaled_updates.keys()) if scaled_updates else set()
                )
                if updated_security_uuids_final:
                    try:
                        with sqlite3.connect(str(db_path)) as reval_conn:
                            revaluation_result = await revalue_after_price_updates(
                                hass, reval_conn, updated_security_uuids_final
                            )
                    except sqlite3.Error:
                        _LOGGER.warning(
                            "prices_cycle: Fehler bei partieller Revaluation",
                            exc_info=True,
                        )

            # Events
            if changed_count > 0:
                pv_dict = revaluation_result.get("portfolio_values") or {}

                # Fallback: Wenn Revaluation nichts liefert, aber Preise geändert,
                # aggregiere betroffene Portfolios direkt.
                if not pv_dict:
                    try:
                        affected_portfolios: set[str] = set()
                        with sqlite3.connect(str(db_path)) as conn:
                            for sec_uuid in scaled_updates:
                                cur = conn.execute(
                                    "SELECT DISTINCT portfolio_uuid "
                                    "FROM portfolio_securities "
                                    "WHERE security_uuid=?",
                                    (sec_uuid,),
                                )
                                affected_portfolios.update(r for (r,) in cur.fetchall())

                        if affected_portfolios:
                            fallback = {}
                            for pid in affected_portfolios:
                                try:
                                    val, cnt = await hass.async_add_executor_job(
                                        db_calculate_portfolio_value_and_count,
                                        pid,
                                        db_path,
                                    )
                                    purch = await hass.async_add_executor_job(
                                        db_calculate_portfolio_purchase_sum,
                                        pid,
                                        db_path,
                                    )
                                    fallback[pid] = {
                                        "name": pid,
                                        "value": val,
                                        "count": cnt,
                                        "purchase_sum": purch,
                                    }
                                except (
                                    HomeAssistantError,
                                    sqlite3.Error,
                                    ValueError,
                                    TypeError,
                                ):
                                    _LOGGER.debug(
                                        (
                                            "prices_cycle: Fehler im Fallback-Aggregat "
                                            "pid=%s"
                                        ),
                                        pid,
                                        exc_info=True,
                                    )
                            if fallback:
                                pv_dict = fallback
                                fallback_msg = (
                                    "prices_cycle: Revaluation leer - Fallback "
                                    "Aggregation genutzt (portfolios=%d)"
                                )
                                _LOGGER.debug(fallback_msg, len(fallback))
                    except sqlite3.Error:
                        _LOGGER.debug(
                            "prices_cycle: Fallback Aggregation fehlgeschlagen",
                            exc_info=True,
                        )

                if pv_dict:
                    try:
                        pv_payload = _build_portfolio_values_payload(pv_dict)

                        # Diff-Logging (alter vs neuer Wert) - nur DEBUG
                        if _LOGGER.isEnabledFor(logging.DEBUG):
                            try:
                                with sqlite3.connect(str(db_path)) as diff_conn:
                                    present: set[str] = set()
                                    for pid in pv_dict:
                                        cur = diff_conn.execute(
                                            "SELECT 1 FROM portfolios WHERE uuid=?",
                                            (pid,),
                                        )
                                        if cur.fetchone():
                                            present.add(pid)
                                for row in pv_payload:
                                    pid = row["uuid"]
                                    if pid not in present:
                                        warn_msg = (
                                            "prices_cycle: pv_event WARN fehlendes "
                                            "Portfolio in DB pid=%s"
                                        )
                                        _LOGGER.debug(warn_msg, pid)
                            except sqlite3.Error:
                                _LOGGER.debug(
                                    "prices_cycle: Diff-Check Fehler", exc_info=True
                                )

                        if pv_payload:
                            _LOGGER.debug(
                                (
                                    "prices_cycle: pv_event push count=%d "
                                    "changed_secs=%d payload=%s"
                                ),
                                len(pv_payload),
                                detected_changes,
                                pv_payload,
                            )
                            _push_update(hass, entry_id, "portfolio_values", pv_payload)
                        else:
                            _LOGGER.warning(
                                (
                                    "prices_cycle: Geänderte Preise (%s) aber leere "
                                    "pv_payload nach Transformation"
                                ),
                                changed_count,
                            )
                    except (HomeAssistantError, ValueError):
                        _LOGGER.warning(
                            "prices_cycle: Fehler beim portfolio_values Event-Push",
                            exc_info=True,
                        )

                else:
                    _LOGGER.debug(
                        (
                            "prices_cycle: Keine portfolio_values (revaluation leer) "
                            "obwohl changed=%s"
                        ),
                        changed_count,
                    )

                # Positions: reuse falls vorhanden, sonst load
                try:
                    positions_map = revaluation_result.get("portfolio_positions")
                    if not positions_map and pv_dict:
                        # Fallback positions (synchroner Loader)
                        affected = set(pv_dict.keys())
                        positions_map = fetch_positions_for_portfolios(
                            db_path, affected
                        )
                    if positions_map:
                        for pid, positions in positions_map.items():
                            _push_update(
                                hass,
                                entry_id,
                                "portfolio_positions",
                                {"portfolio_uuid": pid, "positions": positions},
                            )
                    else:
                        _LOGGER.debug(
                            "prices_cycle: Keine positions_map (skip push) changed=%s",
                            changed_count,
                        )
                except (HomeAssistantError, sqlite3.Error, ValueError):
                    _LOGGER.warning(
                        "prices_cycle: Fehler beim Push portfolio_positions",
                        exc_info=True,
                    )
            meta = {
                "symbols_total": len(symbols),
                "batches": batches_count,
                "quotes_returned": len(all_quotes),
                "changed": changed_count,
                "errors": store.get("price_error_counter", 0),
                "duration_ms": int((time.time() - cycle_start_ts) * 1000),
                "skipped_running": skipped_running,
            }

            try:
                _LOGGER.info(
                    (
                        "prices_cycle symbols=%s batches=%s returned=%s changed=%s "
                        "errors=%s duration=%sms skipped_running=%s"
                    ),
                    meta["symbols_total"],
                    meta["batches"],
                    meta["quotes_returned"],
                    meta["changed"],
                    meta["errors"],
                    meta["duration_ms"],
                    meta["skipped_running"],
                )
            except (TypeError, ValueError):
                _LOGGER.debug("prices_cycle: INFO Log fehlgeschlagen", exc_info=True)

            if (
                not meta.get("skipped_running")
                and isinstance(meta.get("duration_ms"), int)
                and meta["duration_ms"] > WATCHDOG_DURATION_THRESHOLD_MS
            ):
                _LOGGER.warning(
                    (
                        "prices_cycle: Watchdog-Schwelle überschritten "
                        "(duration_ms=%s >%s)"
                    ),
                    meta["duration_ms"],
                    WATCHDOG_DURATION_THRESHOLD_MS,
                )

            if (
                not skipped_running
                and store.get("price_error_counter", 0) >= CONSECUTIVE_ERROR_THRESHOLD
                and len(all_quotes) == 0
            ):
                _LOGGER.warning(
                    (
                        "prices_cycle: Wiederholte Fehlschläge (error_counter=%s >=%s) "
                        "- weiterhin keine gültigen Quotes"
                    ),
                    store["price_error_counter"],
                    CONSECUTIVE_ERROR_THRESHOLD,
                )

            if has_import_error() and not store.get("price_provider_disabled"):
                store["price_provider_disabled"] = True
                _LOGGER.error(
                    (
                        "prices_cycle: yahooquery Importfehler erkannt - Live-Preis "
                        "Feature deaktiviert (entry_id=%s)"
                    ),
                    entry_id,
                )

            if prev_error_counter > 0 and len(all_quotes) > 0:
                _LOGGER.info(
                    "prices_cycle: Fehlerzähler zurückgesetzt (previous=%s)",
                    prev_error_counter,
                )
        except Exception:
            # Increment error counter & return safe meta
            store["price_error_counter"] = store.get("price_error_counter", 0) + 1
            _LOGGER.exception("prices_cycle: Unerwarteter Ausnahmefehler im Zyklus")
            return {
                "symbols_total": store.get("price_last_symbol_count", 0),
                "batches": 0,
                "quotes_returned": 0,
                "changed": 0,
                "errors": store.get("price_error_counter", 0),
                "duration_ms": int((time.time() - cycle_start_ts) * 1000),
                "skipped_running": False,
            }
        else:
            return meta
