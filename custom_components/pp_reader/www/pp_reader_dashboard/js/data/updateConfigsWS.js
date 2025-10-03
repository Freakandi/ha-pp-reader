import { makeTable } from '../content/elements.js';
import { sortTableRows } from '../content/elements.js'; // NEU: generische Sortier-Utility

const PENDING_RETRY_INTERVAL = 500;
const PENDING_MAX_ATTEMPTS = 10;
const PORTFOLIO_POSITIONS_UPDATED_EVENT = 'pp-reader:portfolio-positions-updated';

function ensurePendingMap() {
  if (!window.__ppReaderPendingPositions) {
    window.__ppReaderPendingPositions = new Map();
  }
  return window.__ppReaderPendingPositions;
}

function ensurePendingRetryMeta() {
  if (!window.__ppReaderPendingRetryMeta) {
    window.__ppReaderPendingRetryMeta = new Map();
  }
  return window.__ppReaderPendingRetryMeta;
}

function renderPositionsError(error, portfolioUuid) {
  const safeError = typeof error === 'string' ? error : String(error || 'Unbekannter Fehler');
  return `<div class="error">${safeError} <button class="retry-pos" data-portfolio="${portfolioUuid}">Erneut laden</button></div>`;
}

function restoreSortAndInit(containerEl, rootEl, pid) {
  const table = containerEl.querySelector('table.sortable-positions');
  if (!table) return;

  const key = containerEl.dataset.sortKey || table.dataset.defaultSort || 'name';
  const dir = containerEl.dataset.sortDir || table.dataset.defaultDir || 'asc';
  containerEl.dataset.sortKey = key;
  containerEl.dataset.sortDir = dir;

  try {
    sortTableRows(table, key, dir, true);
  } catch (e) {
    console.warn('restoreSortAndInit: sortTableRows Fehler:', e);
  }

  try {
    if (window.__ppReaderAttachPortfolioPositionsSorting) {
      window.__ppReaderAttachPortfolioPositionsSorting(rootEl, pid);
    }
  } catch (e) {
    console.warn('restoreSortAndInit: attachPortfolioPositionsSorting Fehler:', e);
  }

  try {
    if (window.__ppReaderAttachSecurityDetailListener) {
      window.__ppReaderAttachSecurityDetailListener(rootEl, pid);
    }
  } catch (e) {
    console.warn('restoreSortAndInit: attachSecurityDetailListener Fehler:', e);
  }
}

function applyPortfolioPositionsToDom(root, portfolioUuid, positions, error) {
  if (!root || !portfolioUuid) {
    return { applied: false, reason: 'invalid' };
  }

  const detailsRow = root.querySelector(
    `.portfolio-table .portfolio-details[data-portfolio="${portfolioUuid}"]`
  );
  if (!detailsRow) {
    return { applied: false, reason: 'missing' };
  }

  const container = detailsRow.querySelector('.positions-container');
  if (!container) {
    return { applied: false, reason: 'missing' };
  }

  if (detailsRow.classList.contains('hidden')) {
    return { applied: false, reason: 'hidden' };
  }

  if (error) {
    container.innerHTML = renderPositionsError(error, portfolioUuid);
    return { applied: true };
  }

  const prevKey = container.dataset.sortKey;
  const prevDir = container.dataset.sortDir;

  container.innerHTML = renderPositionsTableInline(positions || []);

  if (prevKey) container.dataset.sortKey = prevKey;
  if (prevDir) container.dataset.sortDir = prevDir;

  restoreSortAndInit(container, root, portfolioUuid);
  return { applied: true };
}

export function flushPendingPositions(root, portfolioUuid) {
  const pendingMap = ensurePendingMap();
  const pending = pendingMap.get(portfolioUuid);
  if (!pending) return false;

  const result = applyPortfolioPositionsToDom(
    root,
    portfolioUuid,
    pending.positions,
    pending.error
  );
  if (result.applied) {
    pendingMap.delete(portfolioUuid);
  }
  return result.applied;
}

