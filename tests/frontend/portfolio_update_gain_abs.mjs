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
  const classList = {
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
    toArray: () => Array.from(set)
  };

  Object.defineProperty(target, 'className', {
    configurable: true,
    enumerable: true,
    get() {
      return classList.toArray().join(' ');
    },
    set(value) {
      set.clear();
      if (!value) {
        return;
      }
      for (const name of String(value).split(/\s+/).filter(Boolean)) {
        set.add(name);
      }
    }
  });

  return classList;
}

function createCell({ text = '', html = null } = {}) {
  const cell = {
    tagName: 'TD',
    dataset: {}
  };
  const classList = createClassList(cell);
  cell.classList = classList;

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
    }
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
    }
  });

  return cell;
}

function createRow() {
  const row = {
    tagName: 'TR',
    dataset: {},
    cells: []
  };
  const classList = createClassList(row);
  row.classList = classList;

  row.appendChild = (cell) => {
    row.cells.push(cell);
    return cell;
  };

  row.querySelector = () => null;
  row.querySelectorAll = () => [];

  Object.defineProperty(row, 'innerHTML', {
    configurable: true,
    enumerable: true,
    get() {
      return row.cells.map((cell) => `<td class="${cell.className ?? ''}">${cell.innerHTML}</td>`).join('');
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
    }
  });

  Object.defineProperty(row, 'textContent', {
    configurable: true,
    enumerable: true,
    get() {
      return row.cells.map((cell) => cell.textContent).join('');
    },
    set(value) {
      row.cells = [createCell({ text: value ?? '' })];
    }
  });

  return row;
}

