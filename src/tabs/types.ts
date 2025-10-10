/**
 * Shared type declarations for PP Reader dashboard tabs.
 *
 * These interfaces centralize cross-tab contracts so the migration from the
 * legacy JavaScript modules can progressively add stronger typing without
 * duplicating structural definitions in each module.
 */

import type { HomeAssistant } from "../types/home-assistant";

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
  average_purchase_price_native?: number | string | null;
  source?: string;
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
  average_purchase_price_native?: number | null;
  purchase_total_security: number;
  purchase_total_account: number;
  avg_price_security: number | null;
  avg_price_account: number | null;
  [key: string]: unknown;
}

export interface PortfolioPositionsUpdatedEventDetail {
  portfolioUuid: string;
  securityUuids: string[];
}
