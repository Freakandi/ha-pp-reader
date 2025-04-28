(async () => {
  console.log("📱 PP Reader Dashboard gestartet (via Proxy)");

  async function fetchStates() {
    const res = await fetch("/pp_reader_api/states", { credentials: "same-origin" });
    if (!res.ok) throw new Error("Fehler beim Laden der Sensoren");
    return await res.json();
  }

  function formatValue(key, value) {
    let formatted;
    if (['balance', 'value', 'gain_abs'].includes(key)) {
      formatted = value.toLocaleString('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) + '&nbsp;€';
    } else if (key === 'count') {
      formatted = value.toLocaleString('de-DE');
    } else if (key === 'gain_pct') {
      formatted = value.toLocaleString('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) + '&nbsp;%';
    } else {
      formatted = value;
    }
    if (typeof value === 'number') {
      const cls = value >= 0 ? 'positive' : 'negative';
      return `<span class="${cls}">${formatted}</span>`;
    }
    return formatted;
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

    // Fußzeile für value & gain_abs
    const sums = {};
    cols.forEach(c => {
      if (c.align === 'right' && ['value', 'gain_abs'].includes(c.key)) {
        sums[c.key] = rows.reduce((acc, row) => {
          const v = row[c.key];
          return acc + (typeof v === 'number' ? v : 0);
        }, 0);
      }
    });

    html += '<tr class="footer-row">';
    cols.forEach((c, idx) => {
      const alignClass = c.align === 'right' ? ' class="align-right"' : '';
      if (idx === 0) {
        html += `<td${alignClass}>Summe</td>`;
      } else if (sums[c.key] != null) {
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

      // Letzte Updates
      const firstAccount = states.find(s => s.entity_id.startsWith('sensor.kontostand_'));
      const fileUpdated = firstAccount?.attributes?.letzte_aktualisierung || 'Unbekannt';
      const lastUpdatedRaw = firstAccount?.last_updated;
      const lastUpdated = lastUpdatedRaw
        ? new Date(lastUpdatedRaw).toLocaleString('de-DE', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })
        : 'Unbekannt';

      // Konten und Summen
      const konten = states
        .filter(s => s.entity_id.startsWith('sensor.kontostand_'))
        .map(s => ({ name: s.attributes.friendly_name, balance: parseFloat(s.state) }));
      const totalKonten = konten.reduce((acc, k) => acc + (isNaN(k.balance) ? 0 : k.balance), 0);

      // Depots inkl. Gewinnsensoren
      const depots = states
        .filter(s => s.entity_id.startsWith('sensor.depotwert_'))
        .map(s => {
          const slug = s.entity_id.replace('sensor.depotwert_', '');
          const absId = `sensor.kursgewinn_absolut_${slug}`;
          const pctId = `sensor.kursgewinn_${slug}`;                // hier angepasst
          const gainAbsState = states.find(x => x.entity_id === absId);
          const gainPctState = states.find(x => x.entity_id === pctId);
          return {
            name: s.attributes.friendly_name,
            count: s.attributes.anzahl_wertpapiere,
            value: parseFloat(s.state),
            gain_abs: gainAbsState ? parseFloat(gainAbsState.state) : 0,
            gain_pct: gainPctState ? parseFloat(gainPctState.state) : 0
          };
        });
      const totalDepots = depots.reduce((acc, d) => acc + (isNaN(d.value) ? 0 : d.value), 0);

      // Gesamtvermögen
      const totalVermoegen = totalKonten + totalDepots;

      // Rendern
      const root = document.querySelector("pp-reader-dashboard");
      root.innerHTML = `
        <div class="card header-card">
          <h1>Portfolio Dashboard</h1>
          <div class="meta">
            <div>📂 Letzte Aktualisierung Datei: <strong>${fileUpdated}</strong></div>
            <div>📈 Geprüft am: <strong>${lastUpdated}</strong></div>
            <div>💰 Gesamtvermögen: <strong>${totalVermoegen.toLocaleString('de-DE',{
              minimumFractionDigits:2, maximumFractionDigits:2
            })}&nbsp;€</strong></div>
          </div>
        </div>

        <div class="card">
          <h2>Konten</h2>
          ${makeTable(konten, [
            { key: 'name', label: 'Name' },
            { key: 'balance', label: 'Kontostand', align: 'right' }
          ])}
        </div>

        <div class="card">
          <h2>Depots</h2>
          ${makeTable(depots, [
            { key: 'name', label: 'Name' },
            { key: 'count', label: 'Anzahl Werte', align: 'right' },
            { key: 'value', label: 'Aktueller Wert', align: 'right' },
            { key: 'gain_abs', label: 'gesamt +/-', align: 'right' },
            { key: 'gain_pct', label: '%', align: 'right' }
          ])}
        </div>
      `;

    } catch (err) {
      console.error("Fehler beim Laden des Dashboards:", err);
      document.querySelector("pp-reader-dashboard").innerHTML =
        `<p style="color:red">⚠️ Fehler beim Laden der Daten: ${err.message}</p>`;
    }
  }

  customElements.define('pp-reader-dashboard', class extends HTMLElement {
    connectedCallback() { renderDashboard(); }
  });
})();
