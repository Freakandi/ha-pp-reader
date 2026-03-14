/**
 * Lightweight in-memory store for normalized dashboard snapshots.
 *
 * Keeps canonical AccountSnapshot / PortfolioSnapshot structures available to
 * both websocket handlers and view controllers without relying on window
 * globals. State mutations always clone nested objects to avoid accidental
 * consumer side-effects.
 */
import type { NormalizedAccountSnapshot, NormalizedPortfolioSnapshot, NormalizedPositionSnapshot } from "../api/portfolio";
type PortfolioSnapshotInput = NormalizedPortfolioSnapshot | (Partial<NormalizedPortfolioSnapshot> & {
    uuid?: string | null;
});
interface PortfolioStoreState {
    accounts: NormalizedAccountSnapshot[];
    portfolios: NormalizedPortfolioSnapshot[];
}
export declare function setAccountSnapshots(accounts: readonly NormalizedAccountSnapshot[] | null | undefined): void;
export declare function getAccountSnapshots(): NormalizedAccountSnapshot[];
export declare function replacePortfolioSnapshots(portfolios: readonly PortfolioSnapshotInput[] | null | undefined): void;
export declare function mergePortfolioSnapshots(patches: readonly PortfolioSnapshotInput[] | null | undefined): void;
export declare function setPortfolioPositionsSnapshot(portfolioUuid: string | null | undefined, positions: readonly NormalizedPositionSnapshot[] | null | undefined): void;
export declare function getPortfolioSnapshots(): NormalizedPortfolioSnapshot[];
export declare function getPortfolioSnapshot(portfolioUuid: string | null | undefined): NormalizedPortfolioSnapshot | null;
export declare function getPortfolioStoreState(): PortfolioStoreState;
export declare const __TEST_ONLY__: {
    reset(): void;
};
export {};
//# sourceMappingURL=portfolioStore.d.ts.map