function createTBody() {
  const body = {
    tagName: 'TBODY',
    rows: []
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

function createGenericElement(tagName = 'div') {
  const element = {
    tagName: tagName.toUpperCase(),
    dataset: {},
    children: []
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

  Object.defineProperty(element, 'textContent', {
    configurable: true,
    enumerable: true,
    get() {
      return element._textContent ?? '';
    },
    set(value) {
      element._textContent = value ?? '';
    }
  });

  return element;
}

function createTable(tbody) {
  const table = createGenericElement('table');
  table.tBodies = tbody ? [tbody] : [];

  table.querySelector = (selector) => {
    if (selector === 'tbody') {
      return table.tBodies[0] ?? null;
    }
    if (selector === 'tr.footer-row' || selector === 'tbody tr.footer-row') {
      return table.tBodies[0]?.querySelector('tr.footer-row') ?? null;
    }
    return null;
  };

  table.querySelectorAll = (selector) => {
    if (selector === 'tbody tr.portfolio-row') {
      return table.tBodies[0]?.querySelectorAll('tr.portfolio-row') ?? [];
    }
    if (selector === 'tbody tr:not(.footer-row)') {
      return table.tBodies[0]?.querySelectorAll('tr:not(.footer-row)') ?? [];
    }
    return [];
  };

  table.appendChild = (child) => {
    if (child?.tagName === 'TBODY') {
      table.tBodies = [child];
    }
    return child;
  };

  return table;
}

function createHeaderMeta() {
  const valueElement = createGenericElement('strong');
  const element = createGenericElement('div');
  element.querySelector = (selector) => {
    if (selector === 'strong' || selector === '.total-wealth-value') {
      return valueElement;
    }
    return null;
  };
  return { element, valueElement };
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
      if (selector === '.security-range-selector' || selector === '.security-detail-placeholder') {
        return null;
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
      if (selector === '.account-table table' || selector === '.fx-account-table table') {
        return null;
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
      if (lower === 'td' || lower === 'span' || lower === 'button' || lower === 'strong' || lower === 'div') {
        return createGenericElement(lower);
      }
      return createGenericElement(lower);
    }
  };

  return { document, root, table, tbody, headerMeta, headerValue: valueElement };
}

const { document, tbody: tableBody } = createDocumentSkeleton();

const window = {
  document,
  navigator: { language: 'de-DE' },
  CustomEvent: class CustomEvent {
    constructor(type, detail = {}) {
      this.type = type;
      this.detail = detail.detail ?? null;
    }
  },
  Intl,
};

global.window = window;
global.document = document;
global.navigator = window.navigator;
global.CustomEvent = window.CustomEvent;

class HTMLElementStub {}

global.HTMLElement = HTMLElementStub;
global.HTMLTableElement = Object;
global.HTMLTableRowElement = Object;
global.HTMLTableCellElement = Object;
global.HTMLDivElement = Object;

const customElementsRegistry = {
  define() {},
  get() {
    return undefined;
  },
};
global.customElements = customElementsRegistry;
window.customElements = customElementsRegistry;
window.HTMLElement = global.HTMLElement;
window.HTMLTableElement = global.HTMLTableElement;
window.HTMLTableRowElement = global.HTMLTableRowElement;
window.HTMLTableCellElement = global.HTMLTableCellElement;
window.HTMLDivElement = global.HTMLDivElement;

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

async function importDashboardBundle() {
  const moduleFile = path.resolve(
    'custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.module.js',
  );
  const moduleSource = await readFile(moduleFile, 'utf-8');
  const match = moduleSource.match(/export \* from '(.+)';/);
  if (!match) {
    throw new Error('Unable to resolve dashboard bundle specifier from dashboard.module.js');
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

const updatePortfolioFooter =
  typeof moduleApi.updatePortfolioFooterFromDom === 'function'
    ? moduleApi.updatePortfolioFooterFromDom
    : null;
if (typeof updatePortfolioFooter !== 'function') {
  throw new Error('dashboard bundle did not expose updatePortfolioFooterFromDom');
}

const canProcessUpdates = typeof handlePortfolioPositionsUpdate === 'function';

const tbody = tableBody ?? document.querySelector('.portfolio-table table tbody');

const row = document.createElement('tr');
row.className = 'portfolio-row';
row.dataset.portfolio = 'portfolio-1';
row.dataset.positionCount = '0';
row.dataset.currentValue = '0';
row.dataset.purchaseSum = '0';
row.dataset.gainAbs = '0';
row.dataset.gainPct = '0';
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

const footer = document.createElement('tr');
footer.className = 'footer-row';
footer.innerHTML = `
  <td>Summe</td>
  <td class="align-right">0</td>
  <td class="align-right"><span class="positive">0,00\u00A0€</span></td>
  <td class="align-right"><span class="positive">0,00\u00A0€</span></td>
  <td class="align-right"><span class="positive">0,00\u00A0%</span></td>
`;
tbody.appendChild(footer);

const updatePayload = {
  uuid: 'portfolio-1',
  position_count: 2,
  current_value: 1500 / 100,
  purchase_sum: 0
};

const updatedRow = document.querySelector('tr.portfolio-row');
if (!updatedRow) {
  throw new Error('portfolio row not found');
}

updatedRow.dataset.positionCount = String(updatePayload.position_count);
updatedRow.dataset.currentValue = String(updatePayload.current_value);
updatedRow.dataset.purchaseSum = String(updatePayload.purchase_sum);
updatedRow.dataset.gainAbs = String(updatePayload.current_value - updatePayload.purchase_sum);
updatedRow.dataset.gainPct = updatePayload.purchase_sum > 0
  ? String(((updatePayload.current_value - updatePayload.purchase_sum) / updatePayload.purchase_sum) * 100)
  : '0';
updatedRow.dataset.hasValue = 'true';

const gainCell = updatedRow.cells[3];
if (gainCell) {
  gainCell.innerHTML = `<span class="positive">${new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(updatePayload.current_value - updatePayload.purchase_sum)}\u00A0€</span>`;
}

const valueCell = updatedRow.cells[2];
if (valueCell) {
  valueCell.innerHTML = `<span class="positive">${new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(updatePayload.current_value)}\u00A0€</span>`;
}

updatePortfolioFooter(document.querySelector('.portfolio-table table'));

const footerRow = document.querySelector('tr.footer-row');
if (!footerRow) {
  throw new Error('footer row not found');
}

const footerGainCell = footerRow.cells[3];
const footerGain = footerGainCell?.textContent?.trim() ?? '';
const footerGainHtml = footerGainCell?.innerHTML ?? '';
const footerGainPct = footerGainCell?.dataset?.gainPct ?? '';

const summary = {
  footerGain,
  footerGainHtml,
  footerGainPct,
};

const normalizationPayload = {
  portfolioUuid: 'portfolio-gain-struct',
  positions: [
    {
      security_uuid: 'gain-struct-1',
      name: 'Gain Structure Check',
      current_holdings: 0,
      purchase_value: updatePayload.purchase_sum,
      current_value: updatePayload.current_value,
      aggregation: null,
      average_cost: null,
      performance: {
        gain_abs: String(updatePayload.current_value - updatePayload.purchase_sum),
        gain_pct: '0',
        total_change_eur: updatePayload.current_value - updatePayload.purchase_sum,
        total_change_pct: 0,
        source: 'derived',
        coverage_ratio: null,
      },
    },
  ],
};

if (canProcessUpdates) {
  handlePortfolioPositionsUpdate(normalizationPayload, null);
}

const cacheSnapshot = getCacheSnapshot();
const cachedPositions = cacheSnapshot.get('portfolio-gain-struct');
if (!Array.isArray(cachedPositions) || cachedPositions.length === 0) {
  throw new Error('expected cached positions for portfolio-gain-struct');
}

const normalizedPositions = cachedPositions.map((position) => ({
  aggregation: position?.aggregation ?? null,
  average_cost: position?.average_cost ?? null,
  performance: position?.performance ?? null,
}));

summary.normalizedPositions = normalizedPositions;

console.log(JSON.stringify(summary));
