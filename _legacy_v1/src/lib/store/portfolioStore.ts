/**
 * Lightweight in-memory store for normalized dashboard snapshots.
 *
 * Keeps canonical AccountSnapshot / PortfolioSnapshot structures available to
 * both websocket handlers and view controllers without relying on window
 * globals. State mutations always clone nested objects to avoid accidental
 * consumer side-effects.
 */

import type {
  NormalizedAccountSnapshot,
  NormalizedPortfolioSnapshot,
  NormalizedPositionSnapshot,
} from "../api/portfolio";

type PortfolioSnapshotInput =
  | NormalizedPortfolioSnapshot
  | (Partial<NormalizedPortfolioSnapshot> & { uuid?: string | null });

type PortfolioSnapshotWithId = NormalizedPortfolioSnapshot & { uuid: string };

interface PortfolioStoreState {
  accounts: NormalizedAccountSnapshot[];
  portfolios: NormalizedPortfolioSnapshot[];
}

let accountsState: NormalizedAccountSnapshot[] = [];
const portfolioState = new Map<string, PortfolioSnapshotWithId>();

function toStringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function toNullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }
  return toStringValue(value);
}

function toFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toNullableNumber(value: unknown): number | null | undefined {
  if (value === null) {
    return null;
  }
  return toFiniteNumber(value);
}

function toFiniteInteger(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.trunc(value);
}

function cloneRecord<T extends Record<string, unknown>>(value: T | null | undefined): T | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  return { ...value };
}

function clonePositionSnapshot(snapshot: NormalizedPositionSnapshot): NormalizedPositionSnapshot {
  const clone: NormalizedPositionSnapshot = { ...snapshot };
  clone.average_cost = cloneRecord(snapshot.average_cost);
  clone.performance = cloneRecord(snapshot.performance);
  clone.aggregation = cloneRecord(snapshot.aggregation);
  clone.data_state = cloneRecord(snapshot.data_state);
  return clone;
}

function clonePortfolioSnapshot(snapshot: PortfolioSnapshotWithId): PortfolioSnapshotWithId {
  const clone: PortfolioSnapshotWithId = { ...snapshot };
  clone.performance = cloneRecord(snapshot.performance);
  clone.data_state = cloneRecord(snapshot.data_state);
  if (Array.isArray(snapshot.positions)) {
    clone.positions = snapshot.positions.map(clonePositionSnapshot);
  }
  return clone;
}

function normalizePortfolioSnapshot(
  candidate: PortfolioSnapshotInput | null | undefined,
): PortfolioSnapshotWithId | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const uuid = toStringValue(candidate.uuid);
  if (!uuid) {
    return null;
  }

  const normalized: PortfolioSnapshotWithId = { uuid };

  const name = toStringValue(candidate.name);
  if (name) {
    normalized.name = name;
  }

  const currentValue = toNullableNumber(candidate.current_value);
  if (currentValue !== undefined) {
    normalized.current_value = currentValue;
  }

  const purchaseValue =
    toNullableNumber(candidate.purchase_sum) ??
    toNullableNumber((candidate as { purchase_value_eur?: unknown }).purchase_value_eur) ??
    toNullableNumber(candidate.purchase_value);
  if (purchaseValue !== undefined) {
    normalized.purchase_value = purchaseValue;
    normalized.purchase_sum = purchaseValue;
  }

  const dayChangeAbs = toNullableNumber((candidate as { day_change_abs?: unknown }).day_change_abs);
  if (dayChangeAbs !== undefined) {
    normalized.day_change_abs = dayChangeAbs;
  }
  const dayChangePct = toNullableNumber((candidate as { day_change_pct?: unknown }).day_change_pct);
  if (dayChangePct !== undefined) {
    normalized.day_change_pct = dayChangePct;
  }

  const positionCount = toFiniteInteger(candidate.position_count);
  if (positionCount !== undefined) {
    normalized.position_count = positionCount;
  }
  const missingPositions = toFiniteInteger(candidate.missing_value_positions);
  if (missingPositions !== undefined) {
    normalized.missing_value_positions = missingPositions;
  }
  if (typeof candidate.has_current_value === "boolean") {
    normalized.has_current_value = candidate.has_current_value;
  }

  const coverageRatio = toNullableNumber(candidate.coverage_ratio);
  if (coverageRatio !== undefined) {
    normalized.coverage_ratio = coverageRatio;
  }
  const provenance = toStringValue(candidate.provenance);
  if (provenance) {
    normalized.provenance = provenance;
  }
  if ("metric_run_uuid" in candidate) {
    normalized.metric_run_uuid = toNullableString(candidate.metric_run_uuid);
  }

  const performance = cloneRecord(candidate.performance);
  if (performance) {
    normalized.performance = performance;
  }
  const dataState = cloneRecord(candidate.data_state);
  if (dataState) {
    normalized.data_state = dataState;
  }
  if (Array.isArray(candidate.positions)) {
    const filtered = candidate.positions.filter(
      (entry): entry is NormalizedPositionSnapshot => Boolean(entry),
    );
    if (filtered.length) {
      normalized.positions = filtered.map(clonePositionSnapshot);
    }
  }

  return normalized;
}

function mergeSnapshots(
  current: PortfolioSnapshotWithId,
  patch: PortfolioSnapshotWithId,
): PortfolioSnapshotWithId {
  const merged: PortfolioSnapshotWithId = {
    ...current,
    ...patch,
  };

  if (!patch.performance && current.performance) {
    merged.performance = cloneRecord(current.performance);
  }
  if (!patch.data_state && current.data_state) {
    merged.data_state = cloneRecord(current.data_state);
  }
  if (!patch.positions && current.positions) {
    merged.positions = current.positions.map(clonePositionSnapshot);
  }
  return merged;
}

