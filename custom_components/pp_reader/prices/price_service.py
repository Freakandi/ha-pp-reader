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
from collections.abc import Mapping
from datetime import UTC, datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any

from homeassistant.exceptions import HomeAssistantError

from custom_components.pp_reader.const import DOMAIN
from custom_components.pp_reader.data.db_access import (
    Transaction as DbTransaction,
)
from custom_components.pp_reader.data.db_access import (
    fetch_live_portfolios,
)
from custom_components.pp_reader.data.event_push import _push_update
from custom_components.pp_reader.data.normalization_pipeline import (
    async_normalize_snapshot,
)
from custom_components.pp_reader.data.normalized_store import (
    SnapshotBundle,
    async_load_latest_snapshot_bundle,
)
from custom_components.pp_reader.logic.securities import (
    db_calculate_current_holdings,
    db_calculate_holdings_value,
    db_calculate_sec_purchase_value,
)
from custom_components.pp_reader.metrics.pipeline import async_refresh_all
from custom_components.pp_reader.prices import revaluation
from custom_components.pp_reader.prices.yahooquery_provider import (
    CHUNK_SIZE,
    YahooQueryProvider,
    has_import_error,
)
from custom_components.pp_reader.util import async_run_executor_job
from custom_components.pp_reader.util.currency import (
    cent_to_eur,
    eur_to_cent,
    round_currency,
)
from custom_components.pp_reader.util.scaling import SCALE


async def revalue_after_price_updates(*args: Any, **kwargs: Any) -> dict[str, Any]:
    """Proxy to the revaluation helper (patchable for tests)."""
    return await revaluation.revalue_after_price_updates(*args, **kwargs)


async def _schedule_metrics_after_price_change(
    hass: HomeAssistant,
    entry_id: str,
    db_path: Path | str | None,
    changed_count: int,
) -> None:
    """Kick off a metrics refresh after price updates so snapshots stay in sync."""
    if changed_count <= 0 or not db_path:
        return

    store = hass.data[DOMAIN].get(entry_id, {})
    existing_task: asyncio.Task | None = store.get("metrics_refresh_task")
    if existing_task and not existing_task.done():
        _LOGGER.debug(
            "prices_cycle: Metrics-Refresh bereits aktiv (entry_id=%s)", entry_id
        )
        return

    async def _run_metrics_refresh() -> None:
        try:
            _LOGGER.info(
                "prices_cycle: Starte Metrics-Refresh (entry_id=%s, changed=%s)",
                entry_id,
                changed_count,
            )
            run = await async_refresh_all(
                hass,
                db_path,
                trigger="price_cycle",
            )
            _LOGGER.debug(
                "prices_cycle: Metrics-Refresh abgeschlossen run_uuid=%s status=%s",
                getattr(run, "run_uuid", None),
                getattr(run, "status", None),
            )
            try:
                await async_normalize_snapshot(
                    hass,
                    Path(db_path),
                    include_positions=False,
                )
            except Exception:  # noqa: BLE001 - defensive logging
                _LOGGER.debug(
                    "prices_cycle: Normalization nach Metrics-Refresh fehlgeschlagen",
                    exc_info=True,
                )

            try:
                portfolio_payload = await async_run_executor_job(
                    hass,
                    fetch_live_portfolios,
                    Path(db_path),
                )
            except Exception:  # noqa: BLE001 - defensive logging
                _LOGGER.debug(
                    (
                        "prices_cycle: Live-Portfolio-Payload nach Metrics-Refresh "
                        "fehlgeschlagen"
                    ),
                    exc_info=True,
                )
            else:
                if portfolio_payload is not None:
                    _push_update(
                        hass,
                        entry_id,
                        "portfolio_values",
                        portfolio_payload,
                    )
        except Exception:  # noqa: BLE001 - defensive logging
            _LOGGER.warning(
                "prices_cycle: Metrics-Refresh nach Preis-Update fehlgeschlagen",
                exc_info=True,
            )
        finally:
            store.pop("metrics_refresh_task", None)

    metrics_task = hass.async_create_task(
        _run_metrics_refresh(), name="pp_reader_metrics_after_price_cycle"
    )
    store["metrics_refresh_task"] = metrics_task


