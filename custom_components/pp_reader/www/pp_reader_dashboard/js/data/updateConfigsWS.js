import { makeTable } from '../content/elements.js';
import { sortTableRows } from '../content/elements.js'; // NEU: generische Sortier-Utility

/**
 * Handler für Kontodaten-Updates (Accounts, inkl. FX).
 * @param {Array} update - Die empfangenen Kontodaten (mit currency_code, orig_balance, balance(EUR)).
 * @param {HTMLElement} root - Das Root-Element des Dashboards.
 */
export function handleAccountUpdate(update, root) {
  console.log("updateConfigsWS: Kontodaten-Update erhalten:", update);
  const updatedAccounts = update || [];

  // Tabellen aktualisieren (EUR + FX)
  updateAccountTable(updatedAccounts, root);

  // Portfolios aus aktueller Tabelle lesen (für Total-Neuberechnung)
  const portfolioTable = root.querySelector('.portfolio-table table');
  const portfolios = portfolioTable
    ? Array.from(portfolioTable.querySelectorAll('tbody tr:not(.footer-row)')).map(row => {
      // Spalten: Name | position_count | current_value | gain_abs | gain_pct
      const currentValueCell = row.cells[2];
      return {
        current_value: parseFloat(
          (currentValueCell?.textContent || '')
            .replace(/\./g, '')
            .replace(',', '.')
            .replace(/[^\d.-]/g, '')
        ) || 0
      };
    })
    : [];

  updateTotalWealth(updatedAccounts, portfolios, root);
}

/**
 * Aktualisiert die Tabellen mit den Kontodaten (EUR + FX).
 * @param {Array} accounts - Alle Kontodaten.
 * @param {HTMLElement} root - Root-Element.
 */
function updateAccountTable(accounts, root) {
  const eurContainer = root.querySelector('.account-table');
  const fxContainer = root.querySelector('.fx-account-table');

  const eurAccounts = accounts.filter(a => (a.currency_code || 'EUR') === 'EUR');
  const fxAccounts = accounts.filter(a => (a.currency_code || 'EUR') !== 'EUR');

  if (eurContainer) {
    eurContainer.innerHTML = makeTable(eurAccounts, [
      { key: 'name', label: 'Name' },
      { key: 'balance', label: 'Kontostand (EUR)', align: 'right' }
    ], ['balance']);
  } else {
    console.warn("updateAccountTable: .account-table nicht gefunden.");
  }

  if (fxContainer) {
    fxContainer.innerHTML = makeTable(
      fxAccounts.map(a => ({
        ...a,
        fx_display: `${(a.orig_balance ?? 0).toLocaleString('de-DE', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}\u00A0${a.currency_code}`
      })),
      [
        { key: 'name', label: 'Name' },
        { key: 'fx_display', label: 'Betrag (FX)' },
        { key: 'balance', label: 'EUR', align: 'right' }
      ],
      ['balance']
    );
  } else if (fxAccounts.length) {
    console.warn("updateAccountTable: .fx-account-table nicht gefunden, obwohl FX-Konten vorhanden sind.");
  }
}

/**
 * Handler für Depot-Updates (aggregierte Portfolio-Werte).
 * Ersetzt die bisherige komplette Tabellen-Neuerstellung durch ein gezieltes Patchen
 * der vorhandenen expandierbaren Tabelle (gebaut in overview.js).
 * @param {Array} update - Die empfangenen Depotdaten (uuid, name, current_value, purchase_sum, position_count)
 * @param {HTMLElement} root - Root-Element.
 */
