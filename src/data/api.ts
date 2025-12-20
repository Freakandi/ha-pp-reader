
import type { HomeAssistant } from '../types/home-assistant';
import type { PanelConfigLike, PortfolioPosition } from '../tabs/types';

export interface AverageCostPayload {
  eur: number | null;
  security: number | null;
  account: number | null;
  native: number | null;
  source: string;
  coverage_ratio: number | null;
}

export interface PerformanceMetricsPayload {
  gain_abs: number;
  gain_pct: number;
  total_change_eur: number;
  total_change_pct: number;
  source: string;
  coverage_ratio: number | null;
  day_change?: {
    price_change_native: number | null;
    price_change_eur: number | null;
    change_pct: number | null;
    source: string;
    coverage_ratio: number | null;
  } | null;
}

export interface HoldingsAggregationPayload {
  total_holdings: number;
  purchase_value_eur: number;
  purchase_total_security: number | null;
  purchase_total_account: number | null;
  purchase_value_cents?: number;
}

export interface RealizedLot {
  date: string;
  shares: number;
  sell_price: number;
  purchase_value_gross: number;
  sales_value_gross: number;
  sales_value_net: number;
  result_pct: number;
}

export interface RealizedTrade {
  security_uuid: string;
  name: string;
  ticker_symbol: string | null;
  current_price: number | null;
  current_holdings: number;
  last_sell_price: number;
  purchase_value_gross: number;
  sales_value_gross: number;
  sales_value_net: number;
  result_abs: number;
  result_pct: number;
  lots: RealizedLot[];
}


export async function fetchRealizedPerformance(
  hass: HomeAssistant | null | undefined,
  config: PanelConfigLike | null | undefined,
): Promise<RealizedTrade[]> {
  const entryId = config?.card?.entry_id;
  if (!hass || !entryId) return [];

  try {
    const response = await hass.connection.sendMessagePromise<{ trades: RealizedTrade[] }>({
      type: 'pp_reader/get_trades',
      entry_id: entryId,
    });
    return response.trades;
  } catch (err) {
    console.error('Error fetching realized performance data:', err);
    return [];
  }
}

export async function fetchAllPortfolioPositionsWS(
  hass: HomeAssistant | null | undefined,
  config: PanelConfigLike | null | undefined,
): Promise<PortfolioPosition[]> {
  const entryId = config?.card?.entry_id;
  if (!hass || !entryId) return [];

  const portfolios = await fetchPortfoliosWS(hass, { card: { entry_id: entryId } });

  const positionPromises = portfolios.portfolios.map(p =>
    fetchPortfolioPositionsWS(hass, config, p.uuid),
  );

  const positionsNested = await Promise.all(positionPromises);
  return positionsNested.map(p => p.positions).flat();
}
