import { createHeaderCard, makeTable } from '../content/elements.js';
import { fetchAccountsWS, fetchLastFileUpdateWS, fetchPortfoliosWS } from '../data/api.js';

export async function renderDashboard(root, hass, panelConfig) {
  try {
    // Lade Depotdaten über WebSocket
    const portfoliosResponse = await fetchPortfoliosWS(hass, panelConfig);
    const depots = portfoliosResponse.portfolios || [];

    // Berechne absolute und prozentuale Gewinne für jedes Depot
    const depotsWithGains = depots.map(depot => {
      const gainAbs = depot.current_value - depot.purchase_sum; // Absoluter Gewinn
      const gainPct = depot.purchase_sum > 0
        ? (gainAbs / depot.purchase_sum) * 100 // Prozentualer Gewinn
        : 0; // Verhindere Division durch 0
      return {
        ...depot,
        gain_abs: gainAbs,
        gain_pct: gainPct,
      };
    });

    // Lade Kontodaten über WebSocket
    const accountsResponse = await fetchAccountsWS(hass, panelConfig);
    // Vorher: const konten = accountsResponse.accounts || [];
    const allAccounts = accountsResponse.accounts || [];
    const konten = allAccounts.filter(a => (a.currency_code || 'EUR') === 'EUR');
    const fxKonten = allAccounts.filter(a => (a.currency_code || 'EUR') !== 'EUR');

    // Lade last_file_update über WebSocket
    const lastFileUpdateResponse = await fetchLastFileUpdateWS(hass, panelConfig);
    const lastFileUpdate = lastFileUpdateResponse || 'Unbekannt';

    // Gesamtvermögen (Alle Konten in EUR, da balance bereits EUR-Wert enthält)
    const totalKonten = allAccounts.reduce((acc, k) => acc + (isNaN(k.balance) ? 0 : k.balance), 0);
    const totalDepots = depotsWithGains.reduce((acc, d) => acc + (isNaN(d.current_value) ? 0 : d.current_value), 0);
    const totalVermoegen = totalKonten + totalDepots;

    // Header-Metadaten
    const headerMeta = `
      <div>💰 Gesamtvermögen: <strong>${totalVermoegen.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}&nbsp;€</strong></div>
    `;

    // Header-Karte erstellen
    const headerCard = createHeaderCard('Übersicht', headerMeta);

    return `
    ${headerCard.outerHTML}

    <div class="card">
      <h2>Investment</h2>
      <div class="scroll-container portfolio-table">
        ${makeTable(depotsWithGains, [
      { key: 'name', label: 'Name' },
      { key: 'position_count', label: 'Anzahl Positionen', align: 'right' },
      { key: 'current_value', label: 'Aktueller Wert', align: 'right' },
      { key: 'gain_abs', label: 'gesamt +/-', align: 'right' },
      { key: 'gain_pct', label: '%', align: 'right' }
    ], ['position_count', 'current_value', 'gain_abs'])}
      </div>
    </div>

    <div class="card">
      <h2>Liquidität</h2>
      <div class="scroll-container account-table">
        ${makeTable(konten, [
      { key: 'name', label: 'Name' },
      { key: 'balance', label: 'Kontostand (EUR)', align: 'right' }
    ], ['balance'])}
      </div>
    </div>

    ${fxKonten.length ? `
    <div class="card">
      <h2>Fremdwährungen</h2>
      <div class="scroll-container fx-account-table">
        ${makeTable(
      fxKonten.map(a => ({
        ...a,
        fx_display: `${(a.orig_balance ?? 0).toLocaleString('de-DE', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}&nbsp;${a.currency_code}`
      })),
      [
        { key: 'name', label: 'Name' },
        { key: 'fx_display', label: 'Betrag (FX)' },
        { key: 'balance', label: 'EUR', align: 'right' }
      ],
      ['balance']
    )}
      </div>
    </div>` : ''}

    <div class="card footer-card">
      <div class="meta">
        <div class="last-file-update">📂 Letzte Aktualisierung Datei: <strong>${lastFileUpdate}</strong></div>
      </div>
    </div>
    `;
  } catch (error) {
    console.error('Fehler beim Rendern des Dashboards:', error);
    return `<div class="card"><h2>Fehler beim Laden der Daten</h2><p>${error.message}</p></div>`;
  }
}
