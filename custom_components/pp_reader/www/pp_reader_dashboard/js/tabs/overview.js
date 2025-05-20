import { createHeaderCard, makeTable } from '../content/elements.js';
import { prepareDashboardData } from '../data/data.js';

export async function renderDashboard() {
  try {
    const { konten, depots, fileUpdated, totalVermoegen } = await prepareDashboardData();

    const formattedFileUpdated = new Date(fileUpdated).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const headerMeta = `
      <div>💰 Gesamtvermögen: <strong>${totalVermoegen.toLocaleString('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}&nbsp;€</strong></div>
    `;

    const headerCard = createHeaderCard('Übersicht', headerMeta);

    return `
    ${headerCard.outerHTML}
    <div class="card">
      <h2>Investment</h2>
      <div class="scroll-container">
        ${makeTable(depots, [
          { key: 'name', label: 'Name' },
          { key: 'count', label: 'Anzahl Positionen', align: 'right' },
          { key: 'value', label: 'Aktueller Wert', align: 'right' },
          { key: 'gain_abs', label: 'gesamt +/-', align: 'right' },
          { key: 'gain_pct', label: '%', align: 'right' }
        ], ['count', 'value', 'gain_abs'])}
      </div>
    </div>

    <div class="card">
      <h2>Liquidität</h2>
      <div class="scroll-container">
        ${makeTable(konten, [
          { key: 'name', label: 'Name' },
          { key: 'balance', label: 'Kontostand', align: 'right' }
        ], ['balance'])}
      </div>
    </div>

    <div class="card footer-card">
      <div class="meta">
        <div>📂 Letzte Aktualisierung Datei: <strong>${formattedFileUpdated}</strong></div>
      </div>
    </div>
    `;
  } catch (error) {
    console.error('Fehler beim Rendern des Dashboards:', error);
    return `<div class="card"><h2>Fehler beim Laden der Daten</h2><p>${error.message}</p></div>`;
  }
}
