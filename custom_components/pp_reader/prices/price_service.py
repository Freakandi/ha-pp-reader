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
import time
from collections import defaultdict
from contextlib import suppress

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
    Initialisiert alle In-Memory State-Variablen für den Preis-Service.

    Legt keine Hintergrund-Tasks an (Scheduling erfolgt in __init__.py).
    Mehrfachaufruf (z.B. Reload) ist idempotent.
    """
    store = hass.data.setdefault(DOMAIN, {}).setdefault(entry_id, {})
    if "price_lock" not in store or not isinstance(store.get("price_lock"), asyncio.Lock):
        store["price_lock"] = asyncio.Lock()
    # Cancel-Handle (Intervall) erst nach Scheduling gesetzt
    store.setdefault("price_task_cancel", None)
    store.setdefault("price_error_counter", 0)
    store.setdefault("price_currency_drift_logged", set())
    # Einmaliges INFO bei leerer Symbol-Liste pro Laufzeit
    store.setdefault("price_empty_symbols_logged", False)
    # Optional: zuletzt verwendete Symbol-Mappings (Debug / Diagnose)
    store.setdefault("price_last_symbol_count", 0)
    store.setdefault("price_last_cycle_meta", {})


def build_symbol_mapping(db_path: Path) -> tuple[list[str], dict[str, list[str]]]:
    """
    Lädt aktive (nicht 'retired') Securities mit gültigem `ticker_symbol`
    und baut ein Mapping symbol -> [security_uuid,...].

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
    hass, entry_id: str, db_path: Path
) -> tuple[list[str], dict[str, list[str]]]:
    """
    Wrapper um build_symbol_mapping mit einmaligem INFO-Log bei leerer Liste.
    """
    try:
        symbols, mapping = build_symbol_mapping(db_path)
    except Exception:
        _LOGGER.warning("prices_cycle: Fehler beim Laden der Symbole", exc_info=True)
        return [], {}

    store = hass.data[DOMAIN][entry_id]
    if not symbols and not store.get("price_empty_symbols_logged"):
        _LOGGER.info(
            "prices_cycle: Keine aktiven Symbole gefunden – Preis-Service wartet (einmaliges Log)"
        )
        store["price_empty_symbols_logged"] = True
    elif symbols:
        # Reset Flag falls nach Reload später doch Symbole existieren
        store["price_empty_symbols_logged"] = False

    store["price_last_symbol_count"] = len(symbols)
    return symbols, mapping


def _maybe_reset_error_counter(hass, entry_id: str, meta: dict) -> None:
    """
    Setzt den Fehlerzähler zurück, wenn im Zyklus mindestens ein Quote
    verarbeitet wurde. Loggt einmalig den Reset.
    """
    store = hass.data[DOMAIN][entry_id]
    if meta.get("quotes_returned", 0) > 0:
        prev = store.get("price_error_counter", 0)
        if prev > 0:
            _LOGGER.info(
                "prices_cycle: Fehlerzähler nach erfolgreichem Zyklus zurückgesetzt (vorher=%s)",
                prev,
            )
        store["price_error_counter"] = 0


# --- Change Detection Helpers -------------------------------------------------
def _utc_now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def _load_old_prices(conn: sqlite3.Connection) -> dict[str, int]:
    """
    Lädt vorhandene last_price Werte für Change Detection.
    """
    cur = conn.execute(
        "SELECT uuid, last_price FROM securities WHERE last_price IS NOT NULL"
    )
    return {uuid: lp for uuid, lp in cur.fetchall() if lp is not None}


def _load_security_currencies(conn: sqlite3.Connection) -> dict[str, str | None]:
    cur = conn.execute("SELECT uuid, currency_code FROM securities")
    return {uuid: ccy for uuid, ccy in cur.fetchall()}


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

    # Gruppierung: Quote.symbol → Quote Objekt (Es wird erwartet, dass jedes Symbol max einmal vorkommt)
    for q in quotes:
        sym = getattr(q, "symbol", None)
        if sym is None:
            continue
        target_uuids = symbol_map.get(sym, [])
        if not target_uuids:
            continue
        try:
            scaled = int(round(q.price * 1e8))
        except Exception:
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
    updates : dict[security_uuid, scaled_price]

    Returns
    -------
    int
        Anzahl aktualisierter Zeilen.
    """
    if not updates:
        return 0

    # Defensive Absicherung (nicht im Hot Path kritisch – geringe Anzahl Updates)
    for _sec, _val in updates.items():
        if not isinstance(_val, int) or _val <= 0:
            raise ValueError(
                f"Ungültiger skalierten Preis (ensure_no_extra_persist Guard) uuid={_sec} value={_val!r}"
            )

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
                cur = conn.execute(
                    stmt, (scaled, source, fetched_at, sec_uuid, scaled)
                )
                if cur.rowcount > 0:
                    updated_rows += 1
            conn.commit()
        except Exception:
            conn.rollback()
            _LOGGER.warning(
                "prices_cycle: Fehler beim Persistieren der Preis-Updates", exc_info=True
            )
            return 0
    return updated_rows


def _filter_invalid_updates(updates: dict[str, int]) -> dict[str, int]:
    """
    Entfernt Updates mit None oder <=0 (defensive Filterung).
    """
    if not updates:
        return {}
    return {k: v for k, v in updates.items() if isinstance(v, int) and v > 0}


def _process_currency_drift_skip_none(
    hass,
    entry_id: str,
    quotes: list[Quote],
    symbol_map: dict[str, list[str]],
    security_currencies: dict[str, str | None],
):
    """
    Filtert Quotes ohne Currency aus Drift-Prüfung heraus (kein Logging).
    """
    # Einfacher Durchlauf – Funktion dient Klarheit / ToDO-Referenz
    # Keine Mutation; Rückgabe nicht notwendig (Selektion erfolgt im zweiten Schritt)
    return


def _process_currency_drift_mismatches(
    hass,
    entry_id: str,
    quotes: list[Quote],
    symbol_map: dict[str, list[str]],
    security_currencies: dict[str, str | None],
):
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

        # Prüfe alle Securities zum Symbol – falls irgendeine abweicht → WARN
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

        # --- NEU: Watchdog WARN bei Zyklusdauer >25s (inkl. Revaluation) ----------
        if (
            not meta.get("skipped_running")
            and isinstance(meta.get("duration_ms"), int)
            and meta["duration_ms"] > 25000
        ):
            _LOGGER.warning(
                "prices_cycle: Watchdog-Schwelle überschritten (duration_ms=%s >25000)",
                meta["duration_ms"],
            )
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
