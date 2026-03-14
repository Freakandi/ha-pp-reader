/**
 * Analyse tab renderer for backdating UI.
 */
import type { DailyWealthRecord, DailyWealthResponse } from '../data/api';
import { type DailyWealthSelection } from '../data/dailyWealthStore';
import type { HomeAssistant } from '../types/home-assistant';
import type { PanelConfigLike } from './types';
type PerformanceRowKey = 'startValue' | 'endValue' | 'marketGain' | 'realizedGains' | 'unrealizedGains' | 'dividends' | 'interest' | 'ertraege' | 'fees' | 'taxes' | 'netTransfers' | 'neutral';
type PerformanceBreakdown = Record<PerformanceRowKey, number>;
type WealthSeries = {
    key: string;
    label: string;
    color: string;
    points: {
        date: string;
        value: number;
    }[];
};
declare function renderCoverageBadges(records: DailyWealthRecord[]): string;
declare function buildSeries(data: DailyWealthResponse): WealthSeries[];
declare function derivePerformance(records: DailyWealthRecord[]): PerformanceBreakdown | null;
export declare function renderAnalyse(root: HTMLElement, hass: HomeAssistant | null | undefined, panelConfig: PanelConfigLike | null | undefined): string;
export declare const __TEST_ONLY__: {
    derivePerformanceForTest: typeof derivePerformance;
    buildSeriesForTest: typeof buildSeries;
    renderCoverageBadgesForTest: typeof renderCoverageBadges;
    renderAnalyseWithDataForTest: (root: HTMLElement, data: DailyWealthResponse, selection?: DailyWealthSelection) => void;
};
export {};
//# sourceMappingURL=analyse.d.ts.map