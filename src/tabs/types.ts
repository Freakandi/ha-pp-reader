
import type {
  AverageCostPayload,
  HoldingsAggregationPayload,
  PerformanceMetricsPayload,
  RealizedLot,
} from '../data/api';

export interface PanelConfigLike {
  config?: {
    entry_id?: string;
    _panel_custom?: {
      config?: {
        entry_id?: string;
      };
    };
  };
  entry_id?: string;
  card?: {
    entry_id?: string;
  };
  webcomponent_name?: string;
}

export interface PortfolioPosition {
  security_uuid: string;
  name: string;
  current_holdings: number;
  purchase_value: number;
  current_value: number;
  currency_code?: string;
  coverage_ratio?: number;
  provenance?: string;
  metric_run_uuid?: string | null;
  last_price_native?: number;
  last_price_eur?: number;
  last_close_native?: number;
  last_close_eur?: number;
  data_state?: {
    status: string;
    message: string;
  };
  ticker_symbol?: string;
  portfolio_uuid?: string;
  average_cost?: AverageCostPayload | null;
  performance?: PerformanceMetricsPayload | null;
  aggregation?: HoldingsAggregationPayload | null;
}

export type TableRow = Record<string, unknown> & {
  _uuid?: string;
  _lots?: RealizedLot[];
};
