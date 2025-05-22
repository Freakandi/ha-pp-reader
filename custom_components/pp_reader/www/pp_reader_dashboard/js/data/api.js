export async function fetchStates() {
  const res = await fetch("/pp_reader_api/states", { credentials: "same-origin" });
  if (!res.ok) throw new Error("Fehler beim Laden der Sensoren");
  return await res.json();
}

export async function fetchDashboardDataWS(hass, panelConfig) {
  console.log("api.js: Wird aufgerufen mit hass:", hass, "und panelConfig:", panelConfig);
  const entry_id = panelConfig
    ?.config
    ?._panel_custom
    ?.config
    ?.entry_id;

  if (!hass || !entry_id) {
    throw new Error(
      `fetchDashboardDataWS: fehlendes hass oder entry_id (hass: ${hass}, entry_id: ${entry_id})`
    );
  }
  console.debug("fetchDashboardDataWS: sende WS-Nachricht für Entry", entry_id);

  return await hass.connection.sendMessagePromise({
    type: "pp_reader/get_dashboard_data",
    entry_id,
  });
}
