export async function fetchStates() {
  const res = await fetch("/pp_reader_api/states", { credentials: "same-origin" });
  if (!res.ok) throw new Error("Fehler beim Laden der Sensoren");
  return await res.json();
}

export async function fetchDashboardDataWS() {
  let conn = null;

  // Verbindung zur Home Assistant Websocket-API herstellen
  if (window.parent && window.parent.hassConnection) {
    conn = await window.parent.hassConnection;
  } else if (window.hassConnection) {
    conn = await window.hassConnection;
  }

  if (!conn) {
    throw new Error("Keine gültige Home Assistant Websocket-Verbindung gefunden! Bitte das Dashboard als Panel in Home Assistant öffnen.");
  }

  // Websocket-Nachricht senden
  try {
    const response = await conn.sendMessage({
      type: "pp_reader/get_dashboard_data"
    });
    return response;
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der Dashboard-Daten: ${error.message}`);
  }
}

