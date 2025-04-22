class PPReaderDashboard extends HTMLElement {
  set hass(hass) {
    // 1. Alle Kontostand‑Sensoren
    const konten = Object.values(hass.states)
      .filter(s => s.entity_id.startsWith('sensor.kontostand_'))
      .map(s => ({
        name: s.attributes.friendly_name,
        balance: parseFloat(s.state).toFixed(2)
      }));

    // 2. Alle Depotwert‑Sensoren
    const depots = Object.values(hass.states)
      .filter(s => s.entity_id.startsWith('sensor.depotwert_'))
      .map(s => ({
        name: s.attributes.friendly_name,
        count: s.attributes.anzahl_wertpapiere,
        value: parseFloat(s.state).toFixed(2)
      }));

    // 3. Tabellen‑Helper
    const makeTable = (rows, cols) => {
      let html = '<table><thead><tr>';
      cols.forEach(c => html += `<th>${c.label}</th>`);
      html += '</tr></thead><tbody>';
      rows.forEach(r => {
        html += '<tr>';
        cols.forEach(c => html += `<td>${r[c.key]}</td>`);
        html += '</tr>';
      });
      html += '</tbody></table>';
      return html;
    };

    // 4. Rendern
    this.innerHTML = `
      <h2>Konten</h2>
      ${makeTable(konten, [
        { key: 'name', label: 'Name' },
        { key: 'balance', label: 'Kontostand (€)' }
      ])}
      <h2>Depots</h2>
      ${makeTable(depots, [
        { key: 'name', label: 'Name' },
        { key: 'count', label: 'Anzahl Wertpapiere' },
        { key: 'value', label: 'Depotwert (€)' }
      ])}
    `;
  }
}
customElements.define('pp-reader-dashboard', PPReaderDashboard);
