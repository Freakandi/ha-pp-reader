export function formatValue(key, value) {
  let formatted;

  // Zahlen absichern
  const safeNumber = (v, minFrac = 2, maxFrac = 2) =>
    (isNaN(v) ? 0 : v).toLocaleString('de-DE', {
      minimumFractionDigits: minFrac,
      maximumFractionDigits: maxFrac
    });

  if (['gain_abs', 'gain_pct'].includes(key)) {
    const symbol = key === 'gain_pct' ? '%' : '€';
    const num = isNaN(value) ? 0 : value;
    formatted = safeNumber(num) + `&nbsp;${symbol}`;
    const cls = num >= 0 ? 'positive' : 'negative';
    return `<span class="${cls}">${formatted}</span>`;
  } else if (key === 'position_count') {
    formatted = (isNaN(value) ? 0 : value).toLocaleString('de-DE');
  } else if (['balance', 'current_value', 'purchase_value'].includes(key)) {
    // Währungswerte (EUR)
    const num = isNaN(value) ? 0 : value;
    formatted = safeNumber(num) + '&nbsp;€';
  } else if (key === 'current_holdings') {
    // Bestände (Anzahl Anteile) – etwas mehr Präzision (bis 4 Nachkommastellen), aber ohne unnötige Nullen
    const num = isNaN(value) ? 0 : value;
    const hasFraction = Math.abs(num % 1) > 0;
    formatted = num.toLocaleString('de-DE', {
      minimumFractionDigits: hasFraction ? 2 : 0,
      maximumFractionDigits: 4
    });
  } else {
    formatted = value;
    if (typeof formatted === 'string') {
      const MAX_LEN = 60;
      if (formatted.length > MAX_LEN) {
        formatted = formatted.slice(0, MAX_LEN - 1) + '…';
      }
      // Entferne frühere Präfixe (Abwärtskompatibilität)
      if (formatted.startsWith('Kontostand ')) {
        formatted = formatted.substring('Kontostand '.length);
      } else if (formatted.startsWith('Depotwert ')) {
        formatted = formatted.substring('Depotwert '.length);
      }
    }
  }
  return formatted;
}

export function makeTable(rows, cols, sumColumns = []) {
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

  // Summen berechnen
  const sums = {};
  cols.forEach(c => {
    if (sumColumns.includes(c.key)) {
      sums[c.key] = rows.reduce((acc, row) => {
        const v = row[c.key];
        return acc + (typeof v === 'number' && !isNaN(v) ? v : 0);
      }, 0);
    }
  });

  // Ableitung Summenfelder:
  // Wenn purchase_value existiert und gain_abs nicht übergeben wurde, kann der Aufrufer es selber liefern.
  // gain_pct Logik:
  //   Falls purchase_value (Summe) vorhanden -> (gain_abs / purchase_value) * 100
  //   Sonst (Fallback) falls current_value vorhanden -> (gain_abs / current_value) * 100
  if ('gain_abs' in sums) {
    if ('purchase_value' in sums && sums.purchase_value > 0) {
      sums['gain_pct'] = (sums['gain_abs'] / sums['purchase_value']) * 100;
    } else if ('current_value' in sums && sums.current_value !== 0) {
      sums['gain_pct'] = (sums['gain_abs'] / (sums['current_value'] - sums['gain_abs'])) * 100;
      // Der obige Ausdruck rekonstruiert purchase_sum ~ current_value - gain_abs (kompatibel zu Portfolio-Formel)
    }
  }

  html += '<tr class="footer-row">';
  cols.forEach((c, idx) => {
    const alignClass = c.align === 'right' ? ' class="align-right"' : '';
    if (idx === 0) {
      html += `<td${alignClass}>Summe</td>`;
    } else if (sums[c.key] != null) {
      html += `<td${alignClass}>${formatValue(c.key, sums[c.key])}</td>`;
    } else if (c.key === 'gain_pct' && sums['gain_pct'] != null) {
      html += `<td${alignClass}>${formatValue('gain_pct', sums['gain_pct'])}</td>`;
    } else {
      html += '<td></td>';
    }
  });
  html += '</tr>';

  html += '</tbody></table>';
  return html;
}

export function createHeaderCard(headerTitle, meta) {
  const headerCard = document.createElement('div');
  headerCard.className = 'header-card';

  headerCard.innerHTML = `
    <div class="header-content">
      <button id="nav-left" class="nav-arrow" aria-label="Vorherige Seite">
        <svg viewBox="0 0 24 24">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path>
        </svg>
      </button>
      <h1 id="headerTitle">${headerTitle}</h1>
      <button id="nav-right" class="nav-arrow" aria-label="Nächste Seite">
        <svg viewBox="0 0 24 24">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path>
        </svg>
      </button>
    </div>
    <div id="headerMeta" class="meta">${meta}</div>
  `;

  return headerCard;
}

// === NEU: Vereinheitlichte Format-Helfer für andere Module (z.B. overview.js) ===
export function formatNumber(value, minFrac = 2, maxFrac = 2) {
  return (isNaN(value) ? 0 : value).toLocaleString('de-DE', {
    minimumFractionDigits: minFrac,
    maximumFractionDigits: maxFrac
  });
}

export function formatGain(value) {
  const num = isNaN(value) ? 0 : value;
  const cls = num >= 0 ? 'positive' : 'negative';
  return `<span class="${cls}">${formatNumber(num)}&nbsp;€</span>`;
}

export function formatGainPct(value) {
  const num = isNaN(value) ? 0 : value;
  const cls = num >= 0 ? 'positive' : 'negative';
  return `<span class="${cls}">${formatNumber(num)}&nbsp;%</span>`;
}
