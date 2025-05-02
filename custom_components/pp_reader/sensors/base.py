import logging
from homeassistant.components.sensor import (
    SensorEntity,
    SensorDeviceClass,
    SensorStateClass
)

_LOGGER = logging.getLogger(__name__)

class PortfolioSensor(SensorEntity):
    """Basis-Klasse für Portfolio Performance Sensoren."""
    
    _attr_has_entity_name = True
    _attr_should_poll = True
    
    @property
    def device_class(self):
        """Return the device class."""
        return SensorDeviceClass.MONETARY
        
    @property
    def state_class(self):
        """Return the state class."""
        return SensorStateClass.MEASUREMENT
    
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