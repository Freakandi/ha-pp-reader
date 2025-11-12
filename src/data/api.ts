/**
 * Home Assistant websocket API helpers carried over for TypeScript migration.
 */

import {
  deserializeAccountSnapshots,
  deserializeNormalizedDashboardSnapshot,
  deserializeNormalizedPayloadMetadata,
  deserializePortfolioSnapshots,
  deserializePositionSnapshots,
} from "../lib/api/portfolio";
import type {
  NormalizedAccountSnapshot,
  NormalizedDashboardSnapshot,
  NormalizedPayloadMetadata,
  NormalizedPortfolioSnapshot,
  NormalizedPositionSnapshot,
} from "../lib/api/portfolio";
import type {
  AverageCostPayload,
  HoldingsAggregationPayload,
  PanelConfigLike,
  PerformanceMetricsPayload,
  PortfolioPosition as TabsPortfolioPosition,
} from "../tabs/types";
import type { HomeAssistant } from "../types/home-assistant";

type UnknownRecord = Record<string, unknown>;

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toMetricRunUuid(value: unknown): string | null | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (value === null) {
    return null;
  }
  return undefined;
}

function toFiniteNumberOrUndefined(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return undefined;
}

function requireString(value: string | null | undefined, field: string): string {
  if (typeof value === "string") {
    return value;
  }
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${field}`);
}

function requireNumber(value: number | null | undefined, field: string): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  throw new Error(`mapPositionSnapshotToRecord: fehlendes ${field}`);
}

function mapPositionSnapshotToRecord(snapshot: NormalizedPositionSnapshot): PortfolioPosition {
  const securityUuid = requireString(snapshot.security_uuid, "security_uuid");
  const name = requireString(snapshot.name, "name");
  const currentHoldings = requireNumber(snapshot.current_holdings, "current_holdings");
  const purchaseValue = requireNumber(snapshot.purchase_value, "purchase_value");
  const currentValue = requireNumber(snapshot.current_value, "current_value");

  const position: PortfolioPosition = {
    security_uuid: securityUuid,
    name,
    current_holdings: currentHoldings,
    purchase_value: purchaseValue,
    current_value: currentValue,
    average_cost: (snapshot.average_cost as AverageCostPayload | null | undefined) ?? null,
    performance: (snapshot.performance as PerformanceMetricsPayload | null | undefined) ?? null,
    aggregation: (snapshot.aggregation as HoldingsAggregationPayload | null | undefined) ?? null,
  };

  if (snapshot.currency_code !== undefined) {
    position.currency_code = snapshot.currency_code;
  }
  if (snapshot.coverage_ratio != null) {
    position.coverage_ratio = snapshot.coverage_ratio;
  }
  if (snapshot.provenance) {
    position.provenance = snapshot.provenance;
  }
  if (snapshot.metric_run_uuid !== undefined) {
    position.metric_run_uuid = snapshot.metric_run_uuid;
  }
  if (snapshot.last_price_native != null) {
    position.last_price_native = snapshot.last_price_native;
  }
  if (snapshot.last_price_eur != null) {
    position.last_price_eur = snapshot.last_price_eur;
  }
  if (snapshot.last_close_native != null) {
    position.last_close_native = snapshot.last_close_native;
  }
  if (snapshot.last_close_eur != null) {
    position.last_close_eur = snapshot.last_close_eur;
  }
  if (snapshot.data_state) {
    position.data_state = snapshot.data_state;
  }
  if (snapshot.portfolio_uuid) {
    position.portfolio_uuid = snapshot.portfolio_uuid;
  }

  return position;
}

export type AccountSummary = NormalizedAccountSnapshot;

export type PortfolioSummary = NormalizedPortfolioSnapshot;

export interface DashboardDataResponse {
  accounts: AccountSummary[];
  portfolios: PortfolioSummary[];
  last_file_update?: string | null;
  transactions: unknown[];
  normalized_payload?: NormalizedDashboardSnapshot | null;
}

export interface AccountsResponse {
  accounts: AccountSummary[];
  normalized_payload?: NormalizedDashboardSnapshot | null;
  [key: string]: unknown;
}

export interface PortfoliosResponse {
  portfolios: PortfolioSummary[];
  normalized_payload?: NormalizedDashboardSnapshot | null;
  [key: string]: unknown;
}

export type PortfolioPosition = TabsPortfolioPosition;

export interface PortfolioPositionsResponse {
  portfolio_uuid: string;
  positions: PortfolioPosition[];
  error?: string;
  metric_run_uuid?: string | null;
  coverage_ratio?: number | null;
  provenance?: string | null;
  normalized_payload?: NormalizedPayloadMetadata | null;
  [key: string]: unknown;
}

export interface SecuritySnapshotResponse {
  security_uuid: string;
  snapshot: {
    name?: string;
    currency_code?: string;
    total_holdings?: number;
    purchase_value_eur?: number;
    current_value_eur?: number;
    last_price_native?: number | null;
    last_price_eur?: number;
    market_value_eur?: number | null;
    last_close_native?: number | null;
    last_close_eur?: number | null;
    /** Structured selection of average purchase prices with provenance metadata. */
    average_cost?: AverageCostPayload | null;
    aggregation?: HoldingsAggregationPayload | null;
    /** Structured gain and day-change metrics shared across payloads. */
    performance?: PerformanceMetricsPayload | null;
    /** Raw snapshot provenance flag (e.g. cache vs. live). */
    source?: string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface SecurityHistoryPoint {
  date: number;
  close: number;
  close_raw?: number;
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

export interface PortfolioValuesUpdateEntry extends Partial<PortfolioSummary> {
  uuid?: string | null;
  value?: number | null;
  purchaseSum?: number | null;
  count?: number | null;
  position_count?: number | null;
  hasValue?: boolean | null;
  [key: string]: unknown;
}

export interface PortfolioPositionsUpdatePayload {
  portfolio_uuid?: string | null;
  portfolioUuid?: string | null;
  positions?: NormalizedPositionSnapshot[] | null;
  error?: string | null;
  normalized_payload?: NormalizedPayloadMetadata | null;
  coverage_ratio?: number | null;
  provenance?: string | null;
  metric_run_uuid?: string | null;
  [key: string]: unknown;
}

export const DASHBOARD_DATA_TYPES = [
  "accounts",
  "portfolio_values",
  "portfolio_positions",
  "security_snapshot",
  "security_history",
] as const;

export type DashboardDataType = (typeof DASHBOARD_DATA_TYPES)[number];

export interface DashboardPushPayloadMap {
  accounts: AccountSummary[] | null | undefined;
  portfolio_values: PortfolioValuesUpdateEntry[] | null | undefined;
  portfolio_positions:
    | PortfolioPositionsUpdatePayload
    | PortfolioPositionsUpdatePayload[]
    | null
    | undefined;
  security_snapshot: SecuritySnapshotResponse | null | undefined;
  security_history: SecurityHistoryResponse | null | undefined;
}

export interface DashboardPushEnvelope<T extends DashboardDataType = DashboardDataType> {
  entry_id?: string | null;
  data_type: T;
  data: DashboardPushPayloadMap[T];
  synced_at?: string | null;
  [key: string]: unknown;
}

export function isDashboardDataType(value: unknown): value is DashboardDataType {
  return typeof value === "string" && (DASHBOARD_DATA_TYPES as readonly string[]).includes(value);
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

  const raw = await hass.connection.sendMessagePromise<UnknownRecord>({
    type: "pp_reader/get_dashboard_data",
    entry_id: entryId,
  });

  const accounts = deserializeAccountSnapshots(raw.accounts);
  const portfolios = deserializePortfolioSnapshots(raw.portfolios);
  const lastFileUpdate = toStringOrNull(raw.last_file_update);
  const transactions = toArray(raw.transactions);
  const normalizedPayload = deserializeNormalizedDashboardSnapshot(raw.normalized_payload);

  return {
    accounts,
    portfolios,
    last_file_update: lastFileUpdate,
    transactions,
    normalized_payload: normalizedPayload,
  };
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

  const raw = await hass.connection.sendMessagePromise<UnknownRecord>({
    type: "pp_reader/get_accounts",
    entry_id: entryId,
  });

  const accounts = deserializeAccountSnapshots(raw.accounts);
  const normalizedPayload = deserializeNormalizedDashboardSnapshot(raw.normalized_payload);

  return {
    accounts,
    normalized_payload: normalizedPayload,
  };
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

  const lastFileUpdate = response.last_file_update;
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

  const raw = await hass.connection.sendMessagePromise<UnknownRecord>({
    type: "pp_reader/get_portfolio_data",
    entry_id: entryId,
  });

  const portfolios = deserializePortfolioSnapshots(raw.portfolios);
  const normalizedPayload = deserializeNormalizedDashboardSnapshot(raw.normalized_payload);

  return {
    portfolios,
    normalized_payload: normalizedPayload,
  };
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

  const raw = await hass.connection.sendMessagePromise<UnknownRecord>({
    type: "pp_reader/get_portfolio_positions",
    entry_id: entryId,
    portfolio_uuid: portfolioUuid,
  });

  const normalizedPositions = deserializePositionSnapshots(raw.positions);
  const positions = normalizedPositions.map(mapPositionSnapshotToRecord);

  const normalizedPayloadMeta = deserializeNormalizedPayloadMetadata(raw.normalized_payload);

  const response: PortfolioPositionsResponse = {
    portfolio_uuid: toStringOrNull(raw.portfolio_uuid) ?? portfolioUuid,
    positions,
  };

  if (typeof raw.error === "string") {
    response.error = raw.error;
  }
  const coverageRatio = toFiniteNumberOrUndefined(raw.coverage_ratio);
  if (coverageRatio !== undefined) {
    response.coverage_ratio = coverageRatio;
  }
  const provenance = toStringOrNull(raw.provenance);
  if (provenance) {
    response.provenance = provenance;
  }
  const metricRunUuid = toMetricRunUuid(raw.metric_run_uuid);
  if (metricRunUuid !== undefined) {
    response.metric_run_uuid = metricRunUuid;
  }
  if (normalizedPayloadMeta) {
    response.normalized_payload = normalizedPayloadMeta;
  }

  return response;
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