export function handlePortfolioUpdate(update, root) {
  console.log("updateConfigsWS: Depotdaten-Update erhalten:", update);
  const updatedPortfolios = update || [];

  const table = root.querySelector('.portfolio-table .expandable-portfolio-table');
  if (!table) {
    console.warn("handlePortfolioUpdate: Keine expandable-portfolio-table gefunden (evtl. Tab nicht aktiv).");
    return;
  }
  const tbody = table.querySelector('tbody');
  if (!tbody) return;

  // Bestehende Portfolio-UUIDs im DOM sammeln
  const existingRows = Array.from(tbody.querySelectorAll('tr.portfolio-row'));
  const existingIds = new Set(existingRows.map(r => r.getAttribute('data-portfolio')));

  // Patch oder Insert
  updatedPortfolios.forEach(p => {
    const gainAbs = p.current_value - p.purchase_sum;
    const gainPct = p.purchase_sum > 0 ? (gainAbs / p.purchase_sum) * 100 : 0;
    let row = tbody.querySelector(`tr.portfolio-row[data-portfolio="${p.uuid}"]`);
    if (!row) {
      // Neuer Eintrag → einfügen vor Footer (falls vorhanden) sonst ans Ende
      const { main, detail } = createPortfolioRowHtml(p, false);
      // Footer (falls vorhanden) identifizieren
      const footer = tbody.querySelector('tr.footer-row');
      if (footer) {
        footer.insertAdjacentHTML('beforebegin', main + detail);
      } else {
        tbody.insertAdjacentHTML('beforeend', main + detail);
      }

      // Änderung 12:
      // Für neu hinzugefügte Portfolios (noch keine Positionsdaten geladen) merken wir
      // den Default-Sortierzustand vor, damit beim späteren ersten Aufklappen (Lazy Load)
      // ein ggf. global gespeicherter Zustand nicht verloren geht bzw. klar definierte
      // Defaults existieren (name asc). Bestehende Container (mit user sort) werden nicht
      // angerührt, da wir nur im "Neuanlage"-Pfad sind.
      try {
        const detailRow = tbody.querySelector(`tr.portfolio-details[data-portfolio="${p.uuid}"]`);
        const posContainer = detailRow?.querySelector('.positions-container');
        if (posContainer && !posContainer.dataset.sortKey) {
          posContainer.dataset.sortKey = 'name';
          posContainer.dataset.sortDir = 'asc';
        }
      } catch (_) { /* noop */ }

      return; // Footer wird später aktualisiert
    }

    row.dataset.purchaseSum = p.purchase_sum ?? 0;
    const cells = row.cells;
    // Spalten: 0 Button(Name), 1 position_count, 2 current_value, 3 gain_abs, 4 gain_pct
    if (cells[1]) cells[1].textContent = (p.position_count ?? 0).toLocaleString('de-DE');
    if (cells[2]) cells[2].innerHTML = `${formatNumber(p.current_value)}&nbsp;€`;
    if (cells[3]) cells[3].innerHTML = formatGain(gainAbs);
    if (cells[4]) cells[4].innerHTML = formatGainPct(gainPct);
  });

  // (Optional) Entfernen veralteter Portfolios:
  // Falls ein vollständiges Set aller Portfolios gesendet würde, könnten hier
  // nicht enthaltene entfernt werden. Da aktuell nur geänderte gesendet werden,
  // überspringen wir Löschlogik. (Dokumentiert für zukünftige Erweiterung.)

  updatePortfolioFooter(table);

  // Accounts (EUR + FX) für Gesamtvermögen neu berechnen
  const eurTable = root.querySelector('.account-table table');
  const fxTable = root.querySelector('.fx-account-table table');

  const parseAccounts = (tableEl, isFx = false) => {
    if (!tableEl) return [];
    return Array.from(tableEl.querySelectorAll('tbody tr:not(.footer-row)')).map(row => {
      const eurCell = isFx ? row.cells[2] : row.cells[1];
      const eurVal = parseFloat(
        (eurCell?.textContent || '')
          .replace(/\./g, '')
          .replace(',', '.')
          .replace(/[^\d.-]/g, '')
      ) || 0;
      return { balance: eurVal };
    });
  };

  const accounts = [
    ...parseAccounts(eurTable, false),
    ...parseAccounts(fxTable, true),
  ];

  updateTotalWealth(
    accounts,
    // Für Total nur aktuelle Werte nötig
    Array.from(tbody.querySelectorAll('tr.portfolio-row')).map(r => {
      const currentValue = parseLocaleNumber(r.cells[2]?.textContent);
      const purchaseSumAttr = parseFloat(r.dataset.purchaseSum || '0');
      return {
        current_value: currentValue,
        purchase_sum: isNaN(purchaseSumAttr)
          ? currentValue - parseLocaleNumber(r.cells[3]?.textContent)
          : purchaseSumAttr,
      };
    }),
    root
  );
}

/**
 * NEU: Handler für Einzel-Positions-Updates (Event: portfolio_positions).
 * @param {{portfolio_uuid: string, positions: Array}} update
 * @param {HTMLElement} root
 */
