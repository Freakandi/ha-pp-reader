/**
 * Shared in-memory portfolio positions cache used by dashboard tabs.
 *
 * Centralises storage for normalised portfolio position payloads so that
 * websocket update handlers and tab renderers can exchange data without
 * relying on window globals. All accessors clone cached entries to prevent
 * consumers from mutating the shared state.
 */

import type { NormalizedPositionSnapshot } from '../lib/api/portfolio';
import type {
  AverageCostPayload,
  HoldingsAggregationPayload,
  PerformanceMetricsPayload,
} from '../tabs/types';
import { normalizeCurrencyValue, toFiniteCurrency } from '../utils/currency';
import { normalizePerformancePayload } from '../utils/performance';

type BasePositionSnapshot = Omit<
  NormalizedPositionSnapshot,
  'average_cost' | 'aggregation' | 'performance'
>;

export type PortfolioPositionRecord = BasePositionSnapshot & {
  average_cost?: AverageCostPayload | null;
  aggregation?: HoldingsAggregationPayload | null;
  performance?: PerformanceMetricsPayload | null;
  gain_abs?: number | null;
  gain_pct?: number | null;
  fx_unavailable?: boolean | null;
  [key: string]: unknown;
};

const portfolioPositionsCache = new Map<string, PortfolioPositionRecord[]>();

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null) {
    return null;
  }
  const numeric = toFiniteCurrency(value);
  return Number.isFinite(numeric ?? NaN) ? (numeric as number) : null;
}

function isPortfolioPositionRecord(value: unknown): value is PortfolioPositionRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.security_uuid === 'string' &&
    typeof record.name === 'string' &&
    typeof record.current_holdings === 'number' &&
    typeof record.purchase_value === 'number' &&
    typeof record.current_value === 'number'
  );
}

function clonePosition(position: PortfolioPositionRecord): PortfolioPositionRecord {
  const clone: PortfolioPositionRecord = { ...position };
  if (position.average_cost && typeof position.average_cost === 'object') {
    clone.average_cost = { ...position.average_cost };
  }
  if (position.performance && typeof position.performance === 'object') {
    clone.performance = { ...position.performance };
  }
  if (position.aggregation && typeof position.aggregation === 'object') {
    clone.aggregation = { ...position.aggregation };
  }
  if (position.data_state && typeof position.data_state === 'object') {
    clone.data_state = { ...position.data_state };
  }
  return clone;
}

function mergeObjectWithPreservedKeys(
  base: Record<string, unknown> | undefined,
  patch: Record<string, unknown> | null,
  preserveKeys: readonly string[] = [],
): Record<string, unknown> | null {
  if (!patch || typeof patch !== 'object') {
    return patch;
  }

  const merged = {
    ...(base && typeof base === 'object' ? base : {}),
    ...patch,
  };

  preserveKeys.forEach(key => {
    const value = base?.[key];
    if (value !== undefined && value !== null) {
      (merged as Record<string, unknown>)[key] = value;
    }
  });

  return merged;
}

