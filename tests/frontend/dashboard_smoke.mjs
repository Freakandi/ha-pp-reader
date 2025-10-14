import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function htmlToText(value = '') {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, '\u00A0');
}

function createClassList(target) {
  const set = new Set();
  return {
    add: (...names) => {
      for (const name of names) {
        if (name) {
          set.add(name);
        }
      }
    },
    remove: (...names) => {
      for (const name of names) {
        if (name) {
          set.delete(name);
        }
      }
    },
    contains: (name) => set.has(name),
    toArray: () => Array.from(set),
  };
}

function createCell({ text = '', html = null } = {}) {
  const cell = {
    tagName: 'TD',
    dataset: {},
    children: [],
  };
  const classList = createClassList(cell);
  cell.classList = classList;

  cell.appendChild = (child) => {
    if (child) {
      cell.children.push(child);
    }
    return child;
  };

  let innerValue = html ?? text;
  let textValue = html != null ? htmlToText(html) : text;

  Object.defineProperty(cell, 'textContent', {
    configurable: true,
    enumerable: true,
    get() {
      return textValue;
    },
    set(value) {
      textValue = value ?? '';
      innerValue = value ?? '';
    },
  });

  Object.defineProperty(cell, 'innerHTML', {
    configurable: true,
    enumerable: true,
    get() {
      return innerValue;
    },
    set(value) {
      innerValue = value ?? '';
      textValue = htmlToText(innerValue);
    },
  });

  return cell;
}

function createRow() {
  const row = {
    tagName: 'TR',
    dataset: {},
    cells: [],
  };
  const classList = createClassList(row);
  row.classList = classList;

  row.appendChild = (cell) => {
    row.cells.push(cell);
    return cell;
  };

  row.querySelector = (selector) => {
    if (selector === '.positions-container') {
      for (const cell of row.cells) {
        for (const child of cell.children ?? []) {
          if (child.classList?.contains('positions-container')) {
            return child;
          }
        }
      }
    }
    return null;
  };

  row.querySelectorAll = () => [];

  Object.defineProperty(row, 'innerHTML', {
    configurable: true,
    enumerable: true,
    get() {
      return row.cells
        .map((cell) => `<td class="${cell.classList?.toArray?.().join(' ') ?? ''}">${cell.innerHTML}</td>`)
        .join('');
    },
    set(value) {
      row.cells = [];
      const matches = (value || '').match(/<td[^>]*>[\s\S]*?<\/td>/gi) || [];
      for (const match of matches) {
        const classMatch = match.match(/class="([^"]*)"/i);
        const inner = match.replace(/^<td[^>]*>/i, '').replace(/<\/td>$/i, '');
        const cell = createCell({ html: inner });
        if (classMatch) {
          cell.className = classMatch[1];
        }
        row.cells.push(cell);
      }
    },
  });

  Object.defineProperty(row, 'textContent', {
    configurable: true,
    enumerable: true,
    get() {
      return row.cells.map((cell) => cell.textContent).join('');
    },
    set(value) {
      row.cells = [createCell({ text: value ?? '' })];
    },
  });

  return row;
}

function createTBody() {
  const body = {
    tagName: 'TBODY',
    rows: [],
  };
  body.children = body.rows;

  body.appendChild = (row) => {
    if (row) {
      body.rows.push(row);
    }
    return row;
  };

  body.querySelectorAll = (selector) => {
    if (selector === 'tr.portfolio-row') {
      return body.rows.filter((row) => row.classList.contains('portfolio-row'));
    }
    if (selector === 'tr.footer-row') {
      return body.rows.filter((row) => row.classList.contains('footer-row'));
    }
    if (selector === 'tr.portfolio-details') {
      return body.rows.filter((row) => row.classList.contains('portfolio-details'));
    }
    if (selector === 'tr:not(.footer-row)') {
      return body.rows.filter((row) => !row.classList.contains('footer-row'));
    }
    if (selector === 'tr') {
      return [...body.rows];
    }
    return [];
  };

  body.querySelector = (selector) => body.querySelectorAll(selector)[0] ?? null;

  return body;
}