export function handlePortfolioPositionsUpdate(update, root) {
  if (!update || !update.portfolio_uuid) {
    console.warn("handlePortfolioPositionsUpdate: Ungültiges Update:", update);
    return;
  }
  const { portfolio_uuid, positions, error } = update;

  // Cache aktualisieren (unverändert)
  try {
    const cache = window.__ppReaderPortfolioPositionsCache;
    if (cache && typeof cache.set === 'function' && !error) {
      cache.set(portfolio_uuid, positions || []);
    }
  } catch (e) {
    console.warn("handlePortfolioPositionsUpdate: Konnte Cache nicht aktualisieren:", e);
  }

  if (!window.__ppReaderPendingPositions) {
    window.__ppReaderPendingPositions = new Map();
  }

  const detailsRow = root.querySelector(
    `.portfolio-table .portfolio-details[data-portfolio="${portfolio_uuid}"]`
  );

  // Falls Detailzeile noch nicht existiert → merken + Retry wie bisher
  if (!detailsRow) {
    window.__ppReaderPendingPositions.set(portfolio_uuid, { positions, error });
    let attempts = 0;
    const maxAttempts = 10;
    const interval = 500;
    const retry = () => {
      attempts += 1;
      const rowNow = root.querySelector(
        `.portfolio-table .portfolio-details[data-portfolio="${portfolio_uuid}"]`
      );
      if (rowNow) {
        const containerNow = rowNow.querySelector('.positions-container');
        if (containerNow && !rowNow.classList.contains('hidden')) {
          // Beim erstmaligen sichtbaren Mount Standard-Rendering,
          // Sortierung wird anschließend per globaler Funktion gesetzt.
          containerNow.innerHTML = error
            ? `<div class="error">${error} <button class="retry-pos" data-portfolio="${portfolio_uuid}">Erneut laden</button></div>`
            : renderPositionsTableInline(positions || []);
          try {
            // User- oder Default-Sort wieder anwenden
            restoreSortAndInit(containerNow, root, portfolio_uuid);
          } catch (e) {
            console.warn("handlePortfolioPositionsUpdate(retry): Sort-Restore fehlerhaft:", e);
          }
        }
        window.__ppReaderPendingPositions.delete(portfolio_uuid);
        return;
      }
      if (attempts < maxAttempts) {
        setTimeout(retry, interval);
      } else {
        window.__ppReaderPendingPositions.delete(portfolio_uuid);
      }
    };
    setTimeout(retry, interval);
    return;
  }

  const container = detailsRow.querySelector('.positions-container');
  if (!container) return;

  if (error) {
    container.innerHTML = `<div class="error">${error} <button class="retry-pos" data-portfolio="${portfolio_uuid}">Erneut laden</button></div>`;
    return;
  }

  // --- NEU: Sortzustand erhalten ---
  const prevKey = container.dataset.sortKey;
  const prevDir = container.dataset.sortDir;

  // Rebuild Tabelle
  container.innerHTML = renderPositionsTableInline(positions || []);

  try {
    // Zustand zurückschreiben (falls vorhanden)
    if (prevKey) container.dataset.sortKey = prevKey;
    if (prevDir) container.dataset.sortDir = prevDir;

    restoreSortAndInit(container, root, portfolio_uuid);
  } catch (e) {
    console.warn("handlePortfolioPositionsUpdate: Fehler bei Sort-Restore:", e);
  }

  function restoreSortAndInit(containerEl, rootEl, pid) {
    const table = containerEl.querySelector('table.sortable-positions');
    if (!table) return;

    // Falls kein vorheriger Zustand → Defaults vom <table>
    const key = containerEl.dataset.sortKey || table.dataset.defaultSort || 'name';
    const dir = containerEl.dataset.sortDir || table.dataset.defaultDir || 'asc';
    containerEl.dataset.sortKey = key;
    containerEl.dataset.sortDir = dir;

    // Anwenden über generische Utility (Positions-Tabelle → isPositions=true)
    try {
      // sortTableRows existiert, da oben importiert
      sortTableRows(table, key, dir, true);
    } catch (e) {
      console.warn("restoreSortAndInit: sortTableRows Fehler:", e);
    }

    // Zentrale Sortier-Klick-Logik (einheitlich zur Lazy-Variante) benutzen
    try {
      if (window.__ppReaderAttachPortfolioPositionsSorting) {
        window.__ppReaderAttachPortfolioPositionsSorting(rootEl, pid);
      }
    } catch (e) {
      console.warn("restoreSortAndInit: attachPortfolioPositionsSorting Fehler:", e);
    }
  }
}

/* ------------------ Hilfsfunktionen (lokal) ------------------ */

