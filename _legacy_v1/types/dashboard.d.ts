/**
 * Mirrors the legacy dashboard controller for initial TypeScript migration.
 */
import { registerDashboardElement, registerPanelHost, unregisterDashboardElement, unregisterPanelHost } from './dashboard/registry';
import { __TEST_ONLY__, flushPendingPositions, handlePortfolioPositionsUpdate, reapplyPositionsSort } from './data/updateConfigsWS';
import { updatePortfolioFooterFromDom } from './tabs/overview';
import type { DashboardTabDescriptor } from './tabs/types';
export { __TEST_ONLY__, closeSecurityDetail, closeTradeDetail, flushPendingPositions, getVisibleTabs, handlePortfolioPositionsUpdate, openSecurityDetail, openTradeDetail, reapplyPositionsSort, registerDashboardElement, registerPanelHost, setTradeDetailTabFactory, unregisterDashboardElement, unregisterPanelHost, updatePortfolioFooterFromDom };
interface DashboardElement extends HTMLElement {
    rememberScrollPosition?: (page?: number) => void;
    _renderIfInitialized?: () => void;
    _render?: () => void;
    _lastPage?: number | null;
    handleExternalRender?: (page: number) => void;
}
type DetailTabDescriptorInput = {
    title: string;
    render: DashboardTabDescriptor['render'];
    cleanup?: DashboardTabDescriptor['cleanup'];
    key?: string;
    [key: string]: unknown;
};
type DetailTabFactory = (securityUuid: string) => DetailTabDescriptorInput | null | undefined;
declare function toErrorMessage(error: unknown): string;
declare function getVisibleTabs(): DashboardTabDescriptor[];
export declare function registerDetailTab(key: string, descriptor: DetailTabDescriptorInput | null | undefined): void;
export declare function unregisterDetailTab(key: string | null | undefined): void;
export declare function hasDetailTab(key: string): boolean;
export declare function getDetailTabDescriptor(key: string): DashboardTabDescriptor | null;
export declare function setSecurityDetailTabFactory(factory: DetailTabFactory | null | undefined): void;
declare function setTradeDetailTabFactory(factory: DetailTabFactory | null | undefined): void;
declare function findDashboardElement(): DashboardElement | null;
export declare const __TEST_ONLY_DASHBOARD: {
    findDashboardElement: typeof findDashboardElement;
    toErrorMessage: typeof toErrorMessage;
};
declare function openSecurityDetail(securityUuid: string | null | undefined): boolean;
declare function openTradeDetail(securityUuid: string | null | undefined): boolean;
interface CloseSecurityDetailOptions {
    suppressRender?: boolean;
}
declare function closeSecurityDetail(securityUuid: string | null | undefined, options?: CloseSecurityDetailOptions): boolean;
declare function closeTradeDetail(securityUuid: string | null | undefined, options?: CloseSecurityDetailOptions): boolean;
//# sourceMappingURL=dashboard.d.ts.map