export function flushAllPendingPositions(root) {
  const pendingMap = ensurePendingMap();
  let appliedAny = false;
  for (const [portfolioUuid] of pendingMap) {
    if (flushPendingPositions(root, portfolioUuid)) {
      appliedAny = true;
    }
  }
  return appliedAny;
}

function schedulePendingRetry(root, portfolioUuid) {
  const retryMetaMap = ensurePendingRetryMeta();
  const meta = retryMetaMap.get(portfolioUuid) || { attempts: 0, timer: null };

  if (meta.timer) {
    return;
  }

  meta.timer = setTimeout(() => {
    meta.timer = null;
    meta.attempts += 1;

    const success = flushPendingPositions(root, portfolioUuid);
    if (success || meta.attempts >= PENDING_MAX_ATTEMPTS) {
      retryMetaMap.delete(portfolioUuid);
      if (!success) {
        ensurePendingMap().delete(portfolioUuid);
      }
    } else {
      schedulePendingRetry(root, portfolioUuid);
    }
  }, PENDING_RETRY_INTERVAL);

  retryMetaMap.set(portfolioUuid, meta);
}

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
  if (!Array.isArray(update)) {
    console.warn("handlePortfolioUpdate: Update ist kein Array:", update);
    return;
  }
  try {
    console.debug("handlePortfolioUpdate: payload=", update);
  } catch (_) { }

  // Tabelle finden (neuer Selektor unterstützt beide Varianten)
  const table =
    root?.querySelector('.portfolio-table table') ||
    root?.querySelector('table.expandable-portfolio-table');
  if (!table) {
    const overviewHost = root?.querySelector('.portfolio-table');
    const detailViewActive =
      !overviewHost &&
      (root?.querySelector('.security-range-selector') ||
        root?.querySelector('.security-detail-placeholder'));

    if (detailViewActive) {
      console.debug(
        "handlePortfolioUpdate: Übersicht nicht aktiv – Update wird später angewendet."
      );
    } else {
      console.warn("handlePortfolioUpdate: Keine Portfolio-Tabelle gefunden.");
    }
    return;
  }
  const tbody = table.tBodies?.[0];
  if (!tbody) {
    console.warn("handlePortfolioUpdate: Kein <tbody> in Tabelle.");
    return;
  }

  // Helper Formatierer (lokal oder einfacher Fallback)
  const formatNumber = (val) => {
    if (window.Intl) {
      try {
        return new Intl.NumberFormat(navigator.language || 'de-DE', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(val);
      } catch (_) { }
    }
    return (Math.round(val * 100) / 100).toFixed(2).replace('.', ',');
  };

  // Map: uuid -> Row
  const rowMap = new Map(
    Array.from(tbody.querySelectorAll('tr.portfolio-row'))
      .filter(r => r.dataset && r.dataset.portfolio)
      .map(r => [r.dataset.portfolio, r])
  );

  let patched = 0;

  const formatPositionCount = (value) => {
    const numeric = Number.isFinite(value) ? value : 0;
    try {
      return numeric.toLocaleString('de-DE');
    } catch (_error) {
      return numeric.toString();
    }
  };

  for (const u of update) {
    if (!u || !u.uuid) continue;
    const row = rowMap.get(u.uuid);
    if (!row) continue;

    if (row.cells.length < 3) continue;

    const posCountCell = row.cells[1];
    const curValCell = row.cells[2];
    const gainAbsCell = row.cells[3];
    const gainPctCell = row.cells[4];

    // Normalisierung (Full Sync nutzt value/purchase_sum; Price Events current_value/purchase_sum)
    const posCount = Number(u.position_count ?? u.count ?? 0);
    const curVal = Number(u.current_value ?? u.value ?? 0);
    const purchase = Number(u.purchase_sum ?? u.purchaseSum ?? 0);

    const gainAbs = curVal - purchase;
    const gainPct = purchase > 0 ? (gainAbs / purchase) * 100 : 0;

    const oldCur = parseNumLoose(curValCell.textContent);
    const oldCnt = parseNumLoose(posCountCell.textContent);

    if (oldCnt !== posCount) {
      posCountCell.textContent = formatPositionCount(posCount);
    }
    if (Math.abs(oldCur - curVal) >= 0.005) {
      curValCell.textContent = formatNumber(curVal) + ' €';
      row.classList.add('flash-update');
      setTimeout(() => row.classList.remove('flash-update'), 800);
    }
    if (gainAbsCell) {
      gainAbsCell.innerHTML = formatGain(gainAbs);
    }
    if (gainPctCell) {
      gainPctCell.innerHTML = formatGainPct(gainPct);
    }

    row.dataset.positionCount = String(posCount);
    row.dataset.currentValue = String(curVal);
    row.dataset.purchaseSum = String(purchase);
    row.dataset.gainAbs = String(gainAbs);
    row.dataset.gainPct = String(gainPct);

    patched++;

  }

  if (patched === 0) {
    console.debug("handlePortfolioUpdate: Keine passenden Zeilen gefunden / keine Änderungen.");
  } else {
    console.debug(`handlePortfolioUpdate: ${patched} Zeile(n) gepatcht.`);
  }

  try {
    updatePortfolioFooter(table);
  } catch (e) {
    console.warn("handlePortfolioUpdate: Fehler bei Summen-Neuberechnung:", e);
  }

  // Total-Wealth neu berechnen (Accounts + Portfolios)
  try {
    const findTable = (...selectors) => {
      for (const selector of selectors) {
        if (!selector) continue;
        const tableEl = root?.querySelector(selector);
        if (tableEl) return tableEl;
      }
      return null;
    };

    const eurTable = findTable(
      '.account-table table',
      '.accounts-eur-table table',
      '.accounts-table table'
    );
    const fxTable = findTable(
      '.fx-account-table table',
      '.accounts-fx-table table'
    );

    const extractAccounts = (tbl, isFx) => {
      if (!tbl) return [];
      const accountRows = tbl.querySelectorAll('tbody tr.account-row');
      const rows = accountRows.length
        ? Array.from(accountRows)
        : Array.from(tbl.querySelectorAll('tbody tr:not(.footer-row)'));

      return rows.map(r => {
        const cell = isFx ? r.cells[2] : r.cells[1];
        return { balance: parseNumLoose(cell?.textContent) };
      });
    };
    const accounts = [
      ...extractAccounts(eurTable, false),
      ...extractAccounts(fxTable, true),
    ];

    const portfolioDomValues = Array.from(
      table.querySelectorAll('tbody tr.portfolio-row')
    ).map(r => {
      const cv = parseNumLoose(r.cells[2]?.textContent);
      const gain = parseNumLoose(r.cells[3]?.textContent);
      const ps = cv - gain;
      return { current_value: cv, purchase_sum: ps };
    });

    if (typeof updateTotalWealth === 'function') {
      updateTotalWealth(accounts, portfolioDomValues, root);
    }
  } catch (e) {
    console.warn("handlePortfolioUpdate: Fehler bei Total-Neuberechnung:", e);
  }
}

