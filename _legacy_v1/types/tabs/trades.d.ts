/**
 * Trades tab renderer for "Realized Performance".
 */
import type { RealizedTrade } from '../data/api';
import type { HomeAssistant } from '../types/home-assistant';
import type { PanelConfigLike } from './types';
export declare function setOpenTradeDetail(fn: (uuid: string) => boolean): void;
declare function renderTradesTable(trades: readonly RealizedTrade[]): string;
export declare function renderTrades(root: HTMLElement, hass: HomeAssistant | null | undefined, panelConfig: PanelConfigLike | null | undefined): Promise<string>;
export declare const __TEST_ONLY__: {
    renderTradesTable: typeof renderTradesTable;
};
export {};
//# sourceMappingURL=trades.d.ts.map