import { createHeaderCard } from '../content/elements.js';
import { fetchDashboardDataWS } from '../data/api.js';

export async function renderTestTab() {
  let konten = [];
  let depots = [];
  let error = null;

  try {
    const data = await fetchDashboardDataWS();
    konten = data.accounts || [];
    depots = data.portfolios || [];
    console.debug("Empfangene Konten:", konten);
    console.debug("Empfangene Depots:", depots);
  } catch (e) {
    error = e.message;
  }

  // Meta-Informationen für die Header-Card
  const meta = `
    <div>Dies ist ein Test-Tab</div>
  `;

  // Header-Card erstellen
  const headerCard = createHeaderCard('Test Tab', meta);

  // Tab-Inhalte zurückgeben
  return `
    ${headerCard.outerHTML}
    <div class="card">
      <h2>Konten aus DB</h2>
      ${error ? `<div style="color:red;">Fehler: ${error}</div>` : ""}
      <ul>
        ${konten.map(k => `<li>${k.name} (${k.currency_code})</li>`).join("")}
      </ul>
    </div>
    <div class="card">
      <h2>Depots aus DB</h2>
      <ul>
        ${depots.map(d => `<li>${d.name}</li>`).join("")}
      </ul>
    </div>
  `;
}