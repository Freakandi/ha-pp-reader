/**
 * Global PP Reader dashboard declarations for window and DOM extensions.
 * Provides typed access to legacy globals during the TypeScript migration.
 */
import type { PortfolioPositionsUpdatedEventDetail } from '../tabs/types';

declare global {
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
