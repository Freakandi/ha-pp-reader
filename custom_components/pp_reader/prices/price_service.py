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
from pathlib import Path
from typing import Any
import sqlite3
from datetime import datetime

from ..const import DOMAIN
from .provider_base import Quote
from .symbols import load_active_security_symbols
from .revaluation import revalue_after_price_updates
from ..data.sync_from_pclient import (
    _push_update,
    fetch_positions_for_portfolios,
)  # Reuse bestehender Event-Push & Positions-Loader
from .yahooquery_provider import YahooQueryProvider, has_import_error

_LOGGER = logging.getLogger(__name__)


def initialize_price_state(hass, entry_id: str) -> None:
    """
    Initialisiert (idempotent) den Preis-Service Grundzustand für einen Config Entry.

    Aufrufzeitpunkt:
        - Beim Setup des Integrations-Eintrags vor Start des ersten Preiszyklus.

    Mutiert:
        hass.data[DOMAIN][entry_id] (legt fehlende Keys an, überschreibt nicht vorhandene).
    """
    store: dict[str, Any] = hass.data.setdefault(DOMAIN, {}).setdefault(entry_id, {})

    if "price_lock" not in store:
        store["price_lock"] = asyncio.Lock()
        _LOGGER.debug("Preis-Service: price_lock initialisiert")

    if "price_task_cancel" not in store:
        store["price_task_cancel"] = None

    if "price_error_counter" not in store:
        store["price_error_counter"] = 0

    if "price_currency_drift_logged" not in store:
        store["price_currency_drift_logged"] = set()

    # NEU: Flag für einmaliges INFO-Log bei leerer Symbol-Liste
    if "price_empty_symbols_logged" not in store:
        store["price_empty_symbols_logged"] = False

    # NEU: Timestamp der letzten Zero-Quotes WARN (Epoch Sekunden)
    if "price_zero_quotes_warn_ts" not in store:
        store["price_zero_quotes_warn_ts"] = None

    # NEU: Flag ob Provider (yahooquery) deaktiviert wurde (Importfehler)
    if "price_provider_disabled" not in store:
        store["price_provider_disabled"] = False

    _LOGGER.debug(
        "Preis-Service State bereit (entry_id=%s, keys=%s)",
        entry_id,
        [k for k in store.keys() if k.startswith("price_")],
    )


def build_symbol_mapping(db_path: Path) -> tuple[list[str], dict[str, list[str]]]:
    """
    Erzeugt eine eindeutige Symbol-Liste sowie ein Mapping symbol -> [security_uuids].

    Regeln laut Spezifikation (Symbol Autodiscovery):
      - Case-Preservation (Symbol unverändert).
      - Stabiler Ordnungserhalt: Reihenfolge des ersten Auftretens.
      - Deduplikation: Ein Symbol nur einmal in der Rückgabeliste.
      - Alle Securities mit identischem ticker_symbol werden in die UUID-Liste aufgenommen.

    Rückgabe:
        (symbols, mapping)
        symbols: list[str] eindeutige Symbole in stabiler Reihenfolge
        mapping: dict[str, list[str]] symbol -> zugehörige Security UUIDs
    """
    rows = load_active_security_symbols(
        db_path
    )  # [(uuid, symbol), ...] (bereits sortiert)
    symbols: list[str] = []
    mapping: dict[str, list[str]] = {}

    for uuid, symbol in rows:
        if symbol not in mapping:
            mapping[symbol] = []
            symbols.append(symbol)
        mapping[symbol].append(uuid)

    total_uuids = sum(len(v) for v in mapping.values())
    _LOGGER.debug(
        "Symbol Mapping erstellt: %d eindeutige Symbole, %d zugewiesene Securities",
        len(symbols),
        total_uuids,
    )
    return symbols, mapping


