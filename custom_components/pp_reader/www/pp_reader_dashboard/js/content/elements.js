export function formatValue(key, value) {
  let formatted;
  if (['gain_abs', 'gain_pct'].includes(key)) {
    const symbol = key === 'gain_pct' ? '%' : '€';
    formatted = value.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + `&nbsp;${symbol}`;
    const cls = value >= 0 ? 'positive' : 'negative';
    return `<span class="${cls}">${formatted}</span>`;
  } else if (key === 'position_count') {
    formatted = value.toLocaleString('de-DE');
  } else if (['balance', 'current_value'].includes(key)) {
    formatted = value.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + '&nbsp;€';
  } else {
    // HIER wird abgeschnitten:
    formatted = value;
    if (typeof formatted === 'string') {
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
  let totalGainAbs = 0;
  let totalValue = 0;

  cols.forEach(c => {
    if (c.align === 'right' && sumColumns.includes(c.key)) {
      sums[c.key] = rows.reduce((acc, row) => {
        const v = row[c.key];
        return acc + (typeof v === 'number' ? v : 0);
      }, 0);
    }
  });

  if ('gain_abs' in sums && 'current_value' in sums) {
    // Gesamtprozent berechnen: (Summe Gewinn absolut / Summe Wert) * 100
    sums['gain_pct'] = (sums['gain_abs'] / sums['current_value']) * 100;
  }

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
