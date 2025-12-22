/**
 * Trades tab renderer for "Realized Performance".
 */

import type { TableRow } from '../content/elements';
import { createHeaderCard, makeTable } from '../content/elements';
// import { openTradeDetail } from '../dashboard';
import type { RealizedLot, RealizedTrade } from '../data/api';
import { fetchRealizedPerformance } from '../data/api';
import type { HomeAssistant } from '../types/home-assistant';
import { formatCurrency, formatDate, formatNumber, formatPercent } from '../utils/format';
import { escapeAttribute, escapeHtml } from '../utils/html';
import type { PanelConfigLike } from './types';
// Circular dependency breaker
let openTradeDetailArg: ((uuid: string) => boolean) | null = null;

export function setOpenTradeDetail(fn: (uuid: string) => boolean) {
  openTradeDetailArg = fn;
}

// CSS for stacked columns and sorting
const STYLES = `
<style>
  .sort-stack {
    display: flex;
    flex-direction: column;
    gap: 4px;
    line-height: 1.2;
    padding: 4px 0;
  }
  .sort-item {
    cursor: pointer;
    white-space: nowrap;
    opacity: 0.7;
    transition: opacity 0.2s;
    display: inline-block;
  }
  .sort-item:hover {
    opacity: 1;
    text-decoration: underline;
  }
  .sort-item.sort-active {
    opacity: 1;
    font-weight: bold;
    color: var(--primary-color);
  }
  .sort-item.sort-active::after {
    content: " ↕"; /* Default neutral arrow */
    font-size: 0.8em;
    opacity: 0.5;
  }
  .sort-item.sort-active.dir-asc::after {
    content: " ▲";
    opacity: 1;
  }
  .sort-item.sort-active.dir-desc::after {
    content: " ▼";
    opacity: 1;
  }

  .simple-sort-header {
    cursor: pointer;
  }
  .simple-sort-header:hover {
    text-decoration: underline;
  }
  .simple-sort-header.sort-active {
     font-weight: bold;
     color: var(--primary-color);
  }
  .simple-sort-header.sort-active.dir-asc::after { content: " ▲"; }
  .simple-sort-header.sort-active.dir-desc::after { content: " ▼"; }


  .cell-stack {
    display: flex;
    flex-direction: column;
    gap: 4px;
    line-height: 1.2;
  }
  .val-top {
    display: block;
    font-weight: 500;
  }
  .val-bottom {
    display: block;
    color: var(--secondary-text-color);
    font-size: 0.9em;
  }

  /* Ensure trend colors carry over */
  .val-top .positive, .val-bottom .positive { color: var(--success-color); }
  .val-top .negative, .val-bottom .negative { color: var(--error-color); }
  .trades-table-container { user-select: none; }
  .trade-name-clickable { cursor: pointer; text-decoration: underline; }
</style>
`;

// Extend TableRow to include our internal properties
type TradesTableRow = TableRow & {
  _uuid: string;
  _lots: RealizedLot[];
};

function renderTrend(value: number, formatted: string): string {
  const cls = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
  return `<span class="${cls}">${formatted}</span>`;
}

function createSortHeader(labelTop: string, selectorTop: string, labelBottom: string, selectorBottom: string): string {
  return `
    <div class="sort-stack">
        <span class="sort-item" data-sort-selector="${selectorTop}" role="button" tabindex="0">${escapeHtml(labelTop)}</span>
        <span class="sort-item" data-sort-selector="${selectorBottom}" role="button" tabindex="0">${escapeHtml(labelBottom)}</span>
    </div>
  `;
}

function createSimpleSortHeader(label: string, key: string): string {
  // Use a pseudo-selector or data-key for simple columns
  return `<span class="simple-sort-header" data-sort-key="${key}" role="button" tabindex="0">${escapeHtml(label)}</span>`;
}

