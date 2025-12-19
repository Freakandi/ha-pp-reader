/**
 * Trades tab renderer.
 */

import { createHeaderCard, makeTable } from '../content/elements';
import type { PortfolioPosition } from '../data/api';
import {
  fetchAllPortfolioPositionsWS,
} from '../data/api';
import type { HomeAssistant } from '../types/home-assistant';
import { escapeHtml } from '../utils/html';
import type { PanelConfigLike } from './types';

function renderTradesTable(positions: readonly PortfolioPosition[]): string {
  const closedPositions = positions.filter(p => p.current_holdings === 0);

  if (closedPositions.length === 0) {
    return '<div class="no-positions">Keine geschlossenen Positionen vorhanden.</div>';
  }

  const cols = [
    { key: 'name', label: 'Wertpapier' },
    { key: 'ticker_symbol', label: 'Symbol' },
    { key: 'current_holdings', label: 'Bestand', align: 'right' as const },
    { key: 'status', label: 'Status' },
  ];

  const rows = closedPositions.map((p) => {
    return {
      name: typeof p.name === 'string' ? escapeHtml(p.name) : '',
      ticker_symbol: typeof p.ticker_symbol === 'string' ? escapeHtml(p.ticker_symbol) : '',
      current_holdings: 0,
      status: 'Geschlossen',
    };
  });

  return makeTable(rows, cols, []);
}

export async function renderTrades(
  _root: HTMLElement,
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
): Promise<string> {
  const headerCard = createHeaderCard('Trades', '');
  const tradesTable = renderTradesTable(await fetchAllPortfolioPositionsWS(hass, panelConfig));

  const markup = `
    ${headerCard.outerHTML}
    <div class="card">
      <div class="scroll-container trades-table">
        ${tradesTable}
      </div>
    </div>
  `;

  return markup;
}