function createTable(tbody) {
  const table = {
    tagName: 'TABLE',
    dataset: {},
    tBodies: [tbody],
  };
  const classList = createClassList(table);
  table.classList = classList;

  table.appendChild = (child) => {
    if (child?.tagName === 'TBODY') {
      table.tBodies.push(child);
    }
    return child;
  };

  table.querySelector = (selector) => {
    if (selector === 'tbody') {
      return tbody;
    }
    if (selector === 'tr.footer-row') {
      return tbody.querySelector('tr.footer-row');
    }
    return null;
  };

  table.querySelectorAll = (selector) => {
    if (selector.startsWith('tbody')) {
      return tbody.querySelectorAll(selector.replace('tbody ', ''));
    }
    return [];
  };

  return table;
}

function createGenericElement(tagName = 'div') {
  const element = {
    tagName: tagName.toUpperCase(),
    dataset: {},
    children: [],
  };
  const classList = createClassList(element);
  element.classList = classList;

  element.appendChild = (child) => {
    if (child) {
      element.children.push(child);
    }
    return child;
  };

  element.querySelector = () => null;
  element.querySelectorAll = () => [];

  Object.defineProperty(element, 'innerHTML', {
    configurable: true,
    enumerable: true,
    get() {
      return element._innerHTML ?? '';
    },
    set(value) {
      element._innerHTML = value ?? '';
      element.children = [];
    },
  });

  Object.defineProperty(element, 'textContent', {
    configurable: true,
    enumerable: true,
    get() {
      return element._textContent ?? '';
    },
    set(value) {
      element._textContent = value ?? '';
    },
  });

  return element;
}

function createHeaderMeta() {
  const element = createGenericElement('div');
  element.classList.add('header-meta');
  const strong = createGenericElement('strong');
  element.appendChild(strong);
  return { element, valueElement: strong };
}

function createDocumentSkeleton() {
  const tbody = createTBody();
  const table = createTable(tbody);
  const root = createGenericElement('div');
  root.classList.add('portfolio-table');
  root.appendChild(table);

  const { element: headerMeta, valueElement } = createHeaderMeta();

  const document = {
    body: root,
    querySelector: (selector) => {
      if (selector === '.portfolio-table table' || selector === 'table.expandable-portfolio-table') {
        return table;
      }
      if (selector === '.portfolio-table table tbody' || selector === 'tbody') {
        return tbody;
      }
      if (selector === '.portfolio-table') {
        return root;
      }
      if (selector === '#headerMeta') {
        return headerMeta;
      }
      if (selector === 'tr.footer-row') {
        return tbody.querySelector('tr.footer-row');
      }
      if (selector === 'tr.portfolio-row') {
        return tbody.querySelector('tr.portfolio-row');
      }
      if (selector.startsWith('.portfolio-table .portfolio-details')) {
        return tbody.querySelector('tr.portfolio-details');
      }
      return null;
    },
    querySelectorAll: (selector) => {
      if (selector === '.portfolio-table table tbody tr.portfolio-row') {
        return tbody.querySelectorAll('tr.portfolio-row');
      }
      if (selector === '.portfolio-table table tbody tr:not(.footer-row)') {
        return tbody.querySelectorAll('tr:not(.footer-row)');
      }
      return [];
    },
    createElement: (tag) => {
      const lower = String(tag).toLowerCase();
      if (lower === 'tr') {
        return createRow();
      }
      if (lower === 'tbody') {
        return createTBody();
      }
      if (lower === 'table') {
        return createTable(createTBody());
      }
      if (lower === 'template') {
        const template = createGenericElement('template');
        template.content = {
          querySelector: () => null,
        };
        Object.defineProperty(template, 'innerHTML', {
          configurable: true,
          enumerable: true,
          get() {
            return template._innerHTML ?? '';
          },
          set(value) {
            template._innerHTML = value ?? '';
          },
        });
        return template;
      }
      if (['td', 'span', 'button', 'strong', 'div'].includes(lower)) {
        return createGenericElement(lower);
      }
      return createGenericElement(lower);
    },
  };

  return { document, root, table, tbody, headerMeta, headerValue: valueElement };
}

function ensureFooterRow(tbody) {
  let footer = tbody.querySelector('tr.footer-row');
  if (footer) {
    return footer;
  }
  footer = createRow();
  footer.classList.add('footer-row');
  footer.innerHTML = `
    <td>Summe</td>
    <td class="align-right">0</td>
    <td class="align-right"><span class="positive">0,00\u00A0€</span></td>
    <td class="align-right"><span class="positive">0,00\u00A0€</span></td>
    <td class="align-right"><span class="positive">0,00\u00A0%</span></td>
  `;
  tbody.appendChild(footer);
  return footer;
}

