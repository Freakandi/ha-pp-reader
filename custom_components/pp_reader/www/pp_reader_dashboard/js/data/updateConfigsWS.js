import { makeTable } from '../content/elements.js';

/**
 * Handler für Kontodaten-Updates.
 * @param {Object} update - Die empfangenen Kontodaten.
 * @param {HTMLElement} root - Das Root-Element des Dashboards.
 */
export function handleAccountUpdate(update, root) {
  console.log("updateConfigsWS: Kontodaten-Update erhalten:", update);

  const updatedAccounts = update || [];
  updateAccountTable(updatedAccounts, root);
}

/**
 * Aktualisiert die Tabelle mit den Kontodaten.
 * @param {Array} accounts - Die aktualisierten Kontodaten.
 * @param {HTMLElement} root - Das Root-Element des Dashboards.
 */
function updateAccountTable(accounts, root) {
  const accountTable = root.querySelector('.account-table');
  if (!accountTable) {
    console.warn("updateConfigsWS: Account-Tabelle nicht gefunden, überspringe Update.");
    return;
  }

  // Aktualisiere die Tabelle mit den neuen Kontodaten
  accountTable.innerHTML = makeTable(accounts, [
    { key: 'name', label: 'Name' },
    { key: 'balance', label: 'Kontostand', align: 'right' }
  ], ['balance']);
}

/**
 * Handler für Last-File-Update.
 * @param {Object} update - Die empfangenen Last-File-Update-Daten.
 * @param {HTMLElement} root - Das Root-Element des Dashboards.
 */
export function handleLastFileUpdate(update, root) {
  console.log("updateConfigsWS: Last-File-Update erhalten:", update);

  const lastFileUpdate = update || "Unbekannt";
  updateLastFileUpdate(lastFileUpdate, root);
}

/**
 * Aktualisiert die Anzeige des Last-File-Updates.
 * @param {string} lastFileUpdate - Das letzte Änderungsdatum.
 * @param {HTMLElement} root - Das Root-Element des Dashboards.
 */
function updateLastFileUpdate(lastFileUpdate, root) {
  const lastFileUpdateElement = root.querySelector('.last-file-update');
  if (!lastFileUpdateElement) {
    console.warn("updateConfigsWS: Last-File-Update-Element nicht gefunden, überspringe Update.");
    return;
  }

  // Aktualisiere nur den Zeitstempel, ohne den Text zu ändern
  lastFileUpdateElement.innerHTML = `📂 Letzte Aktualisierung Datei: <strong>${lastFileUpdate}</strong>`;
}

/**
 * Handler für Depot-Updates.
 * @param {Object} update - Die empfangenen Depotdaten.
 * @param {HTMLElement} root - Das Root-Element des Dashboards.
 */
export function handlePortfolioUpdate(update, root) {
  console.log("updateConfigsWS: Depotdaten-Update erhalten:", update);

  const updatedPortfolios = update || [];
  updatePortfolioTable(updatedPortfolios, root);
}

/**
 * Aktualisiert die Tabelle mit den Depotdaten.
 * @param {Array} portfolios - Die aktualisierten Depotdaten.
 * @param {HTMLElement} root - Das Root-Element des Dashboards.
 */
function updatePortfolioTable(portfolios, root) {
  const portfolioTable = root.querySelector('.scroll-container table');
  if (!portfolioTable) {
    console.warn("updateConfigsWS: Depot-Tabelle nicht gefunden, überspringe Update.");
    return;
  }

  // Berechne absolute und prozentuale Gewinne für jedes Depot
  const portfoliosWithGains = portfolios.map(portfolio => {
    const gainAbs = portfolio.current_value - portfolio.purchase_sum; // Absoluter Gewinn
    const gainPct = portfolio.purchase_sum > 0
      ? (gainAbs / portfolio.purchase_sum) * 100 // Prozentualer Gewinn
      : 0; // Verhindere Division durch 0
    return {
      ...portfolio,
      gain_abs: gainAbs,
      gain_pct: gainPct,
    };
  });

  // Aktualisiere die Tabelle mit den neuen Depotdaten
  portfolioTable.innerHTML = makeTable(portfoliosWithGains, [
    { key: 'name', label: 'Name' },
    { key: 'position_count', label: 'Anzahl Positionen', align: 'right' },
    { key: 'current_value', label: 'Aktueller Wert', align: 'right' },
    { key: 'gain_abs', label: 'gesamt +/-', align: 'right' },
    { key: 'gain_pct', label: '%', align: 'right' }
  ], ['position_count', 'current_value', 'gain_abs']);
}