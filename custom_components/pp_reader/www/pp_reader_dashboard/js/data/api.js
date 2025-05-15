export async function fetchStates() {
  const res = await fetch("/pp_reader_api/states", { credentials: "same-origin" });
  if (!res.ok) throw new Error("Fehler beim Laden der Sensoren");
  return await res.json();
}

export async function fetchDashboardDataWS() {
  let conn = null;
  if (window.parent && window.parent.hassConnection) {
    conn = await window.parent.hassConnection;
  } else if (window.hassConnection) {
    conn = await window.hassConnection;
  }
  if (!conn) {
    throw new Error("Keine gültige Home Assistant Websocket-Verbindung gefunden! Bitte das Dashboard als Panel in Home Assistant öffnen.");
  }

  // Neuere HA-Versionen: sendMessage statt sendMessagePromise
  if (typeof conn.sendMessagePromise === "function") {
    return conn.sendMessagePromise({
      type: "pp_reader/get_dashboard_data"
    });
  } else if (typeof conn.sendMessage === "function") {
    // sendMessage gibt ein Promise zurück
    return conn.sendMessage({
      type: "pp_reader/get_dashboard_data"
    });
  } else {
    throw new Error("Websocket-Verbindung gefunden, aber keine passende sendMessage-Methode!");
  }
}