def load_and_map_symbols(
    hass, entry_id: str, db_path: Path
) -> tuple[list[str], dict[str, list[str]]]:
    """
    Lädt und mappt Symbole (einmalige INFO bei leerer Liste pro Laufzeit).

    Rückgabe:
        (symbols, mapping) wie build_symbol_mapping
    """
    symbols, mapping = build_symbol_mapping(db_path)
    store = hass.data.get(DOMAIN, {}).get(entry_id, {})

    if not symbols:
        if not store.get("price_empty_symbols_logged", False):
            _LOGGER.info(
                "Preis-Service: Keine aktiven Symbole gefunden – Live-Preis-Feature inaktiv bis Symbole verfügbar."
            )
            store["price_empty_symbols_logged"] = True
        else:
            _LOGGER.debug("Preis-Service: Symbol-Liste leer (bereits geloggt).")
    return symbols, mapping


def _maybe_reset_error_counter(hass, entry_id: str, meta: dict) -> None:
    """
    Setzt den Fehlerzähler (price_error_counter) nach erstem erfolgreichen Zyklus zurück.

    Bedingungen:
    - Es wurden ≥1 Quotes verarbeitet (quotes_returned > 0)
    - Der aktuelle Zyklus hat keine neuen Fehler (meta['errors'] == 0)
    - Der bisherige Fehlerzähler > 0
    """
    try:
        domain_state = hass.data.get(DOMAIN, {}).get(entry_id, {})
        counter = domain_state.get("price_error_counter")
        if (
            counter
            and counter > 0
            and meta.get("quotes_returned", 0) > 0
            and meta.get("errors", 0) == 0
        ):
            domain_state["price_error_counter"] = 0
            _LOGGER.info("prices_cycle: error_counter_reset previous=%s now=0", counter)
    except Exception:  # defensive: Reset darf nie den Zyklus stören
        _LOGGER.debug("Konnte error counter nicht resetten", exc_info=True)


# --- Change Detection Helpers -------------------------------------------------
def _utc_now_iso() -> str:
    """
    Liefert aktuellen UTC Zeitstempel ohne Mikrosekunden im Format
    YYYY-MM-DDTHH:MM:SSZ (Konsistenz-Anforderung).
    """
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def _load_old_prices(conn: sqlite3.Connection) -> dict[str, int]:
    """
    Lädt bestehende last_price Werte aller Securities aus der DB.

    Rückgabe:
        Dict[security_uuid, last_price_int] (Integer in 1e-8 Skalierung)
        Fehlende oder NULL last_price Einträge werden als 0 interpretiert,
        um einen klaren Vergleich zu ermöglichen (0 bedeutet "kein persistierter Preis").

    Fehler:
        Bei SQL-Fehlern wird ein leeres Dict zurückgegeben (WARN Log),
        damit der Zyklus weiterlaufen kann (fehlertolerant).
    """
    try:
        cur = conn.execute("SELECT uuid, last_price FROM securities")
        result: dict[str, int] = {}
        for uuid, last_price in cur.fetchall():
            # last_price kann None sein → als 0 behandeln
            result[uuid] = int(last_price) if last_price is not None else 0
        return result
    except sqlite3.Error:
        _LOGGER.warning("Konnte bestehende last_price Werte nicht laden", exc_info=True)
        return {}


def _load_security_currencies(conn: sqlite3.Connection) -> dict[str, str | None]:
    """
    Lädt die persistierten currency_code Werte aller Securities.

    Rückgabe:
        Dict[security_uuid, currency_code or None]
    Fehler:
        Bei SQL-Fehler → leeres Dict (fehlertolerant).
    """
    try:
        cur = conn.execute("SELECT uuid, currency_code FROM securities")
        return {uuid: curr for uuid, curr in cur.fetchall()}
    except sqlite3.Error:
        _LOGGER.warning("Konnte currency_code Werte nicht laden", exc_info=True)
        return {}