function mergePositionRecords(
  base: PortfolioPositionRecord | undefined,
  patch: PortfolioPositionRecord,
): PortfolioPositionRecord {
  const merged = base ? clonePosition(base) : ({} as PortfolioPositionRecord);

  const shallowKeys: (keyof PortfolioPositionRecord)[] = [
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
    'fx_unavailable',
  ];

  const assignIfDefined = (
    target: PortfolioPositionRecord,
    source: PortfolioPositionRecord,
    key: keyof PortfolioPositionRecord,
  ): void => {
    const value = source[key];
    if (value !== undefined) {
      target[key] = value;
    }
  };

  shallowKeys.forEach(key => {
    assignIfDefined(merged, patch, key);
  });

  const mergeObjectField = (field: keyof PortfolioPositionRecord) => {
    const value = patch[field];
    if (value && typeof value === 'object') {
      const baseObj =
        base && base[field] && typeof base[field] === 'object'
          ? (base[field] as Record<string, unknown>)
          : {};
      merged[field] = {
        ...baseObj,
        ...(value as Record<string, unknown>),
      } as PortfolioPositionRecord[typeof field];
    } else if (value !== undefined) {
      merged[field] = value;
    }
  };

  const performancePatch = patch.performance as Record<string, unknown> | null | undefined;
  const basePerformance =
    base && base.performance && typeof base.performance === 'object'
      ? (base.performance as Record<string, unknown>)
      : undefined;

  if (performancePatch !== undefined) {
    merged.performance = mergeObjectWithPreservedKeys(basePerformance, performancePatch, [
      'gain_pct',
      'total_change_pct',
    ]) as PortfolioPositionRecord['performance'];
  }

  mergeObjectField('aggregation');
  mergeObjectField('average_cost');
  mergeObjectField('data_state');

  return merged;
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

  if (positions.length === 0) {
    portfolioPositionsCache.set(portfolioUuid, []);
    return;
  }

  const existing = portfolioPositionsCache.get(portfolioUuid) ?? [];
  const existingBySecurity = new Map(
    existing
      .filter(entry => entry.security_uuid)
      .map(entry => [entry.security_uuid as string, entry]),
  );

  const merged = positions
    .filter((candidate): candidate is PortfolioPositionRecord => Boolean(candidate))
    .map(patch => {
      const key = patch.security_uuid ?? '';
      const base = key ? existingBySecurity.get(key) : undefined;
      return mergePositionRecords(base, patch);
    })
    .map(clonePosition);

  portfolioPositionsCache.set(portfolioUuid, merged);
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

export function normalizeAverageCostPayload(value: unknown): AverageCostPayload | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  const native = toNullableNumber(record.native);
  const security = toNullableNumber(record.security);
  const account = toNullableNumber(record.account);
  const eur = toNullableNumber(record.eur);
  const coverageRatio = toNullableNumber(record.coverage_ratio);

  if (
    native == null &&
    security == null &&
    account == null &&
    eur == null &&
    coverageRatio == null
  ) {
    return null;
  }

  const source = toNonEmptyString(record.source);
  const normalizedSource: AverageCostPayload['source'] =
    source === 'totals' || source === 'eur_total' ? source : 'aggregation';

  return {
    native,
    security,
    account,
    eur,
    source: normalizedSource,
    coverage_ratio: coverageRatio,
  };
}

export function normalizeAggregationPayload(
  value: unknown,
): HoldingsAggregationPayload | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;

  const totalHoldings = toNullableNumber(record.total_holdings);
  const positiveHoldings = toNullableNumber(record.positive_holdings);
  const purchaseValueEur = toNullableNumber(record.purchase_value_eur);
  const securityTotal =
    toNullableNumber(record.purchase_total_security) ??
    toNullableNumber(record.security_currency_total);
  const accountTotal =
    toNullableNumber(record.purchase_total_account) ??
    toNullableNumber(record.account_currency_total);

  let purchaseValueCents = 0;
  if (typeof record.purchase_value_cents === 'number') {
    purchaseValueCents = Number.isFinite(record.purchase_value_cents)
      ? Math.trunc(record.purchase_value_cents)
      : 0;
  } else if (typeof record.purchase_value_cents === 'string') {
    const parsed = Number.parseInt(record.purchase_value_cents, 10);
    if (Number.isFinite(parsed)) {
      purchaseValueCents = parsed;
    }
  }

  const hasValues =
    totalHoldings != null ||
    positiveHoldings != null ||
    purchaseValueEur != null ||
    securityTotal != null ||
    accountTotal != null ||
    purchaseValueCents !== 0;

  if (!hasValues) {
    return null;
  }

  return {
    total_holdings: totalHoldings ?? 0,
    positive_holdings: positiveHoldings ?? 0,
    purchase_value_cents: purchaseValueCents,
    purchase_value_eur: purchaseValueEur ?? 0,
    security_currency_total: securityTotal ?? 0,
    account_currency_total: accountTotal ?? 0,
    purchase_total_security: securityTotal ?? 0,
    purchase_total_account: accountTotal ?? 0,
  };
}

