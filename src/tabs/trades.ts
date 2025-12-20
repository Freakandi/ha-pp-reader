/**
 * Trades tab renderer for "Realized Performance".
 */

import type { TableRow } from '../content/elements';
import { createHeaderCard, makeTable } from '../content/elements';
import type { RealizedLot, RealizedTrade } from '../data/api';
import { fetchRealizedPerformance } from '../data/api';
import type { HomeAssistant } from '../types/home-assistant';
import { formatCurrency, formatNumber, formatPercent } from '../utils/format';
import { escapeHtml } from '../utils/html';
import type { PanelConfigLike } from './types';

// Extend TableRow to include our internal properties
type TradesTableRow = TableRow & {
  _uuid: string;
  _lots: RealizedLot[];
};

function renderTrend(value: number, formatted: string): string {
  const cls = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
  return `<span class="${cls}">${formatted}</span>`;
}

function renderTradesTable(trades: readonly RealizedTrade[]): string {
  if (trades.length === 0) {
    return '<div class="no-positions">Keine realisierten Gewinne/Verluste vorhanden.</div>';
  }

  const cols = [
    { key: 'name', label: 'Wertpapier' },
    { key: 'last_sell_price', label: 'Verkaufskurs', align: 'right' as const },
    { key: 'current_price', label: 'Aktueller Kurs', align: 'right' as const },
    { key: 'purchase_value_gross', label: 'Einstandswert', align: 'right' as const },
    { key: 'sales_value_gross', label: 'Verkaufswert', align: 'right' as const },
    { key: 'result_gross', label: 'Bruttoergebnis', align: 'right' as const },
    { key: 'result_abs', label: 'Nettoergebnis', align: 'right' as const },
    { key: 'result_pct', label: 'Resultat', align: 'right' as const },
    { key: 'current_holdings', label: 'Bestand', align: 'right' as const },
  ];

  const rows: TradesTableRow[] = trades.map((trade) => {
    const currentPrice = trade.current_price ?? 0;
    const lastSellPrice = trade.last_sell_price;
    const priceDiff = currentPrice - lastSellPrice;
    const priceTrend = priceDiff > 0 ? 'positive' : priceDiff < 0 ? 'negative' : 'neutral';

    let nameCell = escapeHtml(trade.name);
    if (trade.lots.length > 1) {
      nameCell = `
        <span class="expand-icon" data-security-uuid="${trade.security_uuid}">
          <ha-icon icon="mdi:chevron-right"></ha-icon>
        </span>
        ${nameCell}
      `;
    }

    const isClosed = Math.abs(trade.current_holdings) < 0.001;

    return {
      _uuid: trade.security_uuid,
      _lots: trade.lots,
      name: nameCell,
      last_sell_price: formatCurrency(trade.last_sell_price_native ?? trade.last_sell_price, trade.currency_code),
      current_price: `<span class="trend--${priceTrend}">${formatCurrency(trade.current_price, trade.currency_code)}</span>`,
      purchase_value_gross: formatCurrency(trade.purchase_value_gross),
      sales_value_gross: formatCurrency(trade.sales_value_gross),
      result_gross: formatCurrency(trade.sales_value_gross - trade.purchase_value_gross),
      result_abs: formatCurrency(trade.result_abs),
      result_pct: renderTrend(trade.result_pct, formatPercent(trade.result_pct / 100)),
      current_holdings: isClosed
        ? '<ha-icon icon="mdi:lock-outline" title="Geschlossen" style="opacity: 0.6;"></ha-icon>'
        : formatNumber(trade.current_holdings),
    } as TradesTableRow;
  });

  return makeTable(rows, cols, [], {
    sortable: true,
    defaultSort: { key: 'name' },

    rowAttributes: (row: TableRow) => ({
      'data-security-uuid': (row as TradesTableRow)._uuid,
    }),
  });
}

function renderLots(lots: RealizedLot[], trade: RealizedTrade): string { // Need trade to get currency
  const lotRows = lots.map((lot) => {
    // Merge Date and Shares
    const dateShares = `
      <div class="lot-date-shares">
         <span class="lot-date">${lot.date}</span>
         <span class="lot-shares">${formatNumber(lot.shares)} Stk.</span>
      </div>
    `;

    // Only show formatted prices/values
    return {
      name: dateShares,
      last_sell_price: formatCurrency(lot.sell_price_native ?? lot.sell_price, trade.currency_code),
      current_price: '',
      purchase_value_gross: formatCurrency(lot.purchase_value_gross),
      sales_value_gross: formatCurrency(lot.sales_value_gross),
      result_gross: formatCurrency(lot.sales_value_gross - lot.purchase_value_gross),
      result_abs: formatCurrency(lot.result_abs),
      result_pct: renderTrend(lot.result_pct, formatPercent(lot.result_pct / 100)),
      current_holdings: '',
    };
  });

  return makeTable(
    lotRows,
    [
      { key: 'name', label: '' },
      { key: 'last_sell_price', label: '', align: 'right' },
      { key: 'current_price', label: '', align: 'right' },
      { key: 'purchase_value_gross', label: '', align: 'right' },
      { key: 'sales_value_gross', label: '', align: 'right' },
      { key: 'result_gross', label: '', align: 'right' },
      { key: 'result_abs', label: '', align: 'right' },
      { key: 'result_pct', label: '', align: 'right' },
      { key: 'current_holdings', label: '', align: 'right' },
    ],
    [],
    { sortable: false }
  );
}

function attachEventListeners(root: HTMLElement, trades: readonly RealizedTrade[]) {
  const tradeMap = new Map(trades.map(t => [t.security_uuid, t]));

  root.querySelectorAll('.expand-icon').forEach(icon => {
    icon.addEventListener('click', (event) => {
      event.stopPropagation();
      const target = event.currentTarget as HTMLElement;
      const uuid = target.dataset.securityUuid;
      const trade = uuid ? tradeMap.get(uuid) : undefined;
      const mainRow = root.querySelector(`tr[data-security-uuid="${String(uuid)}"]`);

      if (!mainRow || !trade) return;

      const iconEl = mainRow.querySelector('.expand-icon ha-icon');
      if (mainRow.classList.toggle('is-expanded')) {
        iconEl?.setAttribute('icon', 'mdi:chevron-down');
        const childRowsHtml = renderLots(trade.lots, trade);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = childRowsHtml;
        const childRows = Array.from(tempDiv.querySelectorAll('tbody tr')).map(row => {
          row.classList.add('child-row');
          if (uuid) {
            (row as HTMLElement).dataset.parentUuid = uuid;
          }
          return row;
        });

        mainRow.after(...childRows);

      } else {
        iconEl?.setAttribute('icon', 'mdi:chevron-right');
        root.querySelectorAll(`tr.child - row[data - parent - uuid="${String(uuid)}"]`).forEach(child => {
          child.remove();
        });
      }
    });
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
    ${headerCard.outerHTML}
          <div class="card" >
            <div class="scroll-container trades-table" >
              ${tradesTable}
          </div>
            </div>
              `;

  // Attach event listeners after rendering
  setTimeout(() => {
    attachEventListeners(root, trades);
  }, 0);

  return markup;
}