/**
 * NEU: Handler für Einzel-Positions-Updates (Event: portfolio_positions).
 * @param {{portfolio_uuid: string, positions: Array}} update
 * @param {HTMLElement} root
 */
function normalizePortfolioUuid(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const direct = payload.portfolio_uuid;
  if (typeof direct === 'string' && direct) {
    return direct;
  }
  const camelCase = payload.portfolioUuid;
  if (typeof camelCase === 'string' && camelCase) {
    return camelCase;
  }
  return null;
}

function processPortfolioPositionsUpdate(update, root) {
  const portfolioUuid = normalizePortfolioUuid(update);
  if (!portfolioUuid) {
    console.warn("handlePortfolioPositionsUpdate: Ungültiges Update:", update);
    return false;
  }

  const error = update?.error;
  const positions = Array.isArray(update?.positions) ? update.positions : [];

  // Positions-Cache aktualisieren (Lazy-Load bleibt bestehen)
  try {
    const cache = window.__ppReaderPortfolioPositionsCache;
    if (cache && typeof cache.set === 'function' && !error) {
      cache.set(portfolioUuid, positions);
    }
  } catch (e) {
    console.warn("handlePortfolioPositionsUpdate: Positions-Cache konnte nicht aktualisiert werden:", e);
  }

  const result = applyPortfolioPositionsToDom(root, portfolioUuid, positions, error);
  const pendingMap = ensurePendingMap();

  if (result.applied) {
    pendingMap.delete(portfolioUuid);
  } else {
    pendingMap.set(portfolioUuid, { positions, error });
    if (result.reason !== 'hidden') {
      schedulePendingRetry(root, portfolioUuid);
    }
  }

  if (!error && positions.length > 0) {
    const securityUuids = Array.from(
      new Set(
        positions
          .map((pos) => pos?.security_uuid)
          .filter((uuid) => typeof uuid === 'string' && uuid.length > 0),
      ),
    );

    if (securityUuids.length && typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent(PORTFOLIO_POSITIONS_UPDATED_EVENT, {
            detail: {
              portfolioUuid,
              securityUuids,
            },
          }),
        );
      } catch (dispatchError) {
        console.warn(
          'handlePortfolioPositionsUpdate: Dispatch des Portfolio-Events fehlgeschlagen',
          dispatchError,
        );
      }
    }
  }

  return true;
}

