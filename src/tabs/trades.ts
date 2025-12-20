/**
 * Trades tab renderer for "Realized Performance".
 */

import { createHeaderCard, makeTable, renderTrend } from '../content/elements';
import type { RealizedLot, RealizedTrade } from '../data/api';
import { fetchRealizedPerformance } from '../data/api';
import type { HomeAssistant } from '../types/home-assistant';
import { formatCurrency, formatNumber, formatPercent } from '../utils/format';
import { escapeHtml } from '../utils/html';
import type { PanelConfigLike, TableRow } from './types';

function renderTradesTable(trades: readonly RealizedTrade[]): string {
  if (trades.length === 0) {
    return '<div class="no-positions">Keine realisierten Gewinne/Verluste vorhanden.</div>';
  }

  const cols = [
    { key: 'name', label: 'Wertpapier' },
    { key: 'ticker_symbol', label: 'Symbol' },
    { key: 'last_sell_price', label: 'Verkaufskurs', align: 'right' as const },
    { key: 'current_price', label: 'Aktueller Kurs', align: 'right' as const },
    { key: 'purchase_value_gross', label: 'Einstandswert', align: 'right' as const },
    { key: 'sales_value_gross', label: 'Verkaufswert', align: 'right' as const },
    { key: 'sales_value_net', label: 'Nettoerlös', align: 'right' as const },
    { key: 'result_pct', label: 'Resultat', align: 'right' as const },
    { key: 'current_holdings', label: 'Bestand', align: 'right' as const },
  ];

  const rows: TableRow[] = trades.map((trade) => {
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

    return {
      _uuid: trade.security_uuid,
      _lots: trade.lots,
      name: nameCell,
      ticker_symbol: escapeHtml(trade.ticker_symbol || ''),
      last_sell_price: formatCurrency(trade.last_sell_price),
      current_price: `<span class="trend--${priceTrend}">${formatCurrency(trade.current_price)}</span>`,
      purchase_value_gross: formatCurrency(trade.purchase_value_gross),
      sales_value_gross: formatCurrency(trade.sales_value_gross),
      sales_value_net: formatCurrency(trade.sales_value_net),
      result_pct: renderTrend(trade.result_pct, formatPercent(trade.result_pct / 100)),
      current_holdings: `${formatNumber(trade.current_holdings)} ${trade.current_holdings === 0 ? '<ha-icon icon="mdi:lock-outline" title="Geschlossen"></ha-icon>' : ''}`,
    };
  });

  return makeTable(rows, cols, [], {
    sortable: true,
    defaultSort: { key: 'name' },
    rowAttributes: (row: TableRow) => ({
      'data-security-uuid': String(row._uuid),
    }),
  });
}


function attachEventListeners(root: HTMLElement, trades: readonly RealizedTrade[]) {
  const tradeMap = new Map(trades.map(t => [t.security_uuid, t]));

  root.querySelectorAll('.expand-icon').forEach(icon => {
    icon.addEventListener('click', (event) => {
      event.stopPropagation();
      const uuid = (event.currentTarget as HTMLElement).dataset.securityUuid;
      const trade = tradeMap.get(uuid!);
      const mainRow = root.querySelector(`tr[data-security-uuid="${String(uuid)}"]`);

      if (!mainRow || !trade) return;

      const iconEl = mainRow.querySelector('.expand-icon ha-icon');
      if (mainRow.classList.toggle('is-expanded')) {
        iconEl?.setAttribute('icon', 'mdi:chevron-down');
        const childRows = trade.lots.map((lot: RealizedLot) => {
          const row = document.createElement('tr');
          row.classList.add('child-row');
          if (uuid) {
            row.dataset.parentUuid = uuid;
          }
          row.innerHTML = `
            <td class="cell--name">
              <span class="child-indicator"></span>
              ${escapeHtml(lot.date)}
            </td>
            <td>${formatNumber(lot.shares)} Stk.</td>
            <td class="cell--right">${formatCurrency(lot.sell_price)}</td>
            <td></td>
            <td class="cell--right">${formatCurrency(lot.purchase_value_gross)}</td>
            <td class="cell--right">${formatCurrency(lot.sales_value_gross)}</td>
            <td class="cell--right">${formatCurrency(lot.sales_value_net)}</td>
            <td class="cell--right">${renderTrend(lot.result_pct, formatPercent(lot.result_pct / 100))}</td>
            <td></td>
          `;
          return row;
        });

        mainRow.after(...childRows);

      } else {
        iconEl?.setAttribute('icon', 'mdi:chevron-right');
        root.querySelectorAll(`tr.child-row[data-parent-uuid="${String(uuid)}"]`).forEach(child => {
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
  const trades = await fetchRealizedPerformance(hass, panelConfig);
  const tradesTable = renderTradesTable(trades);

  const markup = `
    ${headerCard.outerHTML}
    <div class="card">
      <div class="scroll-container trades-table">
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
