/**
 * Overview tab renderer copied for the TypeScript source tree.
 */
import type { PortfolioPositionRecord } from "../data/positionsCache";
import { type PortfolioOverviewRow } from "../lib/store/selectors/portfolio";
import type { HomeAssistant } from "../types/home-assistant";
import type { PanelConfigLike } from "./types";
type PortfolioQueryRoot = Document | HTMLElement;
type ToggleRootElement = HTMLElement & {
    __ppReaderAttachToken?: number;
    __ppReaderAttachInProgress?: boolean;
};
declare function buildPurchasePriceDisplay(position: PortfolioPositionRecord): {
    markup: string;
    sortValue: number;
    ariaLabel: string;
};
declare function buildLastPriceDisplay(position: PortfolioPositionRecord): {
    markup: string;
    sortValue: number;
    ariaLabel: string;
};
export declare const __TEST_ONLY__: {
    buildPurchasePriceDisplayForTest: typeof buildPurchasePriceDisplay;
    buildLastPriceDisplayForTest: typeof buildLastPriceDisplay;
    attachPortfolioOverviewSorting: typeof attachPortfolioOverviewSorting;
    buildExpandablePortfolioTableForTest: typeof buildExpandablePortfolioTable;
};
export declare function renderPortfolioPositions(positions: readonly (PortfolioPositionRecord | Record<string, unknown>)[] | null | undefined): string;
export declare function attachSecurityDetailListener(root: PortfolioQueryRoot, portfolioUuid: string): void;
declare function buildExpandablePortfolioTable(depots: readonly PortfolioOverviewRow[]): string;
export declare function updatePortfolioFooterFromDom(target: Element | PortfolioQueryRoot | null | undefined): void;
/**
 * Utility-Funktionen zum Auslesen und Wiederherstellen des Expand-States.
 * Perspektivisch nutzbar, falls ein vollständiger Neu-Render (Hard Refresh) der
 * Depot-Tabelle nötig wird (z.B. beim späteren Hinzufügen von Filter-/Sortierlogik).
 */
export declare function getExpandedPortfolios(): string[];
export declare function setExpandedPortfolios(portfolioIds: Array<string | null | undefined> | null | undefined): void;
export declare function attachPortfolioPositionsSorting(root: PortfolioQueryRoot, portfolioUuid: string): void;
declare function attachPortfolioOverviewSorting(root: HTMLElement): void;
export declare function attachPortfolioToggleHandler(root: ToggleRootElement): void;
export declare function ensurePortfolioRowFallbackListener(root: ToggleRootElement): void;
export declare function renderDashboard(root: HTMLElement, hass: HomeAssistant | null | undefined, panelConfig: PanelConfigLike | null | undefined): Promise<string>;
export {};
//# sourceMappingURL=overview.d.ts.map