import { createHeaderCard } from '../content/elements.js';
import { fetchDashboardDataWS } from '../data/api.js';

export async function renderTestTab(hass) {
  console.log("renderTestTab: Wird aufgerufen mit hass:", hass);

  if (!hass) {
    console.error("renderTestTab: Das hass-Objekt ist nicht verfügbar!");
    return `<div class="card"><h2>Fehler</h2><p>Das hass-Objekt ist nicht verfügbar!</p></div>`;
  }

  let konten = [];
  let depots = [];
  let error = null;

  try {
    const data = await fetchDashboardDataWS(hass); // Übergib das hass-Objekt
    konten = data.accounts || [];
    depots = data.portfolios || [];
    console.debug("renderTestTab: Empfangene Konten:", konten);
    console.debug("renderTestTab: Empfangene Depots:", depots);
  } catch (e) {
    error = e.message;
    console.error("renderTestTab: Fehler beim Abrufen der Dashboard-Daten:", error);
  }

  const meta = `<div>Dies ist ein Test-Tab</div>`;
  const headerCard = createHeaderCard('Test Tab', meta);

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