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
  AverageCostPayload,
  PortfolioPositionsUpdatedEventDetail,
} from '../tabs/types';
import type {
  attachPortfolioPositionsSorting,
  attachSecurityDetailListener,
  getSecurityPositionsFromCache,
  updatePortfolioFooterFromDom,
} from '../tabs/overview';

type CachedSecurityPositions = ReturnType<typeof getSecurityPositionsFromCache>;
type DashboardPortfolioPosition = CachedSecurityPositions extends Array<infer Item>
  ? Item
  : never;

type GainPctMetadataApplier = (table: HTMLTableElement) => void;
type RenderPositionsTable = (positions: readonly DashboardPortfolioPosition[]) => string;

interface PendingPortfolioPosition {
  security_uuid?: string | null;
  name?: string | null;
  current_holdings?: number | null;
  purchase_value?: number | null;
  current_value?: number | null;
  gain_abs?: number | null;
  gain_pct?: number | null;
  average_cost?: AverageCostPayload | null;
  [key: string]: unknown;
}

type PendingPortfolioUpdate = {
  positions: PendingPortfolioPosition[];
  error?: unknown;
};

type PendingRetryMeta = {
  attempts: number;
  timer: ReturnType<typeof setTimeout> | null;
};

interface PortfolioPositionsCache extends Map<string, DashboardPortfolioPosition[]> {
  getSecurityPositions?: (
    securityUuid: string | null | undefined,
  ) => DashboardPortfolioPosition[];
}

declare global {
  interface Window {
    __ppReaderDashboardElements?: Set<HTMLElement>;
    __ppReaderPanelHosts?: Set<HTMLElement>;
    __ppReaderPortfolioPositionsCache?: PortfolioPositionsCache;
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

  interface WindowEventMap {
    'pp-reader:portfolio-positions-updated': CustomEvent<PortfolioPositionsUpdatedEventDetail>;
  }

  interface GlobalEventHandlersEventMap {
    'pp-reader:portfolio-positions-updated': CustomEvent<PortfolioPositionsUpdatedEventDetail>;
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
