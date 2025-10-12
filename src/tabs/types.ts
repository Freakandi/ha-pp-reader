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

/**
 * Normalised average purchase prices shared between backend payloads.
 *
 * The legacy fields `average_purchase_price_native`, `avg_price_security`,
 * `avg_price_account` and `purchase_value_eur` remain on the individual
 * payloads for compatibility, but their values mirror this object.
 */
export interface AverageCostPayload {
  native: number | null;
  security: number | null;
  account: number | null;
  eur: number | null;
  source: AverageCostSource;
  coverage_ratio: number | null;
  [key: string]: unknown;
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
  [key: string]: unknown;
}

/**
 * Normalised gain and change metrics shared between backend payloads.
 *
 * Legacy flat fields such as `gain_abs`, `gain_pct` or `day_price_change_*`
 * remain on the individual payloads for compatibility, but mirror the values
 * exposed by this object.
 */
export interface PerformanceMetricsPayload {
  gain_abs: number;
  gain_pct: number;
  total_change_eur: number;
  total_change_pct: number;
  source: string;
  coverage_ratio: number | null;
  day_change?: PerformanceDayChangePayload | null;
  [key: string]: unknown;
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
  gain_abs_eur: number;
  gain_pct: number;
  purchase_total_security?: number;
  purchase_total_account?: number;
  avg_price_security?: number | null;
  avg_price_account?: number | null;
  last_price_native?: number | null;
  last_price_eur: number | null;
  last_close_native?: number | null;
  last_close_eur?: number | null;
  day_price_change_native?: number | null;
  day_price_change_eur?: number | null;
  day_change_pct?: number | null;
  /** Mirrors `average_cost.native` for backwards compatibility. */
  average_purchase_price_native?: number | string | null;
  /**
   * Structured selection of average purchase prices with provenance metadata.
   */
  average_cost?: AverageCostPayload | null;
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
  average_purchase_price_native: number | null;
  avg_price_security: number | null;
  avg_price_account: number | null;
  purchase_total_security: number;
  purchase_total_account: number;
  [key: string]: unknown;
}

export interface PortfolioPosition {
  security_uuid: string;
  name: string;
  current_holdings: number;
  purchase_value: number;
  current_value: number;
  gain_abs: number;
  gain_pct: number;
  /** Mirrors `average_cost.native` for backwards compatibility. */
  average_purchase_price_native?: number | null;
  purchase_total_security: number;
  purchase_total_account: number;
  avg_price_security: number | null;
  avg_price_account: number | null;
  /**
   * Structured selection of average purchase prices with provenance metadata.
   */
  average_cost?: AverageCostPayload | null;
  /** Structured gain metrics that mirror the legacy flat fields. */
  performance?: PerformanceMetricsPayload | null;
  aggregation?: HoldingsAggregationPayload | null;
  [key: string]: unknown;
}

export interface PortfolioPositionsUpdatedEventDetail {
  portfolioUuid: string;
  securityUuids: string[];
}