export function normalizePositionRecord(value: unknown): PortfolioPositionRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = isPortfolioPositionRecord(value)
    ? (clonePosition(value) as Record<string, unknown>)
    : (value as Record<string, unknown>);
  const securityUuid = toNonEmptyString(record.security_uuid);
  const name = toNonEmptyString(record.name);
  const currentHoldings = toFiniteCurrency(record.current_holdings);
  const currentValue = normalizeCurrencyValue(record.current_value);
  const aggregation = normalizeAggregationPayload(record.aggregation);
  const aggregationRaw =
    record.aggregation && typeof record.aggregation === 'object'
      ? (record.aggregation as Record<string, unknown>)
      : null;
  const purchaseValue =
    toNullableNumber((record as { purchase_value_eur?: unknown }).purchase_value_eur) ??
    toNullableNumber(aggregationRaw?.purchase_value_eur) ??
    toNullableNumber(aggregationRaw?.purchase_total_account) ??
    toNullableNumber(aggregationRaw?.account_currency_total) ??
    normalizeCurrencyValue(record.purchase_value);

  if (
    !securityUuid ||
    !name ||
    currentHoldings == null ||
    purchaseValue == null ||
    currentValue == null
  ) {
    return null;
  }

  const normalized: PortfolioPositionRecord = {
    security_uuid: securityUuid,
    name,
    portfolio_uuid:
      toNonEmptyString(record.portfolio_uuid) ?? toNonEmptyString(record.portfolioUuid) ?? undefined,
    currency_code: toNonEmptyString(record.currency_code),
    current_holdings: currentHoldings,
    purchase_value: purchaseValue,
    current_value: currentValue,
  };

  const averageCost = normalizeAverageCostPayload(record.average_cost);
  if (averageCost) {
    normalized.average_cost = averageCost;
  }
  if (aggregation) {
    normalized.aggregation = aggregation;
  }
  const performance = normalizePerformancePayload(record.performance);
  if (performance) {
    normalized.performance = performance;
    normalized.gain_abs =
      typeof performance.gain_abs === 'number' ? performance.gain_abs : null;
    normalized.gain_pct =
      typeof performance.gain_pct === 'number' ? performance.gain_pct : null;
  } else {
    const gainAbs = toNullableNumber(record.gain_abs);
    const gainPct = toNullableNumber(record.gain_pct);
    if (gainAbs !== null) {
      normalized.gain_abs = gainAbs;
    }
    if (gainPct !== null) {
      normalized.gain_pct = gainPct;
    }
  }

  if ('coverage_ratio' in record) {
    normalized.coverage_ratio = toNullableNumber(record.coverage_ratio);
  }
  const provenance = toNonEmptyString(record.provenance);
  if (provenance) {
    normalized.provenance = provenance;
  }
  const metricRunUuid = toNonEmptyString(record.metric_run_uuid);
  if (metricRunUuid || record.metric_run_uuid === null) {
    normalized.metric_run_uuid = metricRunUuid ?? null;
  }

  const lastPriceNative = toNullableNumber(record.last_price_native);
  if (lastPriceNative !== null) {
    normalized.last_price_native = lastPriceNative;
  }
  const lastPriceEur = toNullableNumber(record.last_price_eur);
  if (lastPriceEur !== null) {
    normalized.last_price_eur = lastPriceEur;
  }
  const lastCloseNative = toNullableNumber(record.last_close_native);
  if (lastCloseNative !== null) {
    normalized.last_close_native = lastCloseNative;
  }
  const lastCloseEur = toNullableNumber(record.last_close_eur);
  if (lastCloseEur !== null) {
    normalized.last_close_eur = lastCloseEur;
  }

  const dataState =
    record.data_state && typeof record.data_state === 'object'
      ? { ...(record.data_state as Record<string, unknown>) }
      : undefined;
  if (dataState) {
    normalized.data_state = dataState;
  }

  return normalized;
}

export function normalizePositionRecords(positions: unknown): PortfolioPositionRecord[] {
  if (!Array.isArray(positions)) {
    return [];
  }
  const normalized: PortfolioPositionRecord[] = [];
  for (const entry of positions) {
    const record = normalizePositionRecord(entry);
    if (record) {
      normalized.push(record);
    }
  }
  return normalized;
}