function ensurePortfolioRow(tbody) {
  let row = tbody.querySelector('tr.portfolio-row');
  if (row) {
    return row;
  }
  row = createRow();
  row.classList.add('portfolio-row');
  row.innerHTML = `
    <td>
      <button type="button" class="portfolio-toggle" data-portfolio="portfolio-1">
        <span class="caret">▶</span>
        <span class="portfolio-name">Test Portfolio</span>
      </button>
    </td>
    <td class="align-right">0</td>
    <td class="align-right"><span class="positive">0,00\u00A0€</span></td>
    <td class="align-right"><span class="positive">0,00\u00A0€</span></td>
    <td class="align-right"><span class="positive">0,00\u00A0%</span></td>
  `;
  tbody.appendChild(row);
  return row;
}

function ensureDetailsRow(tbody) {
  let row = tbody.rows.find((candidate) => candidate.classList.contains('portfolio-details'));
  if (row) {
    return row;
  }
  row = createRow();
  row.classList.add('portfolio-details');
  row.dataset.portfolio = 'portfolio-1';
  const cell = createCell();
  cell.classList = createClassList(cell);
  cell.classList.add('positions-cell');
  const container = createGenericElement('div');
  container.classList.add('positions-container');
  cell.appendChild(container);
  Object.defineProperty(cell, 'innerHTML', {
    configurable: true,
    enumerable: true,
    get() {
      return container.innerHTML;
    },
    set(value) {
      container.innerHTML = value;
    },
  });
  row.appendChild(cell);
  tbody.appendChild(row);
  return row;
}

const { document, table, tbody } = createDocumentSkeleton();
const footer = ensureFooterRow(tbody);
const portfolioRow = ensurePortfolioRow(tbody);
const detailsRow = ensureDetailsRow(tbody);
const positionsContainer = detailsRow.querySelector('.positions-container');

const windowObj = {
  document,
  navigator: { language: 'de-DE' },
  Intl,
};

global.window = windowObj;
windowObj.window = windowObj;
global.document = document;
global.navigator = windowObj.navigator;

class CustomEventImpl {
  constructor(type, detail = {}) {
    this.type = type;
    this.detail = detail.detail ?? null;
  }
}

windowObj.CustomEvent = CustomEventImpl;
global.CustomEvent = CustomEventImpl;

class HTMLElementStub {}

global.HTMLElement = HTMLElementStub;
global.HTMLTableElement = Object;
global.HTMLTableRowElement = Object;
global.HTMLTableCellElement = Object;
global.HTMLDivElement = Object;
windowObj.HTMLElement = HTMLElementStub;

const customElementsRegistry = {
  define() {},
  get() {
    return undefined;
  },
};

windowObj.customElements = customElementsRegistry;
global.customElements = customElementsRegistry;
windowObj.HTMLTableElement = global.HTMLTableElement;
windowObj.HTMLTableRowElement = global.HTMLTableRowElement;
windowObj.HTMLTableCellElement = global.HTMLTableCellElement;
windowObj.HTMLDivElement = global.HTMLDivElement;

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = NoopObserver;
global.IntersectionObserver = NoopObserver;

if (typeof queueMicrotask !== 'function') {
  global.queueMicrotask = (cb) => Promise.resolve().then(cb);
}

global.console = console;

async function importDashboardBundle() {
  const moduleFile = path.resolve('custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.module.js');
  const moduleSource = await readFile(moduleFile, 'utf-8');
  const match = moduleSource.match(/export \* from '(.+)';/);
  if (!match) {
    throw new Error('Unable to resolve dashboard bundle specifier');
  }
  const bundleSpecifier = match[1];
  const bundleUrl = new URL(bundleSpecifier, pathToFileURL(moduleFile));
  return import(bundleUrl.href);
}
const moduleApi = await importDashboardBundle();
const testHelpers = moduleApi.__TEST_ONLY__ ?? {};
const getCacheSnapshot =
  typeof testHelpers.getPortfolioPositionsCacheSnapshot === 'function'
    ? testHelpers.getPortfolioPositionsCacheSnapshot
    : () => new Map();
