/**
 * Barrel module exposing the legacy dashboard surface for TypeScript sources.
 *
 * Keeps tab controllers and data utilities reachable under a single import,
 * mirroring the public API provided by the historical JavaScript modules.
 */
export * from '../dashboard';

// Re-export the dashboard tab utilities explicitly to avoid leaking
// test-only helpers (`__TEST_ONLY__`) multiple times which causes
// conflicts under TypeScript's star-export rules.
export {
  renderDashboard,
  attachPortfolioToggleHandler,
  renderPortfolioPositions,
  attachSecurityDetailListener,
  updatePortfolioFooterFromDom,
  getExpandedPortfolios,
  setExpandedPortfolios,
  attachPortfolioPositionsSorting,
  ensurePortfolioRowFallbackListener,
} from '../tabs/overview';

export {
  renderSecurityDetail,
  registerSecurityDetailTab,
} from '../tabs/security_detail';
export * from '../tabs/types';
export {
  getEntryId,
  fetchDashboardDataWS,
  fetchAccountsWS,
  fetchLastFileUpdateWS,
  fetchPortfoliosWS,
  fetchPortfolioPositionsWS,
  fetchSecuritySnapshotWS,
  fetchSecurityHistoryWS,
} from '../data/api';
export type {
  AccountSummary,
  PortfolioSummary,
  DashboardDataResponse,
  AccountsResponse,
  PortfoliosResponse,
  PortfolioPositionsResponse,
  SecuritySnapshotResponse,
  SecurityHistoryPoint,
  SecurityHistoryTransaction,
  SecurityHistoryResponse,
  LastFileUpdateResponse,
  SecurityHistoryOptions,
} from '../data/api';
export * from '../data/updateConfigsWS';
export { addSwipeEvents, goToTab } from '../interaction/tab_control';
