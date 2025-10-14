/**
 * Dashboard registry utilities replacing legacy window.__ppReader* shims.
 *
 * Keeps cross-module helpers and element references in module scope so
 * consumers interact via imports instead of global assignments.
 */

export type DashboardElement = HTMLElement;

export type PortfolioPositionsRenderer = (positions: readonly unknown[]) => string;
export type GainPctMetadataApplier = (table: HTMLTableElement) => void;
export type PortfolioPositionsSortingAttacher = (
  root: Document | HTMLElement,
  portfolioUuid: string,
) => void;
export type SecurityDetailListenerAttacher = (
  root: Document | HTMLElement,
  portfolioUuid: string,
) => void;
export type PortfolioFooterUpdater = (table: HTMLTableElement | null) => void;

interface OverviewHelperRegistry {
  renderPositionsTable?: PortfolioPositionsRenderer;
  applyGainPctMetadata?: GainPctMetadataApplier;
  attachSecurityDetailListener?: SecurityDetailListenerAttacher;
  attachPortfolioPositionsSorting?: PortfolioPositionsSortingAttacher;
  updatePortfolioFooter?: PortfolioFooterUpdater;
}

const dashboardElements = new Set<DashboardElement>();
const panelHosts = new Set<HTMLElement>();
const overviewHelpers: OverviewHelperRegistry = {};

export function registerDashboardElement(element: DashboardElement | null | undefined): void {
  if (!element) {
    return;
  }
  dashboardElements.add(element);
}

export function unregisterDashboardElement(element: DashboardElement | null | undefined): void {
  if (!element) {
    return;
  }
  dashboardElements.delete(element);
}

export function getRegisteredDashboardElements(): ReadonlySet<DashboardElement> {
  return dashboardElements;
}

export function registerPanelHost(host: HTMLElement | null | undefined): void {
  if (!host) {
    return;
  }
  panelHosts.add(host);
}

export function unregisterPanelHost(host: HTMLElement | null | undefined): void {
  if (!host) {
    return;
  }
  panelHosts.delete(host);
}

export function getRegisteredPanelHosts(): ReadonlySet<HTMLElement> {
  return panelHosts;
}

export function registerOverviewHelpers(helpers: OverviewHelperRegistry): void {
  Object.assign(overviewHelpers, helpers);
}

export function getOverviewHelpers(): OverviewHelperRegistry {
  return overviewHelpers;
}

export const __TEST_ONLY__ = {
  clearRegistries(): void {
    dashboardElements.clear();
    panelHosts.clear();
    for (const key of Object.keys(overviewHelpers) as Array<keyof OverviewHelperRegistry>) {
      overviewHelpers[key] = undefined;
    }
  },
};
