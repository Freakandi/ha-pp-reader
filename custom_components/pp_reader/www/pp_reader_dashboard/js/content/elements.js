export function formatValue(key, value, row = undefined, context = undefined) {
  let formatted;

  const toNumber = (v) => {
    if (typeof v === 'number') {
      return v;
    }
    if (typeof v === 'string' && v.trim() !== '') {
      const cleaned = v
        .replace(/\s+/g, '')
        .replace(/[^0-9,.-]/g, '')
        .replace(/\.(?=\d{3}(\D|$))/g, '')
        .replace(',', '.');
      const parsed = Number.parseFloat(cleaned);
      return Number.isNaN(parsed) ? Number.NaN : parsed;
    }
    return Number.NaN;
  };

  const safeNumber = (v, minFrac = 2, maxFrac = 2) => {
    const num = typeof v === 'number' ? v : toNumber(v);
    if (!Number.isFinite(num)) {
      return '';
    }
    return num.toLocaleString('de-DE', {
      minimumFractionDigits: minFrac,
      maximumFractionDigits: maxFrac
    });
  };

  const renderMissingValue = (reason = '') => {
    const title = reason || 'Kein Wert verfügbar';
    return `<span class="missing-value" role="note" aria-label="${title}" title="${title}">—</span>`;
  };

  if (['gain_abs', 'gain_pct'].includes(key)) {
    const symbol = key === 'gain_pct' ? '%' : '€';
    const num = isNaN(value) ? 0 : value;
    formatted = safeNumber(num) + `&nbsp;${symbol}`;
    const cls = num >= 0 ? 'positive' : 'negative';
    return `<span class="${cls}">${formatted}</span>`;
  } else if (key === 'position_count') {
    formatted = (isNaN(value) ? 0 : value).toLocaleString('de-DE');
  } else if (['balance', 'current_value', 'purchase_value'].includes(key)) {
    const numeric = typeof value === 'number' ? value : toNumber(value);
    if (!Number.isFinite(numeric)) {
      if (row?.fx_unavailable) {
        return renderMissingValue('Wechselkurs nicht verfügbar – EUR-Wert unbekannt');
      }
      if (context && context.hasValue === false) {
        return renderMissingValue();
      }
      return renderMissingValue();
    }
    formatted = safeNumber(numeric) + '&nbsp;€';
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
  if (formatted === '' || formatted == null) {
    return renderMissingValue();
  }

  return formatted;
}

export function makeTable(rows, cols, sumColumns = [], options = {}) {
  /**
   * Erweiterung (optional):
   * options.sortable    -> true | false (default false)
   * options.defaultSort -> { key: 'name', dir: 'asc' } (nur wirksam falls sortable)
   *
   * Bestehende Aufrufer (3 Parameter) bleiben kompatibel.
   */
  const { sortable = false, defaultSort = { key: '', dir: 'asc' } } = options || {};

  const escapeAttribute = (value) => {
    if (value == null) {
      return '';
    }
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;');
  };

  let html = '<table><thead><tr>';
  cols.forEach(c => {
    const alignClass = c.align === 'right' ? ' class="align-right"' : '';
    // Falls sortable: th data-sort-key setzen (nur wenn key vorhanden)
    if (sortable && c.key) {
      html += `<th${alignClass} data-sort-key="${c.key}">${c.label}</th>`;
    } else {
      html += `<th${alignClass}>${c.label}</th>`;
    }
  });
  html += '</tr></thead><tbody>';

  rows.forEach(r => {
    html += '<tr>';
    cols.forEach(c => {
      const alignClass = c.align === 'right' ? ' class="align-right"' : '';
      html += `<td${alignClass}>${formatValue(c.key, r[c.key], r)}</td>`;
    });
    html += '</tr>';
  });

  // Summen berechnen (unverändert)
  const sums = {};
  const sumMeta = {};
  cols.forEach(c => {
    if (sumColumns.includes(c.key)) {
      let total = 0;
      let hasValue = false;
      rows.forEach(row => {
        const v = row[c.key];
        if (typeof v === 'number' && Number.isFinite(v)) {
          total += v;
          hasValue = true;
        }
      });
      sums[c.key] = hasValue ? total : null;
      sumMeta[c.key] = { hasValue };
    }
  });

  if ('gain_abs' in sums) {
    if ('purchase_value' in sums && sums.purchase_value > 0) {
      sums['gain_pct'] = (sums['gain_abs'] / sums['purchase_value']) * 100;
    } else if ('current_value' in sums && sums.current_value !== 0) {
      sums['gain_pct'] = (sums['gain_abs'] / (sums['current_value'] - sums['gain_abs'])) * 100;
    }
  }

  const aggregatedGainPct = Number.isFinite(sums['gain_pct']) ? sums['gain_pct'] : null;
  let aggregatedGainPctLabel = '';
  let aggregatedGainPctSign = 'neutral';

  if (aggregatedGainPct != null) {
    aggregatedGainPctLabel = `${formatNumber(aggregatedGainPct)}\u00a0%`;
    if (aggregatedGainPct > 0) {
      aggregatedGainPctSign = 'positive';
    } else if (aggregatedGainPct < 0) {
      aggregatedGainPctSign = 'negative';
    }
  }

  html += '<tr class="footer-row">';
  cols.forEach((c, idx) => {
    const alignClass = c.align === 'right' ? ' class="align-right"' : '';
    if (idx === 0) {
      html += `<td${alignClass}>Summe</td>`;
      return;
    }

    if (sums[c.key] != null) {
      let extraAttributes = '';
      if (c.key === 'gain_abs' && aggregatedGainPctLabel) {
        extraAttributes = ` data-gain-pct="${escapeAttribute(aggregatedGainPctLabel)}" data-gain-sign="${escapeAttribute(aggregatedGainPctSign)}"`;
      }
      html += `<td${alignClass}${extraAttributes}>${formatValue(c.key, sums[c.key], undefined, sumMeta[c.key])}</td>`;
      return;
    }

    if (c.key === 'gain_pct' && sums['gain_pct'] != null) {
      html += `<td${alignClass}>${formatValue('gain_pct', sums['gain_pct'], undefined, sumMeta[c.key])}</td>`;
      return;
    }

    const fallbackContext = sumMeta[c.key] ?? { hasValue: false };
    html += `<td${alignClass}>${formatValue(c.key, null, undefined, fallbackContext)}</td>`;
  });
  html += '</tr>';

  html += '</tbody></table>';

  // Falls sortable: Default-Sort-Metadaten injizieren (nicht doppelt parsen falls nicht nötig)
  if (sortable) {
    try {
      const tpl = document.createElement('template');
      tpl.innerHTML = html.trim();
      const table = tpl.content.querySelector('table');
      if (table) {
        table.classList.add('sortable-table');
        if (defaultSort?.key) {
          table.dataset.defaultSort = defaultSort.key;
          table.dataset.defaultDir = defaultSort.dir === 'desc' ? 'desc' : 'asc';
        }
        return table.outerHTML;
      }
    } catch (e) {
      console.warn("makeTable(sortable): Injection fehlgeschlagen:", e);
    }
  }

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

/**
 * Neue Utility: sortTableRows
 * Sortiert die Datenzeilen (<tr>) einer Tabelle anhand eines Keys.
 *
 * @param {HTMLTableElement} tableEl  Ziel-Tabelle
 * @param {string} key                Daten-Key (muss mit data-sort-key im TH oder Positions-Mapping übereinstimmen)
 * @param {'asc'|'desc'} dir          Sortierrichtung
 * @param {boolean} isPositions       true => Positions-Spalten-Mapping verwenden
 * @returns {HTMLTableRowElement[]}   Array der neu angeordneten Daten-Zeilen (ohne Footer)
 *
 * Erkennung Zahl vs. String:
 *  - Entfernt NBSP, €, %, Tausenderpunkte
 *  - Wandelt Komma in Punkt
 *  - Wenn parseFloat ein valides Zahlenergebnis liefert und der ursprüngliche Text
 *    nicht komplett alphabetisch ist -> numerischer Vergleich; sonst localeCompare.
 *
 * Footer-Zeile ('.footer-row') bleibt am Ende erhalten.
 */
export function sortTableRows(tableEl, key, dir = 'asc', isPositions = false) {
  if (!tableEl) return [];
  const tbody = tableEl.querySelector('tbody');
  if (!tbody) return [];

  const footer = tbody.querySelector('tr.footer-row');
  const rows = Array
    .from(tbody.querySelectorAll('tr'))
    .filter(r => r !== footer);

  // Spaltenindex bestimmen
  let colIdx = -1;
  if (isPositions) {
    const posMap = {
      name: 0,
      current_holdings: 1,
      purchase_value: 2,
      current_value: 3,
      gain_abs: 4,
      gain_pct: 5
    };
    colIdx = posMap[key];
  } else {
    // Generisch über thead th[data-sort-key]
    const ths = Array.from(tableEl.querySelectorAll('thead th'));
    for (let i = 0; i < ths.length; i++) {
      if (ths[i].getAttribute('data-sort-key') === key) {
        colIdx = i;
        break;
      }
    }
  }
  if (colIdx == null || colIdx < 0) return rows;

  const toNumber = (txt) => {
    if (txt == null) return NaN;
    const cleaned = txt
      .replace(/\u00A0/g, ' ')
      .replace(/[%€]/g, '')
      .replace(/\./g, '')
      .replace(/,/g, '.')
      .replace(/[^\d.-]/g, '')
      .trim();
    if (!cleaned) return NaN;
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : NaN;
  };

  rows.sort((a, b) => {
    const aTxt = a.cells[colIdx]?.textContent.trim() || '';
    const bTxt = b.cells[colIdx]?.textContent.trim() || '';

    const aNum = toNumber(aTxt);
    const bNum = toNumber(bTxt);

    let cmp;
    if (!isNaN(aNum) && !isNaN(bNum) && (aTxt.match(/[0-9]/) || bTxt.match(/[0-9]/))) {
      cmp = aNum - bNum;
    } else {
      cmp = aTxt.localeCompare(bTxt, 'de', { sensitivity: 'base' });
    }
    return dir === 'asc' ? cmp : -cmp;
  });

  // Re-Anordnung im DOM
  rows.forEach(r => tbody.appendChild(r));
  if (footer) tbody.appendChild(footer);

  // Visuelle Indikatoren aktualisieren (optional generisch)
  tableEl.querySelectorAll('thead th.sort-active').forEach(th => {
    th.classList.remove('sort-active', 'dir-asc', 'dir-desc');
  });
  const activeTh = tableEl.querySelector(`thead th[data-sort-key="${key}"]`);
  if (activeTh) {
    activeTh.classList.add('sort-active', dir === 'asc' ? 'dir-asc' : 'dir-desc');
  }

  return rows;
}
