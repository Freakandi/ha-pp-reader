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

function createCellCollection() {
  const cells = [];
  cells.item = (index) => cells[index] ?? null;
  return cells;
}

function createRow() {
  const row = {
    tagName: 'TR',
    dataset: {},
    cells: createCellCollection(),
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
      row.cells = createCellCollection();
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
      row.cells = createCellCollection();
      row.cells.push(createCell({ text: value ?? '' }));
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
  const tBodies = [tbody];
  const table = {
    tagName: 'TABLE',
    dataset: {},
    tBodies,
  };
  tBodies.item = (index) => tBodies[index] ?? null;
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
windowObj.dispatchEvent = () => true;

global.window = windowObj;
windowObj.window = windowObj;
global.document = document;
Object.defineProperty(global, 'navigator', {
  configurable: true,
  enumerable: true,
  value: windowObj.navigator,
});
global.dispatchEvent = windowObj.dispatchEvent;

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
let moduleApi = await importDashboardBundle();

const ensureDashboardModuleExports = async () => {
  const hasExports = Object.keys(moduleApi ?? {}).length > 0 || typeof moduleApi?.default === 'object';
  if (hasExports) {
    return;
  }

  try {
    await import('tsx/esm');
    const tsDashboardUrl = new URL('../../src/dashboard/index.ts', import.meta.url);
    moduleApi = await import(tsDashboardUrl.href);
  } catch (error) {
    console.warn('dashboard_smoke: failed to load TypeScript fallback bundle', error);
  }
};

await ensureDashboardModuleExports();

const fixturesDir = path.resolve('tests/dashboard/fixtures');
const normalizationFixturePath = path.join(fixturesDir, 'normalization_smoketest_snapshot.json');
const diagnosticsFixturePath = path.join(fixturesDir, 'diagnostics_smoketest.json');
const normalizationSnapshot = JSON.parse(await readFile(normalizationFixturePath, 'utf-8'));
const diagnosticsSummary = JSON.parse(await readFile(diagnosticsFixturePath, 'utf-8'));

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

const footerHelperExported = typeof moduleApi.updatePortfolioFooterFromDom === 'function';
const updateFooter = footerHelperExported ? moduleApi.updatePortfolioFooterFromDom : null;
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

const smoketestPortfolio = normalizationSnapshot.portfolios?.find(
  (entry) => entry?.uuid === 'port-smoke',
);
if (!smoketestPortfolio) {
  throw new Error('normalization fixture missing port-smoke snapshot');
}

const portfolioUuid = smoketestPortfolio.uuid;
portfolioRow.dataset.portfolio = portfolioUuid;
const toggleButton = portfolioRow.querySelector('.portfolio-toggle');
if (toggleButton) {
  toggleButton.dataset.portfolio = portfolioUuid;
}
detailsRow.dataset.portfolio = portfolioUuid;

const gainCell = portfolioRow.cells[3];
const valueCell = portfolioRow.cells[2];

const updatePayload = {
  position_count: smoketestPortfolio.position_count ?? 0,
  current_value: smoketestPortfolio.current_value ?? 0,
  purchase_sum: smoketestPortfolio.purchase_sum ?? smoketestPortfolio.purchase_value ?? 0,
  gain_abs: smoketestPortfolio.performance?.gain_abs ?? 0,
  gain_pct: smoketestPortfolio.performance?.gain_pct ?? 0,
};

const formatEuro = (value) =>
  new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

portfolioRow.dataset.positionCount = String(updatePayload.position_count);
portfolioRow.dataset.currentValue = String(updatePayload.current_value);
portfolioRow.dataset.purchaseSum = String(updatePayload.purchase_sum);
portfolioRow.dataset.gainAbs = String(updatePayload.gain_abs);
portfolioRow.dataset.gainPct = String(updatePayload.gain_pct);
portfolioRow.dataset.hasValue = 'true';
portfolioRow.dataset.fxUnavailable = smoketestPortfolio.coverage_ratio === 1 ? 'false' : 'true';
portfolioRow.dataset.coverageRatio =
  typeof smoketestPortfolio.coverage_ratio === 'number'
    ? String(smoketestPortfolio.coverage_ratio)
    : '';
portfolioRow.dataset.provenance =
  typeof smoketestPortfolio.provenance === 'string' ? smoketestPortfolio.provenance : '';
portfolioRow.dataset.metricRunUuid =
  typeof smoketestPortfolio.metric_run_uuid === 'string' ? smoketestPortfolio.metric_run_uuid : '';
if (gainCell) {
  const gainClass = updatePayload.gain_abs >= 0 ? 'positive' : 'negative';
  gainCell.innerHTML = `<span class="${gainClass}">${formatEuro(updatePayload.gain_abs)}\u00A0€</span>`;
}
if (valueCell) {
  valueCell.innerHTML = `<span class="positive">${formatEuro(updatePayload.current_value)}\u00A0€</span>`;
}

updateFooter(table);

queuePendingUpdate(portfolioUuid, Array.isArray(smoketestPortfolio.positions) ? smoketestPortfolio.positions : []);

const pendingSizeBefore = getPendingUpdateCount();
const detailsLookup = document.querySelector(
  `.portfolio-table .portfolio-details[data-portfolio="${portfolioUuid}"]`,
);
const applied = flushPending(document, portfolioUuid);
const pendingSizeAfter = getPendingUpdateCount();
if (typeof reapplySort === 'function') {
  reapplySort(positionsContainer);
}

const footerGainCell = footer.cells[3];
const summary = {
  footerHelperExported,
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
  coverageRatio: portfolioRow.dataset.coverageRatio ?? '',
  provenance: portfolioRow.dataset.provenance ?? '',
  metricRunUuid: portfolioRow.dataset.metricRunUuid ?? '',
};

const normalizationPayload = {
  portfolioUuid,
  positions: Array.isArray(smoketestPortfolio.positions)
    ? smoketestPortfolio.positions
    : [],
};

if (canProcessUpdates) {
  handlePortfolioPositionsUpdate(normalizationPayload, null);
}

const cacheSnapshot = getCacheSnapshot();
const cachedPositions = cacheSnapshot.get(portfolioUuid);
if (!Array.isArray(cachedPositions) || cachedPositions.length === 0) {
  throw new Error(`expected cached positions for ${portfolioUuid}`);
}

const normalizedPositions = cachedPositions.map((position) => ({
  security_uuid: position?.security_uuid ?? null,
  name: position?.name ?? null,
  current_value: position?.current_value ?? null,
  aggregation: position?.aggregation ?? null,
  average_cost: position?.average_cost ?? null,
  performance: position?.performance ?? null,
  coverage_ratio: position?.coverage_ratio ?? null,
  provenance: position?.provenance ?? null,
  metric_run_uuid: position?.metric_run_uuid ?? null,
}));

summary.normalizedPositions = normalizedPositions;
summary.diagnostics = {
  ingestionAccounts: diagnosticsSummary.ingestion?.processed_entities?.accounts ?? 0,
  ingestionPortfolios: diagnosticsSummary.ingestion?.processed_entities?.portfolios ?? 0,
  ingestionTransactions: diagnosticsSummary.ingestion?.processed_entities?.transactions ?? 0,
  fxRateRows: diagnosticsSummary.enrichment?.fx?.latest_rate_fetch ? 1 : 0,
  metricsStatus: typeof diagnosticsSummary.metrics?.status === 'string'
    ? diagnosticsSummary.metrics.status
    : diagnosticsSummary.metrics?.available
      ? 'available'
      : diagnosticsSummary.metrics?.reason ?? '',
  metricsLatestRun: diagnosticsSummary.metrics?.latest_run?.run_uuid ?? '',
  normalizationStatus: diagnosticsSummary.normalized_payload?.available
    ? 'ok'
    : diagnosticsSummary.normalized_payload?.reason ?? 'unavailable',
  normalizationAccounts: diagnosticsSummary.normalized_payload?.account_count ?? 0,
  normalizationPositions: (diagnosticsSummary.normalized_payload?.portfolios ?? []).reduce(
    (total, entry) => total + (entry?.position_count ?? 0),
    0,
  ),
};

console.log(JSON.stringify(summary));
