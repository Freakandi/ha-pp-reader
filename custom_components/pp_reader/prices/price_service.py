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
import sqlite3  # (künftige Schritte benötigen DB Zugriffe für Change Detection)

from ..const import DOMAIN
from .symbols import load_active_security_symbols

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


async def _run_price_cycle(hass, entry_id: str):
    # ...existing code before metadata finalization...
    meta = {
        "symbols_total": total_symbols,
        "batches": batches_count,
        "quotes_returned": len(all_quotes),
        "changed": changed_count,
        "errors": error_count,
        "duration_ms": int((time.monotonic() - start_ts) * 1000),
        "skipped_running": skipped_running,
    }
    # Reset Fehlerzähler falls Erfolg (≥1 Quote, keine neuen Fehler)
    _maybe_reset_error_counter(hass, entry_id, meta)

    _LOGGER.info(
        "prices_cycle symbols=%s batches=%s returned=%s changed=%s errors=%s duration=%s skipped=%s",
        meta["symbols_total"],
        meta["batches"],
        meta["quotes_returned"],
        meta["changed"],
        meta["errors"],
        meta["duration_ms"],
        meta["skipped_running"],
    )
    # ...existing code...
