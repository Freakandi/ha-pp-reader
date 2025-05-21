export async function fetchStates() {
  const res = await fetch("/pp_reader_api/states", { credentials: "same-origin" });
  if (!res.ok) throw new Error("Fehler beim Laden der Sensoren");
  return await res.json();
}

export async function fetchDashboardDataWS() {

  if (!hass || !hass.connection) {
    throw new Error("Keine gültige Home Assistant Websocket-Verbindung gefunden! Bitte das Dashboard als Panel in Home Assistant öffnen.");
  }

  // Websocket-Nachricht senden
  try {
    const response = await hass.connection.sendMessagePromise({
      type: "pp_reader/get_dashboard_data",
      entry_id: hass.config.entryId, // Falls erforderlich, den Entry-ID-Wert hinzufügen
    });
    return response;
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der Dashboard-Daten: ${error.message}`);
  }
}