if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

    from custom_components.pp_reader.prices.provider_base import Quote

WATCHDOG_DURATION_THRESHOLD_MS = 25_000
CONSECUTIVE_ERROR_THRESHOLD = 3
INVALID_SCALED_PRICE_ERROR = (
    "Ungültiger skalierten Preis (ensure_no_extra_persist Guard)"
)
_SCALED_INT_THRESHOLD = 10_000
_EIGHT_DECIMAL_SCALE = int(SCALE)
ZERO_QUOTES_WARN_INTERVAL = 1_800
# Yahoo Finance benötigt teils >10s für große Chunks -
# größere Puffer reduzieren Timeout-Abbrüche.
PRICE_FETCH_TIMEOUT = 30
TRANSACTION_UNIT_CHUNK_SIZE = 500
HOLDING_VALUE_MATCH_EPSILON = 1e-9
TOTAL_VALUE_MATCH_EPSILON = 1e-6

_LOGGER = logging.getLogger(__name__)

_ALLOWED_PORTFOLIO_SNAPSHOT_FIELDS = {
    "uuid",
    "name",
    "performance",
    "coverage_ratio",
    "provenance",
    "metric_run_uuid",
    "generated_at",
    "position_count",
    "missing_value_positions",
    "has_current_value",
    "current_value",
    "purchase_value",
    "purchase_sum",
}
_ALLOWED_POSITION_FIELDS = {
    "security_uuid",
    "name",
    "currency_code",
    "current_holdings",
    "purchase_value",
    "current_value",
    "coverage_ratio",
    "provenance",
    "metric_run_uuid",
    "data_state",
    "fx_unavailable",
}


def _slim_position_payload(position: Mapping[str, Any]) -> dict[str, Any]:
    """Return a trimmed position payload suitable for live push events."""
    slim: dict[str, Any] = {
        key: value for key, value in position.items() if key in _ALLOWED_POSITION_FIELDS
    }

    performance = position.get("performance")
    if isinstance(performance, Mapping):
        slim["performance"] = {
            key: performance.get(key)
            for key in ("gain_abs", "gain_pct")
            if performance.get(key) is not None
        }

    return slim


def _normalize_scaled_quantity(value: Any) -> float:
    """Interpret raw numeric values that may already be scaled by 1e8."""
    if value in (None, ""):
        return 0.0
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return 0.0

    if abs(numeric) >= _SCALED_INT_THRESHOLD:
        return numeric / _EIGHT_DECIMAL_SCALE
    return numeric


def _scale_quantity(value: float | None) -> int:
    """Return an integer representation using the canonical 1e8 scaling."""
    if value in (None, ""):
        return 0
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return 0
    return round(numeric * _EIGHT_DECIMAL_SCALE)


def initialize_price_state(hass: HomeAssistant, entry_id: str) -> None:
    """
    Initialisiert alle In-Memory State-Variablen für den Preis-Service.

    Legt keine Hintergrund-Tasks an (Scheduling erfolgt in __init__.py).
    Mehrfachaufruf (z.B. Reload) ist idempotent.
    """
    if _LOGGER.level > logging.INFO:
        _LOGGER.setLevel(logging.INFO)

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
    store.setdefault("price_zero_quotes_warn_ts", None)


def build_symbol_mapping(db_path: Path) -> tuple[list[str], dict[str, list[str]]]:
    """
    Erzeugt ein Symbol-Mapping für aktive Securities.

    Returns
    -------
    (unique_symbols_sorted, mapping)

    """
    symbols_map: dict[str, list[str]] = {}
    symbols_order: list[str] = []
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
            if ticker_norm not in symbols_map:
                symbols_map[ticker_norm] = []
                symbols_order.append(ticker_norm)
            symbols_map[ticker_norm].append(uuid)

    return list(symbols_order), symbols_map


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


