/**
 * Home Assistant websocket API helpers carried over for TypeScript migration.
 */
import type { NormalizedAccountSnapshot, NormalizedDashboardSnapshot, NormalizedPayloadMetadata, NormalizedPortfolioSnapshot, NormalizedPositionSnapshot } from "../lib/api/portfolio";
import type { AverageCostPayload, HoldingsAggregationPayload, PanelConfigLike, PerformanceMetricsPayload, PortfolioPosition as TabsPortfolioPosition } from "../tabs/types";
import type { HomeAssistant } from "../types/home-assistant";
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
export interface SecurityHistoryOptions {
    startDate?: number | null;
    endDate?: number | null;
    start_date?: number | null;
    end_date?: number | null;
    [key: string]: unknown;
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
export declare const DASHBOARD_DATA_TYPES: readonly ["accounts", "portfolio_values", "portfolio_positions", "security_snapshot", "security_history"];
export type DashboardDataType = (typeof DASHBOARD_DATA_TYPES)[number];
export interface DashboardPushPayloadMap {
    accounts: AccountSummary[] | null | undefined;
    portfolio_values: PortfolioValuesUpdateEntry[] | null | undefined;
    portfolio_positions: PortfolioPositionsUpdatePayload | PortfolioPositionsUpdatePayload[] | null | undefined;
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
export declare function isDashboardDataType(value: unknown): value is DashboardDataType;
export declare function getEntryId(hass: HomeAssistant | null | undefined, panelConfig: PanelConfigLike | null | undefined): string | undefined;
export declare function fetchDashboardDataWS(hass: HomeAssistant | null | undefined, panelConfig: PanelConfigLike | null | undefined): Promise<DashboardDataResponse>;
export declare function fetchAccountsWS(hass: HomeAssistant | null | undefined, panelConfig: PanelConfigLike | null | undefined): Promise<AccountsResponse>;
export declare function fetchLastFileUpdateWS(hass: HomeAssistant | null | undefined, panelConfig: PanelConfigLike | null | undefined): Promise<string>;
export declare function fetchPortfoliosWS(hass: HomeAssistant | null | undefined, panelConfig: PanelConfigLike | null | undefined): Promise<PortfoliosResponse>;
export declare function fetchPortfolioPositionsWS(hass: HomeAssistant | null | undefined, panelConfig: PanelConfigLike | null | undefined, portfolioUuid: string | null | undefined): Promise<PortfolioPositionsResponse>;
export declare function fetchSecuritySnapshotWS(hass: HomeAssistant | null | undefined, panelConfig: PanelConfigLike | null | undefined, securityUuid: string | null | undefined): Promise<SecuritySnapshotResponse>;
export declare function fetchNewsPromptWS(hass: HomeAssistant | null | undefined, panelConfig: PanelConfigLike | null | undefined): Promise<NewsPromptResponse>;
export declare function fetchSecurityHistoryWS(hass: HomeAssistant | null | undefined, panelConfig: PanelConfigLike | null | undefined, securityUuid: string | null | undefined, options?: SecurityHistoryOptions | null | undefined): Promise<SecurityHistoryResponse>;
export interface RealizedLot {
    date: string;
    shares: number;
    sell_price: number;
    sell_price_native: number | null;
    purchase_value_gross: number;
    sales_value_gross: number;
    sales_value_net: number;
    result_abs: number;
    result_pct: number;
    since_sell_abs: number;
    since_sell_pct: number;
}
export interface RealizedTrade {
    security_uuid: string;
    name: string;
    currency_code: string;
    ticker_symbol: string | null;
    current_price: number | null;
    current_holdings: number;
    last_sell_price: number;
    last_sell_price_native: number | null;
    purchase_value_gross: number;
    sales_value_gross: number;
    sales_value_net: number;
    result_abs: number;
    result_pct: number;
    total_shares_sold: number;
    lots: RealizedLot[];
    total_sold_shares: number;
    last_sell_date: string;
    since_sell_abs: number;
    since_sell_pct: number;
}
export declare function fetchRealizedPerformance(hass: HomeAssistant | null | undefined, panelConfig: PanelConfigLike | null | undefined): Promise<RealizedTrade[]>;
export interface DailyWealthRange {
    start: string;
    end: string;
}
export interface DailyWealthFetchOptions {
    date?: string | null;
    range?: DailyWealthRange | null;
    metrics_start?: string | null;
    scopes?: {
        accounts?: string[];
        portfolios?: string[];
    };
    includeSlices?: boolean;
    includeScopes?: boolean;
    limit?: number;
    offset?: number;
}
export interface DailyWealthRequest extends DailyWealthFetchOptions {
    type: 'pp_reader/get_daily_wealth';
    entry_id: string;
    [key: string]: unknown;
}
export interface DailyWealthRecord {
    date: string;
    total_wealth_eur: number;
    invested_capital_eur: number;
    fx_coverage_ratio?: number | null;
    price_coverage_ratio?: number | null;
    stale_price?: boolean;
    provenance?: string;
    [key: string]: unknown;
}
export interface DailyWealthScopeRecord {
    scope_type: 'account' | 'portfolio';
    scope_id: string;
    scope_name?: string;
    date: string;
    total_wealth_eur: number;
    [key: string]: unknown;
}
export interface DailyWealthSlices {
    accounts: DailyWealthScopeRecord[];
    portfolios: DailyWealthScopeRecord[];
}
export interface PerformanceMetrics {
    start_wealth: number;
    end_wealth: number;
    absolute_performance: number;
    realized_gains: number;
    unrealized_gains: number;
    fx_gains_cash: number;
    dividends: number;
    fees: number;
    taxes: number;
    interest: number;
    net_transfers: number;
    twr?: number;
    irr?: number;
}
export interface DailyWealthResponse {
    range: DailyWealthRange;
    records: DailyWealthRecord[];
    slices?: DailyWealthSlices;
    metrics?: PerformanceMetrics;
}
export declare function fetchDailyWealthWS(hass: HomeAssistant | null | undefined, config: PanelConfigLike | null | undefined, options: DailyWealthFetchOptions): Promise<DailyWealthResponse | null>;
//# sourceMappingURL=api.d.ts.map