export async function fetchStates() {
  const res = await fetch("/pp_reader_api/states", { credentials: "same-origin" });
  if (!res.ok) throw new Error("Fehler beim Laden der Sensoren");
  return await res.json();
}

export async function fetchDashboardDataWS() {
  // Home Assistant Websocket-Verbindung holen
  const conn = window.parent && window.parent.hassConnection
    ? await window.parent.hassConnection
    : null;
  if (!conn) throw new Error("Keine Home Assistant Websocket-Verbindung gefunden!");

  // Websocket-API aufrufen
  return conn.sendMessagePromise({
    type: "pp_reader/get_dashboard_data"
  });
}