function renderPositionsTableInline(positions) {
  // Konsistenz Push vs Lazy:
  try {
    if (window.__ppReaderRenderPositionsTable) {
      return window.__ppReaderRenderPositionsTable(positions);
    }
  } catch (_) { }

  if (!positions || !positions.length) {
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  }
  const rows = positions.map(p => ({
    name: p.name,
    current_holdings: p.current_holdings,
    purchase_value: p.purchase_value,
    current_value: p.current_value,
    gain_abs: p.gain_abs,
    gain_pct: p.gain_pct
  }));

  // Basis HTML
  const raw = makeTable(
    rows,
    [
      { key: 'name', label: 'Wertpapier' },
      { key: 'current_holdings', label: 'Bestand' },
      { key: 'purchase_value', label: 'Kaufwert', align: 'right' },
      { key: 'current_value', label: 'Aktueller Wert', align: 'right' },
      { key: 'gain_abs', label: '+/-', align: 'right' },
      { key: 'gain_pct', label: '%', align: 'right' }
    ],
    ['purchase_value', 'current_value', 'gain_abs']
  );

  // Sortier-Metadaten wie in overview.js renderPositionsTable injizieren
  try {
    const tpl = document.createElement('template');
    tpl.innerHTML = raw.trim();
    const table = tpl.content.querySelector('table');
    if (table) {
      table.classList.add('sortable-positions');
      const ths = table.querySelectorAll('thead th');
      const colKeys = ['name', 'current_holdings', 'purchase_value', 'current_value', 'gain_abs', 'gain_pct'];
      ths.forEach((th, i) => {
        const key = colKeys[i];
        if (!key) return;
        th.setAttribute('data-sort-key', key);
        th.classList.add('sortable-col');
      });
      table.dataset.defaultSort = 'name';
      table.dataset.defaultDir = 'asc';
      return table.outerHTML;
    }
  } catch (e) {
    console.warn("renderPositionsTableInline: Sortier-Metadaten Injection fehlgeschlagen:", e);
  }
  return raw;
}

function updatePortfolioFooter(table) {
  const rows = Array.from(table.querySelectorAll('tbody tr.portfolio-row'));
  let sumCurrent = 0;
  let sumGainAbs = 0;
  let sumPurchase = 0;
  let sumPositions = 0;

  rows.forEach(r => {
    const count = parseInt(r.cells[1]?.textContent.replace(/\./g, ''), 10) || 0;
    const currentValue = parseLocaleNumber(r.cells[2]?.textContent) || 0;
    const gainAbs = parseLocaleNumber(r.cells[3]?.textContent) || 0;
    const purchaseSumAttr = parseFloat(r.dataset.purchaseSum || '0');

    sumPositions += count;
    sumCurrent += currentValue;
    sumGainAbs += gainAbs;
    sumPurchase += isNaN(purchaseSumAttr) ? (currentValue - gainAbs) : purchaseSumAttr;
  });

  // Fallback falls purchase_sum nicht gesetzt war
  if (sumPurchase <= 0) {
    sumPurchase = sumCurrent - sumGainAbs;
  }
  const sumGainPct = sumPurchase > 0 ? (sumGainAbs / sumPurchase) * 100 : 0;

  let footer = table.querySelector('tr.footer-row');
  if (!footer) {
    // Fallback: anfügen falls nicht vorhanden
    footer = document.createElement('tr');
    footer.className = 'footer-row';
    footer.innerHTML = '<td colspan="5"></td>';
    table.querySelector('tbody')?.appendChild(footer);
  }
  footer.innerHTML = `
    <td>Summe</td>
    <td class="align-right">${sumPositions.toLocaleString('de-DE')}</td>
    <td class="align-right">${formatNumber(sumCurrent)}&nbsp;€</td>
    <td class="align-right">${formatGain(sumGainAbs)}</td>
    <td class="align-right">${formatGainPct(sumGainPct)}</td>
  `;
}

