"""reader.py – entpackt eine .portfolio-Datei und liefert den Pfad zur data.portfolio."""
import os
import zipfile
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def extract_data_portfolio(portfolio_path: str, extract_dir: str) -> str:
    """Entpacke .portfolio-Datei nach extract_dir. Gibt Pfad zur data.portfolio zurück."""
    if not os.path.exists(portfolio_path):
        raise FileNotFoundError(f"Datei nicht gefunden: {portfolio_path}")

    if not zipfile.is_zipfile(portfolio_path):
        raise zipfile.BadZipFile(f"Ungültige ZIP-Datei: {portfolio_path}")

    try:
        with zipfile.ZipFile(portfolio_path, "r") as zf:
            zf.extractall(extract_dir)
            data_file = os.path.join(extract_dir, "data.portfolio")
            if not os.path.exists(data_file):
                raise FileNotFoundError("data.portfolio nicht im Archiv enthalten")
            return data_file
    except Exception as e:
        logger.exception("Fehler beim Entpacken: %s", str(e))
        raise
