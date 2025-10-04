/**
 * Global PP Reader dashboard declarations for window and DOM extensions.
 * Provides typed access to legacy globals during the TypeScript migration.
 */
import type {
  flushAllPendingPositions,
  flushPendingPositions,
  reapplyPositionsSort,
} from '../data/updateConfigsWS';
import type {
  attachPortfolioPositionsSorting,
  attachSecurityDetailListener,
  getSecurityPositionsFromCache,
  getSecuritySnapshotFromCache,
  updatePortfolioFooterFromDom,
} from '../tabs/overview';

type PortfolioPosition = Record<string, unknown>;

type GainPctMetadataApplier = (table: HTMLTableElement) => void;
type RenderPositionsTable = (positions: PortfolioPosition[]) => string;

type PendingPortfolioUpdate = {
  positions: PortfolioPosition[];
  error?: unknown;
};

type PendingRetryMeta = {
  attempts: number;
  timer: ReturnType<typeof setTimeout> | null;
};

interface PortfolioPositionsCache extends Map<string, PortfolioPosition[]> {
  getSecuritySnapshot?: typeof getSecuritySnapshotFromCache;
  getSecurityPositions?: typeof getSecurityPositionsFromCache;
}

declare global {
  interface Window {
    __ppReaderDashboardElements?: Set<HTMLElement>;
    __ppReaderPanelHosts?: Set<HTMLElement>;
    __ppReaderPortfolioPositionsCache?: PortfolioPositionsCache;
    __ppReaderGetSecuritySnapshotFromCache?: typeof getSecuritySnapshotFromCache;
    __ppReaderGetSecurityPositionsFromCache?: typeof getSecurityPositionsFromCache;
    __ppReaderApplyGainPctMetadata?: GainPctMetadataApplier;
    __ppReaderRenderPositionsTable?: RenderPositionsTable;
    __ppReaderAttachSecurityDetailListener?: typeof attachSecurityDetailListener;
    __ppReaderAttachPortfolioPositionsSorting?: typeof attachPortfolioPositionsSorting;
    __ppReaderPendingPositions?: Map<string, PendingPortfolioUpdate>;
    __ppReaderPendingRetryMeta?: Map<string, PendingRetryMeta>;
    __ppReaderFlushPendingPositions?: typeof flushPendingPositions;
    __ppReaderFlushAllPendingPositions?: typeof flushAllPendingPositions;
    __ppReaderUpdatePortfolioFooter?: typeof updatePortfolioFooterFromDom;
    __ppReaderReapplyPositionsSort?: typeof reapplyPositionsSort;
  }

  interface HTMLElement {
    __ppReaderSecurityClickBound?: boolean;
    __ppReaderSortingBound?: boolean;
    __ppReaderPortfolioToggleBound?: boolean;
    __ppReaderPortfolioFallbackBound?: boolean;
    __ppReaderAttachToken?: number;
    __ppReaderAttachInProgress?: boolean;
  }
}

export {};
