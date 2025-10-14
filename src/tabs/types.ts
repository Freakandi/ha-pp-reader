/**
 * Shared type declarations for PP Reader dashboard tabs.
 *
 * These interfaces centralize cross-tab contracts so the migration from the
 * legacy JavaScript modules can progressively add stronger typing without
 * duplicating structural definitions in each module.
 */

import type { HomeAssistant } from "../types/home-assistant";

/**
 * Supported provenance markers for helper-provided average cost payloads.
 */
export type AverageCostSource = "aggregation" | "totals" | "eur_total";

export interface AverageCostPayload {
  native: number | null;
  security: number | null;
  account: number | null;
  eur: number | null;
  source: AverageCostSource;
  coverage_ratio: number | null;
}

/**
 * Optional day-change metrics accompanying a performance payload.
 */
export interface PerformanceDayChangePayload {
  price_change_native: number | null;
  price_change_eur: number | null;
  change_pct: number | null;
  source: string;
  coverage_ratio: number | null;
}

/**
 * Normalised gain and change metrics shared between backend payloads.
 *
 * Consumers should rely on this payload for gain and percentage metrics rather
 * than legacy flat mirrors.
 */
export interface PerformanceMetricsPayload {
  gain_abs: number;
  gain_pct: number;
  total_change_eur: number;
  total_change_pct: number;
  source: string;
  coverage_ratio: number | null;
  day_change?: PerformanceDayChangePayload | null;
}

export interface PanelConfigLike {
  entry_id?: string | null;
  config?: {
    entry_id?: string | null;
    _panel_custom?: {
      config?: {
        entry_id?: string | null;
      } | null;
    } | null;
  } | null;
  webcomponent_name?: string | null;
  [key: string]: unknown;
}

export interface DashboardTabRenderContext {
  root: HTMLElement;
  hass: HomeAssistant | null | undefined;
  panelConfig: PanelConfigLike | null | undefined;
}

export type DashboardTabRenderResult = string | void | Promise<string | void>;

export type DashboardTabRenderFn = (
  root: HTMLElement,
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
) => DashboardTabRenderResult;

export interface DashboardTabDescriptor {
  key: string;
  title: string;
  render: DashboardTabRenderFn;
  cleanup?: (context: { key: string }) => void | Promise<void>;
  [key: string]: unknown;
}

export type SecurityHistoryRangeKey = "1M" | "6M" | "1Y" | "5Y" | "ALL";

export interface SecurityHistoryRangeState {
  activeRange: SecurityHistoryRangeKey;
  [key: string]: unknown;
}

export interface SecuritySnapshotLike {
  security_uuid: string;
  name: string;
  currency_code?: string | null;
  total_holdings: number;
  purchase_value_eur: number;
  current_value_eur: number;
  gain_pct: number;
  last_price_native?: number | null;
  last_price_eur: number | null;
  last_close_native?: number | null;
  last_close_eur?: number | null;
  /**
   * Structured selection of average purchase prices with provenance metadata.
   */
  average_cost?: AverageCostPayload | null;
  aggregation?: HoldingsAggregationPayload | null;
  /** Structured gain and day-change metrics shared across payloads. */
  performance?: PerformanceMetricsPayload | null;
  /** Raw snapshot provenance flag (e.g. cache vs. live). */
  source?: string | null;
  [key: string]: unknown;
}

export interface HoldingsAggregationPayload {
  total_holdings: number;
  positive_holdings: number;
  purchase_value_cents: number;
  purchase_value_eur: number;
  security_currency_total: number;
  account_currency_total: number;
  purchase_total_security: number;
  purchase_total_account: number;
}

export interface PortfolioPosition {
  security_uuid: string;
  name: string;
  current_holdings: number;
  purchase_value: number;
  current_value: number;
  /**
   * Structured selection of average purchase prices with provenance metadata.
   */
  average_cost: AverageCostPayload | null;
  /** Structured gain metrics supplied by the backend. */
  performance: PerformanceMetricsPayload | null;
  aggregation: HoldingsAggregationPayload | null;
  /** Client-side convenience mirrors derived from the performance payload. */
  gain_abs?: number | null;
  /** Client-side convenience mirrors derived from the performance payload. */
  gain_pct?: number | null;
  [key: string]: unknown;
}

export interface PortfolioPositionsUpdatedEventDetail {
  portfolioUuid: string;
  securityUuids: string[];
}
