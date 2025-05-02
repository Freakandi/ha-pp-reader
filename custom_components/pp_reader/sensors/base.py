import logging
from homeassistant.components.sensor import (
    SensorEntity,
    SensorDeviceClass,
    SensorStateClass
)
from homeassistant.helpers.entity import DeviceInfo  # Import hinzugefügt
from ..const import DOMAIN  # DOMAIN für device_info benötigt

_LOGGER = logging.getLogger(__name__)

class PortfolioSensor(SensorEntity):
    """Basis-Klasse für Portfolio Performance Sensoren."""
    
    _attr_has_entity_name = True
    _attr_should_poll = True
    
    def __init__(self):
        super().__init__()
        # Device Info für Gruppierung der Sensoren
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, "pp_reader")},
            name="Portfolio Performance Reader",
            manufacturer="Portfolio Performance",
            model="Sensor Hub"
        )
    
    @property
    def device_class(self):
        """Return the device class."""
        return SensorDeviceClass.MONETARY
        
    @property
    def state_class(self):
        """Return the state class."""
        return SensorStateClass.TOTAL  # MEASUREMENT -> TOTAL geändert
    
    async def async_update(self) -> None:
        """Aktualisiert den Sensor-Wert."""
        try:
            await self._async_update_internal()
            self._attr_available = True
        except Exception as e:
            self._attr_available = False
            _LOGGER.error(
                "Fehler bei Aktualisierung von %s: %s", 
                self.entity_id, 
                str(e)
            )
            
    async def _async_update_internal(self) -> None:
        """Interne Update-Methode, die von Kindklassen überschrieben wird."""
        raise NotImplementedError()