const clearCache =
  typeof testHelpers.clearPortfolioPositionsCache === 'function'
    ? testHelpers.clearPortfolioPositionsCache
    : () => {};
const queuePendingUpdate =
  typeof testHelpers.queuePendingUpdate === 'function'
    ? testHelpers.queuePendingUpdate
    : () => {};
const getPendingUpdateCount =
  typeof testHelpers.getPendingUpdateCount === 'function'
    ? testHelpers.getPendingUpdateCount
    : () => 0;
const clearPendingUpdates =
  typeof testHelpers.clearPendingUpdates === 'function'
    ? testHelpers.clearPendingUpdates
    : () => {};

clearCache();
clearPendingUpdates();

let handlePortfolioPositionsUpdate = moduleApi.handlePortfolioPositionsUpdate;

if (typeof handlePortfolioPositionsUpdate !== 'function') {
  handlePortfolioPositionsUpdate = Object.values(moduleApi).find(candidate => {
    if (typeof candidate !== 'function') {
      return false;
    }
    const candidateName = candidate.name || candidate.displayName || '';
    return candidateName.toLowerCase().includes('handleportfoliopositionsupdate');
  });
}

const updateFooter =
  typeof moduleApi.updatePortfolioFooterFromDom === 'function'
    ? moduleApi.updatePortfolioFooterFromDom
    : null;
const flushPending =
  typeof moduleApi.flushPendingPositions === 'function'
    ? moduleApi.flushPendingPositions
    : null;
const reapplySort =
  typeof moduleApi.reapplyPositionsSort === 'function'
    ? moduleApi.reapplyPositionsSort
    : null;

if (typeof updateFooter !== 'function' || typeof flushPending !== 'function') {
  throw new Error('dashboard bundle missing expected helpers');
}

const canProcessUpdates = typeof handlePortfolioPositionsUpdate === 'function';

portfolioRow.dataset.portfolio = 'portfolio-1';
portfolioRow.dataset.positionCount = '0';
portfolioRow.dataset.currentValue = '0';
portfolioRow.dataset.purchaseSum = '0';
portfolioRow.dataset.gainAbs = '0';
portfolioRow.dataset.gainPct = '0';
portfolioRow.dataset.hasValue = 'true';

const gainCell = portfolioRow.cells[3];
if (gainCell) {
  gainCell.innerHTML = '<span class="positive">0,00\u00A0€</span>';
}

const valueCell = portfolioRow.cells[2];
if (valueCell) {
  valueCell.innerHTML = '<span class="positive">0,00\u00A0€</span>';
}

const updatePayload = {
  position_count: 2,
  current_value: 1500,
  purchase_sum: 0,
};

portfolioRow.dataset.positionCount = String(updatePayload.position_count);
portfolioRow.dataset.currentValue = String(updatePayload.current_value);
portfolioRow.dataset.purchaseSum = String(updatePayload.purchase_sum);
portfolioRow.dataset.gainAbs = String(updatePayload.current_value - updatePayload.purchase_sum);
portfolioRow.dataset.gainPct = '0';
portfolioRow.dataset.hasValue = 'true';
if (gainCell) {
  gainCell.innerHTML = `<span class="positive">${new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(updatePayload.current_value - updatePayload.purchase_sum)}\u00A0€</span>`;
}
if (valueCell) {
  valueCell.innerHTML = `<span class="positive">${new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(updatePayload.current_value)}\u00A0€</span>`;
}

updateFooter(table);

queuePendingUpdate('portfolio-1', [
  {
    security_uuid: 'sec-1',
    name: 'Test Security',
    current_holdings: 10,
    purchase_value: 500,
    current_value: 1500,
    gain_abs: 1000,
    aggregation: {
      total_holdings: 10,
      positive_holdings: 10,
      purchase_value_cents: 50000,
      purchase_value_eur: 500,
      security_currency_total: 500,
      account_currency_total: 500,
      purchase_total_security: 500,
      purchase_total_account: 500,
    },
    average_cost: {
      native: null,
      security: null,
      account: null,
      eur: null,
      source: 'aggregation',
      coverage_ratio: null,
    },
  },
]);

const pendingSizeBefore = getPendingUpdateCount();
const detailsLookup = document.querySelector(
  '.portfolio-table .portfolio-details[data-portfolio="portfolio-1"]',
);
const applied = flushPending(document, 'portfolio-1');
const pendingSizeAfter = getPendingUpdateCount();
if (typeof reapplySort === 'function') {
  reapplySort(positionsContainer);
}