function parseLocaleNumber(txt = '') {
  if (!txt) return 0;
  return parseFloat(
    txt
      .replace(/[^0-9,.\-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
  ) || 0;
}

function formatNumber(v) {
  return (isNaN(v) ? 0 : v).toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function formatGain(v) {
  const cls = v >= 0 ? 'positive' : 'negative';
  return `<span class="${cls}">${formatNumber(v)}&nbsp;€</span>`;
}
function formatGainPct(v) {
  const cls = v >= 0 ? 'positive' : 'negative';
  return `<span class="${cls}">${formatNumber(v)}&nbsp;%</span>`;
}

/**
 * HINWEIS (2025-09):
 * Die frühere Funktion updatePortfolioTable (vollständiger Neuaufbau der Depot-Tabelle)
 * wurde durch inkrementelles Patchen via handlePortfolioUpdate + Lazy-Load der Positions-
 * daten ersetzt. Alte Implementierung entfernt, um doppelte Logik und Render-Flashes
 * zu vermeiden.
 *
 * Falls noch Referenzen auf updatePortfolioTable existieren, bitte auf handlePortfolioUpdate
 * umstellen. (dashboard.js ruft bereits nur noch _doRender -> handlePortfolioUpdate auf.)
 */
// Entfernte Legacy-Funktion:
// function updatePortfolioTable(...) { /* veraltet, entfernt */ }

// Helper: Erzeuge (Portfolio-Hauptzeile + Detailzeile) HTML-Strings
function createPortfolioRowHtml(p, expanded = false) {
  const detailId = `portfolio-details-${p.uuid}`;
  const toggleClass = expanded ? 'portfolio-toggle expanded' : 'portfolio-toggle';
  return {
    main: `<tr class="portfolio-row" data-portfolio="${p.uuid}" data-purchase-sum="${p.purchase_sum ?? 0}">
      <td>
        <button type="button"
                class="${toggleClass}"
                data-portfolio="${p.uuid}"
                aria-expanded="${expanded ? 'true' : 'false'}"
                aria-controls="${detailId}">
          <span class="caret">${expanded ? '▼' : '▶'}</span>
          <span class="portfolio-name">${p.name}</span>
        </button>
      </td>
      <td class="align-right">${(p.position_count ?? 0).toLocaleString('de-DE')}</td>
      <td class="align-right">${formatNumber(p.current_value)}&nbsp;€</td>
      <td class="align-right">${formatGain(p.current_value - p.purchase_sum)}</td>
      <td class="align-right">${formatGainPct(p.purchase_sum > 0 ? ((p.current_value - p.purchase_sum) / p.purchase_sum) * 100 : 0)}</td>
    </tr>`,
    detail: `<tr class="portfolio-details hidden"
                 data-portfolio="${p.uuid}"
                 id="${detailId}"
                 role="region"
                 aria-label="Positionen für ${p.name}">
        <td colspan="5">
          <div class="positions-container"></div>
        </td>
      </tr>`
  };
}

// ==== Last File Update Handler (canonical) ====
// (Ändere zu export function, damit unten kein Sammel-Export nötig ist)
export function handleLastFileUpdate(update, root) {
  const value = typeof update === 'string'
    ? update
    : (update && update.last_file_update) || '';

  if (!root) {
    console.warn("handleLastFileUpdate: root fehlt");
    return;
  }

  // Bevorzugt Footer-Karte, sonst erste passende Stelle
  let el = root.querySelector('.footer-card .last-file-update') ||
    root.querySelector('.last-file-update');

  if (!el) {
    // Fallback: existierende Meta-Hosts durchsuchen
    const metaHost =
      root.querySelector('.footer-card .meta') ||
      root.querySelector('#headerMeta') ||
      root.querySelector('.header-card .meta') ||
      root.querySelector('.header-card');
    if (!metaHost) {
      console.warn("handleLastFileUpdate: Kein Einfügepunkt gefunden.");
      return;
    }
    el = document.createElement('div');
    el.className = 'last-file-update';
    metaHost.appendChild(el);
  }

  // Format abhängig vom Ort (Footer behält <strong>)
  if (el.closest('.footer-card')) {
    el.innerHTML = value
      ? `📂 Letzte Aktualisierung Datei: <strong>${value}</strong>`
      : `📂 Letzte Aktualisierung Datei: <strong>Unbekannt</strong>`;
  } else {
    // Header/Meta-Version (schlichter Text)
    el.textContent = value
      ? `📂 Letzte Aktualisierung: ${value}`
      : '📂 Letzte Aktualisierung: Unbekannt';
  }
}
/// END handleLastFileUpdate (canonical)

/**
 * NEUER HELPER (Änderung 8):
 * Re-applied die gespeicherte Sortierung einer Positions-Tabelle.
 * Liest container.dataset.sortKey / sortDir oder Default-Werte vom <table>.
 * Nutzt sortTableRows(..., true) für Positions-Mapping.
 * @param {HTMLElement} containerEl .positions-container
 */
export function reapplyPositionsSort(containerEl) {
  if (!containerEl) return;
  const table = containerEl.querySelector('table.sortable-positions');
  if (!table) return;
  const key = containerEl.dataset.sortKey || table.dataset.defaultSort || 'name';
  const dir = containerEl.dataset.sortDir || table.dataset.defaultDir || 'asc';
  // Persistiere (falls erstmalig)
  containerEl.dataset.sortKey = key;
  containerEl.dataset.sortDir = dir;
  sortTableRows(table, key, dir, true);
}
window.__ppReaderReapplyPositionsSort = reapplyPositionsSort; // Optional global für Lazy-Load-Code