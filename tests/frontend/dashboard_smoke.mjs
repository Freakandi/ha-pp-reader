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
  await import(bundleUrl.href);
}

await importDashboardBundle();

const updateFooter = windowObj.__ppReaderUpdatePortfolioFooter;
const flushPending = windowObj.__ppReaderFlushPendingPositions;
const reapplySort = windowObj.__ppReaderReapplyPositionsSort;

if (typeof updateFooter !== 'function' || typeof flushPending !== 'function') {
  throw new Error('dashboard bundle missing expected helpers');
}

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

const pendingMap = windowObj.__ppReaderPendingPositions instanceof Map
  ? windowObj.__ppReaderPendingPositions
  : new Map();
pendingMap.set('portfolio-1', {
  positions: [
    {
      security_uuid: 'sec-1',
      name: 'Test Security',
      current_holdings: 10,
      purchase_value: 500,
      current_value: 1500,
      gain_abs: 1000,
      gain_pct: 200,
      aggregation: {
        total_holdings: 10,
        positive_holdings: 10,
        purchase_value_cents: 50000,
        purchase_value_eur: 500,
        security_currency_total: 500,
        account_currency_total: 500,
        average_purchase_price_native: null,
        avg_price_security: null,
        avg_price_account: null,
        purchase_total_security: 500,
        purchase_total_account: 500,
      },
    },
  ],
});
windowObj.__ppReaderPendingPositions = pendingMap;

const pendingSizeBefore = pendingMap.size;
const detailsLookup = document.querySelector(
  '.portfolio-table .portfolio-details[data-portfolio="portfolio-1"]',
);
const applied = flushPending(document, 'portfolio-1');
const pendingSizeAfter = windowObj.__ppReaderPendingPositions instanceof Map
  ? windowObj.__ppReaderPendingPositions.size
  : 0;
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

console.log(JSON.stringify(summary));