export function setAccountSnapshots(
  accounts: readonly NormalizedAccountSnapshot[] | null | undefined,
): void {
  const entries = accounts ?? [];
  accountsState = entries.map((account) => ({ ...account }));
}

export function getAccountSnapshots(): NormalizedAccountSnapshot[] {
  return accountsState.map((account) => ({ ...account }));
}

export function replacePortfolioSnapshots(
  portfolios: readonly PortfolioSnapshotInput[] | null | undefined,
): void {
  portfolioState.clear();
  const entries = portfolios ?? [];

  for (const snapshot of entries) {
    const normalized = normalizePortfolioSnapshot(snapshot);
    if (!normalized) {
      continue;
    }
    portfolioState.set(normalized.uuid, clonePortfolioSnapshot(normalized));
  }
}

export function mergePortfolioSnapshots(
  patches: readonly PortfolioSnapshotInput[] | null | undefined,
): void {
  const entries = patches ?? [];

  for (const patch of entries) {
    const normalized = normalizePortfolioSnapshot(patch);
    if (!normalized) {
      continue;
    }
    const existing = portfolioState.get(normalized.uuid);
    const snapshot = existing
      ? mergeSnapshots(existing, normalized)
      : clonePortfolioSnapshot(normalized);
    portfolioState.set(snapshot.uuid, snapshot);
  }
}

export function setPortfolioPositionsSnapshot(
  portfolioUuid: string | null | undefined,
  positions: readonly NormalizedPositionSnapshot[] | null | undefined,
): void {
  if (!portfolioUuid) {
    return;
  }
  const entry = portfolioState.get(portfolioUuid);
  if (!entry) {
    return;
  }
  if (!Array.isArray(positions) || positions.length === 0) {
    const next: PortfolioSnapshotWithId = { ...entry };
    delete next.positions;
    portfolioState.set(portfolioUuid, next);
    return;
  }

  const mergePosition = (
    base: NormalizedPositionSnapshot | undefined,
    patch: NormalizedPositionSnapshot,
  ): NormalizedPositionSnapshot => {
    const merged: NormalizedPositionSnapshot = base
      ? clonePositionSnapshot(base)
      : ({} as NormalizedPositionSnapshot);
    const mergedTarget = merged as Record<string, unknown>;

    const shallowKeys: (keyof NormalizedPositionSnapshot)[] = [
      'portfolio_uuid',
      'security_uuid',
      'name',
      'ticker_symbol',
      'currency_code',
      'current_holdings',
      'purchase_value',
      'current_value',
      'coverage_ratio',
      'provenance',
      'metric_run_uuid',
    ];

    shallowKeys.forEach((key) => {
      const value = patch[key];
      if (value !== undefined && value !== null) {
        mergedTarget[key] = value;
      }
    });

    const mergeObjectField = (
      field: keyof NormalizedPositionSnapshot,
      preserveKeys: readonly string[] = [],
    ) => {
      const value = patch[field] as Record<string, unknown> | null | undefined;
      const baseValue =
        base && base[field] && typeof base[field] === 'object'
          ? (base[field] as Record<string, unknown>)
          : undefined;

      if (!value || typeof value !== 'object') {
        if (value !== undefined) {
          mergedTarget[field] = value;
        }
        return;
      }

      const mergedValue: Record<string, unknown> = {
        ...(baseValue ?? {}),
        ...value,
      };

      preserveKeys.forEach((key) => {
        const preserved = baseValue?.[key];
        if (preserved !== undefined && preserved !== null) {
          mergedValue[key] = preserved;
        }
      });

      mergedTarget[field] = mergedValue;
    };

    mergeObjectField('performance', ['gain_pct', 'total_change_pct']);
    mergeObjectField('aggregation');
    mergeObjectField('average_cost');
    mergeObjectField('data_state');

    return merged;
  };

  const existingPositions = Array.isArray(entry.positions) ? entry.positions : [];
  const existingBySecurity = new Map(
    existingPositions
      .filter((pos) => pos.security_uuid)
      .map((pos) => [pos.security_uuid as string, pos]),
  );

  const mergedPositions = positions
    .filter((candidate): candidate is NormalizedPositionSnapshot => Boolean(candidate))
    .map((patch) => {
      const base = patch.security_uuid ? existingBySecurity.get(patch.security_uuid) : undefined;
      return mergePosition(base, patch);
    })
    .map(clonePositionSnapshot);

  const next: PortfolioSnapshotWithId = {
    ...entry,
    positions: mergedPositions,
  };
  portfolioState.set(portfolioUuid, next);
}

export function getPortfolioSnapshots(): NormalizedPortfolioSnapshot[] {
  return Array.from(portfolioState.values(), (snapshot) => clonePortfolioSnapshot(snapshot));
}

export function getPortfolioSnapshot(
  portfolioUuid: string | null | undefined,
): NormalizedPortfolioSnapshot | null {
  if (!portfolioUuid) {
    return null;
  }
  const snapshot = portfolioState.get(portfolioUuid);
  return snapshot ? clonePortfolioSnapshot(snapshot) : null;
}

export function getPortfolioStoreState(): PortfolioStoreState {
  return {
    accounts: getAccountSnapshots(),
    portfolios: getPortfolioSnapshots(),
  };
}

export const __TEST_ONLY__ = {
  reset(): void {
    accountsState = [];
    portfolioState.clear();
  },
};