export function handlePortfolioPositionsUpdate(update, root) {
  if (Array.isArray(update)) {
    let handled = false;
    for (const item of update) {
      if (processPortfolioPositionsUpdate(item, root)) {
        handled = true;
      }
    }
    if (!handled && update.length) {
      console.warn("handlePortfolioPositionsUpdate: Kein gültiges Element im Array:", update);
    }
    return;
  }

  processPortfolioPositionsUpdate(update, root);
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
      const bodyRows = table.querySelectorAll('tbody tr');
      bodyRows.forEach((tr, idx) => {
        if (tr.classList.contains('footer-row')) {
          return;
        }
        const pos = positions[idx];
        if (pos?.security_uuid) {
          tr.dataset.security = pos.security_uuid;
        }
        tr.classList.add('position-row');
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

if (!window.__ppReaderFlushPendingPositions) {
  window.__ppReaderFlushPendingPositions = (root, portfolioUuid) =>
    flushPendingPositions(root, portfolioUuid);
}

if (!window.__ppReaderFlushAllPendingPositions) {
  window.__ppReaderFlushAllPendingPositions = (root) => flushAllPendingPositions(root);
}

function updatePortfolioFooter(table) {
  if (!table) return;
  try {
    const helper = window.__ppReaderUpdatePortfolioFooter;
    if (typeof helper === 'function') {
      helper(table);
      return;
    }
  } catch (err) {
    console.warn("updatePortfolioFooter: global Helper schlug fehl:", err);
  }

  const rows = Array.from(table.querySelectorAll('tbody tr.portfolio-row'));
  let sumCurrent = 0;
  let sumGainAbs = 0;
  let sumPurchase = 0;
  let sumPositions = 0;

  rows.forEach(r => {
    const datasetCount = Number(r.dataset?.positionCount);
    const posCount = Number.isFinite(datasetCount)
      ? datasetCount
      : parseInt((r.cells[1]?.textContent || '').replace(/\./g, ''), 10) || 0;

    const datasetCurrent = Number(r.dataset?.currentValue);
    const currentValue = Number.isFinite(datasetCurrent)
      ? datasetCurrent
      : parseNumLoose(r.cells[2]?.textContent);

    const datasetGain = Number(r.dataset?.gainAbs);
    const gainAbs = Number.isFinite(datasetGain)
      ? datasetGain
      : parseNumLoose(r.cells[3]?.textContent);

    const datasetPurchase = Number(r.dataset?.purchaseSum);
    const purchase = Number.isFinite(datasetPurchase)
      ? datasetPurchase
      : (currentValue - gainAbs);

    sumPositions += posCount;
    sumCurrent += currentValue;
    sumGainAbs += gainAbs;
    sumPurchase += purchase;
  });

  if (sumPurchase <= 0) {
    sumPurchase = sumCurrent - sumGainAbs;
  }
  const sumGainPct = sumPurchase > 0 ? (sumGainAbs / sumPurchase) * 100 : 0;

  let footer = table.querySelector('tr.footer-row');
  if (!footer) {
    footer = document.createElement('tr');
    footer.className = 'footer-row';
    table.querySelector('tbody')?.appendChild(footer);
  }
  const sumPositionsDisplay = Math.round(sumPositions).toLocaleString('de-DE');

  footer.innerHTML = `
    <td>Summe</td>
    <td class="align-right">${sumPositionsDisplay}</td>
    <td class="align-right">${formatNumber(sumCurrent)}&nbsp;€</td>
    <td class="align-right">${formatGain(sumGainAbs)}</td>
    <td class="align-right">${formatGainPct(sumGainPct)}</td>
  `;
  footer.dataset.positionCount = String(Math.round(sumPositions));
  footer.dataset.currentValue = String(sumCurrent);
  footer.dataset.purchaseSum = String(sumPurchase);
  footer.dataset.gainAbs = String(sumGainAbs);
  footer.dataset.gainPct = String(sumGainPct);
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

function updateTotalWealth(accounts, portfolios, root) {
  const targetRoot = root || document;

  const accountSum = (Array.isArray(accounts) ? accounts : []).reduce((acc, entry) => {
    const value = entry != null && typeof entry === 'object'
      ? entry.balance ?? entry.current_value ?? entry.value ?? 0
      : entry;
    const numeric = Number(value);
    return acc + (Number.isFinite(numeric) ? numeric : 0);
  }, 0);

  const portfolioSum = (Array.isArray(portfolios) ? portfolios : []).reduce((acc, entry) => {
    const value = entry != null && typeof entry === 'object'
      ? entry.current_value ?? entry.value ?? 0
      : entry;
    const numeric = Number(value);
    return acc + (Number.isFinite(numeric) ? numeric : 0);
  }, 0);

  const totalWealth = accountSum + portfolioSum;

  const headerMeta = targetRoot?.querySelector('#headerMeta');
  if (!headerMeta) {
    console.warn('updateTotalWealth: #headerMeta nicht gefunden.');
    return;
  }

  const valueElement = headerMeta.querySelector('strong') || headerMeta.querySelector('.total-wealth-value');
  if (valueElement) {
    valueElement.textContent = `${formatNumber(totalWealth)}\u00A0€`;
  } else {
    headerMeta.textContent = `💰 Gesamtvermögen: ${formatNumber(totalWealth)}\u00A0€`;
  }

  headerMeta.dataset.totalWealthEur = String(totalWealth);
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
    main: `<tr class="portfolio-row" data-portfolio="${p.uuid}">
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
      ? `📂 Letzte Aktualisierung der Datei: <strong>${value}</strong>`
      : `📂 Letzte Aktualisierung der Datei: <strong>Unbekannt</strong>`;
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

// === Globale / modulweite Utilities ===
function parseNumLoose(txt) {
  if (txt == null) return 0;
  return parseFloat(
    String(txt)
      .replace(/\u00A0/g, ' ')
      .replace(/[€%]/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/[^\d.-]/g, '')
  ) || 0;
}
