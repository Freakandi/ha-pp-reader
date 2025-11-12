/**
 * Shared type declarations for PP Reader dashboard tabs.
 *
 * These interfaces centralize cross-tab contracts so the migration from the
 * legacy JavaScript modules can progressively add stronger typing without
 * duplicating structural definitions in each module.
 */

import type { HomeAssistant } from "../types/home-assistant";

type UnknownRecord = Record<string, unknown>;

function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || isNumber(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

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

export type DashboardTabRenderResult =
  | string
  | undefined
  | Promise<string | undefined>;

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
  [key: string]: unknown;
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

export type PortfolioPositionsUpdatedEvent = CustomEvent<PortfolioPositionsUpdatedEventDetail>;

export function isAverageCostPayload(value: unknown): value is AverageCostPayload {
  if (!isRecord(value)) {
    return false;
  }

  const record = value;

  if (typeof record.source !== "string") {
    return false;
  }

  const hasNative = "native" in record && isNullableNumber(record.native);
  const hasSecurity = "security" in record && isNullableNumber(record.security);
  const hasAccount = "account" in record && isNullableNumber(record.account);
  const hasEur = "eur" in record && isNullableNumber(record.eur);

  if (!hasNative || !hasSecurity || !hasAccount || !hasEur) {
    return false;
  }

  if ("coverage_ratio" in record && !isNullableNumber(record.coverage_ratio)) {
    return false;
  }

  return true;
}

export function isPerformanceDayChangePayload(
  value: unknown,
): value is PerformanceDayChangePayload {
  if (!isRecord(value)) {
    return false;
  }

  const record = value;

  if (typeof record.source !== "string") {
    return false;
  }

  const hasNative = "price_change_native" in record && isNullableNumber(record.price_change_native);
  const hasEur = "price_change_eur" in record && isNullableNumber(record.price_change_eur);
  const hasChange = "change_pct" in record && isNullableNumber(record.change_pct);

  if (!hasNative || !hasEur || !hasChange) {
    return false;
  }

  if ("coverage_ratio" in record && !isNullableNumber(record.coverage_ratio)) {
    return false;
  }

  return true;
}

export function isPerformanceMetricsPayload(value: unknown): value is PerformanceMetricsPayload {
  if (!isRecord(value)) {
    return false;
  }

  const record = value;

  if (
    !isNumber(record.gain_abs) ||
    !isNumber(record.gain_pct) ||
    !isNumber(record.total_change_eur) ||
    !isNumber(record.total_change_pct) ||
    typeof record.source !== "string"
  ) {
    return false;
  }

  if ("coverage_ratio" in record && !isNullableNumber(record.coverage_ratio)) {
    return false;
  }

  if ("day_change" in record && record.day_change !== undefined && record.day_change !== null) {
    if (!isPerformanceDayChangePayload(record.day_change)) {
      return false;
    }
  }

  return true;
}

export function isHoldingsAggregationPayload(value: unknown): value is HoldingsAggregationPayload {
  if (!isRecord(value)) {
    return false;
  }

  const record = value;

  return (
    isNumber(record.total_holdings) &&
    isNumber(record.positive_holdings) &&
    isNumber(record.purchase_value_cents) &&
    isNumber(record.purchase_value_eur) &&
    isNumber(record.security_currency_total) &&
    isNumber(record.account_currency_total) &&
    isNumber(record.purchase_total_security) &&
    isNumber(record.purchase_total_account)
  );
}

export function isPortfolioPositionsUpdatedEventDetail(
  value: unknown,
): value is PortfolioPositionsUpdatedEventDetail {
  if (!isRecord(value)) {
    return false;
  }

  const record = value;

  if (typeof record.portfolioUuid !== "string") {
    return false;
  }

  return isStringArray(record.securityUuids);
}

export function isPortfolioPositionsUpdatedEvent(
  event: Event,
): event is PortfolioPositionsUpdatedEvent {
  if (!(event instanceof CustomEvent)) {
    return false;
  }

  return isPortfolioPositionsUpdatedEventDetail(event.detail);
}
