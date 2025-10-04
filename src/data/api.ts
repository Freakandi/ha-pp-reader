/**
 * Home Assistant websocket API helpers carried over for TypeScript migration.
 */

import type { PanelConfigLike } from "../tabs/types";
import type { HomeAssistant } from "../types/home-assistant";

export interface AccountSummary {
  name?: string | null;
  currency_code?: string | null;
  orig_balance?: number | null;
  balance?: number | null;
  fx_unavailable?: boolean;
  [key: string]: unknown;
}

export interface PortfolioSummary {
  uuid?: string | null;
  name?: string | null;
  current_value?: number | null;
  purchase_sum?: number | null;
  position_count?: number | null;
  [key: string]: unknown;
}

export interface DashboardDataResponse {
  accounts: AccountSummary[];
  portfolios: PortfolioSummary[];
  last_file_update?: string | null;
  transactions: unknown[];
  [key: string]: unknown;
}

export interface AccountsResponse {
  accounts: AccountSummary[];
  [key: string]: unknown;
}

export interface PortfoliosResponse {
  portfolios: PortfolioSummary[];
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
  [key: string]: unknown;
}

export interface PortfolioPositionsResponse {
  portfolio_uuid: string;
  positions: PortfolioPosition[];
  error?: string;
  [key: string]: unknown;
}

