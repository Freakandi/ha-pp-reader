export async function fetchStates() {
  const res = await fetch("/pp_reader_api/states", { credentials: "same-origin" });
  if (!res.ok) throw new Error("Fehler beim Laden der Sensoren");
  return await res.json();
}

export async function fetchDashboardDataWS(hass) {
  if (!hass) {
    throw new Error("Das hass-Objekt ist nicht verfügbar! Bitte sicherstellen, dass es korrekt übergeben wurde.");
  }

  console.log("fetchDashboardDataWS: hass gefunden:", hass);

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
