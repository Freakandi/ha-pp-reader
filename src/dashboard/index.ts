/**
 * Barrel module exposing the legacy dashboard surface for TypeScript sources.
 *
 * Keeps tab controllers and data utilities reachable under a single import,
 * mirroring the public API provided by the historical JavaScript modules.
 */
export * from "../dashboard";

// Re-export the dashboard tab utilities explicitly to avoid leaking
// test-only helpers (`__TEST_ONLY__`) multiple times which causes
// conflicts under TypeScript's star-export rules.
export {
  attachPortfolioPositionsSorting,
  attachPortfolioToggleHandler,
  attachSecurityDetailListener,
  ensurePortfolioRowFallbackListener,
  getExpandedPortfolios,
  renderDashboard,
  renderPortfolioPositions,
  setExpandedPortfolios,
  updatePortfolioFooterFromDom,
} from "../tabs/overview";

export {
  fetchAccountsWS,
  fetchDailyWealthWS,
  fetchDashboardDataWS,
  fetchLastFileUpdateWS,
  fetchPortfolioPositionsWS,
  fetchPortfoliosWS,
  fetchRealizedPerformance,
  fetchSecurityHistoryWS,
  fetchSecuritySnapshotWS,
  getEntryId,
} from "../data/api";
export type {
  AccountSummary,
  AccountsResponse,
  DashboardDataResponse,
  LastFileUpdateResponse,
  PortfolioPositionsResponse,
  PortfolioSummary,
  PortfoliosResponse,
  SecurityHistoryOptions,
  SecurityHistoryPoint,
  SecurityHistoryResponse,
  SecurityHistoryTransaction,
  SecuritySnapshotResponse,
} from "../data/api";
export * from "../data/updateConfigsWS";
export { addSwipeEvents, goToTab } from "../interaction/tab_control";
export {
  registerSecurityDetailTab,
  renderSecurityDetail,
} from "../tabs/security_detail";
export * from "../tabs/types";
