export async function fetchStates() {
  const res = await fetch("/pp_reader_api/states", { credentials: "same-origin" });
  if (!res.ok) throw new Error("Fehler beim Laden der Sensoren");
  return await res.json();
}

export async function fetchDashboardDataWS() {
  // Zugriff auf das PPReaderPanel
  const panel = document.querySelector('pp-reader-panel');
  if (!panel) {
    throw new Error("PPReaderPanel nicht gefunden! Bitte das Dashboard als Panel in Home Assistant öffnen.");
  }

  // Zugriff auf das Shadow DOM des Panels
  const dashboard = panel.shadowRoot.querySelector('pp-reader-dashboard');
  console.log("fetchDashboardDataWS: Dashboard gefunden:", dashboard);

  if (!dashboard) {
    throw new Error("pp-reader-dashboard nicht gefunden! Bitte das Dashboard als Panel in Home Assistant öffnen.");
  }

  // Warte, bis hass gesetzt ist
  const waitForHass = () =>
    new Promise((resolve) => {
      const checkHass = () => {
        if (dashboard._hass) {
          resolve(dashboard._hass);
        } else {
          console.warn("fetchDashboardDataWS: hass ist noch nicht verfügbar, warte...");
          setTimeout(checkHass, 100); // Überprüfe alle 100ms
        }
      };
      checkHass();
    });

  const hass = await waitForHass();
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
