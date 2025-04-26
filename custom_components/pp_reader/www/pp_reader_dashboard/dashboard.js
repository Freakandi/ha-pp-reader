(async () => {
  console.log("📡 PP Reader Dashboard gestartet (via Proxy)");

  async function fetchStates() {
    const res = await fetch("/pp_reader_api/states", { credentials: "same-origin" });
    if (!res.ok) throw new Error("Fehler beim Laden der Sensoren");
    return await res.json();
  }

function makeTable(rows, cols) {
  let html = '<table><thead><tr>';
  cols.forEach(c => {
    const alignClass = c.align === 'right' ? ' class="align-right"' : '';
    html += `<th${alignClass}>${c.label}</th>`;
  });
  html += '</tr></thead><tbody>';
  rows.forEach(r => {
    html += '<tr>';
    cols.forEach(c => {
      const alignClass = c.align === 'right' ? ' class="align-right"' : '';
      html += `<td${alignClass}>${r[c.key]}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

  async function renderDashboard() {
    try {
      const states = await fetchStates();

      const konten = states
        .filter(s => s.entity_id.startsWith('sensor.kontostand_'))
        .map(s => ({
          name: s.attributes.friendly_name,
          balance: parseFloat(s.state).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '&nbsp;€'
        }));

      const depots = states
        .filter(s => s.entity_id.startsWith('sensor.depotwert_'))
        .map(s => ({
          name: s.attributes.friendly_name,
          count: s.attributes.anzahl_wertpapiere,
          value: parseFloat(s.state).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '&nbsp;€'
        }));

      const root = document.querySelector("pp-reader-dashboard");
      root.innerHTML = `
        <h2>Konten</h2>
        ${makeTable(konten, [
          { key: 'name', label: 'Name' },
          { key: 'balance', label: 'Kontostand', align: 'right' }
        ])}
        <h2>Depots</h2>
        ${makeTable(depots, [
          { key: 'name', label: 'Name' },
          { key: 'count', label: 'Anzahl Wertpapiere', align: 'right' },
          { key: 'value', label: 'Depotwert', align: 'right' }
        ])}
      `;

    } catch (err) {
      console.error("Fehler beim Laden des Dashboards:", err);
      document.querySelector("pp-reader-dashboard").innerHTML =
        `<p style="color:red">⚠️ Fehler beim Laden der Daten: ${err.message}</p>`;
    }
  }

  class PPReaderDashboard extends HTMLElement {
    connectedCallback() {
      renderDashboard();
    }
  }
  customElements.define('pp-reader-dashboard', PPReaderDashboard);
})();
