import { makeTable } from '../content/elements.js';

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

  // Cache aktualisieren
  try {
    const cache = window.__ppReaderPortfolioPositionsCache;
    if (cache && typeof cache.set === 'function' && !error) {
      cache.set(portfolio_uuid, positions || []);
    }
  } catch (e) {
    console.warn("handlePortfolioPositionsUpdate: Konnte Cache nicht aktualisieren:", e);
  }

  // Globale Pending-Map initialisieren (für Events vor Initialrender der Tabelle)
  if (!window.__ppReaderPendingPositions) {
    window.__ppReaderPendingPositions = new Map();
  }

  const detailsRow = root.querySelector(
    `.portfolio-table .portfolio-details[data-portfolio="${portfolio_uuid}"]`
  );

  // Falls Tabelle/Zeile noch nicht existiert (z.B. Event kommt sehr früh), merken und später anwenden
  if (!detailsRow) {
    window.__ppReaderPendingPositions.set(portfolio_uuid, { positions, error });
    // Retry-Mechanismus: Versuche kurzzeitig, ob Zeile inzwischen gerendert wurde
    let attempts = 0;
    const maxAttempts = 10;        // ~5s bei 500ms Intervall
    const interval = 500;
    const retry = () => {
      attempts += 1;
      const rowNow = root.querySelector(
        `.portfolio-table .portfolio-details[data-portfolio="${portfolio_uuid}"]`
      );
      if (rowNow) {
        // Wenn inzwischen vorhanden und Nutzer das Depot bereits aufgeklappt hat
        const containerNow = rowNow.querySelector('.positions-container');
        if (containerNow && !rowNow.classList.contains('hidden')) {
          if (error) {
            containerNow.innerHTML = `<div class="error">${error} <button class="retry-pos" data-portfolio="${portfolio_uuid}">Erneut laden</button></div>`;
          } else {
            containerNow.innerHTML = renderPositionsTableInline(positions || []);
          }
        }
        window.__ppReaderPendingPositions.delete(portfolio_uuid);
        return;
      }
      if (attempts < maxAttempts) {
        setTimeout(retry, interval);
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

  container.innerHTML = renderPositionsTableInline(positions || []);
}

/* ------------------ Hilfsfunktionen (lokal) ------------------ */

function renderPositionsTableInline(positions) {
  // Konsistenz Push vs Lazy:
  // Falls overview.js bereits eine zentrale Render-Funktion bereitstellt, nutze diese,
  // damit Lazy Load (WS) und Push (Event) identisches Markup erzeugen.
  try {
    if (window.__ppReaderRenderPositionsTable) {
      return window.__ppReaderRenderPositionsTable(positions);
    }
  } catch (_) {
    // Fallback auf lokale Implementierung unten
  }

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
  return makeTable(
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