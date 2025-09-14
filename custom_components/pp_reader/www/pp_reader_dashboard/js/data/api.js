export async function fetchDashboardDataWS(hass, panelConfig) {
  // console.log("api.js: Wird aufgerufen mit hass:", hass, "und panelConfig:", panelConfig);
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
  // console.debug("fetchDashboardDataWS: sende WS-Nachricht für Entry", entry_id);

  return await hass.connection.sendMessagePromise({
    type: "pp_reader/get_dashboard_data",
    entry_id,
  });
}

// Websocket-API and subscription for accounts
export async function fetchAccountsWS(hass, panelConfig) {
  // console.log("api.js: Wird aufgerufen mit hass:", hass, "und panelConfig:", panelConfig);
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
  // console.debug("fetchAccountsWS: sende WS-Nachricht für Entry", entry_id);

  // Sende die WebSocket-Nachricht, um die Kontodaten zu laden
  const accounts = await hass.connection.sendMessagePromise({
    type: "pp_reader/get_accounts",
    entry_id,
  });

  // console.debug("fetchAccountsWS: Kontodaten empfangen:", accounts);

  return accounts;
}

// Websocket-API and subscription for last_file_update
export async function fetchLastFileUpdateWS(hass, panelConfig) {
  // console.log("api.js: Wird aufgerufen mit hass:", hass, "und panelConfig:", panelConfig);
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
  //console.debug("fetchLastFileUpdateWS: sende WS-Nachricht für Entry", entry_id);

  // Sende die WebSocket-Nachricht, um das letzte Änderungsdatum zu laden
  const response = await hass.connection.sendMessagePromise({
    type: "pp_reader/get_last_file_update",
    entry_id,
  });

  // console.debug("fetchLastFileUpdateWS: Last file update empfangen:", response);

  return response.last_file_update;
}

// Websocket-API and subscription for portfolios
export async function fetchPortfoliosWS(hass, panelConfig) {
  // console.log("api.js: Wird aufgerufen mit hass:", hass, "und panelConfig:", panelConfig);
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
  // console.debug("fetchPortfoliosWS: sende WS-Nachricht für Entry", entry_id);

  // Sende die WebSocket-Nachricht, um die Depotdaten zu laden
  const portfolios = await hass.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_data",
    entry_id,
  });

  // console.debug("fetchPortfoliosWS: Depotdaten empfangen:", portfolios);

  return portfolios;
}

// NEU: Lazy Load der Wertpapier-Positionen für ein einzelnes Depot
export async function fetchPortfolioPositionsWS(hass, panelConfig, portfolio_uuid) {
  const entry_id = panelConfig
    ?.config
    ?._panel_custom
    ?.config
    ?.entry_id;

  if (!hass || !entry_id) {
    throw new Error(
      `fetchPortfolioPositionsWS: fehlendes hass oder entry_id (hass: ${hass}, entry_id: ${entry_id})`
    );
  }
  if (!portfolio_uuid) {
    throw new Error("fetchPortfolioPositionsWS: fehlendes portfolio_uuid");
  }

  const response = await hass.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_positions",
    entry_id,
    portfolio_uuid,
  });

  // Erwartetes Response-Format:
  // {
  //   portfolio_uuid: "...",
  //   positions: [
  //     { security_uuid, name, current_holdings, purchase_value, current_value, gain_abs, gain_pct }
  //   ]
  // }
  return response;
}
