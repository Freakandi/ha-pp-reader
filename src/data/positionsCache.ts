/**
 * Shared in-memory portfolio positions cache used by dashboard tabs.
 *
 * Centralises storage for normalised portfolio position payloads so that
 * websocket update handlers and tab renderers can exchange data without
 * relying on window globals. All accessors clone cached entries to prevent
 * consumers from mutating the shared state.
 */

import type { PortfolioPosition } from '../tabs/types';

export type PortfolioPositionRecord = PortfolioPosition & { [key: string]: unknown };

const portfolioPositionsCache = new Map<string, PortfolioPositionRecord[]>();

function clonePosition(position: PortfolioPositionRecord): PortfolioPositionRecord {
  return { ...position };
}

export function setPortfolioPositions(
  portfolioUuid: string | null | undefined,
  positions: readonly PortfolioPositionRecord[] | null | undefined,
): void {
  if (!portfolioUuid) {
    return;
  }

  if (!Array.isArray(positions)) {
    portfolioPositionsCache.delete(portfolioUuid);
    return;
  }

  const normalised = positions
    .filter((candidate): candidate is PortfolioPositionRecord => Boolean(candidate))
    .map(clonePosition);
  portfolioPositionsCache.set(portfolioUuid, normalised);
}

export function hasPortfolioPositions(portfolioUuid: string | null | undefined): boolean {
  if (!portfolioUuid) {
    return false;
  }
  return portfolioPositionsCache.has(portfolioUuid);
}

export function getPortfolioPositions(
  portfolioUuid: string | null | undefined,
): PortfolioPositionRecord[] {
  if (!portfolioUuid) {
    return [];
  }
  const entries = portfolioPositionsCache.get(portfolioUuid);
  if (!entries) {
    return [];
  }
  return entries.map(clonePosition);
}

export function clearPortfolioPositions(portfolioUuid: string | null | undefined): void {
  if (!portfolioUuid) {
    return;
  }
  portfolioPositionsCache.delete(portfolioUuid);
}

export function clearAllPortfolioPositions(): void {
  portfolioPositionsCache.clear();
}

export function getPortfolioPositionsSnapshot(): ReadonlyMap<string, PortfolioPositionRecord[]> {
  return new Map(
    Array.from(portfolioPositionsCache.entries(), ([portfolioUuid, positions]) => [
      portfolioUuid,
      positions.map(clonePosition),
    ]),
  );
}
