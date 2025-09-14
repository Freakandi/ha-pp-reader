import { createHeaderCard, makeTable, formatNumber, formatGain, formatGainPct } from '../content/elements.js';
import { fetchAccountsWS, fetchLastFileUpdateWS, fetchPortfoliosWS, fetchPortfolioPositionsWS } from '../data/api.js';

// === Modul-weiter State für Expand/Collapse & Lazy Load ===
let _hassRef = null;
let _panelConfigRef = null;
const portfolioPositionsCache = new Map();      // portfolio_uuid -> positions[]
// Global für Push-Handler (Events)
window.__ppReaderPortfolioPositionsCache = portfolioPositionsCache;
const expandedPortfolios = new Set();           // gemerkte geöffnete Depots (persistiert über Re-Renders)

// ENTFERNT: Globaler document-Listener (Section 6 Hardening)
// Stattdessen scoped Listener über attachPortfolioToggleHandler(root)

// Rendert die Positions-Tabelle für ein Depot
function renderPositionsTable(positions) {
  if (!positions || !positions.length) {
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  }
  // Mapping für makeTable
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

// NEU: Export / Global bereitstellen für Push-Handler (Konsistenz Push vs Lazy)
export function renderPortfolioPositions(positions) {
  return renderPositionsTable(positions);
}
window.__ppReaderRenderPositionsTable = renderPositionsTable;

// (1) Entferne evtl. doppelte frühere Definitionen von buildExpandablePortfolioTable – nur diese Version behalten
function buildExpandablePortfolioTable(depots) {
  console.debug("buildExpandablePortfolioTable: render", depots.length, "portfolios");
  let html = '<table class="expandable-portfolio-table"><thead><tr>';
  const cols = [
    { key: 'name', label: 'Name' },
    { key: 'position_count', label: 'Anzahl Positionen', align: 'right' },
    { key: 'current_value', label: 'Aktueller Wert', align: 'right' },
    { key: 'gain_abs', label: 'gesamt +/-', align: 'right' },
    { key: 'gain_pct', label: '%', align: 'right' }
  ];
  cols.forEach(c => {
    const align = c.align === 'right' ? ' class="align-right"' : '';
    html += `<th${align}>${c.label}</th>`;
  });
  html += '</tr></thead><tbody>';

  depots.forEach(d => {
    if (!d || !d.uuid) return;
    const positionCount = Number.isFinite(d.position_count) ? d.position_count : 0;
    const currentValue = Number.isFinite(d.current_value) ? d.current_value : 0;
    const purchaseSum = Number.isFinite(d.purchase_sum) ? d.purchase_sum : 0;
    const gainAbs = Number.isFinite(d.gain_abs) ? d.gain_abs : (currentValue - purchaseSum);
    const gainPct = purchaseSum > 0 ? (gainAbs / purchaseSum) * 100 : 0;

    const expanded = expandedPortfolios.has(d.uuid);
    const toggleClass = expanded ? 'portfolio-toggle expanded' : 'portfolio-toggle';
    const detailId = `portfolio-details-${d.uuid}`;

    html += `<tr class="portfolio-row" data-portfolio="${d.uuid}" data-purchase-sum="${purchaseSum}">
      <td>
        <button type="button"
                class="${toggleClass}"
                data-portfolio="${d.uuid}"
                aria-expanded="${expanded ? 'true' : 'false'}"
                aria-controls="${detailId}">
          <span class="caret">${expanded ? '▼' : '▶'}</span>
          <span class="portfolio-name">${d.name}</span>
        </button>
      </td>
      <td class="align-right">${positionCount}</td>
      <td class="align-right">${formatNumber(currentValue)}&nbsp;€</td>
      <td class="align-right">${formatGain(gainAbs)}</td>
      <td class="align-right">${formatGainPct(gainPct)}</td>
    </tr>`;

    html += `<tr class="portfolio-details${expanded ? '' : ' hidden'}"
                data-portfolio="${d.uuid}"
                id="${detailId}"
                role="region"
                aria-label="Positionen für ${d.name}">
      <td colspan="5">
        <div class="positions-container">${expanded
        ? (portfolioPositionsCache.has(d.uuid)
          ? renderPositionsTable(portfolioPositionsCache.get(d.uuid))
          : '<div class="loading">Lade Positionen...</div>')
        : ''
      }</div>
      </td>
    </tr>`;
  });

  const sumCurrent = depots.reduce((a, d) => a + (Number.isFinite(d.current_value) ? d.current_value : 0), 0);
  const sumPurchase = depots.reduce((a, d) => a + (Number.isFinite(d.purchase_sum) ? d.purchase_sum : 0), 0);
  const sumGainAbs = depots.reduce((a, d) => {
    if (Number.isFinite(d.gain_abs)) return a + d.gain_abs;
    const cv = Number.isFinite(d.current_value) ? d.current_value : 0;
    const ps = Number.isFinite(d.purchase_sum) ? d.purchase_sum : 0;
    return a + (cv - ps);
  }, 0);
  const sumGainPct = sumPurchase > 0 ? (sumGainAbs / sumPurchase) * 100 : 0;
  const sumPositions = depots.reduce((a, d) => a + (Number.isFinite(d.position_count) ? d.position_count : 0), 0);

  html += `<tr class="footer-row">
    <td>Summe</td>
    <td class="align-right">${sumPositions}</td>
    <td class="align-right">${formatNumber(sumCurrent)}&nbsp;€</td>
    <td class="align-right">${formatGain(sumGainAbs)}</td>
    <td class="align-right">${formatGainPct(sumGainPct)}</td>
  </tr>`;

  html += '</tbody></table>';
  return html;
}

/**
 * Utility-Funktionen zum Auslesen und Wiederherstellen des Expand-States.
 * Perspektivisch nutzbar, falls ein vollständiger Neu-Render (Hard Refresh) der
 * Depot-Tabelle nötig wird (z.B. beim späteren Hinzufügen von Filter-/Sortierlogik).
 */
export function getExpandedPortfolios() {
  // Primär DOM lesen (falls Tabelle gerendert), Fallback: interner Set
  const domRows = Array.from(document.querySelectorAll('.portfolio-details:not(.hidden)[data-portfolio]'));
  if (domRows.length) {
    return domRows.map(r => r.getAttribute('data-portfolio')).filter(Boolean);
  }
  return Array.from(expandedPortfolios.values());
}

export function setExpandedPortfolios(portfolioIds) {
  expandedPortfolios.clear();
  if (Array.isArray(portfolioIds)) {
    portfolioIds.forEach(id => {
      if (id) expandedPortfolios.add(id);
    });
  }
}

// NEU: Funktion zum erneuten Laden der Positionsdaten
async function reloadPortfolioPositions(portfolioUuid, containerEl) {
  if (!portfolioUuid || !_hassRef || !_panelConfigRef) return;
  if (containerEl) {
    containerEl.innerHTML = '<div class="loading">Neu laden...</div>';
  }
  try {
    const resp = await fetchPortfolioPositionsWS(_hassRef, _panelConfigRef, portfolioUuid);
    if (resp.error) {
      if (containerEl) {
        containerEl.innerHTML = `<div class="error">${resp.error} <button class="retry-pos" data-portfolio="${portfolioUuid}">Erneut laden</button></div>`;
      }
      return;
    }
    const positions = resp.positions || [];
    portfolioPositionsCache.set(portfolioUuid, positions);
    if (containerEl) {
      containerEl.innerHTML = renderPositionsTable(positions);
    }
  } catch (e) {
    if (containerEl) {
      containerEl.innerHTML = `<div class="error">Fehler: ${e.message} <button class="retry-pos" data-portfolio="${portfolioUuid}">Retry</button></div>`;
    }
  }
}

// Hilfsfunktion: wartet bis ein Selektor im root existiert
async function waitForElement(root, selector, timeoutMs = 3000, intervalMs = 50) {
  const start = performance.now();
  return new Promise((resolve) => {
    const tick = () => {
      const el = root.querySelector(selector);
      if (el) return resolve(el);
      if (performance.now() - start > timeoutMs) return resolve(null);
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}

export function attachPortfolioToggleHandler(root) {
  if (!root) return;

  if (root.__ppReaderAttachInProgress) return;
  root.__ppReaderAttachInProgress = true;

  (async () => {
    const container = await waitForElement(root, '.portfolio-table');
    if (!container) {
      console.warn("attachPortfolioToggleHandler: .portfolio-table nicht gefunden (Timeout)");
      root.__ppReaderAttachInProgress = false;
      return;
    }

    // Buttons generiert?
    const btnCount = container.querySelectorAll('.portfolio-toggle').length;
    if (btnCount === 0) {
      console.debug("attachPortfolioToggleHandler: Noch keine Buttons – evtl. Recovery später");
    }

    if (container.__ppReaderPortfolioToggleBound) {
      root.__ppReaderAttachInProgress = false;
      return;
    }
    container.__ppReaderPortfolioToggleBound = true;
    console.debug("attachPortfolioToggleHandler: Listener registriert");

    container.addEventListener('click', async (e) => {
      try {
        const retryBtn = e.target.closest('.retry-pos');
        if (retryBtn && container.contains(retryBtn)) {
          const pid = retryBtn.getAttribute('data-portfolio');
          const detailsRow = root.querySelector(`.portfolio-details[data-portfolio="${pid}"]`);
          const cont = detailsRow?.querySelector('.positions-container');
          await reloadPortfolioPositions(pid, cont);
          return;
        }

        const btn = e.target.closest('.portfolio-toggle');
        if (!btn || !container.contains(btn)) return;

        const portfolioUuid = btn.getAttribute('data-portfolio');
        if (!portfolioUuid) return;

        const detailsRow = root.querySelector(`.portfolio-details[data-portfolio="${portfolioUuid}"]`);
        if (!detailsRow) return;

        const caretEl = btn.querySelector('.caret');
        const isHidden = detailsRow.classList.contains('hidden');

        if (isHidden) {
          detailsRow.classList.remove('hidden');
          btn.classList.add('expanded');
          btn.setAttribute('aria-expanded', 'true');
          if (caretEl) caretEl.textContent = '▼';
          expandedPortfolios.add(portfolioUuid);

          if (!portfolioPositionsCache.has(portfolioUuid)) {
            const containerEl = detailsRow.querySelector('.positions-container');
            if (containerEl) containerEl.innerHTML = '<div class="loading">Lade Positionen...</div>';
            try {
              const resp = await fetchPortfolioPositionsWS(_hassRef, _panelConfigRef, portfolioUuid);
              if (resp.error) {
                if (containerEl) {
                  containerEl.innerHTML = `<div class="error">${resp.error} <button class="retry-pos" data-portfolio="${portfolioUuid}">Erneut laden</button></div>`;
                }
                return;
              }
              const positions = (resp && resp.positions) || [];
              portfolioPositionsCache.set(portfolioUuid, positions);
              if (containerEl) {
                containerEl.innerHTML = renderPositionsTable(positions);
              }
            } catch (err) {
              const containerEl = detailsRow.querySelector('.positions-container');
              if (containerEl) {
                containerEl.innerHTML = `<div class="error">Fehler beim Laden: ${err.message} <button class="retry-pos" data-portfolio="${portfolioUuid}">Retry</button></div>`;
              }
              console.error('Fehler beim Lazy Load für', portfolioUuid, err);
            }
          } else {
            const containerEl = detailsRow.querySelector('.positions-container');
            if (containerEl) {
              containerEl.innerHTML = renderPositionsTable(portfolioPositionsCache.get(portfolioUuid));
            }
          }
        } else {
          detailsRow.classList.add('hidden');
          btn.classList.remove('expanded');
          btn.setAttribute('aria-expanded', 'false');
          if (caretEl) caretEl.textContent = '▶';
          expandedPortfolios.delete(portfolioUuid);
        }
      } catch (err) {
        console.error("attachPortfolioToggleHandler: Ungefangener Fehler im Click-Handler", err);
      }
    });

    root.__ppReaderAttachInProgress = false;
  })();
}

// Fallback: direkter Listener auf die Tabelle selbst (falls outer container nicht klickt)
export function ensurePortfolioRowFallbackListener(root) {
  const table = root.querySelector('.expandable-portfolio-table');
  if (!table) return;
  if (table.__ppReaderPortfolioFallbackBound) return;
  table.__ppReaderPortfolioFallbackBound = true;
  table.addEventListener('click', (e) => {
    const btn = e.target.closest('.portfolio-toggle');
    if (!btn) return;
    // Falls der Haupt-Listener schon aktiv war, nichts doppelt machen
    if (root.querySelector('.portfolio-table').__ppReaderPortfolioToggleBound) return;
    console.debug("Fallback-Listener aktiv – re-attach Hauptlistener");
    attachPortfolioToggleHandler(root);
  });
}

export async function renderDashboard(root, hass, panelConfig) {
  _hassRef = hass;
  _panelConfigRef = panelConfig;
  console.debug("renderDashboard: start – panelConfig:", panelConfig?.config, "derived entry_id?", panelConfig?.config?.entry_id || panelConfig?.config?._panel_custom?.config?.entry_id);

  const accountsResp = await fetchAccountsWS(hass, panelConfig);
  const accounts = (accountsResp && accountsResp.accounts) || [];

  const portfoliosResp = await fetchPortfoliosWS(hass, panelConfig);
  const depots = (portfoliosResp.portfolios || []).map(p => {
    const current_value = typeof p.current_value === 'number' ? p.current_value : 0;
    const purchase_sum = typeof p.purchase_sum === 'number' ? p.purchase_sum : 0;
    const gain_abs = current_value - purchase_sum;
    const gain_pct = purchase_sum > 0 ? (gain_abs / purchase_sum) * 100 : 0;
    return {
      uuid: p.uuid,
      name: p.name,
      position_count: typeof p.position_count === 'number' ? p.position_count : 0,
      current_value,
      purchase_sum,
      gain_abs,
      gain_pct
    };
  });

  // 3. Last file update (optional – falls bereits WS-Command vorhanden)
  let lastFileUpdate = '';
  try {
    lastFileUpdate = await fetchLastFileUpdateWS(hass, panelConfig);
  } catch {
    lastFileUpdate = '';
  }

  // 4. Gesamtvermögen berechnen (nur Anzeige)
  const totalAccounts = accounts.reduce((s, a) => s + (isNaN(a.balance) ? 0 : a.balance), 0);
  const totalDepots = depots.reduce((s, d) => s + (isNaN(d.current_value) ? 0 : d.current_value), 0);
  const totalWealth = totalAccounts + totalDepots;

  // 5. Header (falls createHeaderCard vorhanden)
  const headerMeta = `
    <div id="headerMeta">
      <div>💰 Gesamtvermögen: <strong>${formatNumber(totalWealth)}&nbsp;€</strong></div>
      ${lastFileUpdate ? `<div class="last-file-update">📂 Letzte Aktualisierung: ${lastFileUpdate}</div>` : ''}
    </div>
  `;
  const headerCard = createHeaderCard('Übersicht', headerMeta);

  // 6. Sicherstellen, dass die Struktur exakt der erwartet wird:
  //    - .portfolio-table (Wrapper)
  //    - darin eine <table class="expandable-portfolio-table"> mit <tr class="portfolio-row" data-portfolio="UUID">
  const portfolioTableHtml = buildExpandablePortfolioTable(depots);

  // 7. Konten-Tabellen
  const eurAccounts = accounts.filter(a => (a.currency_code || 'EUR') === 'EUR');
  const fxAccounts = accounts.filter(a => (a.currency_code || 'EUR') !== 'EUR');

  const accountsHtml = `
    <div class="card">
      <h2>Liquidität</h2>
      <div class="scroll-container account-table">
        ${makeTable(eurAccounts, [
    { key: 'name', label: 'Name' },
    { key: 'balance', label: 'Kontostand (EUR)', align: 'right' }
  ], ['balance'])}
      </div>
    </div>
    ${fxAccounts.length ? `
      <div class="card">
        <h2>Fremdwährungen</h2>
        <div class="scroll-container fx-account-table">
          ${makeTable(
    fxAccounts.map(a => ({
      ...a,
      fx_display: `${(a.orig_balance ?? 0).toLocaleString('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}&nbsp;${a.currency_code}`
    })),
    [
      { key: 'name', label: 'Name' },
      { key: 'fx_display', label: 'Betrag (FX)' },
      { key: 'balance', label: 'EUR', align: 'right' }
    ],
    ['balance']
  )}
        </div>
      </div>` : ''}
  `;

  // 8. Gesamtes Markup zurückgeben
  const markup = `
    ${headerCard.outerHTML}
    <div class="card">
      <h2>Investment</h2>
      <div class="scroll-container portfolio-table">
        ${portfolioTableHtml}
      </div>
    </div>
    ${accountsHtml}
  `;

  // Nach Render prüfen ob Buttons vorhanden; sonst Recovery (z.B. falls alte Funktion überschrieben)
  queueMicrotask(() => {
    try {
      const wrapper = root;
      const btns = wrapper.querySelectorAll('.portfolio-table .portfolio-toggle');
      if (btns.length === 0) {
        console.debug("Recovery: Tabelle ohne Buttons – erneuter Aufbau");
        const tableHost = wrapper.querySelector('.portfolio-table');
        if (tableHost) {
          tableHost.innerHTML = buildExpandablePortfolioTable(depots);
        }
      }
      attachPortfolioToggleHandler(root);
      ensurePortfolioRowFallbackListener(root);
      console.debug("renderDashboard: portfolio-toggle Buttons:", wrapper.querySelectorAll('.portfolio-toggle').length);
    } catch (e) {
      console.error("renderDashboard: Fehler bei Recovery/Listener", e);
    }
  });

  return markup;
}
