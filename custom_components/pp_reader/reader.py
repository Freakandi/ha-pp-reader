"""Hilfsmodul zum Entpacken und Zugriff auf .portfolio-Dateien."""

import os
import zipfile
import logging

_LOGGER = logging.getLogger(__name__)

def extract_data_portfolio(portfolio_path: str, extract_dir: str) -> str:
    """Entpacke die .portfolio-Datei und liefere Pfad zu data.portfolio."""
    if not os.path.exists(portfolio_path):
        _LOGGER.error("Datei nicht gefunden: %s", portfolio_path)
        raise FileNotFoundError(f"{portfolio_path} existiert nicht.")

    if not zipfile.is_zipfile(portfolio_path):
        _LOGGER.error("Keine gültige .portfolio-Datei (ZIP-Format erwartet): %s", portfolio_path)
        raise zipfile.BadZipFile(f"{portfolio_path} ist keine ZIP-Datei.")

    try:
        with zipfile.ZipFile(portfolio_path, "r") as zf:
            zf.extractall(extract_dir)
            data_file = os.path.join(extract_dir, "data.portfolio")
            if not os.path.exists(data_file):
                raise FileNotFoundError("data.portfolio nicht im Archiv gefunden.")
            return data_file
    except Exception as e:
        _LOGGER.exception("Fehler beim Entpacken: %s", str(e))
        raise
