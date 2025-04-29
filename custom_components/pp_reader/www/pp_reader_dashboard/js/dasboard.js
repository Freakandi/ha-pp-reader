import { createThemeToggle } from './themeToggle.js';
import { makeTable } from './elements.js';
import { prepareDashboardData } from './data.js';

console.log("📱 PP Reader Dashboard gestartet (modular)");

async function renderDashboard() {
  try {
    const {
      konten,
      depots,
      totalVermoegen,
      fileUpdated,
      lastUpdated
    } = await prepareDashboardData();

    const root = document.querySelector("pp-reader-dashboard");
    root.innerHTML = `
      <div class="card header-card">
        <h1>Portfolio Dashboard</h1>
        <div class="meta">
          <div>💰 Gesamtvermögen: <strong>${totalVermoegen.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})}&nbsp;€</strong></div>
        </div>
      </div>

      <div class="card">
        <h2>Konten</h2>
        <div class="scroll-container">
          ${makeTable(konten, [
            { key: 'name', label: 'Name' },
            { key: 'balance', label: 'Kontostand', align: 'right' }
          ], ['balance'])}
        </div>
      </div>

      <div class="card">
        <h2>Depots</h2>
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

      <div class="card footer-card">
        <div class="meta">
          <div>📂 Letzte Aktualisierung Datei: <strong>${fileUpdated}</strong></div>
          <div>📈 Geprüft am: <strong>${lastUpdated}</strong></div>
        </div>
      </div>
    `;

    createThemeToggle();

  } catch (err) {
    console.error("Fehler beim Laden des Dashboards:", err);
    document.querySelector("pp-reader-dashboard").innerHTML =
      `<p style="color:red">⚠️ Fehler beim Laden der Daten: ${err.message}</p>`;
  }
}

customElements.define('pp-reader-dashboard', class extends HTMLElement {
  connectedCallback() {
    renderDashboard();
  }
});
