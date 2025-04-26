(async () => {
  console.log("\ud83d\udcf1 PP Reader Dashboard gestartet (via Proxy)");

  async function fetchStates() {
    const res = await fetch("/pp_reader_api/states", { credentials: "same-origin" });
    if (!res.ok) throw new Error("Fehler beim Laden der Sensoren");
    return await res.json();
  }

  function formatValue(key, value) {
    if (key === 'balance' || key === 'value') {
      return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '&nbsp;€';
    } else if (key === 'count') {
      return value.toLocaleString('de-DE');
    } else {
      return value;
    }
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
        html += `<td${alignClass}>${formatValue(c.key, r[c.key])}</td>`;
      });
      html += '</tr>';
    });

    // Summenzeile berechnen
    const sums = {};
    cols.forEach(c => {
      if (c.align === 'right') {
        sums[c.key] = rows.reduce((acc, row) => {
          const value = row[c.key] || 0;
          return acc + (typeof value === 'number' ? value : 0);
        }, 0);
      }
    });

    html += '<tr style="font-weight:bold">';
    cols.forEach((c, index) => {
      const alignClass = c.align === 'right' ? ' class="align-right"' : '';
      if (index === 0) {
        html += `<td${alignClass}>Summe</td>`;
      } else if (sums[c.key] !== undefined) {
        html += `<td${alignClass}>${formatValue(c.key, sums[c.key])}</td>`;
      } else {
        html += '<td></td>';
      }
    });
    html += '</tr>';

    html += '</tbody></table>';
    return html;
  }

  async function renderDashboard() {
    try {
      const states = await fetchStates();

      const firstAccount = states.find(s => s.entity_id.startsWith('sensor.kontostand_'));
      const fileUpdated = firstAccount?.attributes?.letzte_aktualisierung || 'Unbekannt';

      const lastUpdatedRaw = firstAccount?.last_updated;
      const lastUpdated = lastUpdatedRaw
        ? new Date(lastUpdatedRaw).toLocaleString('de-DE', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })
        : 'Unbekannt';

      const konten = states
        .filter(s => s.entity_id.startsWith('sensor.kontostand_'))
        .map(s => ({
          name: s.attributes.friendly_name,
          balance: parseFloat(s.state)
        }));

      const depots = states
        .filter(s => s.entity_id.startsWith('sensor.depotwert_'))
        .map(s => ({
          name: s.attributes.friendly_name,
          count: s.attributes.anzahl_wertpapiere,
          value: parseFloat(s.state)
        }));

      const root = document.querySelector("pp-reader-dashboard");
      root.innerHTML = `
        <h2>Portfolio Dashboard</h2>
        <p><strong>📂 Letzte Aktualisierung Portfolio-Datei:</strong> ${fileUpdated}</p>
        <p><strong>📈 Auf Update geprüft am:</strong> ${lastUpdated}</p>
        <h2>Konten</h2>
        ${makeTable(konten, [
          { key: 'name', label: 'Name' },
          { key: 'balance', label: 'Kontostand', align: 'right' }
        ])}
        <h2>Depots</h2>
        ${makeTable(depots, [
          { key: 'name', label: 'Name' },
          { key: 'count', label: 'Anzahl Positionen', align: 'right' },
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
