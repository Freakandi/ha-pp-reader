import { fetchDashboardDataWS } from '../data/api.js';

export async function renderTestTab() {
  let konten = [];
  let depots = [];
  let error = null;

  try {
    const data = await fetchDashboardDataWS();
    konten = data.accounts || [];
    depots = data.portfolios || [];
  } catch (e) {
    error = e.message;
  }

  return `
    <div class="header-card">
      <h1>Test Tab</h1>
      <div class="meta">
        <div>Dies ist ein Test-Tab</div>
      </div>
    </div>
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