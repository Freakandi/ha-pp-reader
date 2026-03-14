/**
 * Daily wealth state and caching helper for the Analyse tab.
 */
import type { PanelConfigLike } from '../tabs/types';
import type { HomeAssistant } from '../types/home-assistant';
import { type DailyWealthFetchOptions, type DailyWealthResponse } from './api';
type DailyWealthStatus = 'idle' | 'loading' | 'loaded' | 'error';
export type DailyWealthSelection = DailyWealthFetchOptions;
export interface DailyWealthState {
    status: DailyWealthStatus;
    error: string | null;
    data: DailyWealthResponse | null;
    selection: DailyWealthSelection | null;
    lastUpdated: number | null;
}
type LoadDailyWealthOptions = DailyWealthSelection & {
    force?: boolean;
};
export declare function resetDailyWealthState(): void;
export declare function getDailyWealthState(): DailyWealthState;
export declare function invalidateDailyWealthCache(): void;
export declare function loadDailyWealth(hass: HomeAssistant | null | undefined, panelConfig: PanelConfigLike | null | undefined, options?: LoadDailyWealthOptions): Promise<DailyWealthState>;
export {};
//# sourceMappingURL=dailyWealthStore.d.ts.map