export interface SecuritySnapshotResponse {
  security_uuid: string;
  snapshot: {
    name?: string;
    currency_code?: string;
    total_holdings?: number;
    last_price_native?: number | null;
    last_price_eur?: number;
    market_value_eur?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface SecurityHistoryPoint {
  date: number;
  close: number;
  [key: string]: unknown;
}

export interface SecurityHistoryResponse {
  security_uuid: string;
  prices: SecurityHistoryPoint[];
  start_date?: number | null;
  end_date?: number | null;
  [key: string]: unknown;
}

export interface LastFileUpdateResponse {
  last_file_update?: string | null;
  [key: string]: unknown;
}

export interface SecurityHistoryOptions {
  startDate?: number | null;
  endDate?: number | null;
  start_date?: number | null;
  end_date?: number | null;
  [key: string]: unknown;
}

interface SecurityHistoryRequestPayload {
  type: "pp_reader/get_security_history";
  entry_id: string;
  security_uuid: string;
  start_date?: number | null;
  end_date?: number | null;
  [key: string]: string | number | null | undefined;
}

function deriveEntryId(
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
): string | undefined {
  let entryId =
    panelConfig?.config?.entry_id ??
    panelConfig?.entry_id ??
    panelConfig?.config?._panel_custom?.config?.entry_id ??
    undefined;

  if (!entryId && hass?.panels) {
    const panels = hass.panels;
    const candidate =
      (panels.ppreader as PanelConfigLike | undefined) ??
      (panels.pp_reader as PanelConfigLike | undefined) ??
      (Object.values(panels).find(
        panel => (panel as PanelConfigLike | undefined)?.webcomponent_name === "pp-reader-panel",
      ) as PanelConfigLike | undefined);

    entryId =
      candidate?.config?.entry_id ??
      candidate?.entry_id ??
      candidate?.config?._panel_custom?.config?.entry_id ??
      undefined;
  }

  return entryId ?? undefined;
}

// Export für andere Module (Dashboard/Event-Filter)
export function getEntryId(
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
): string | undefined {
  return deriveEntryId(hass, panelConfig);
}

// Dashboard Data
export async function fetchDashboardDataWS(
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
): Promise<DashboardDataResponse> {
  if (!hass) {
    throw new Error("fetchDashboardDataWS: fehlendes hass");
  }

  const entryId = deriveEntryId(hass, panelConfig);
  if (!entryId) {
    throw new Error("fetchDashboardDataWS: fehlendes entry_id");
  }

  return hass.connection.sendMessagePromise<DashboardDataResponse>({
    type: "pp_reader/get_dashboard_data",
    entry_id: entryId,
  });
}

// Accounts
export async function fetchAccountsWS(
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
): Promise<AccountsResponse> {
  if (!hass) {
    throw new Error("fetchAccountsWS: fehlendes hass");
  }

  const entryId = deriveEntryId(hass, panelConfig);
  if (!entryId) {
    throw new Error("fetchAccountsWS: fehlendes entry_id");
  }

  return hass.connection.sendMessagePromise<AccountsResponse>({
    type: "pp_reader/get_accounts",
    entry_id: entryId,
  });
}

// Last file update
export async function fetchLastFileUpdateWS(
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
): Promise<string> {
  if (!hass) {
    throw new Error("fetchLastFileUpdateWS: fehlendes hass");
  }

  const entryId = deriveEntryId(hass, panelConfig);
  if (!entryId) {
    throw new Error("fetchLastFileUpdateWS: fehlendes entry_id");
  }

  const response = await hass.connection.sendMessagePromise<
    LastFileUpdateResponse | string
  >({
    type: "pp_reader/get_last_file_update",
    entry_id: entryId,
  });

  if (typeof response === "string") {
    return response;
  }

  const lastFileUpdate = response?.last_file_update;
  return typeof lastFileUpdate === "string" ? lastFileUpdate : "";
}

// Portfolios
export async function fetchPortfoliosWS(
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
): Promise<PortfoliosResponse> {
  if (!hass) {
    throw new Error("fetchPortfoliosWS: fehlendes hass");
  }

  const entryId = deriveEntryId(hass, panelConfig);
  if (!entryId) {
    throw new Error("fetchPortfoliosWS: fehlendes entry_id");
  }

  return hass.connection.sendMessagePromise<PortfoliosResponse>({
    type: "pp_reader/get_portfolio_data",
    entry_id: entryId,
  });
}

// Positions (lazy)
export async function fetchPortfolioPositionsWS(
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
  portfolioUuid: string | null | undefined,
): Promise<PortfolioPositionsResponse> {
  if (!hass) {
    throw new Error("fetchPortfolioPositionsWS: fehlendes hass");
  }

  const entryId = deriveEntryId(hass, panelConfig);
  if (!entryId) {
    throw new Error("fetchPortfolioPositionsWS: fehlendes entry_id");
  }

  if (!portfolioUuid) {
    throw new Error("fetchPortfolioPositionsWS: fehlendes portfolio_uuid");
  }

  return hass.connection.sendMessagePromise<PortfolioPositionsResponse>({
    type: "pp_reader/get_portfolio_positions",
    entry_id: entryId,
    portfolio_uuid: portfolioUuid,
  });
}

// Security snapshot for detail tab
export async function fetchSecuritySnapshotWS(
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
  securityUuid: string | null | undefined,
): Promise<SecuritySnapshotResponse> {
  if (!hass) {
    throw new Error("fetchSecuritySnapshotWS: fehlendes hass");
  }

  const entryId = deriveEntryId(hass, panelConfig);
  if (!entryId) {
    throw new Error("fetchSecuritySnapshotWS: fehlendes entry_id");
  }

  if (!securityUuid) {
    throw new Error("fetchSecuritySnapshotWS: fehlendes securityUuid");
  }

  return hass.connection.sendMessagePromise<SecuritySnapshotResponse>({
    type: "pp_reader/get_security_snapshot",
    entry_id: entryId,
    security_uuid: securityUuid,
  });
}

// Historical prices for detail tab charting
export async function fetchSecurityHistoryWS(
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
  securityUuid: string | null | undefined,
  options: SecurityHistoryOptions | null | undefined = {},
): Promise<SecurityHistoryResponse> {
  if (!hass) {
    throw new Error("fetchSecurityHistoryWS: fehlendes hass");
  }

  const entryId = deriveEntryId(hass, panelConfig);
  if (!entryId) {
    throw new Error("fetchSecurityHistoryWS: fehlendes entry_id");
  }

  if (!securityUuid) {
    throw new Error("fetchSecurityHistoryWS: fehlendes securityUuid");
  }

  const payload: SecurityHistoryRequestPayload = {
    type: "pp_reader/get_security_history",
    entry_id: entryId,
    security_uuid: securityUuid,
  };

  const { startDate, endDate, start_date: startDateRaw, end_date: endDateRaw } =
    options || {};

  const resolvedStart = startDate ?? startDateRaw;
  if (resolvedStart !== undefined && resolvedStart !== null) {
    payload.start_date = resolvedStart;
  }

  const resolvedEnd = endDate ?? endDateRaw;
  if (resolvedEnd !== undefined && resolvedEnd !== null) {
    payload.end_date = resolvedEnd;
  }

  return hass.connection.sendMessagePromise<SecurityHistoryResponse>(payload);
}
