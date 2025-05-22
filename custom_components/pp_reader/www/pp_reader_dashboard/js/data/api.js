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

export async function fetchAccountsWS(hass, panelConfig) {
  console.log("api.js: Wird aufgerufen mit hass:", hass, "und panelConfig:", panelConfig);
  const entry_id = panelConfig
    ?.config
    ?._panel_custom
    ?.config
    ?.entry_id;

  if (!hass || !entry_id) {
    throw new Error(
      `fetchAccountsWS: fehlendes hass oder entry_id (hass: ${hass}, entry_id: ${entry_id})`
    );
  }
  console.debug("fetchAccountsWS: sende WS-Nachricht für Entry", entry_id);

  // Sende die WebSocket-Nachricht, um die Kontodaten zu laden
  const accounts = await hass.connection.sendMessagePromise({
    type: "pp_reader/get_accounts",
    entry_id,
  });

  console.debug("fetchAccountsWS: Kontodaten empfangen:", accounts);

  return accounts;
}

export function subscribeAccountUpdates(hass, entry_id, callback) {
  if (!hass || !entry_id) {
    throw new Error(
      `subscribeAccountUpdates: fehlendes hass oder entry_id (hass: ${hass}, entry_id: ${entry_id})`
    );
  }

  console.debug("subscribeAccountUpdates: Abonniere Updates für Entry", entry_id);

  // WebSocket-Listener registrieren
  return hass.connection.subscribeMessage((message) => {
    console.debug("subscribeAccountUpdates: Update empfangen:", message);
    callback(message);
  }, {
    type: "pp_reader/accounts_updated",
    entry_id,
  });
}
