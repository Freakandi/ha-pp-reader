import { makeTable } from '../content/elements.js';

/**
 * Handler für Kontodaten-Updates.
 * @param {Object} update - Die empfangenen Kontodaten.
 * @param {HTMLElement} root - Das Root-Element des Dashboards.
 */
export function handleAccountUpdate(update, root) {
  console.log("updateConfigsWS: Kontodaten-Update erhalten:", update);

  const updatedAccounts = update.accounts || [];
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

  const lastFileUpdate = update.last_file_update || "Unbekannt";
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