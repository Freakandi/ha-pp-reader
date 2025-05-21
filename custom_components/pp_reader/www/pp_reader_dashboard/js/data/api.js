export async function fetchStates() {
  const res = await fetch("/pp_reader_api/states", { credentials: "same-origin" });
  if (!res.ok) throw new Error("Fehler beim Laden der Sensoren");
  return await res.json();
}

export async function fetchDashboardDataWS() {
  console.log("fetchDashboardDataWS: Wird aufgerufen im Kontext:", document);

  const panel = document.querySelector('pp-reader-panel');
  console.log("fetchDashboardDataWS: Panel gefunden:", panel);

  if (!panel) {
    throw new Error("PPReaderPanel nicht gefunden! Bitte das Dashboard als Panel in Home Assistant öffnen.");
  }

  const dashboard = panel.shadowRoot.querySelector('pp-reader-dashboard');
  console.log("fetchDashboardDataWS: Dashboard gefunden:", dashboard);

  if (!dashboard || !dashboard._hass) {
    throw new Error("Keine gültige Home Assistant Websocket-Verbindung gefunden! Bitte das Dashboard als Panel in Home Assistant öffnen.");
  }

  const hass = dashboard._hass;
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
