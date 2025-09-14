function deriveEntryId(hass, panelConfig) {
  // Direkt gesetzte einfache Variante
  let entry_id = panelConfig?.config?.entry_id;

  // Legacy verschachtelte Struktur (panel_custom)
  if (!entry_id) {
    entry_id = panelConfig?.config?._panel_custom?.config?.entry_id;
  }

  // Fallback: aus hass.panels suchen
  if (!entry_id && hass?.panels) {
    const candidate =
      hass.panels.ppreader ||
      hass.panels.pp_reader ||
      Object.values(hass.panels).find(p => p?.webcomponent_name === 'pp-reader-panel');
    entry_id =
      candidate?.config?.entry_id ||
      candidate?.config?._panel_custom?.config?.entry_id;
  }

  return entry_id;
}

// Export für andere Module (Dashboard/Event-Filter)
export function getEntryId(hass, panelConfig) {
  return deriveEntryId(hass, panelConfig);
}

// Dashboard Data
export async function fetchDashboardDataWS(hass, panelConfig) {
  const entry_id = deriveEntryId(hass, panelConfig);
  if (!hass || !entry_id) {
    throw new Error(`fetchDashboardDataWS: fehlendes hass oder entry_id (${entry_id})`);
  }
  return await hass.connection.sendMessagePromise({
    type: "pp_reader/get_dashboard_data",
    entry_id,
  });
}

// Accounts
export async function fetchAccountsWS(hass, panelConfig) {
  const entry_id = deriveEntryId(hass, panelConfig);
  if (!hass || !entry_id) {
    throw new Error(`fetchAccountsWS: fehlendes hass oder entry_id (${entry_id})`);
  }
  return await hass.connection.sendMessagePromise({
    type: "pp_reader/get_accounts",
    entry_id,
  });
}

// Last file update
export async function fetchLastFileUpdateWS(hass, panelConfig) {
  const entry_id = deriveEntryId(hass, panelConfig);
  if (!hass || !entry_id) {
    throw new Error(`fetchLastFileUpdateWS: fehlendes hass oder entry_id (${entry_id})`);
  }
  const response = await hass.connection.sendMessagePromise({
    type: "pp_reader/get_last_file_update",
    entry_id,
  });
  return response?.last_file_update || response || '';
}

// Portfolios
export async function fetchPortfoliosWS(hass, panelConfig) {
  const entry_id = deriveEntryId(hass, panelConfig);
  if (!hass || !entry_id) {
    throw new Error(`fetchPortfoliosWS: fehlendes hass oder entry_id (${entry_id})`);
  }
  return await hass.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_data",
    entry_id,
  });
}

// Positions (lazy)
export async function fetchPortfolioPositionsWS(hass, panelConfig, portfolio_uuid) {
  const entry_id = deriveEntryId(hass, panelConfig);
  if (!hass || !entry_id) {
    throw new Error(`fetchPortfolioPositionsWS: fehlendes hass oder entry_id (${entry_id})`);
  }
  if (!portfolio_uuid) {
    throw new Error("fetchPortfolioPositionsWS: fehlendes portfolio_uuid");
  }
  return await hass.connection.sendMessagePromise({
    type: "pp_reader/get_portfolio_positions",
    entry_id,
    portfolio_uuid,
  });
}