function renderTradesTable(trades: readonly RealizedTrade[]): string {
  if (trades.length === 0) {
    return STYLES + '<div class="no-positions">Keine realisierten Gewinne/Verluste vorhanden.</div>';
  }

  // Define columns with custom headers
  const cols = [
    { key: 'name', label: createSimpleSortHeader('Wertpapier', 'name') },
    { key: 'total_sold_shares', label: createSimpleSortHeader('Stück', 'total_sold_shares'), align: 'right' as const },
    { key: 'last_sell_date', label: createSimpleSortHeader('Datum', 'last_sell_date'), align: 'right' as const },
    // Combo 1: Sales / Current
    {
      key: 'price_combo',
      label: createSortHeader('Verkaufskurs', '.val-top', 'Aktueller Kurs', '.val-bottom'),
      align: 'right' as const
    },
    // Combo 2: Purchase / Sales Value
    {
      key: 'value_combo',
      label: createSortHeader('Einstandswert', '.val-top', 'Verkaufswert', '.val-bottom'),
      align: 'right' as const
    },
    // Combo 3: Gross / Net Result
    {
      key: 'result_combo',
      label: createSortHeader('Bruttoergebnis', '.val-top', 'Nettoergebnis', '.val-bottom'),
      align: 'right' as const
    },
    { key: 'result_pct', label: createSimpleSortHeader('Resultat', 'result_pct'), align: 'right' as const },
    { key: 'current_holdings', label: createSimpleSortHeader('Bestand', 'current_holdings'), align: 'right' as const },
    {
      key: 'since_sell',
      label: createSortHeader('Seit Verkauf %', '.val-top', 'Gesamt', '.val-bottom'),
      align: 'right' as const,
    },
  ];

  // Helper for stacked cells
  const stack = (topVal: number | string, topFmt: string, botVal: number | string, botFmt: string) => `
      <div class="cell-stack">
        <span class="val-top" data-val="${String(topVal)}">${topFmt}</span>
        <span class="val-bottom" data-val="${String(botVal)}">${botFmt}</span>
      </div>
    `;

  const rows: TradesTableRow[] = trades.map((trade) => {
    const currentPrice = trade.current_price ?? 0;
    const lastSellPrice = trade.last_sell_price;
    const priceDiff = currentPrice - lastSellPrice;
    const priceTrend = priceDiff > 0 ? 'positive' : priceDiff < 0 ? 'negative' : 'neutral';

    const nameContent = escapeHtml(trade.name);
    let nameCell = `<span class="trade-name-clickable" data-val="${nameContent}" data-security-uuid="${escapeAttribute(trade.security_uuid)}">${nameContent}</span>`;
    if (trade.lots.length > 1) {
      nameCell = `
        <span class="expand-icon" data-security-uuid="${escapeAttribute(trade.security_uuid)}">
          <ha-icon icon="mdi:chevron-right"></ha-icon>
        </span>
        ${nameCell}
      `;
    }

    const isClosed = Math.abs(trade.current_holdings) < 0.001;

    // Use backend-provided metrics which handle currency conversion correctly
    const sinceSellAbs = trade.since_sell_abs;
    const sinceSellPct = trade.since_sell_pct;

    return {
      _uuid: trade.security_uuid,
      _lots: trade.lots,
      name: nameCell,
      total_sold_shares: `<span data-val="${String(trade.total_sold_shares)}">${formatNumber(trade.total_sold_shares)}</span>`,
      last_sell_date: `<span data-val="${escapeAttribute(trade.last_sell_date)}">${formatDate(trade.last_sell_date)}</span>`,

      price_combo: stack(
        trade.last_sell_price_native ?? trade.last_sell_price,
        formatCurrency(trade.last_sell_price_native ?? trade.last_sell_price, trade.currency_code),
        trade.current_price ?? 0,
        `<span class="trend--${priceTrend}">${formatCurrency(trade.current_price, trade.currency_code)}</span>`
      ),

      value_combo: stack(
        trade.purchase_value_gross,
        formatCurrency(trade.purchase_value_gross),
        trade.sales_value_gross,
        formatCurrency(trade.sales_value_gross)
      ),

      // Gross Result (Top) / Net Result (Bottom)
      result_combo: stack(
        trade.sales_value_gross - trade.purchase_value_gross, // result_gross
        formatCurrency(trade.sales_value_gross - trade.purchase_value_gross),
        trade.result_abs,
        formatCurrency(trade.result_abs)
      ),

      result_pct: `<span data-val="${String(trade.result_pct)}">${renderTrend(trade.result_pct, formatPercent(trade.result_pct / 100))}</span>`,

      current_holdings: isClosed
        ? '<span data-val="0"><ha-icon icon="mdi:lock-outline" title="Geschlossen" style="opacity: 0.6;"></ha-icon></span>'
        : `<span data-val="${String(trade.current_holdings)}">${formatNumber(trade.current_holdings)}</span>`,
      since_sell: trade.current_price === null ? '<span>-</span>' : stack(
        sinceSellPct,
        renderTrend(sinceSellPct, formatPercent(sinceSellPct)),
        sinceSellAbs,
        renderTrend(sinceSellAbs, formatCurrency(sinceSellAbs))
      ),
    } as TradesTableRow;
  });

  // --- Footer Calculation ---
  const totalPurchase = trades.reduce((sum, t) => sum + t.purchase_value_gross, 0);
  const totalSales = trades.reduce((sum, t) => sum + t.sales_value_gross, 0);
  const totalResultGross = trades.reduce((sum, t) => sum + (t.sales_value_gross - t.purchase_value_gross), 0);
  const totalResultNet = trades.reduce((sum, t) => sum + t.result_abs, 0);
  const totalSinceSellAbs = trades.reduce((sum, t) => sum + t.since_sell_abs, 0);

  // Percentage of total result over total purchase value
  const totalResultPct = totalPurchase !== 0 ? (totalResultGross / totalPurchase) * 100 : 0;

  const footerValues = {
    value_combo: stack(
      totalPurchase,
      formatCurrency(totalPurchase),
      totalSales,
      formatCurrency(totalSales)
    ),
    result_combo: stack(
      totalResultGross,
      formatCurrency(totalResultGross),
      totalResultNet,
      formatCurrency(totalResultNet)
    ),
    result_pct: `<span data-val="${String(totalResultPct)}">${renderTrend(totalResultPct, formatPercent(totalResultPct / 100))}</span>`,
    since_sell: stack(
      0,
      '—',
      totalSinceSellAbs,
      renderTrend(totalSinceSellAbs, formatCurrency(totalSinceSellAbs))
    )
  };

  return STYLES + makeTable(rows, cols, [], {
    sortable: false, // We handle sorting manually
    rowAttributes: (row: TableRow) => ({
      'data-security-uuid': (row as TradesTableRow)._uuid,
    }),
    footerValues: footerValues,
  });
}

