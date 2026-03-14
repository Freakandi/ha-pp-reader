/**
 * Dashboard registry utilities replacing legacy window.__ppReader* shims.
 *
 * Keeps cross-module helpers and element references in module scope so
 * consumers interact via imports instead of global assignments.
 */
export type DashboardElement = HTMLElement;
export type PortfolioPositionsRenderer = (positions: readonly unknown[]) => string;
export type GainPctMetadataApplier = (table: HTMLTableElement) => void;
export type PortfolioPositionsSortingAttacher = (root: Document | HTMLElement, portfolioUuid: string) => void;
export type SecurityDetailListenerAttacher = (root: Document | HTMLElement, portfolioUuid: string) => void;
export type PortfolioFooterUpdater = (table: HTMLTableElement | null) => void;
interface OverviewHelperRegistry {
    renderPositionsTable?: PortfolioPositionsRenderer;
    applyGainPctMetadata?: GainPctMetadataApplier;
    attachSecurityDetailListener?: SecurityDetailListenerAttacher;
    attachPortfolioPositionsSorting?: PortfolioPositionsSortingAttacher;
    updatePortfolioFooter?: PortfolioFooterUpdater;
}
export declare function registerDashboardElement(element: DashboardElement | null | undefined): void;
export declare function unregisterDashboardElement(element: DashboardElement | null | undefined): void;
export declare function getRegisteredDashboardElements(): ReadonlySet<DashboardElement>;
export declare function registerPanelHost(host: HTMLElement | null | undefined): void;
export declare function unregisterPanelHost(host: HTMLElement | null | undefined): void;
export declare function getRegisteredPanelHosts(): ReadonlySet<HTMLElement>;
export declare function registerOverviewHelpers(helpers: OverviewHelperRegistry): void;
export declare function getOverviewHelpers(): Readonly<OverviewHelperRegistry>;
export declare const __TEST_ONLY__: {
    clearRegistries(): void;
};
export {};
//# sourceMappingURL=registry.d.ts.map