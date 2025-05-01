"""Fixtures für pytest."""
import pytest
import sys
from pathlib import Path
from unittest.mock import patch

# Root-Verzeichnis zum Python-Path hinzufügen
root_dir = Path(__file__).parent.parent
sys.path.insert(0, str(root_dir))

pytest_plugins = "pytest_homeassistant_custom_component"

@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Aktiviere Custom Components."""
    yield

@pytest.fixture(name="mock_setup_entry")
def mock_setup_entry_fixture():
    """Patch async_setup_entry."""
    with patch(
        "custom_components.pp_reader.async_setup_entry", return_value=True
    ) as mock_setup_entry:
        yield mock_setup_entry

@pytest.fixture(autouse=True)
def skip_hass():
    """Mock Home Assistant für Tests."""
    with patch("homeassistant.core.HomeAssistant"):
        yield