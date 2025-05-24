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

// Websocket-API and subscription for accounts
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

// Websocket-API and subscription for last_file_update
export async function fetchLastFileUpdateWS(hass, panelConfig) {
  console.log("api.js: Wird aufgerufen mit hass:", hass, "und panelConfig:", panelConfig);
  const entry_id = panelConfig
    ?.config
    ?._panel_custom
    ?.config
    ?.entry_id;

  if (!hass || !entry_id) {
    throw new Error(
      `fetchLastFileUpdateWS: fehlendes hass oder entry_id (hass: ${hass}, entry_id: ${entry_id})`
    );
  }
  console.debug("fetchLastFileUpdateWS: sende WS-Nachricht für Entry", entry_id);

  // Sende die WebSocket-Nachricht, um das letzte Änderungsdatum zu laden
  const response = await hass.connection.sendMessagePromise({
    type: "pp_reader/get_last_file_update",
    entry_id,
  });

  console.debug("fetchLastFileUpdateWS: Last file update empfangen:", response);

  return response.last_file_update;
}

// Websocket-API and subscription for portfolios
export async function fetchPortfoliosWS(hass, panelConfig) {
  console.log("api.js: Wird aufgerufen mit hass:", hass, "und panelConfig:", panelConfig);
  const entry_id = panelConfig
    ?.config
    ?._panel_custom
    ?.config
    ?.entry_id;

  if (!hass || !entry_id) {
    throw new Error(
      `fetchPortfoliosWS: fehlendes hass oder entry_id (hass: ${hass}, entry_id: ${entry_id})`
    );
  }
  console.debug("fetchPortfoliosWS: sende WS-Nachricht für Entry", entry_id);

  // Sende die WebSocket-Nachricht, um die Depotdaten zu laden
  const portfolios = await hass.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_data",
    entry_id,
  });

  console.debug("fetchPortfoliosWS: Depotdaten empfangen:", portfolios);

  return portfolios;
}
