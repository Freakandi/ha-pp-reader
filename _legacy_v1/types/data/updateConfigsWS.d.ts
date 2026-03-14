/**
 * Live update handlers mirrored from the legacy websocket client.
 */
import type { AccountSummary, PortfolioPositionsUpdatePayload, PortfolioValuesUpdateEntry } from './api';
import { clearAllPortfolioPositions, getPortfolioPositionsSnapshot, type PortfolioPositionRecord } from './positionsCache';
export type { PortfolioPositionsUpdatedEventDetail } from '../tabs/types';
type DiagnosticSnapshotKind = 'account' | 'portfolio' | 'portfolio_positions';
interface SnapshotDiagnosticsState {
    coverage_ratio?: number | null;
    provenance?: string | null;
    metric_run_uuid?: string | null;
    generated_at?: string | null;
}
interface DiagnosticChange<T> {
    previous: T | undefined;
    current: T | undefined;
}
type DiagnosticField = keyof SnapshotDiagnosticsState;
type DiagnosticValue = string | number | null | undefined;
type DiagnosticChanges = Partial<Record<DiagnosticField, DiagnosticChange<DiagnosticValue>>>;
export interface DashboardDiagnosticsEventDetail {
    kind: DiagnosticSnapshotKind;
    uuid: string;
    source: string;
    changed: DiagnosticChanges;
    snapshot: SnapshotDiagnosticsState;
    timestamp: string;
}
type QueryRoot = HTMLElement | Document;
type PortfolioUpdatePayload = PortfolioValuesUpdateEntry;
export declare const PORTFOLIO_POSITIONS_UPDATED_EVENT = "pp-reader:portfolio-positions-updated";
export declare const DASHBOARD_DIAGNOSTICS_EVENT = "pp-reader:diagnostics";
export declare function flushPendingPositions(root: QueryRoot | null | undefined, portfolioUuid: string): boolean;
export declare function flushAllPendingPositions(root: QueryRoot | null | undefined): boolean;
/**
 * Handler für Kontodaten-Updates (Accounts, inkl. FX).
 * @param update Die empfangenen Kontodaten (mit currency_code, orig_balance, balance(EUR)).
 * @param root Das Root-Element des Dashboards.
 */
export declare function handleAccountUpdate(update: AccountSummary[] | null | undefined, root: QueryRoot | null | undefined): void;
/**
 * Handler für Depot-Updates (aggregierte Portfolio-Werte).
 * Ersetzt die bisherige komplette Tabellen-Neuerstellung durch ein gezieltes Patchen
 * der vorhandenen expandierbaren Tabelle (gebaut in overview.js).
 */
export declare function handlePortfolioUpdate(update: PortfolioUpdatePayload[] | null | undefined, root: QueryRoot | null | undefined): void;
export declare function handlePortfolioPositionsUpdate(update: PortfolioPositionsUpdatePayload | PortfolioPositionsUpdatePayload[] | null | undefined, root: QueryRoot | null | undefined): void;
declare function renderPositionsTableInline(positions: PortfolioPositionRecord[]): string;
export declare function updateTotalWealth(accounts: Array<{
    balance?: number | null;
    current_value?: number | null;
    value?: number | null;
}> | null | undefined, portfolios: Array<{
    current_value?: number | null;
    value?: number | null;
    purchase_sum?: number | null;
}> | null | undefined, root: QueryRoot | null | undefined): void;
/**
 * HINWEIS (2025-09):
 * Die frühere Funktion updatePortfolioTable (vollständiger Neuaufbau der Depot-Tabelle)
 * wurde durch inkrementelles Patchen via handlePortfolioUpdate + Lazy-Load der Positions-
 * daten ersetzt. Alte Implementierung entfernt, um doppelte Logik und Render-Flashes
 * zu vermeiden.
 *
 * Falls noch Referenzen auf updatePortfolioTable existieren, bitte auf handlePortfolioUpdate
 * umstellen. (Das Dashboard-Modul ruft bereits nur noch _doRender -> handlePortfolioUpdate auf.)
 */
export declare function handleLastFileUpdate(update: string | {
    last_file_update?: string | null;
} | null | undefined, root: QueryRoot | null | undefined): void;
/**
 * NEUER HELPER (Änderung 8):
 * Re-applied die gespeicherte Sortierung einer Positions-Tabelle.
 * Liest container.dataset.sortKey / sortDir oder Default-Werte vom <table>.
 * Nutzt sortTableRows(..., true) für Positions-Mapping.
 * @param {HTMLElement} containerEl .positions-container
 */
export declare function reapplyPositionsSort(containerEl: HTMLElement | null | undefined): void;
export declare const __TEST_ONLY__: {
    getPortfolioPositionsCacheSnapshot: typeof getPortfolioPositionsSnapshot;
    clearPortfolioPositionsCache: typeof clearAllPortfolioPositions;
    getPendingUpdateCount(): number;
    queuePendingUpdate(portfolioUuid: string, positions: PortfolioPositionRecord[], error?: unknown): void;
    clearPendingUpdates(): void;
    renderPositionsTableInline: typeof renderPositionsTableInline;
};
//# sourceMappingURL=updateConfigsWS.d.ts.map