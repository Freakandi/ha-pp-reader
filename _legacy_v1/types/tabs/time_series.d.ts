/**
 * Analyse tab renderer for backdating UI.
 */
import type { DailyWealthRecord, DailyWealthResponse } from '../data/api';
import { type DailyWealthSelection } from '../data/dailyWealthStore';
import type { HomeAssistant } from '../types/home-assistant';
import type { PanelConfigLike } from './types';
type PerformanceRowKey = 'startValue' | 'endValue' | 'marketGain' | 'realizedGains' | 'unrealizedGains' | 'fxGains' | 'dividends' | 'interest' | 'fees' | 'taxes' | 'netTransfers' | 'twr' | 'irr';
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
declare function renderMetrics(card: HTMLElement, records: DailyWealthRecord[], metrics?: DailyWealthResponse['metrics'], hass?: HomeAssistant, selection?: DailyWealthSelection, entryId?: string): void;
declare function buildSeries(data: DailyWealthResponse): WealthSeries[];
/**
 * Derive performance metrics from a sequence of daily wealth records.
 * The first record (index 0) is treated as the baseline (morning of start date).
 * Subsequent records are treated as the activity within the selected period.
 */
declare function derivePerformance(_records: DailyWealthRecord[], responseMetrics?: DailyWealthResponse['metrics']): PerformanceBreakdown | null;
export declare function refreshAnalyseData(root: HTMLElement, hass: HomeAssistant | null | undefined, panelConfig: PanelConfigLike | null | undefined): Promise<void>;
export declare function renderAnalyse(root: HTMLElement, hass: HomeAssistant | null | undefined, panelConfig: PanelConfigLike | null | undefined): string;
export declare const __TEST_ONLY__: {
    renderMetrics: typeof renderMetrics;
    derivePerformanceForTest: typeof derivePerformance;
    buildSeriesForTest: typeof buildSeries;
    renderCoverageBadgesForTest: typeof renderCoverageBadges;
    renderAnalyseWithDataForTest: (root: HTMLElement, data: DailyWealthResponse, selection?: DailyWealthSelection) => void;
};
export {};
//# sourceMappingURL=time_series.d.ts.map