function renderLots(lots: RealizedLot[], trade: RealizedTrade): string {
  const lotRows = lots.map((lot) => {
    // Helper for stacked cells -- same structure as parent for alignment
    const stack = (topVal: number, topFmt: string, botVal: number | string, botFmt: string) => `
      <div class="cell-stack">
        <span class="val-top" data-val="${String(topVal)}">${topFmt}</span>
        <span class="val-bottom" data-val="${String(botVal)}">${botFmt}</span>
      </div>
    `;

    const sinceSellAbs = lot.since_sell_abs;
    const sinceSellPct = lot.since_sell_pct;

    return {
      name: escapeHtml(trade.name),
      total_sold_shares: formatNumber(lot.shares),
      last_sell_date: formatDate(lot.date),
      price_combo: stack(
        lot.sell_price_native ?? lot.sell_price,
        formatCurrency(lot.sell_price_native ?? lot.sell_price, trade.currency_code),
        0, '' // No current price for lots
      ),
      value_combo: stack(
        lot.purchase_value_gross,
        formatCurrency(lot.purchase_value_gross),
        lot.sales_value_gross,
        formatCurrency(lot.sales_value_gross)
      ),
      result_combo: stack(
        lot.sales_value_gross - lot.purchase_value_gross,
        formatCurrency(lot.sales_value_gross - lot.purchase_value_gross),
        lot.result_abs,
        formatCurrency(lot.result_abs)
      ),
      result_pct: `<span data-val="${String(lot.result_pct)}">${renderTrend(lot.result_pct, formatPercent(lot.result_pct / 100))}</span>`,
      current_holdings: '',
      since_sell: trade.current_price === null ? '<span>-</span>' : stack(
        sinceSellPct,
        renderTrend(sinceSellPct, formatPercent(sinceSellPct)),
        sinceSellAbs,
        renderTrend(sinceSellAbs, formatCurrency(sinceSellAbs))
      ),
    };
  });

  return makeTable(
    lotRows,
    [
      { key: 'name', label: '' },
      { key: 'total_sold_shares', label: '', align: 'right' },
      { key: 'last_sell_date', label: '', align: 'right' },
      { key: 'price_combo', label: '', align: 'right' },
      { key: 'value_combo', label: '', align: 'right' },
      { key: 'result_combo', label: '', align: 'right' },
      { key: 'result_pct', label: '', align: 'right' },
      { key: 'current_holdings', label: '', align: 'right' },
      { key: 'since_sell', label: '', align: 'right' },
    ],
    [],
    { sortable: false }
  );
}

