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
 * Handler für Depot-Updates.
 * @param {Array} update - Die empfangenen Depotdaten.
 * @param {HTMLElement} root - Root-Element.
 */
export function handlePortfolioUpdate(update, root) {
  console.log("updateConfigsWS: Depotdaten-Update erhalten:", update);
  const updatedPortfolios = update || [];
  updatePortfolioTable(updatedPortfolios, root);

  // Accounts (EUR + FX) aus Tabellen extrahieren für Neuberechnung
  const eurTable = root.querySelector('.account-table table');
  const fxTable = root.querySelector('.fx-account-table table');

  const parseAccounts = (table, isFx = false) => {
    if (!table) return [];
    return Array.from(table.querySelectorAll('tbody tr:not(.footer-row)')).map(row => {
      // EUR-Tabelle: Name | Kontostand(EUR)
      // FX-Tabelle:  Name | FX | EUR
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

  updateTotalWealth(accounts, updatedPortfolios, root);
}

/**
 * Aktualisiert die Tabelle mit den Depotdaten (inkl. Gewinnberechnung).
 * @param {Array} portfolios
 * @param {HTMLElement} root
 */
function updatePortfolioTable(portfolios, root) {
  const portfolioTable = root.querySelector('.portfolio-table');
  if (!portfolioTable) {
    console.warn("updatePortfolioTable: .portfolio-table nicht gefunden.");
    return;
  }

  const portfoliosWithGains = portfolios.map(p => {
    const gainAbs = p.current_value - p.purchase_sum;
    const gainPct = p.purchase_sum > 0 ? (gainAbs / p.purchase_sum) * 100 : 0;
    return {
      ...p,
      gain_abs: gainAbs,
      gain_pct: gainPct,
    };
  });

  portfolioTable.innerHTML = makeTable(
    portfoliosWithGains,
    [
      { key: 'name', label: 'Name' },
      { key: 'position_count', label: 'Anzahl Positionen', align: 'right' },
      { key: 'current_value', label: 'Aktueller Wert', align: 'right' },
      { key: 'gain_abs', label: 'gesamt +/-', align: 'right' },
      { key: 'gain_pct', label: '%', align: 'right' }
    ],
    ['position_count', 'current_value', 'gain_abs']
  );
}

/**
 * Handler für Last-File-Update.
 * @param {string} update
 * @param {HTMLElement} root
 */
export function handleLastFileUpdate(update, root) {
  const lastFileUpdate = update || "Unbekannt";
  updateLastFileUpdate(lastFileUpdate, root);
}

/**
 * Aktualisiert die Anzeige des Last-File-Updates.
 */
function updateLastFileUpdate(lastFileUpdate, root) {
  const el = root.querySelector('.last-file-update');
  if (!el) {
    console.warn("updateLastFileUpdate: Element '.last-file-update' nicht gefunden.");
    return;
  }
  el.innerHTML = `📂 Letzte Aktualisierung Datei: <strong>${lastFileUpdate}</strong>`;
}

/**
 * Aktualisiert die Gesamtvermögensanzeige (Accounts balance bereits in EUR).
 * @param {Array} accounts
 * @param {Array} portfolios
 * @param {HTMLElement} root
 */
function updateTotalWealth(accounts, portfolios, root) {
  const totalKonten = accounts.reduce((acc, k) => acc + (isNaN(k.balance) ? 0 : k.balance), 0);
  const totalDepots = portfolios.reduce((acc, d) => acc + (isNaN(d.current_value) ? 0 : d.current_value), 0);
  const totalVermoegen = totalKonten + totalDepots;

  const headerMetaHtml = `
    <div>💰 Gesamtvermögen: <strong>${totalVermoegen.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}&nbsp;€</strong></div>
  `;

  const headerMetaContainer = root.querySelector('#headerMeta');
  if (headerMetaContainer) {
    headerMetaContainer.innerHTML = headerMetaHtml;
  } else {
    console.warn("updateTotalWealth: '#headerMeta' nicht gefunden.");
  }
}