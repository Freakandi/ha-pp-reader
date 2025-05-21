export async function fetchStates() {
  const res = await fetch("/pp_reader_api/states", { credentials: "same-origin" });
  if (!res.ok) throw new Error("Fehler beim Laden der Sensoren");
  return await res.json();
}

export async function fetchDashboardDataWS() {
  let hass = null;

  // Zugriff auf das Home Assistant-Objekt
  if (window.parent && window.parent.hass) {
    hass = window.parent.hass;
  } else if (window.hass) {
    hass = window.hass;
  }

  if (!hass || !hass.connection) {
    throw new Error("Keine gültige Home Assistant Websocket-Verbindung gefunden! Bitte das Dashboard als Panel in Home Assistant öffnen.");
  }

  // Websocket-Nachricht senden
  try {
    const response = await hass.connection.sendMessagePromise({
      type: "pp_reader/get_dashboard_data"
    });
    return response;
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der Dashboard-Daten: ${error.message}`);
  }
}

