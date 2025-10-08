/**
 * Barrel module exposing the legacy dashboard surface for TypeScript sources.
 *
 * Keeps tab controllers and data utilities reachable under a single import,
 * mirroring the public API provided by the historical JavaScript modules.
 */
export * from '../dashboard';
export * from '../tabs/overview';
export * from '../tabs/security_detail';
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
  SecurityHistoryResponse,
  LastFileUpdateResponse,
  SecurityHistoryOptions,
} from '../data/api';
export * from '../data/updateConfigsWS';
export { addSwipeEvents, goToTab } from '../interaction/tab_control';
