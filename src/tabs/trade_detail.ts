/**
 * Trade detail tab renderer.
 */
import { createHeaderCard } from '../content/elements';
import { renderLineChart } from '../content/charting';
import type { LineChartOptions } from '../content/charting';
import { fetchSecurityHistoryWS, fetchRealizedPerformance } from '../data/api';
import type { HomeAssistant } from '../types/home-assistant';
import type {
  DashboardTabRenderFn,
  PanelConfigLike,
} from './types';
import { setTradeDetailTabFactory } from '../dashboard';
import { formatCurrency, formatPercent } from '../utils/format';
import { escapeHtml } from '../utils/html';

const STYLES = `
<style>
  .trade-detail-container {
    user-select: none;
  }
</style>
`;

async function renderTradeDetail(
  root: HTMLElement,
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
  securityUuid: string | null | undefined,
): Promise<string> {
  if (!securityUuid) {
    return '<div class="card"><h2>Fehler</h2><p>Kein Wertpapier angegeben.</p></div>';
  }

  const headerCard = createHeaderCard('Trade-Details', '');
  const trades = await fetchRealizedPerformance(hass, panelConfig);
  const trade = trades.find(t => t.security_uuid === securityUuid);

  if (!trade) {
    return '<div class="card"><h2>Fehler</h2><p>Trade-Daten nicht gefunden.</p></div>';
  }

  const history = await fetchSecurityHistoryWS(hass, panelConfig, securityUuid);

  const content = `
    <div class="trade-detail-container">
      ${STYLES}
      ${headerCard.outerHTML}
      <div class="card">
        <h2>${escapeHtml(trade.name)}</h2>
        <p>Letzter Verkaufspreis: ${formatCurrency(trade.last_sell_price_native ?? trade.last_sell_price, trade.currency_code)} / ${formatCurrency(trade.last_sell_price)}</p>
        <p>Änderung seit Verkauf: ${formatCurrency(trade.since_sell_abs)} / ${formatPercent(trade.since_sell_pct)}</p>
      </div>
      <div class="card">
        <div id="trade-chart"></div>
      </div>
    </div>
  `;

  setTimeout(() => {
    const chartElement = root.querySelector<HTMLElement>('#trade-chart');
    if (chartElement) {
      const chartOptions: LineChartOptions = {
        series: history.prices.map(p => ({ date: new Date(p.date), close: p.close })),
        baseline: { value: trade.last_sell_price, label: 'Letzter Verkaufspreis' },
        width: chartElement.clientWidth,
        height: 400,
        margin: { top: 20, right: 20, bottom: 30, left: 50 },
        yFormatter: (value) => formatCurrency(value, trade.currency_code),
      };
      renderLineChart(chartElement, chartOptions);
    }
  }, 0);

  return content;
}


export function registerTradeDetailTab(): void {
  setTradeDetailTabFactory((securityUuid: string) => ({
    title: 'Trade-Details',
    render: (root: HTMLElement, hass: HomeAssistant | null | undefined, panelConfig: PanelConfigLike | null | undefined) =>
      renderTradeDetail(root, hass, panelConfig, securityUuid),
    cleanup: () => {},
  }));
}
