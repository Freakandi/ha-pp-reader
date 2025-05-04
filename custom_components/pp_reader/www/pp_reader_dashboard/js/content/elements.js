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
  } else if (key === 'count') {
    formatted = value.toLocaleString('de-DE');
  } else if (['balance', 'value'].includes(key)) {
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

  if ('gain_abs' in sums && 'value' in sums) {
    // Gesamtprozent berechnen: (Summe Gewinn absolut / Summe Wert) * 100
    sums['gain_pct'] = (sums['gain_abs'] / sums['value']) * 100;
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