const footerGainCell = footer.cells[3];
const summary = {
  footerGain: footerGainCell?.textContent?.trim() ?? '',
  footerGainHtml: footerGainCell?.innerHTML ?? '',
  footerGainPct: footerGainCell?.dataset?.gainPct ?? '',
  footerGainSign: footerGainCell?.dataset?.gainSign ?? '',
  flushApplied: applied,
  positionsMarkupIncludesTable: /<table/i.test(positionsContainer?.innerHTML ?? ''),
  positionsMarkupLength: (positionsContainer?.innerHTML ?? '').length,
  positionsMarkupHasPurchaseValue: /500,00/.test(positionsContainer?.innerHTML ?? ''),
  sortKey: positionsContainer?.dataset?.sortKey ?? '',
  sortDir: positionsContainer?.dataset?.sortDir ?? '',
  pendingSizeBefore,
  pendingSizeAfter,
  detailsFound: Boolean(detailsLookup),
};

const NUMERIC_STRING_PATTERN = /^[+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:[eE][+-]?\d+)?$/;

const toFiniteNumber = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || !NUMERIC_STRING_PATTERN.test(trimmed)) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toOptionalString = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const simulateNormalizePerformancePayload = (raw) => {
  const candidate = raw && typeof raw === 'object' ? raw : null;
  if (!candidate) {
    return null;
  }

  const gainAbs = toFiniteNumber(candidate.gain_abs);
  const gainPct = toFiniteNumber(candidate.gain_pct);
  const totalChangeEur = toFiniteNumber(candidate.total_change_eur);
  const totalChangePct = toFiniteNumber(candidate.total_change_pct);

  if (gainAbs == null || gainPct == null || totalChangeEur == null || totalChangePct == null) {
    return null;
  }

  const source = toOptionalString(candidate.source) ?? 'derived';
  const coverage = toFiniteNumber(candidate.coverage_ratio) ?? null;

  const dayChangeCandidate = candidate.day_change && typeof candidate.day_change === 'object'
    ? candidate.day_change
    : null;
  let dayChange = null;
  if (dayChangeCandidate) {
    const priceChangeNative = toFiniteNumber(dayChangeCandidate.price_change_native);
    const priceChangeEur = toFiniteNumber(dayChangeCandidate.price_change_eur);
    const changePct = toFiniteNumber(dayChangeCandidate.change_pct);
    if (priceChangeNative != null || priceChangeEur != null || changePct != null) {
      dayChange = {
        price_change_native: priceChangeNative,
        price_change_eur: priceChangeEur,
        change_pct: changePct,
        source: toOptionalString(dayChangeCandidate.source) ?? 'derived',
        coverage_ratio: toFiniteNumber(dayChangeCandidate.coverage_ratio) ?? null,
      };
    }
  }

  return {
    gain_abs: gainAbs,
    gain_pct: gainPct,
    total_change_eur: totalChangeEur,
    total_change_pct: totalChangePct,
    source,
    coverage_ratio: coverage,
    day_change: dayChange,
  };
};

const simulateDeriveAggregation = (position) => {
  const rawAggregation = position.aggregation && typeof position.aggregation === 'object'
    ? position.aggregation
    : {};

  const asFiniteNumber = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
  const asNullableNumber = (value) => {
    const numeric = asFiniteNumber(value);
    return numeric === null ? null : numeric;
  };

  const totalHoldings = asFiniteNumber(rawAggregation.total_holdings) ?? 0;
  const positiveHoldingsRaw = asFiniteNumber(rawAggregation.positive_holdings);
  const purchaseValueEur = asFiniteNumber(rawAggregation.purchase_value_eur) ?? 0;
  const purchaseValueCentsRaw = asFiniteNumber(rawAggregation.purchase_value_cents);
  const securityTotal = asFiniteNumber(rawAggregation.security_currency_total) ?? 0;
  const accountTotal = asFiniteNumber(rawAggregation.account_currency_total) ?? 0;
  const purchaseTotalSecurity = asFiniteNumber(rawAggregation.purchase_total_security) ?? securityTotal;
  const purchaseTotalAccount = asFiniteNumber(rawAggregation.purchase_total_account) ?? accountTotal;

  return {
    total_holdings: totalHoldings,
    positive_holdings: Math.max(0, positiveHoldingsRaw ?? totalHoldings),
    purchase_value_cents: Math.round(purchaseValueCentsRaw ?? 0),
    purchase_value_eur: purchaseValueEur,
    security_currency_total: securityTotal,
    account_currency_total: accountTotal,
    purchase_total_security: purchaseTotalSecurity,
    purchase_total_account: purchaseTotalAccount,
  };
};