def _load_prices_and_currencies(
    db_path: Path,
) -> tuple[dict[str, int], dict[str, str | None]]:
    """Load cached prices and security currencies from SQLite."""
    with sqlite3.connect(str(db_path)) as conn:
        return _load_old_prices(conn), _load_security_currencies(conn)


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


def _filter_invalid_updates(updates: dict[str, int]) -> dict[str, int]:
    """Entfernt Updates mit None oder <=0 (defensive Filterung)."""
    if not updates:
        return {}
    return {k: v for k, v in updates.items() if isinstance(v, int) and v > 0}


def _refresh_impacted_portfolio_securities(  # noqa: C901, PLR0911, PLR0912, PLR0915 - SQL refresh mirrors legacy flow
    db_path: Path, scaled_updates: dict[str, int]
) -> set[str]:
    """Recalculate portfolio/security aggregates for affected securities."""
    if not scaled_updates:
        return set()

    security_ids = [sec for sec in set(scaled_updates.keys()) if sec]
    if not security_ids:
        return set()

    impacted_portfolios: set[str] = set()

    try:
        with sqlite3.connect(str(db_path)) as conn:
            existing_entries: dict[tuple[str, str], dict[str, float | int | None]] = {}
            impacted_pairs: set[tuple[str, str]] = set()

            try:
                for sec_id in security_ids:
                    cur = conn.execute(
                        """
                            SELECT portfolio_uuid,
                                   security_uuid,
                                   current_holdings,
                                   purchase_value,
                                   avg_price_native,
                                   avg_price_security,
                                   avg_price_account,
                                   current_value,
                                   security_currency_total,
                                   account_currency_total
                            FROM portfolio_securities
                            WHERE security_uuid = ?
                        """,
                        (sec_id,),
                    )
                    for (
                        portfolio_uuid,
                        security_uuid,
                        cur_hold,
                        purch_val,
                        avg_native,
                        avg_security,
                        avg_account,
                        cur_val,
                        sec_total,
                        acc_total,
                    ) in cur.fetchall():
                        key = (portfolio_uuid, security_uuid)
                        impacted_pairs.add(key)
                        impacted_portfolios.add(portfolio_uuid)
                        existing_entries[key] = {
                            "current_holdings": _normalize_scaled_quantity(
                                cur_hold or 0.0
                            ),
                            "purchase_value": int(purch_val or 0),
                            "avg_price_native": (
                                float(avg_native) if avg_native is not None else None
                            ),
                            "avg_price_security": (
                                float(avg_security)
                                if avg_security is not None
                                else None
                            ),
                            "avg_price_account": (
                                float(avg_account) if avg_account is not None else None
                            ),
                            "current_value": int(cur_val or 0),
                            "security_currency_total": (
                                float(sec_total) if sec_total is not None else 0.0
                            ),
                            "account_currency_total": (
                                float(acc_total) if acc_total is not None else 0.0
                            ),
                        }
            except sqlite3.Error:
                _LOGGER.debug(
                    (
                        "prices_cycle: portfolio_securities Lookup übersprungen "
                        "(Tabelle fehlt?)"
                    ),
                    exc_info=True,
                )
                return set()

            transaction_rows: list[tuple] = []
            try:
                for sec_id in security_ids:
                    tx_cur = conn.execute(
                        """
                            SELECT uuid,
                                   type,
                                   account,
                                   portfolio,
                                   other_account,
                                   other_portfolio,
                                   date,
                                   currency_code,
                                   amount,
                                   shares,
                                   security
                            FROM transactions
                            WHERE security = ?
                              AND portfolio IS NOT NULL
                        """,
                        (sec_id,),
                    )
                    transaction_rows.extend(tx_cur.fetchall())
            except sqlite3.Error:
                _LOGGER.debug(
                    (
                        "prices_cycle: transactions Lookup fehlgeschlagen "
                        "(Refresh übersprungen)"
                    ),
                    exc_info=True,
                )

            transactions: list[DbTransaction] = [
                DbTransaction(*row) for row in transaction_rows
            ]

            tx_units: dict[str, dict[str, Any]] = {}
            if transactions:
                tx_ids = [tx.uuid for tx in transactions if tx.uuid]
                if tx_ids:
                    for start in range(0, len(tx_ids), TRANSACTION_UNIT_CHUNK_SIZE):
                        chunk = tx_ids[start : start + TRANSACTION_UNIT_CHUNK_SIZE]
                        try:
                            for tx_uuid in chunk:
                                unit_cur = conn.execute(
                                    """
                                        SELECT transaction_uuid,
                                               fx_amount,
                                               fx_currency_code
                                        FROM transaction_units
                                        WHERE transaction_uuid = ?
                                          AND fx_amount IS NOT NULL
                                    """,
                                    (tx_uuid,),
                                )
                                for unit_row in unit_cur.fetchall():
                                    tx_unit_uuid, fx_amount, fx_currency = unit_row
                                    if fx_amount is None or not fx_currency:
                                        continue
                                    tx_units[tx_unit_uuid] = {
                                        "fx_amount": fx_amount,
                                        "fx_currency_code": fx_currency,
                                    }
                        except sqlite3.Error:
                            _LOGGER.debug(
                                (
                                    "prices_cycle: transaction_units Lookup "
                                    "fehlgeschlagen (Refresh übersprungen)"
                                ),
                                exc_info=True,
                            )
                            tx_units = {}
                            break

            for tx in transactions:
                if tx.portfolio and tx.security:
                    key = (tx.portfolio, tx.security)
                    impacted_pairs.add(key)
                    impacted_portfolios.add(tx.portfolio)

            if not impacted_pairs:
                return set()

            current_holdings = (
                db_calculate_current_holdings(transactions) if transactions else {}
            )
            purchase_metrics = (
                db_calculate_sec_purchase_value(
                    transactions, db_path, tx_units=tx_units
                )
                if transactions
                else {}
            )

            current_hold_pur: dict[tuple[str, str], dict[str, float | None]] = {}
            for key in impacted_pairs:
                holdings = current_holdings.get(key)
                metrics = purchase_metrics.get(key)
                purchase_value = metrics.purchase_value if metrics else None
                avg_price_native = metrics.avg_price_native if metrics else None
                security_total = metrics.security_currency_total if metrics else None
                account_total = metrics.account_currency_total if metrics else None
                avg_price_security = metrics.avg_price_security if metrics else None
                avg_price_account = metrics.avg_price_account if metrics else None

                existing_entry = existing_entries.get(key)
                if holdings is None and existing_entry:
                    holdings = float(existing_entry.get("current_holdings", 0.0))
                if purchase_value is None and existing_entry:
                    purchase_value = cent_to_eur(
                        existing_entry.get("purchase_value"), default=0.0
                    )
                if avg_price_native is None and existing_entry:
                    avg_price_native = existing_entry.get("avg_price_native")
                if avg_price_security is None and existing_entry:
                    avg_price_security = existing_entry.get("avg_price_security")
                if avg_price_account is None and existing_entry:
                    avg_price_account = existing_entry.get("avg_price_account")
                if security_total is None and existing_entry:
                    security_total = existing_entry.get("security_currency_total", 0.0)
                if account_total is None and existing_entry:
                    account_total = existing_entry.get("account_currency_total", 0.0)

                if holdings is None:
                    continue

                holdings = _normalize_scaled_quantity(holdings)
                current_hold_pur[key] = {
                    "current_holdings": holdings,
                    "purchase_value": purchase_value or 0.0,
                    "avg_price_native": avg_price_native,
                    "security_currency_total": security_total or 0.0,
                    "account_currency_total": account_total or 0.0,
                    "avg_price_security": avg_price_security,
                    "avg_price_account": avg_price_account,
                }

            if not current_hold_pur:
                return impacted_portfolios

            holdings_values = db_calculate_holdings_value(
                db_path, conn, current_hold_pur
            )
            if not holdings_values:
                return impacted_portfolios

            upserts: list[tuple] = []
            for key, data in holdings_values.items():
                portfolio_uuid, security_uuid = key
                current_holdings_val = _normalize_scaled_quantity(
                    data.get("current_holdings", 0.0)
                )
                purchase_value_eur = (
                    round_currency(data.get("purchase_value"), default=0.0) or 0.0
                )
                current_value_raw = data.get("current_value")
                current_value_eur = (
                    round_currency(current_value_raw, default=None)
                    if current_value_raw is not None
                    else None
                )
                avg_price_native = data.get("avg_price_native")
                if isinstance(avg_price_native, (int, float)):
                    avg_price_native_val: float | None = float(avg_price_native)
                else:
                    avg_price_native_val = None

                avg_price_security = data.get("avg_price_security")
                if isinstance(avg_price_security, (int, float)):
                    avg_price_security_val: float | None = float(avg_price_security)
                else:
                    avg_price_security_val = None

                avg_price_account = data.get("avg_price_account")
                if isinstance(avg_price_account, (int, float)):
                    avg_price_account_val: float | None = float(avg_price_account)
                else:
                    avg_price_account_val = None

                security_total = (
                    round_currency(data.get("security_currency_total"), default=0.0)
                    or 0.0
                )
                account_total = (
                    round_currency(data.get("account_currency_total"), default=0.0)
                    or 0.0
                )
                purchase_value_cents = eur_to_cent(purchase_value_eur, default=0) or 0
                current_value_cents = (
                    eur_to_cent(current_value_eur, default=None)
                    if current_value_eur is not None
                    else None
                )

                existing_entry = existing_entries.get(key)
                existing_current_value = (
                    existing_entry.get("current_value") if existing_entry else None
                )
                current_value_matches = existing_entry is not None and (
                    existing_current_value == current_value_cents
                )

                if existing_entry and (
                    abs(
                        existing_entry.get("current_holdings", 0.0)
                        - current_holdings_val
                    )
                    < HOLDING_VALUE_MATCH_EPSILON
                    and int(existing_entry.get("purchase_value", 0))
                    == purchase_value_cents
                    and (
                        (
                            existing_entry.get("avg_price_native") is None
                            and avg_price_native_val is None
                        )
                        or (
                            existing_entry.get("avg_price_native") is not None
                            and avg_price_native_val is not None
                            and abs(
                                float(existing_entry.get("avg_price_native", 0.0))
                                - avg_price_native_val
                            )
                            < TOTAL_VALUE_MATCH_EPSILON
                        )
                    )
                    and current_value_matches
                    and (
                        (
                            existing_entry.get("avg_price_security") is None
                            and avg_price_security_val is None
                        )
                        or (
                            existing_entry.get("avg_price_security") is not None
                            and avg_price_security_val is not None
                            and abs(
                                float(existing_entry.get("avg_price_security", 0.0))
                                - avg_price_security_val
                            )
                            < TOTAL_VALUE_MATCH_EPSILON
                        )
                    )
                    and (
                        (
                            existing_entry.get("avg_price_account") is None
                            and avg_price_account_val is None
                        )
                        or (
                            existing_entry.get("avg_price_account") is not None
                            and avg_price_account_val is not None
                            and abs(
                                float(existing_entry.get("avg_price_account", 0.0))
                                - avg_price_account_val
                            )
                            < TOTAL_VALUE_MATCH_EPSILON
                        )
                    )
                    and abs(
                        float(existing_entry.get("security_currency_total", 0.0))
                        - security_total
                    )
                    < TOTAL_VALUE_MATCH_EPSILON
                    and abs(
                        float(existing_entry.get("account_currency_total", 0.0))
                        - account_total
                    )
                    < TOTAL_VALUE_MATCH_EPSILON
                ):
                    continue

                upserts.append(
                    (
                        portfolio_uuid,
                        security_uuid,
                        _scale_quantity(current_holdings_val),
                        purchase_value_cents,
                        avg_price_native_val,
                        avg_price_security_val,
                        avg_price_account_val,
                        security_total,
                        account_total,
                        current_value_cents,
                    )
                )

            if not upserts:
                return impacted_portfolios

            try:
                conn.execute("BEGIN")
                conn.executemany(
                    """
                        INSERT OR REPLACE INTO portfolio_securities (
                            portfolio_uuid,
                            security_uuid,
                            current_holdings,
                            purchase_value,
                            avg_price_native,
                            avg_price_security,
                            avg_price_account,
                            security_currency_total,
                            account_currency_total,
                            current_value
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    upserts,
                )
                conn.commit()
            except sqlite3.Error:
                conn.rollback()
                _LOGGER.warning(
                    "prices_cycle: Fehler beim Aktualisieren von portfolio_securities",
                    exc_info=True,
                )
            return impacted_portfolios
    except sqlite3.Error:
        _LOGGER.debug(
            "prices_cycle: Verbindung für portfolio_securities Refresh fehlgeschlagen",
            exc_info=True,
        )
        return set()


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

            error_counter = store.get("price_error_counter", 0)
            prev_error_counter = error_counter

            # --- Batch Bildung mit Provider-Konstante ---
            batches = [
                symbols[i : i + CHUNK_SIZE] for i in range(0, len(symbols), CHUNK_SIZE)
            ]
            batches_count = len(batches)

            provider = YahooQueryProvider()
            all_quotes: list[Quote] = []
            skipped_running = False
            chunk_failure_count = 0
            provider_import_error = False

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
                        provider.fetch(batch_symbols), PRICE_FETCH_TIMEOUT
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
                error_counter += chunk_failure_count
                store["price_error_counter"] = error_counter
                _LOGGER.debug(
                    "prices_cycle: chunk_failures=%s error_counter=%s",
                    chunk_failure_count,
                    error_counter,
                )
            else:
                store["price_error_counter"] = error_counter

            provider_import_error = has_import_error()

            if len(all_quotes) == 0:
                error_counter += 1
                store["price_error_counter"] = error_counter
                if not provider_import_error:
                    now_ts = time.time()
                    last_warn = store.get("price_zero_quotes_warn_ts")
                    if (
                        last_warn is None
                        or (now_ts - last_warn) >= ZERO_QUOTES_WARN_INTERVAL
                    ):
                        warn_msg = (
                            "prices_cycle: zero-quotes detected (WARN) - "
                            "error_counter=%s"
                        )
                        _LOGGER.warning(warn_msg, error_counter)
                        store["price_zero_quotes_warn_ts"] = now_ts
                    else:
                        _LOGGER.debug(
                            (
                                "prices_cycle: zero-quotes detected "
                                "(WARN gedrosselt) -> "
                                "error_counter=%s"
                            ),
                            error_counter,
                        )
            else:
                store["price_error_counter"] = error_counter

            # --- Load existing prices and currencies ---
            existing_prices: dict[str, int] = {}
            security_currencies: dict[str, str | None] = {}
            try:
                existing_prices, security_currencies = await async_run_executor_job(
                    hass,
                    _load_prices_and_currencies,
                    db_path,
                )
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
                    updated_rows = await async_run_executor_job(
                        hass,
                        _apply_price_updates,
                        db_path,
                        scaled_updates,
                        fetched_at,
                        "yahoo",
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
                    if updated_rows > 0:
                        try:
                            await async_run_executor_job(
                                hass,
                                _refresh_impacted_portfolio_securities,
                                db_path,
                                scaled_updates,
                            )
                        except Exception:  # noqa: BLE001 - Logging für Diagnose
                            _LOGGER.debug(
                                (
                                    "prices_cycle: Refresh portfolio_securities "
                                    "fehlgeschlagen"
                                ),
                                exc_info=True,
                            )
                    changed_count = updated_rows
            else:
                changed_count = 0

            revaluation_result = {"portfolio_values": None, "portfolio_positions": None}
            snapshot_bundle: SnapshotBundle | None = None
            snapshot_lookup: dict[str, dict[str, Any]] = {}

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

                if pv_dict:
                    try:
                        if not snapshot_lookup:
                            (
                                snapshot_bundle,
                                snapshot_lookup,
                            ) = await _async_load_snapshot_bundle(hass, db_path)
                        pv_payload = _compose_portfolio_payload_from_snapshots(
                            pv_dict,
                            snapshot_lookup,
                            snapshot_bundle,
                        )

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
                    if positions_map:
                        if not snapshot_lookup:
                            (
                                snapshot_bundle,
                                snapshot_lookup,
                            ) = await _async_load_snapshot_bundle(hass, db_path)
                        for pid, positions in positions_map.items():
                            entry_payload = _build_positions_event_entry(
                                pid,
                                positions or [],
                                snapshot_lookup,
                                snapshot_bundle,
                            )
                            _push_update(
                                hass,
                                entry_id,
                                "portfolio_positions",
                                [entry_payload],
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
            quotes_returned = len(all_quotes)
            await _schedule_metrics_after_price_change(
                hass, entry_id, db_path, changed_count
            )
            if quotes_returned > 0:
                if chunk_failure_count == 0:
                    if prev_error_counter > 0:
                        _LOGGER.info(
                            "prices_cycle: Fehlerzähler zurückgesetzt (previous=%s)",
                            prev_error_counter,
                        )
                    error_counter = 0
                store["price_error_counter"] = error_counter
            else:
                store["price_error_counter"] = error_counter

            meta = {
                "symbols_total": len(symbols),
                "batches": batches_count,
                "quotes_returned": quotes_returned,
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
                and not provider_import_error
            ):
                _LOGGER.warning(
                    (
                        "prices_cycle: Wiederholte Fehlschläge (error_counter=%s >=%s) "
                        "- weiterhin keine gültigen Quotes"
                    ),
                    store["price_error_counter"],
                    CONSECUTIVE_ERROR_THRESHOLD,
                )

            if provider_import_error and not store.get("price_provider_disabled"):
                store["price_provider_disabled"] = True
                _LOGGER.error(
                    (
                        "prices_cycle: yahooquery Importfehler erkannt - Live-Preis "
                        "Feature deaktiviert (entry_id=%s)"
                    ),
                    entry_id,
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


def _snapshot_lookup_from_bundle(
    bundle: SnapshotBundle | None,
) -> dict[str, dict[str, Any]]:
    if not bundle:
        return {}
    lookup: dict[str, dict[str, Any]] = {}
    for entry in bundle.portfolios:
        if isinstance(entry, Mapping):
            uuid = entry.get("uuid")
            if uuid:
                lookup[str(uuid)] = dict(entry)
    return lookup


def _normalized_metadata(
    entry: Mapping[str, Any] | None,
    bundle: SnapshotBundle | None,
) -> dict[str, Any] | None:
    if entry is None and bundle is None:
        return None

    metadata: dict[str, Any] = {}
    metric_run_uuid = (entry.get("metric_run_uuid") if entry else None) or (
        bundle.metric_run_uuid if bundle else None
    )
    if metric_run_uuid:
        metadata["metric_run_uuid"] = metric_run_uuid

    generated_at = entry.get("generated_at") if entry else None
    if not generated_at and bundle:
        generated_at = bundle.snapshot_at
    if generated_at:
        metadata["generated_at"] = generated_at

    coverage_ratio = entry.get("coverage_ratio") if entry else None
    if isinstance(coverage_ratio, (int, float)):
        metadata["coverage_ratio"] = coverage_ratio

    provenance = entry.get("provenance") if entry else None
    if isinstance(provenance, str) and provenance:
        metadata["provenance"] = provenance

    return metadata or None


def _compose_portfolio_payload_from_snapshots(
    pv_dict: Mapping[str, Mapping[str, Any]],
    snapshot_map: Mapping[str, Mapping[str, Any]],
    bundle: SnapshotBundle | None,
) -> list[dict[str, Any]]:
    payload: list[dict[str, Any]] = []
    for pid, data in pv_dict.items():
        if not isinstance(data, Mapping):
            continue

        base = {
            key: value
            for key, value in dict(snapshot_map.get(pid, {})).items()
            if key in _ALLOWED_PORTFOLIO_SNAPSHOT_FIELDS
        }
        uuid = data.get("uuid") or base.get("uuid") or pid
        entry: dict[str, Any] = {"uuid": str(uuid)}
        entry.update({k: v for k, v in base.items() if k not in entry})

        for key in ("name", "performance", "coverage_ratio", "provenance"):
            if key in data and data[key] is not None:
                entry[key] = data[key]

        position_count = data.get("position_count")
        if position_count is None and "count" in data:
            position_count = data.get("count")
        if position_count is not None:
            entry["position_count"] = position_count

        if "missing_value_positions" in data:
            entry["missing_value_positions"] = data["missing_value_positions"]

        current_value = data.get("current_value")
        if current_value is not None:
            entry["current_value"] = current_value

        purchase_value = data.get("purchase_sum", data.get("purchase_value"))
        if purchase_value is not None:
            entry["purchase_value"] = purchase_value
            entry["purchase_sum"] = purchase_value

        normalized_payload = _normalized_metadata(entry, bundle)
        if normalized_payload:
            entry["normalized_payload"] = normalized_payload

        payload.append(entry)

    return payload


def _build_positions_event_entry(
    portfolio_uuid: str,
    positions: list[dict[str, Any]] | Any,
    snapshot_map: Mapping[str, Mapping[str, Any]],
    bundle: SnapshotBundle | None,
) -> dict[str, Any]:
    base = snapshot_map.get(portfolio_uuid, {})
    payload_positions: list[dict[str, Any]] = []
    if isinstance(positions, list):
        for position in positions:
            if not isinstance(position, Mapping):
                continue
            payload_positions.append(_slim_position_payload(position))
    elif positions and isinstance(positions, Mapping):
        payload_positions.append(_slim_position_payload(positions))
    entry: dict[str, Any] = {
        "portfolio_uuid": portfolio_uuid,
        "positions": payload_positions,
    }
    normalized_payload = _normalized_metadata(base, bundle)
    if normalized_payload:
        entry["normalized_payload"] = normalized_payload
        if normalized_payload.get("metric_run_uuid"):
            entry["metric_run_uuid"] = normalized_payload["metric_run_uuid"]
        if normalized_payload.get("coverage_ratio") is not None:
            entry["coverage_ratio"] = normalized_payload["coverage_ratio"]
        if normalized_payload.get("provenance"):
            entry["provenance"] = normalized_payload["provenance"]
    return entry


async def _async_load_snapshot_bundle(
    hass: HomeAssistant,
    db_path: Path | str,
) -> tuple[SnapshotBundle | None, dict[str, dict[str, Any]]]:
    try:
        bundle = await async_load_latest_snapshot_bundle(hass, db_path)
    except Exception:  # noqa: BLE001 - diagnostics only
        _LOGGER.debug(
            "prices_cycle: Fehler beim Laden der Snapshot-Bundles (db_path=%s)",
            db_path,
            exc_info=True,
        )
        return None, {}
    return bundle, _snapshot_lookup_from_bundle(bundle)
