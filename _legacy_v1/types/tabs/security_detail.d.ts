/**
 * Security detail tab renderer migrated verbatim for TypeScript.
 */
/**
 * Security detail tab renderer and registration.
 *
 * Provides the render function used by dynamic security tabs and
 * exposes a helper to register the descriptor factory with the
 * dashboard controller.
 */
import type { LineChartMarker, LineChartOptions } from '../content/charting';
import type { SecurityHistoryOptions } from '../data/api';
import type { HomeAssistant } from '../types/home-assistant';
import type { DashboardTabRenderFn, PanelConfigLike, SecurityHistoryRangeKey, SecuritySnapshotLike } from './types';
type SecuritySnapshotDetail = Partial<Omit<SecuritySnapshotLike, 'security_uuid'>> & {
    security_uuid?: string | null;
    name?: string | null;
    total_holdings?: number | string | null;
    total_holdings_precise?: number | string | null;
    last_price_native?: number | string | null;
    last_price_eur?: number | string | null;
    market_value_eur?: number | string | null;
    current_value_eur?: number | string | null;
    currency_code?: string | null;
    last_close_native?: number | string | null;
    last_close_eur?: number | string | null;
    last_price?: {
        native?: number | string | null;
        [key: string]: unknown;
    } | null;
    source?: string | null;
    [key: string]: unknown;
};
interface NormalizedHistoryEntry {
    date: Date | string | number;
    close: number;
}
export declare const __TEST_ONLY__: {
    getHistoryChartOptionsForTest: typeof getHistoryChartOptions;
    mergeHistoryWithSnapshotPriceForTest: (historySeries: readonly NormalizedHistoryEntry[] | null | undefined, snapshot: SecuritySnapshotDetail | null | undefined) => NormalizedHistoryEntry[];
    composeAveragePurchaseTooltipForTest: typeof composeAveragePurchaseTooltip;
    parseHistoryDateForTest: typeof parseHistoryDate;
    resolveRangeOptionsForTest: typeof resolveRangeOptions;
    selectAveragePurchaseBaselineForTest: typeof selectAveragePurchaseBaseline;
    resolveAccountCurrencyCodeForTest: typeof resolveAccountCurrencyCode;
    resolvePurchaseFxTimestampForTest: typeof resolvePurchaseFxTimestamp;
    buildHeaderMetaForTest: typeof buildHeaderMeta;
    normaliseTransactionMarkersForTest: (transactions: unknown, fallbackCurrency: string | null | undefined, snapshot?: SecuritySnapshotDetail | null) => LineChartMarker[];
};
declare function resolveRangeOptions(rangeKey: SecurityHistoryRangeKey, today?: Date): SecurityHistoryOptions;
declare function parseHistoryDate(raw: unknown): Date | null;
declare function resolveAccountCurrencyCode(snapshot: SecuritySnapshotDetail | null | undefined, accountAverage: number | null | undefined, securityAverage: number | null | undefined): string | null;
declare function resolvePurchaseFxTimestamp(snapshot: SecuritySnapshotDetail | null | undefined): number | null;
declare function composeAveragePurchaseTooltip(snapshot: SecuritySnapshotDetail | null | undefined, accountCurrency: string | null | undefined): string | null;
declare function selectAveragePurchaseBaseline(snapshot: SecuritySnapshotDetail | null | undefined): number | null;
declare function buildHeaderMeta(snapshot: SecuritySnapshotDetail | null): string;
declare function getHistoryChartOptions(host: HTMLElement, series: readonly NormalizedHistoryEntry[], { currency, baseline, markers, }?: {
    currency?: string | null | undefined;
    baseline?: number | null | undefined;
    markers?: readonly LineChartMarker[];
}): LineChartOptions;
export declare function renderSecurityDetail(root: HTMLElement, hass: HomeAssistant | null | undefined, panelConfig: PanelConfigLike | null | undefined, securityUuid: string | null | undefined): Promise<string>;
interface RegisterSecurityDetailTabOptions {
    setSecurityDetailTabFactory?: ((factory: (securityUuid: string) => {
        title: string;
        render: DashboardTabRenderFn;
        cleanup: (context?: {
            key: string;
        }) => void;
    }) => void) | null;
}
export declare function registerSecurityDetailTab(options: RegisterSecurityDetailTabOptions): void;
export {};
//# sourceMappingURL=security_detail.d.ts.map