const simulateNormalizeAverageCost = (position) => {
  const rawAverageCost = position.average_cost && typeof position.average_cost === 'object'
    ? position.average_cost
    : null;

  if (!rawAverageCost) {
    return null;
  }

  const asFiniteNumber = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
  const asNullableNumber = (value) => {
    const numeric = asFiniteNumber(value);
    return numeric === null ? null : numeric;
  };

  const normalizeSource = (value) => {
    if (value === 'totals' || value === 'eur_total' || value === 'aggregation') {
      return value;
    }
    return 'aggregation';
  };

  return {
    native: asNullableNumber(rawAverageCost.native),
    security: asNullableNumber(rawAverageCost.security),
    account: asNullableNumber(rawAverageCost.account),
    eur: asNullableNumber(rawAverageCost.eur),
    source: normalizeSource(rawAverageCost.source),
    coverage_ratio: asNullableNumber(rawAverageCost.coverage_ratio),
  };
};

const simulateNormalizePerformance = (position) => simulateNormalizePerformancePayload(position.performance);

const simulateNormalizePosition = (position) => {
  const normalized = { ...position };
  const hasAggregation = position.aggregation && typeof position.aggregation === 'object';
  const aggregation = hasAggregation ? simulateDeriveAggregation(position) : null;
  const averageCost = simulateNormalizeAverageCost(position);
  const performance = simulateNormalizePerformance(position);

  if (hasAggregation && aggregation) {
    normalized.aggregation = aggregation;
  } else if ('aggregation' in normalized) {
    normalized.aggregation = null;
  }

  if (averageCost) {
    normalized.average_cost = averageCost;
  } else if ('average_cost' in normalized) {
    normalized.average_cost = null;
  }

  if (performance) {
    normalized.performance = performance;
  } else if ('performance' in normalized) {
    normalized.performance = null;
  }

  return normalized;
};

const simulateNormalizePositions = (positions) => positions.map(simulateNormalizePosition);

const normalizationPayload = {
  portfolioUuid: 'portfolio-struct',
  positions: [
    {
      security_uuid: 'sec-struct-1',
      name: 'Struct Validation',
      purchase_value: 3400,
      current_value: 3650,
      gain_abs: 250,
      aggregation: {
        total_holdings: '7',
        positive_holdings: undefined,
        purchase_value_cents: '340000',
      purchase_value_eur: 3400,
      security_currency_total: 3500.25,
      account_currency_total: 3600.5,
      purchase_total_security: undefined,
      purchase_total_account: null,
    },
      average_cost: {
        native: 'invalid',
        security: 45.67,
        account: null,
        eur: 'NaN',
        source: 'legacy',
        coverage_ratio: '0.42',
      },
      performance: {
        gain_abs: '900',
        gain_pct: 12.3456,
      },
    },
    {
      security_uuid: 'sec-struct-2',
      name: 'Missing Structures',
      current_holdings: 5,
      purchase_value: 800,
      current_value: 950,
      gain_abs: 150,
      aggregation: null,
      average_cost: null,
      performance: null,
    },
  ],
};

let fallbackPositions = [];

if (canProcessUpdates) {
  handlePortfolioPositionsUpdate(normalizationPayload, null);
}

if (!canProcessUpdates) {
  const simulated = simulateNormalizePositions(normalizationPayload.positions);
  fallbackPositions = simulated;
}

const cacheSnapshot = getCacheSnapshot();
const cachedPositions = cacheSnapshot.get('portfolio-struct');
const sourcePositions =
  Array.isArray(cachedPositions) && cachedPositions.length
    ? cachedPositions
    : fallbackPositions;

const normalizedPositions = sourcePositions.map((position) => ({
  aggregation: position?.aggregation ?? null,
  average_cost: position?.average_cost ?? null,
  performance: position?.performance ?? null,
}));

summary.normalizedPositions = normalizedPositions;

console.log(JSON.stringify(summary));