// Custom sort function
function sortTrades(
  table: HTMLTableElement,
  colIndex: number,
  valueSelector: string | null, // null means use simple data-val or text
  dir: 'asc' | 'desc'
) {
  const tbody = table.querySelector('tbody');
  if (!tbody) return;

  const footer = tbody.querySelector<HTMLTableRowElement>('tr.footer-row');
  // We only sort main rows, not child lot rows (they get removed anyway on re-render but let's be safe)
  // Actually, child rows are dynamically added/removed. If they exist, sorting breaks.
  // Ideally we collapse all before sorting.
  table.querySelectorAll('.is-expanded').forEach(tr => {
    tr.classList.remove('is-expanded');
    const icon = tr.querySelector('.expand-icon ha-icon');
    if (icon) icon.setAttribute('icon', 'mdi:chevron-right');
  });
  // Remove all child rows
  tbody.querySelectorAll('tr.child-row').forEach(tr => { tr.remove(); });

  const rows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>('tr')).filter(r => r !== footer);

  rows.sort((a, b) => {
    const aCell = a.cells[colIndex];
    const bCell = b.cells[colIndex];
    // Cells are guaranteed to exist by row index logic
    // if (!aCell || !bCell) return 0;

    let aValText = '';
    let bValText = '';

    if (valueSelector) {
      const aEl = aCell.querySelector<HTMLElement>(valueSelector);
      const bEl = bCell.querySelector<HTMLElement>(valueSelector);
      aValText = aEl?.getAttribute('data-val') ?? '';
      bValText = bEl?.getAttribute('data-val') ?? '';
    } else {
      // Try to find data-val on children first (for simple columns wrapped in span)
      // or data-val on cell? We didn't put data-val on cell for simple ones in `makeTable`.
      // Rendered: <td><span data-val="...">...</span></td>
      const aEl = aCell.querySelector<HTMLElement>('[data-val]');
      const bEl = bCell.querySelector<HTMLElement>('[data-val]');
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      aValText = aEl?.getAttribute('data-val') ?? aCell.textContent ?? '';
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      bValText = bEl?.getAttribute('data-val') ?? bCell.textContent ?? '';
    }

    // Use Number() to avoid partial parsing of dates (e.g. "2024-01-01" -> 2024)
    // implicitly checking isNaN(Number('')) -> 0, which might be acceptable or handled by fallthrough if we want empty to be NaN
    // But data-val for empty/missing might be tricky.
    // Actually, for robust sorting, we want strictly numeric strings to be sorted as numbers.
    // Date strings 'YYYY-MM-DD' result in NaN with Number(), so they fall through to localeCompare which is correct for ISO dates.
    const aNum = Number(aValText);
    const bNum = Number(bValText);

    // Check for NaN but also ensure we aren't comparing empty strings as 0 if that wasn't intended,
    // though String(0) is "0".
    // aValText might be empty string if attribute missing and text content empty.
    // But let's stick to the minimal fix: Number() returns NaN for "2024-...", parseFloat returns 2024.

    // We only want to use numeric sort if BOTH are valid numbers.
    // Note: whitespace strings become 0 with Number(), but parseFloat would be NaN (if empty) or parsed.
    // If aValText is strictly whitespace/empty, Number is 0.
    // If our data-val are generated from numbers, they won't be empty unless value is null/undefined.
    // If value is null, String(null) is "null" -> Number is NaN.

    if (!isNaN(aNum) && !isNaN(bNum)) {
      return (aNum - bNum) * (dir === 'asc' ? 1 : -1);
    }

    return aValText.localeCompare(bValText) * (dir === 'asc' ? 1 : -1);
  });

  // Reorder
  rows.forEach(r => tbody.appendChild(r));
  if (footer) tbody.appendChild(footer);
}

