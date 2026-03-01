"""
Test: Leere Symbol-Liste (INFO nur beim ersten Lauf).

Prüft, dass load_and_map_symbols:
- Beim ersten Aufruf mit leerer Symbolliste genau einmal ein INFO-Log schreibt.
- Beim zweiten Aufruf (gleiche Laufzeit, gesetztes Flag) kein weiteres INFO-Log erzeugt.
"""

import logging
from types import SimpleNamespace
from unittest.mock import patch

from custom_components.pp_reader.const import DOMAIN
from custom_components.pp_reader.prices.price_service import load_and_map_symbols


def _init_store():
    hass = SimpleNamespace()
    hass.data = {DOMAIN: {}}
    entry_id = "test_entry"
    hass.data[DOMAIN][entry_id] = {}
    return hass, entry_id


def test_empty_symbols_info_logged_once(caplog, tmp_path):
    hass, entry_id = _init_store()
    db_path = tmp_path / "dummy.db"  # Pfad wird nicht geöffnet (nur durchgereicht)

    caplog.set_level(
        logging.INFO, logger="custom_components.pp_reader.prices.price_service"
    )

    with patch(
        "custom_components.pp_reader.prices.price_service.build_symbol_mapping",
        return_value=([], {}),
    ):
        # First call -> should log INFO once
        symbols1, mapping1 = load_and_map_symbols(hass, entry_id, db_path)
        assert symbols1 == []
        assert mapping1 == {}
        assert hass.data[DOMAIN][entry_id]["price_empty_symbols_logged"] is True

        info_first = [
            r
            for r in caplog.records
            if r.levelno == logging.INFO
            and r.name == "custom_components.pp_reader.prices.price_service"
        ]
        assert len(info_first) == 1, "Erster Aufruf sollte genau ein INFO-Log erzeugen"

        # Second call -> no new INFO log
        symbols2, mapping2 = load_and_map_symbols(hass, entry_id, db_path)
        assert symbols2 == []
        assert mapping2 == {}

        info_second = [
            r
            for r in caplog.records
            if r.levelno == logging.INFO
            and r.name == "custom_components.pp_reader.prices.price_service"
        ]
        assert len(info_second) == 1, (
            "Zweiter Aufruf darf kein zusätzliches INFO-Log erzeugen (dedupliziert)"
        )
