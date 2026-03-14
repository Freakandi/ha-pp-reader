/**
 * Shared in-memory portfolio positions cache used by dashboard tabs.
 *
 * Centralises storage for normalised portfolio position payloads so that
 * websocket update handlers and tab renderers can exchange data without
 * relying on window globals. All accessors clone cached entries to prevent
 * consumers from mutating the shared state.
 */
import type { NormalizedPositionSnapshot } from '../lib/api/portfolio';
import type { AverageCostPayload, HoldingsAggregationPayload, PerformanceMetricsPayload } from '../tabs/types';
type BasePositionSnapshot = Omit<NormalizedPositionSnapshot, 'average_cost' | 'aggregation' | 'performance'>;
export type PortfolioPositionRecord = BasePositionSnapshot & {
    average_cost?: AverageCostPayload | null;
    aggregation?: HoldingsAggregationPayload | null;
    performance?: PerformanceMetricsPayload | null;
    gain_abs?: number | null;
    gain_pct?: number | null;
    fx_unavailable?: boolean | null;
    [key: string]: unknown;
};
export declare function setPortfolioPositions(portfolioUuid: string | null | undefined, positions: readonly PortfolioPositionRecord[] | null | undefined): PortfolioPositionRecord[];
export declare function hasPortfolioPositions(portfolioUuid: string | null | undefined): boolean;
export declare function getPortfolioPositions(portfolioUuid: string | null | undefined): PortfolioPositionRecord[];
export declare function clearPortfolioPositions(portfolioUuid: string | null | undefined): void;
export declare function clearAllPortfolioPositions(): void;
export declare function getPortfolioPositionsSnapshot(): ReadonlyMap<string, PortfolioPositionRecord[]>;
export declare function normalizeAverageCostPayload(value: unknown): AverageCostPayload | null;
export declare function normalizeAggregationPayload(value: unknown): HoldingsAggregationPayload | null;
export declare function normalizePositionRecord(value: unknown): PortfolioPositionRecord | null;
export declare function normalizePositionRecords(positions: unknown): PortfolioPositionRecord[];
export {};
//# sourceMappingURL=positionsCache.d.ts.map