function attachEventListeners(root: HTMLElement, trades: readonly RealizedTrade[]) {
  const tradeMap = new Map(trades.map(t => [t.security_uuid, t]));

  // Expand/Collapse handlers
  root.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;

    // Handle trade detail click
    const tradeNameLink = target.closest('.trade-name-clickable');
    if (tradeNameLink) {
      event.stopPropagation();
      const uuid = (tradeNameLink as HTMLElement).dataset.securityUuid;

      if (uuid && openTradeDetailArg) {
        openTradeDetailArg(uuid);
      } else if (!openTradeDetailArg) {
        console.warn('openTradeDetail callback not set');
      }
      return;
    }
    // Handle expander
    const expandIcon = target.closest('.expand-icon');
    if (expandIcon) {
      event.stopPropagation();
      const uuid = (expandIcon as HTMLElement).dataset.securityUuid;
      const trade = uuid ? tradeMap.get(uuid) : undefined;
      const mainRow = root.querySelector(`tr[data-security-uuid="${String(uuid)}"]`);

      if (mainRow && trade) {
        if (mainRow.classList.toggle('is-expanded')) {
          mainRow.querySelector('.expand-icon ha-icon')?.setAttribute('icon', 'mdi:chevron-down');
          const childRowsHtml = renderLots(trade.lots, trade);
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = childRowsHtml;
          // Extract rows from the temp table body
          const childRows = Array.from(tempDiv.querySelectorAll('tbody tr')).map(row => {
            row.classList.add('child-row');
            if (uuid) (row as HTMLElement).dataset.parentUuid = uuid;
            return row;
          });
          mainRow.after(...childRows);
        } else {
          mainRow.querySelector('.expand-icon ha-icon')?.setAttribute('icon', 'mdi:chevron-right');
          root.querySelectorAll(`tr.child-row[data-parent-uuid="${String(uuid)}"]`).forEach(child => { child.remove(); });
        }
      }
      return;
    }

    // Handle sort
    const sortTrigger = target.closest('[data-sort-selector]') || target.closest('[data-sort-key]');
    if (sortTrigger) {
      const table = sortTrigger.closest('table');
      if (!table) return;

      // Clean up previous sort indicators
      table.querySelectorAll('.sort-active').forEach(el => {
        if (el !== sortTrigger) {
          el.classList.remove('sort-active', 'dir-asc', 'dir-desc');
        }
      });

      // Determine new state
      let dir: 'asc' | 'desc' = 'asc';
      if (sortTrigger.classList.contains('sort-active') && sortTrigger.classList.contains('dir-asc')) {
        dir = 'desc';
      }

      // Apply visual state
      sortTrigger.classList.add('sort-active');
      sortTrigger.classList.remove('dir-asc', 'dir-desc');
      sortTrigger.classList.add(`dir-${dir}`);

      // Execute sort
      // Find column index
      const th = sortTrigger.closest('th');
      const colIndex = th ? Array.from(th.parentElement?.children ?? []).indexOf(th) : -1;

      if (colIndex >= 0) {
        const selector = (sortTrigger as HTMLElement).dataset.sortSelector || null;
        sortTrades(table, colIndex, selector, dir);
      }
    }
  });
}

export async function renderTrades(
  root: HTMLElement,
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
): Promise<string> {
  const headerCard = createHeaderCard('Realisierte Performance', '');

  let trades: RealizedTrade[] = [];
  try {
    trades = await fetchRealizedPerformance(hass, panelConfig);
  } catch (e) {
    console.error("Failed to fetch trades", e);
  }

  const tradesTable = renderTradesTable(trades);

  const markup = `
    <div class="trades-view-wrapper" style="height: 100%;">
      ${headerCard.outerHTML}
      <div class="card">
        <div class="trades-table-container">
          ${tradesTable}
        </div>
      </div>
    </div>
  `;

  // Attach event listeners after rendering
  setTimeout(() => {
    const wrapper = root.querySelector<HTMLElement>('.trades-view-wrapper');
    if (wrapper) {
      attachEventListeners(wrapper, trades);
    }
  }, 0);

  return markup;
}

export const __TEST_ONLY__ = {
  renderTradesTable,
};
