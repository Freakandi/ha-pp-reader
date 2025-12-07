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
  if (snapshot.ticker_symbol) {
    position.ticker_symbol = snapshot.ticker_symbol;
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
    ticker_symbol?: string | null;
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

export interface SecurityHistoryTransaction {
  uuid?: string | null;
  type?: number | null;
  date?: string | number | null;
  portfolio?: string | null;
  currency_code?: string | null;
  shares?: number | null;
  price?: number | null;
  net_price_eur?: number | null;
  amount?: number | null;
  fees?: number | null;
  taxes?: number | null;
  [key: string]: unknown;
}

export interface SecurityHistoryResponse {
  security_uuid: string;
  prices: SecurityHistoryPoint[];
  transactions?: SecurityHistoryTransaction[];
  start_date?: number | null;
  end_date?: number | null;
  [key: string]: unknown;
}

export interface NewsPromptResponse {
  link: string;
  prompt_template: string;
  placeholder?: string | null;
  [key: string]: unknown;
}

export interface LastFileUpdateResponse {
  last_file_update?: string | null;
  [key: string]: unknown;
}

export interface DailyWealthRecord {
  date: string;
  total_wealth_eur: number;
  portfolio_wealth_eur: number;
  account_wealth_eur: number;
  dividends_eur: number;
  interest_eur: number;
  inbound_transfers_eur: number;
  outbound_transfers_eur: number;
  performance_neutral_movements: number;
  fees_eur: number;
  taxes_eur: number;
  fx_coverage_ratio: number | null;
  price_coverage_ratio: number | null;
  stale_price: boolean;
  provenance?: string | null;
  [key: string]: unknown;
}

export interface DailyWealthScopeRecord extends DailyWealthRecord {
  scope_type: "account" | "portfolio";
  scope_id: string;
  scope_name?: string | null;
}

export interface DailyWealthSlices {
  accounts: DailyWealthScopeRecord[];
  portfolios: DailyWealthScopeRecord[];
}

export interface DailyWealthRange {
  start: string;
  end: string;
}

export interface DailyWealthResponse {
  range: DailyWealthRange;
  records: DailyWealthRecord[];
  slices?: DailyWealthSlices;
  [key: string]: unknown;
}

export interface DailyWealthRequest {
  type: "pp_reader/get_daily_wealth";
  entry_id: string;
  date?: string;
  range?: DailyWealthRange;
  include_slices?: boolean;
  include_scopes?: boolean;
  limit?: number;
  offset?: number;
  scopes?: {
    accounts?: string[];
    portfolios?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface DailyWealthFetchOptions {
  date?: string | null;
  range?: DailyWealthRange | null;
  includeSlices?: boolean;
  includeScopes?: boolean;
  limit?: number;
  offset?: number;
  scopes?: DailyWealthRequest["scopes"];
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
  chunk_index?: number | null;
  chunk_count?: number | null;
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

function normalizeWealthRange(
  range: unknown,
  fallbackDate: string | null | undefined,
  fallbackRange: DailyWealthRange | null | undefined,
): DailyWealthRange {
  if (range && typeof range === "object") {
    const start = toStringOrNull((range as Record<string, unknown>).start);
    const end = toStringOrNull((range as Record<string, unknown>).end);
    if (start && end) {
      return { start, end };
    }
  }

  if (fallbackRange?.start && fallbackRange.end) {
    return { start: fallbackRange.start, end: fallbackRange.end };
  }

  if (fallbackDate) {
    return { start: fallbackDate, end: fallbackDate };
  }

  throw new Error("fetchDailyWealthWS: fehlender Zeitraum");
}

function toFiniteNumberOrZero(value: unknown): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return numeric;
}

function toCoverageValue(value: unknown): number | null {
  if (value === null) {
    return null;
  }
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeDailyWealthRecord(raw: UnknownRecord): DailyWealthRecord | null {
  const date = toStringOrNull(raw.date);
  if (!date) {
    return null;
  }

  const record: DailyWealthRecord = {
    date,
    total_wealth_eur: toFiniteNumberOrZero(raw.total_wealth_eur),
    portfolio_wealth_eur: toFiniteNumberOrZero(raw.portfolio_wealth_eur),
    account_wealth_eur: toFiniteNumberOrZero(raw.account_wealth_eur),
    dividends_eur: toFiniteNumberOrZero(raw.dividends_eur),
    interest_eur: toFiniteNumberOrZero(raw.interest_eur),
    inbound_transfers_eur: toFiniteNumberOrZero(raw.inbound_transfers_eur),
    outbound_transfers_eur: toFiniteNumberOrZero(raw.outbound_transfers_eur),
    performance_neutral_movements: toFiniteNumberOrZero(raw.performance_neutral_movements),
    fees_eur: toFiniteNumberOrZero(raw.fees_eur),
    taxes_eur: toFiniteNumberOrZero(raw.taxes_eur),
    fx_coverage_ratio: toCoverageValue(raw.fx_coverage_ratio),
    price_coverage_ratio: toCoverageValue(raw.price_coverage_ratio),
    stale_price: raw.stale_price === true,
  };

  const provenance = toStringOrNull(raw.provenance);
  if (provenance) {
    record.provenance = provenance;
  }

  return record;
}

function normalizeDailyWealthScopeRecord(raw: UnknownRecord): DailyWealthScopeRecord | null {
  const base = normalizeDailyWealthRecord(raw);
  const scopeTypeRaw = toStringOrNull(raw.scope_type);
  const scopeId = toStringOrNull(raw.scope_id);
  if (!base || !scopeTypeRaw || !scopeId) {
    return null;
  }
  if (scopeTypeRaw !== "portfolio" && scopeTypeRaw !== "account") {
    return null;
  }
  const scopeRecord: DailyWealthScopeRecord = {
    ...base,
    scope_type: scopeTypeRaw,
    scope_id: scopeId,
  };
  const scopeName = toStringOrNull(raw.scope_name);
  if (scopeName) {
    scopeRecord.scope_name = scopeName;
  }
  return scopeRecord;
}

function normalizeDailyWealthSlices(rawSlices: unknown): DailyWealthSlices | undefined {
  if (!rawSlices || typeof rawSlices !== "object") {
    return undefined;
  }
  const raw = rawSlices as Record<string, unknown>;
  const accountsRaw = Array.isArray(raw.accounts) ? raw.accounts : [];
  const portfoliosRaw = Array.isArray(raw.portfolios) ? raw.portfolios : [];

  const accounts = accountsRaw
    .map(item => (item && typeof item === "object" ? normalizeDailyWealthScopeRecord(item as UnknownRecord) : null))
    .filter((entry): entry is DailyWealthScopeRecord => Boolean(entry));
  const portfolios = portfoliosRaw
    .map(item => (item && typeof item === "object" ? normalizeDailyWealthScopeRecord(item as UnknownRecord) : null))
    .filter((entry): entry is DailyWealthScopeRecord => Boolean(entry));

  if (accounts.length === 0 && portfolios.length === 0) {
    return undefined;
  }

  return { accounts, portfolios };
}

export async function fetchDailyWealthWS(
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
  options: DailyWealthFetchOptions,
): Promise<DailyWealthResponse> {
  if (!hass) {
    throw new Error("fetchDailyWealthWS: fehlendes hass");
  }

  const entryId = deriveEntryId(hass, panelConfig);
  if (!entryId) {
    throw new Error("fetchDailyWealthWS: fehlendes entry_id");
  }

  const { date, range, includeSlices, includeScopes, scopes, limit, offset } = options;
  const normalizedDate = toStringOrNull(date);
  const normalizedRange =
    range && typeof range === "object"
      ? {
          start: toStringOrNull(range.start) ?? "",
          end: toStringOrNull(range.end) ?? "",
        }
      : null;

  if (normalizedDate && normalizedRange && normalizedRange.start && normalizedRange.end) {
    throw new Error("fetchDailyWealthWS: date und range sind gleichzeitig gesetzt");
  }

  const payload: DailyWealthRequest = {
    type: "pp_reader/get_daily_wealth",
    entry_id: entryId,
  };

  if (normalizedDate) {
    payload.date = normalizedDate;
  } else if (normalizedRange && normalizedRange.start && normalizedRange.end) {
    payload.range = normalizedRange;
  } else {
    throw new Error("fetchDailyWealthWS: weder date noch range angegeben");
  }

  if (includeSlices !== undefined) {
    payload.include_slices = includeSlices;
  }
  if (includeScopes !== undefined) {
    payload.include_scopes = includeScopes;
  }
  if (Array.isArray(scopes?.accounts) || Array.isArray(scopes?.portfolios)) {
    payload.scopes = {};
    if (Array.isArray(scopes.accounts)) {
      payload.scopes.accounts = scopes.accounts.filter((id): id is string => typeof id === "string" && id.length > 0);
    }
    if (Array.isArray(scopes.portfolios)) {
      payload.scopes.portfolios = scopes.portfolios.filter(
        (id): id is string => typeof id === "string" && id.length > 0,
      );
    }
  }
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    payload.limit = limit;
  }
  if (typeof offset === "number" && Number.isFinite(offset) && offset >= 0) {
    payload.offset = offset;
  }

  const raw = await hass.connection.sendMessagePromise<UnknownRecord>(payload);

  const normalizedRangeOrFallback = normalizeWealthRange(raw.range, normalizedDate, normalizedRange);

  const recordsRaw = Array.isArray(raw.records) ? raw.records : [];
  const records = recordsRaw
    .map(item => (item && typeof item === "object" ? normalizeDailyWealthRecord(item as UnknownRecord) : null))
    .filter((entry): entry is DailyWealthRecord => Boolean(entry));

  const slices = normalizeDailyWealthSlices(raw.slices);

  return {
    range: normalizedRangeOrFallback,
    records,
    ...(slices ? { slices } : {}),
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

export async function fetchNewsPromptWS(
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
): Promise<NewsPromptResponse> {
  if (!hass) {
    throw new Error("fetchNewsPromptWS: fehlendes hass");
  }

  const entryId = deriveEntryId(hass, panelConfig);
  if (!entryId) {
    throw new Error("fetchNewsPromptWS: fehlendes entry_id");
  }

  return hass.connection.sendMessagePromise<NewsPromptResponse>({
    type: "pp_reader/get_news_prompt",
    entry_id: entryId,
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

  const response = await hass.connection.sendMessagePromise<SecurityHistoryResponse>(payload);
  if (!Array.isArray(response.prices)) {
    response.prices = [];
  }
  if (!Array.isArray(response.transactions)) {
    response.transactions = [];
  }

  return response;
}