def _detect_price_changes(
    quotes: list[Quote],
    symbol_map: dict[str, list[str]],
    existing_prices: dict[str, int],
) -> tuple[dict[str, int], set[str]]:
    """
    Skalierung (Bankers Rounding) & Diff-Ermittlung.

    Rückgabe:
        (updates_dict, changed_security_uuids)

    Bedeutungen:
        updates_dict: uuid -> neuer skalierter Preis (nur bei Änderung)
        changed_security_uuids: Menge aller Securities mit Preisänderung

    Keine DB-Schreiboperation – erfolgt in separat umgesetztem Schritt
    (selective_update).
    """
    updates: dict[str, int] = {}
    changed: set[str] = set()

    for q in quotes:
        # Provider filtert price <= 0 bereits; defensive Guard
        if q.price is None or q.price <= 0:
            continue
        scaled = int(round(q.price * 1e8))  # Bankers Rounding
        uuids = symbol_map.get(q.symbol, [])
        for sec_uuid in uuids:
            old_val = existing_prices.get(sec_uuid, 0)
            if old_val != scaled:
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
    Persistiert nur geänderte Preise transaktional.

    Jetzt: Aktualisiert last_price (+ last_price_fetched_at, + last_price_source wenn übergeben).
    Folgende Items können noch ergänzen:
        - skip_invalid_prices: zusätzliche Guard-Filter (defensiv)

    Args:
        db_path: Pfad zur DB
        updates: uuid -> skalierter Preis
        fetched_at: ISO Timestamp (UTC, ohne ms, mit 'Z')
        source: Provider Source (z.B. 'yahoo')

    Rückgabe:
        Anzahl geänderter Zeilen
    """
    if not updates:
        return 0
    try:
        conn = sqlite3.connect(str(db_path))
    except sqlite3.Error:
        _LOGGER.warning("price_update: DB Verbindung fehlgeschlagen", exc_info=True)
        return 0

    try:
        conn.execute("BEGIN")
        if fetched_at is not None and source is not None:
            params = [
                (price, fetched_at, source, uuid) for uuid, price in updates.items()
            ]
            conn.executemany(
                "UPDATE securities SET last_price=?, last_price_fetched_at=?, last_price_source=? WHERE uuid=?",
                params,
            )
        elif fetched_at is not None:
            # Fallback falls source nicht übergeben (sollte nicht vorkommen nach Implementierung dieses Items)
            params = [(price, fetched_at, uuid) for uuid, price in updates.items()]
            conn.executemany(
                "UPDATE securities SET last_price=?, last_price_fetched_at=? WHERE uuid=?",
                params,
            )
        else:
            params = [(price, uuid) for uuid, price in updates.items()]
            conn.executemany(
                "UPDATE securities SET last_price=? WHERE uuid=?",
                params,
            )
        conn.commit()
        return len(updates)
    except sqlite3.Error:
        _LOGGER.warning(
            "price_update: Fehler beim Aktualisieren der Preise (Rollback)",
            exc_info=True,
        )
        try:
            conn.rollback()
        except Exception:
            pass
        return 0
    finally:
        conn.close()


def _filter_invalid_updates(updates: dict[str, int]) -> dict[str, int]:
    """
    Defensive Filterung bereits skalierter Preis-Updates.

    Entfernt Einträge mit Wert <= 0 (oder None – sollte nicht vorkommen).
    Rückgabe: Gefiltertes Dict (neues Objekt, Original bleibt unverändert).
    """
    if not updates:
        return updates
    filtered = {u: p for u, p in updates.items() if p is not None and p > 0}
    if len(filtered) != len(updates):
        _LOGGER.debug(
            "prices_cycle: filtered invalid updates removed=%s total_before=%s",
            len(updates) - len(filtered),
            len(updates),
        )
    return filtered


def _process_currency_drift_skip_none(
    hass,
    entry_id: str,
    quotes: list[Quote],
    symbol_map: dict[str, list[str]],
    security_currencies: dict[str, str | None],
):
    """
    Vorbereitender Schritt für Currency Drift Handling.

    Dieses Item (skip_none_currency) garantiert ausschließlich, dass Quotes
    ohne Currency (currency is None) vollständig von der Drift-Betrachtung
    ausgeschlossen werden. Aktuell keine WARN-Ausgaben.

    Folgeschritt (drift_once) ergänzt:
        - Vergleich quote.currency vs security_currencies[uuid]
        - WARN einmal pro Symbol
        - Nutzung des Caches price_currency_drift_logged
    """
    if not quotes or not symbol_map or not security_currencies:
        return

    for q in quotes:
        if q.currency is None:
            # DEBUG nur falls Currency fehlt – dokumentiert Skip-Verhalten
            _LOGGER.debug("currency_drift: skip symbol=%s (currency None)", q.symbol)
            continue
        # TODO (drift_once): Mismatch-Erkennung + einmalige WARN hier ergänzen
        # Platz bewusst nicht mit zusätzlicher Logik gefüllt (Minimalscope dieses Items)


def _process_currency_drift_mismatches(
    hass,
    entry_id: str,
    quotes: list[Quote],
    symbol_map: dict[str, list[str]],
    security_currencies: dict[str, str | None],
):
    """
    Currency Drift Mismatch Detection (einmalige WARN pro Symbol).

    Bedingungen für WARN:
        - Quote.currency vorhanden (nicht None – vorher schon gefiltert)
        - Mindestens eine zugeordnete Security besitzt ein persistiertes currency_code (nicht None)
        - currency_code != quote.currency
        - Für dieses Symbol wurde noch keine Drift-WARN geloggt (Once-Log via Set)

    State:
        Verwendet hass.data[DOMAIN][entry_id]['price_currency_drift_logged'] (Set[str])
        zum Merken bereits geloggter Symbole.
    """
    if not quotes or not symbol_map or not security_currencies:
        return

    store = hass.data[DOMAIN][entry_id]
    logged: set[str] = store.setdefault("price_currency_drift_logged", set())

    for q in quotes:
        if q.currency is None:
            continue  # Bereits durch vorherige Phase dokumentiert
        if q.symbol in logged:
            continue

        uuids = symbol_map.get(q.symbol, [])
        mismatch_found = False
        for sec_uuid in uuids:
            persisted = security_currencies.get(sec_uuid)
            if persisted and persisted != q.currency:
                mismatch_found = True
                break

        if mismatch_found:
            _LOGGER.warning(
                "currency_drift: Symbol %s QuoteCurrency=%s mismatch persisted=%s (erste WARN – weitere unterdrückt)",
                q.symbol,
                q.currency,
                persisted,
            )
            logged.add(q.symbol)


async def _run_price_cycle(hass, entry_id: str):
    cycle_start_ts = time.time()
    store = hass.data[DOMAIN][entry_id]

    # Overlap / laufender Zyklus?
    lock: asyncio.Lock = store.get("price_lock")  # type: ignore
    if lock.locked():
        _LOGGER.debug("prices_cycle: skip overlap (laufender Zyklus) entry_id=%s", entry_id)
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
        # Schritt: Symbole in Batches vorbereiten (wie bisher)
        db_path = store.get("db_path")
        symbols = store.get("price_symbols")
        if not symbols or not db_path:
            _LOGGER.warning(
                "prices_cycle: Keine gültigen Symbole oder DB-Pfad gefunden (skipped_running)",
                exc_info=True,
            )
            # State zurücksetzen für nächsten Zyklus (um hängende Zustände zu vermeiden)
            store["price_task_cancel"] = None
            store["price_error_counter"] = 0
            return {
                "symbols_total": 0,
                "batches": 0,
                "quotes_returned": 0,
                "changed": 0,
                "errors": 0,
                "duration_ms": 0,
                "skipped_running": True,
            }

        # NEU (error_counter_reset_log): Vor Reset alten Wert merken
        prev_error_counter = store.get("price_error_counter", 0)

        # NEU: Chunk-Fehlerzähler zurücksetzen (bisheriges Verhalten unverändert)
        store["price_error_counter"] = 0

        # Batches bilden (wie bisher)
        batches: list[list[str]] = []
        batch_size = 10  # Beispielgröße, anpassen je nach Bedarf
        for i in range(0, len(symbols), batch_size):
            batches.append(symbols[i : i + batch_size])

        all_quotes: list[Quote] = []
        skipped_running = False
        error_count = 0

        # --- NEU: Fehlerbehandlung auf Chunk-Ebene (innerhalb der Batch-Schleife) ---
        chunk_failure_count = 0
        # Batch-Schleife mit DEBUG Logs
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
                    provider.fetch(batch_symbols), timeout=10
                )
            except Exception:
                chunk_failure_count += 1
                _LOGGER.warning(
                    "prices_cycle: Chunk Fetch Fehler (timeout/exception) batch_size=%s idx=%s",
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

            # ...existing code converting quotes_dict -> Quote Objekte...
            for q in quotes_dict.values():
                all_quotes.append(q)

            _LOGGER.debug(
                "prices_cycle: batch_end idx=%s accepted=%s cumulative=%s",
                idx,
                len(quotes_dict),
                len(all_quotes),
            )
        # ...existing code continues (Fehlerzähler, Zero-Quotes etc.)...

        # NEU: Fehlerzähler um Chunk-Fehlschläge erhöhen (separat von Zero-Quotes Logik)
        if chunk_failure_count:
            store["price_error_counter"] = store.get("price_error_counter", 0) + chunk_failure_count
            _LOGGER.debug(
                "prices_cycle: chunk_failures=%s error_counter=%s",
                chunk_failure_count,
                store["price_error_counter"],
            )

        # Nach Batch-Fetching: Fehlerfall wenn absolut 0 valide Quotes
        if not skipped_running:
            if len(all_quotes) == 0:
                store = hass.data[DOMAIN][entry_id]
                store["price_error_counter"] = store.get("price_error_counter", 0) + 1

                # Dedup: WARN höchstens 1x pro 30 Minuten
                now_ts = time.time()
                last_warn = store.get("price_zero_quotes_warn_ts")
                if last_warn is None or (now_ts - last_warn) >= 1800:
                    _LOGGER.warning(
                        "prices_cycle: Keine Quotes erhalten (total=0) – Fehlerzähler=%s",
                        store["price_error_counter"],
                    )
                    store["price_zero_quotes_warn_ts"] = now_ts
                else:
                    _LOGGER.debug(
                        "prices_cycle: zero-quotes detected (WARN gedrosselt) -> error_counter=%s",
                        store["price_error_counter"],
                    )
                # Change Detection läuft weiter; kein Abbruch

        # Schritt: Alte Preise laden (Grundlage für Change Detection) + Währungs-Mapping
        db_path = hass.data.get(DOMAIN, {}).get(entry_id, {}).get("db_path")
        existing_prices: dict[str, int] = {}
        security_currencies: dict[str, str | None] = {}
        if db_path:
            try:
                with sqlite3.connect(str(db_path)) as conn:
                    existing_prices = _load_old_prices(conn)
                    security_currencies = _load_security_currencies(conn)
                _LOGGER.debug(
                    "prices_cycle: bestehende Preise geladen count=%s",
                    len(existing_prices),
                )
            except Exception:
                _LOGGER.warning(
                    "prices_cycle: Unerwarteter Fehler beim Laden bestehender Preise / Währungen",
                    exc_info=True,
                )
        else:
            _LOGGER.debug(
                "prices_cycle: Kein db_path im State gefunden – überspringe Preis-Load"
            )

        # Schritt: Currency Drift (Teil 1) – Nur Skip für fehlende Currency
        try:
            _process_currency_drift_skip_none(
                hass,
                entry_id,
                all_quotes,
                symbol_to_uuids,
                security_currencies,
            )
            # NEU: Mismatch-Erkennung + Once-WARN
            _process_currency_drift_mismatches(
                hass,
                entry_id,
                all_quotes,
                symbol_to_uuids,
                security_currencies,
            )
        except Exception:
            _LOGGER.warning(
                "prices_cycle: Fehler in currency drift (mismatch phase)",
                exc_info=True,
            )

        # Schritt: Skalierung & Change Detection (In-Memory)
        try:
            scaled_updates, changed_security_uuids = _detect_price_changes(
                all_quotes, symbol_to_uuids, existing_prices
            )
            detected_changes = len(changed_security_uuids)
            _LOGGER.debug(
                "prices_cycle: change_detection finished detected_updates=%s",
                detected_changes,
            )
        except Exception:
            _LOGGER.warning(
                "prices_cycle: Fehler in Change Detection (Skalierung)",
                exc_info=True,
            )
            scaled_updates = {}
            changed_security_uuids = set()
            detected_changes = 0

        # Schritt: Transaktionales Update nur geänderter UUIDs
        # (Erweitert um Timestamp + Source; jetzt mit zusätzlicher defensiver Filterung)
        if scaled_updates and db_path:
            # Defensive Filter (Item skip_invalid_prices)
            scaled_updates = _filter_invalid_updates(scaled_updates)
            if not scaled_updates:
                # Alle Updates herausgefiltert → keine Änderung mehr
                changed_count = 0
            else:
                fetched_at = _utc_now_iso()
                updated_rows = _apply_price_updates(
                    db_path, scaled_updates, fetched_at=fetched_at, source="yahoo"
                )
                if updated_rows != detected_changes:
                    _LOGGER.debug(
                        "prices_cycle: update_result mismatch detected=%s updated=%s",
                        detected_changes,
                        updated_rows,
                    )
                changed_count = updated_rows
        else:
            changed_count = 0

        # Schritt: Revaluation (partiell) nur wenn es tatsächliche Updates gab
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
                except Exception:
                    _LOGGER.warning(
                        "prices_cycle: Fehler in partielle Revaluation",
                        exc_info=True,
                    )

        # Event-Push (only_on_change): Nur senden wenn mindestens eine Preisänderung UND Revaluation Werte lieferte
        if changed_count > 0:
            pv_dict = revaluation_result.get("portfolio_values") or {}
            if pv_dict:
                try:
                    # 1. portfolio_values Event (Array-Format wie File-Sync Pfad)
                    portfolio_values_payload = [
                        {
                            "uuid": pid,
                            "name": pdata.get("name", pid),
                            "position_count": pdata.get("count", 0),
                            "current_value": round(pdata.get("value", 0.0), 2),
                            "purchase_sum": round(pdata.get("purchase_sum", 0.0), 2),
                        }
                        for pid, pdata in pv_dict.items()
                    ]
                    if portfolio_values_payload:
                        _push_update(
                            hass,
                            entry_id,
                            "portfolio_values",
                            portfolio_values_payload,
                        )
                        _LOGGER.debug(
                            "prices_cycle: 📡 portfolio_values Event gesendet count=%s",
                            len(portfolio_values_payload),
                        )

                        # 2. Positions pro betroffenem Portfolio (granular) – Reuse bestehender Helper
                        affected_portfolios = {p["uuid"] for p in portfolio_values_payload}
                        try:
                            positions_map = await hass.async_add_executor_job(
                                fetch_positions_for_portfolios,
                                db_path,
                                affected_portfolios,
                            )
                            empty_lists = [
                                pid for pid, pos in positions_map.items() if not pos
                            ]
                            if empty_lists:
                                _LOGGER.debug(
                                    "prices_cycle: %d Portfolios ohne Positionen (werden trotzdem gesendet) %s",
                                    len(empty_lists),
                                    empty_lists[:10],
                                )

                            for pid, positions in positions_map.items():
                                try:
                                    _push_update(
                                        hass,
                                        entry_id,
                                        "portfolio_positions",
                                        {
                                            "portfolio_uuid": pid,
                                            "positions": positions,
                                        },
                                    )
                                    _LOGGER.debug(
                                        "prices_cycle: 📡 portfolio_positions Event %s (%d Positionen)",
                                        pid,
                                        len(positions),
                                    )
                                except Exception:
                                    _LOGGER.exception(
                                        "prices_cycle: Fehler beim Senden portfolio_positions für %s",
                                        pid,
                                    )
                        except Exception:
                            _LOGGER.warning(
                                "prices_cycle: Fehler beim Laden der Positionsdaten für Event-Push",
                                exc_info=True,
                            )
                except Exception:
                    _LOGGER.warning(
                        "prices_cycle: Fehler im Event-Push (portfolio_values / positions)",
                        exc_info=True,
                    )
            else:
                _LOGGER.debug(
                    "prices_cycle: Keine betroffenen Portfolios trotz Preisänderungen (kein Event-Push)."
                )

        # TODO (order_values_then_positions): Feinjustierung Reihenfolge/Batching falls später benötigt
        # TODO (events_filter_future): Optionaler Filter nur bei Netto-Portfoliowert-Änderung (Phase 2)

        meta = {
            "symbols_total": total_symbols,
            "batches": batches_count,
            "quotes_returned": len(all_quotes),
            "changed": changed_count,
            "errors": store.get("price_error_counter", 0),
            "duration_ms": int((time.time() - cycle_start_ts) * 1000) if 'cycle_start_ts' in locals() else 0,
            "skipped_running": skipped_running,
        }

        # --- NEU: INFO Zyklus-Metadaten Log (info_cycle Item) ---------------------
        try:
            _LOGGER.info(
                "prices_cycle symbols=%s batches=%s returned=%s changed=%s errors=%s duration=%sms skipped_running=%s",
                meta["symbols_total"],
                meta["batches"],
                meta["quotes_returned"],
                meta["changed"],
                meta["errors"],
                meta["duration_ms"],
                meta["skipped_running"],
            )
        except Exception:  # Sollte nie passieren; verhindert Log-Abbruch
            _LOGGER.debug("prices_cycle: INFO Log fehlgeschlagen", exc_info=True)
        # --------------------------------------------------------------------------

        # --- NEU: Wiederholte Fehler WARN (ab 3 aufeinanderfolgenden Fehl-Ereignissen) ---
        # Bedingung: error_counter >=3 UND in diesem Zyklus keine Quotes (total 0) UND Zyklus nicht übersprungen
        if (
            not skipped_running
            and store.get("price_error_counter", 0) >= 3
            and len(all_quotes) == 0
        ):
            _LOGGER.warning(
                "prices_cycle: Wiederholte Fehlschläge (error_counter=%s ≥3) – weiterhin keine gültigen Quotes",
                store["price_error_counter"],
            )
        # -------------------------------------------------------------------------------

        # --- NEU: Provider-Importfehler nach erstem Zyklus erkennen & deaktivieren ---
        if has_import_error() and not store.get("price_provider_disabled"):
            store["price_provider_disabled"] = True
            _LOGGER.error(
                "prices_cycle: yahooquery Importfehler erkannt – Live-Preis Feature deaktiviert (entry_id=%s)",
                entry_id,
            )
        # ------------------------------------------------------------------------------

        # --- NEU: INFO Log bei erfolgreichem Zyklus nach vorherigen Fehlern ----------
        # Bedingungen: mind. eine Quote verarbeitet (quotes_returned >0) UND vorheriger
        # Fehlerzähler >0 (zeigt echte Erholung). Aktueller store['price_error_counter']
        # ist bereits 0 (Reset), daher Nutzung prev_error_counter.
        if prev_error_counter > 0 and len(all_quotes) > 0:
            _LOGGER.info(
                "prices_cycle: Fehlerzähler zurückgesetzt (previous=%s)",
                prev_error_counter,
            )
        # ------------------------------------------------------------------------------

        return meta
