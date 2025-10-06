/**
 * Security detail tab renderer migrated verbatim for TypeScript.
 */

/**
 * Security detail tab renderer and registration.
 *
 * Provides the render function used by dynamic security tabs and
 * exposes a helper to register the descriptor factory with the
 * dashboard controller.
 */
import {
  createHeaderCard,
  formatNumber,
  formatGain,
  formatGainPct,
} from '../content/elements';
import { renderLineChart, updateLineChart } from '../content/charting';
import type { LineChartOptions } from '../content/charting';
import {
  fetchSecuritySnapshotWS,
  fetchSecurityHistoryWS,
} from '../data/api';
import type {
  SecuritySnapshotResponse,
  SecurityHistoryResponse,
  SecurityHistoryOptions,
} from '../data/api';
import type { HomeAssistant } from '../types/home-assistant';
import type {
  DashboardTabRenderFn,
  PanelConfigLike,
  PortfolioPositionsUpdatedEventDetail,
  SecurityHistoryRangeKey,
  SecurityHistoryRangeState,
  SecuritySnapshotLike,
} from './types';

const HOLDINGS_FRACTION_DIGITS = { min: 0, max: 6 } as const;
const PRICE_FRACTION_DIGITS = { min: 2, max: 4 } as const;
const PRICE_SCALE = 1e8;
const HISTORY_SYNC_TOLERANCE_MS = 6 * 60 * 60 * 1000; // 6 hours leeway between history close and price fetch
const MAX_PRICE_STALENESS_MS = 36 * 60 * 60 * 1000; // 36 hours tolerance before treating last price as stale
const DEFAULT_HISTORY_RANGE: SecurityHistoryRangeKey = '1Y';
const AVAILABLE_HISTORY_RANGES: readonly SecurityHistoryRangeKey[] = [
  '1M',
  '6M',
  '1Y',
  '5Y',
  'ALL',
];
const RANGE_DAY_COUNTS: Record<SecurityHistoryRangeKey, number> = {
  '1M': 30,
  '6M': 182,
  '1Y': 365,
  '5Y': 1826,
  'ALL': Number.POSITIVE_INFINITY,
};

type SecuritySnapshotDetail = Partial<Omit<SecuritySnapshotLike, 'security_uuid'>> & {
  security_uuid?: string | null;
  name?: string | null;
  total_holdings?: number | string | null;
  total_holdings_precise?: number | string | null;
  last_price_native?: number | string | null;
  last_price_eur?: number | string | null;
  market_value_eur?: number | string | null;
  current_value_eur?: number | string | null;
  currency_code?: string | null;
  average_purchase_price_native?: number | string | null;
  last_close_native?: number | string | null;
  last_close_eur?: number | string | null;
  last_price?: {
    native?: number | string | null;
    [key: string]: unknown;
  } | null;
  source?: string | null;
  [key: string]: unknown;
};

interface RawHistoryEntry {
  date?: unknown;
  close?: unknown;
  [key: string]: unknown;
}

interface NormalizedHistoryEntry {
  date: Date | string | number;
  close: number;
}

type HistoryPlaceholderState =
  | { status: 'loaded' }
  | { status: 'empty' }
  | { status: 'error'; message?: string };

type SecurityHistoryCache = Map<SecurityHistoryRangeKey, NormalizedHistoryEntry[]>;

type HistoryCacheRegistry = Map<string, SecurityHistoryCache>;

type RangeStateRegistry = Map<string, SecurityHistoryRangeState>;

type SnapshotDetailRegistry = Map<string, SecuritySnapshotDetail>;

interface SecuritySnapshotMetrics {
  holdings: number | null;
  fxRate: number | null;
  purchaseValueEur: number | null;
  currentValueEur: number | null;
  averagePurchaseNative: number | null;
  averagePurchaseEur: number | null;
  dayPriceChangeNative: number | null;
  dayPriceChangeEur: number | null;
  dayChangePct: number | null;
  totalChangeEur: number | null;
  totalChangePct: number | null;
  lastPriceFetchedAt: number | null;
}

type SnapshotMetricsRegistry = Map<string, SecuritySnapshotMetrics>;

type LiveUpdateHandler = (event: Event) => void;

const SECURITY_HISTORY_CACHE: HistoryCacheRegistry = new Map();
const RANGE_STATE_REGISTRY: RangeStateRegistry = new Map();
const SNAPSHOT_DETAIL_REGISTRY: SnapshotDetailRegistry = new Map();
const SNAPSHOT_METRICS_REGISTRY: SnapshotMetricsRegistry = new Map();
const LIVE_UPDATE_EVENT = 'pp-reader:portfolio-positions-updated';
const LIVE_UPDATE_HANDLERS = new Map<string, LiveUpdateHandler>();

function buildCachedSnapshotNotice(params: {
  fallbackUsed: boolean;
  flaggedAsCache: boolean;
}): string {
  const { fallbackUsed, flaggedAsCache } = params;
  const reasons: string[] = [];
  if (fallbackUsed) {
    reasons.push(
      'Der aktuelle Snapshot konnte nicht geladen werden. Es werden die zuletzt gespeicherten Werte angezeigt.',
    );
  }
  if (flaggedAsCache && !fallbackUsed) {
    reasons.push(
      'Der Snapshot ist vom Datenanbieter als Zwischenspeicherstand markiert.',
    );
  }

  const reasonText = reasons.length
    ? reasons.join(' ')
    : 'Die Daten stammen aus dem Zwischenspeicher.';

  return `
    <div class="card warning-card stale-notice" role="status" aria-live="polite">
      <h2>Zwischengespeicherte Werte</h2>
      <p>${reasonText}</p>
      <p class="stale-notice__hint">Die angezeigten Beträge können von den aktuellen Marktwerten abweichen. Laden Sie die Ansicht erneut, sobald eine Verbindung verfügbar ist.</p>
    </div>
  `;
}

function cacheSecuritySnapshotDetail(
  securityUuid: string | null | undefined,
  snapshot: SecuritySnapshotDetail | null,
): void {
  if (!securityUuid) {
    return;
  }

  if (snapshot) {
    SNAPSHOT_DETAIL_REGISTRY.set(securityUuid, snapshot);
    return;
  }

  SNAPSHOT_DETAIL_REGISTRY.delete(securityUuid);
}

function getCachedSecuritySnapshot(
  securityUuid: string | null | undefined,
): SecuritySnapshotDetail | null {
  if (!securityUuid || typeof window === 'undefined') {
    return null;
  }

  if (SNAPSHOT_DETAIL_REGISTRY.has(securityUuid)) {
    const cached = SNAPSHOT_DETAIL_REGISTRY.get(securityUuid) || null;
    if (cached) {
      return cached;
    }
  }

  try {
    const getter = window.__ppReaderGetSecuritySnapshotFromCache;
    if (typeof getter === 'function') {
      const snapshot = getter(securityUuid);
      if (snapshot && typeof snapshot === 'object') {
        const detail = snapshot as SecuritySnapshotDetail;
        cacheSecuritySnapshotDetail(securityUuid, detail);
        return detail;
      }
    }
  } catch (error) {
    console.warn('getCachedSecuritySnapshot: Zugriff auf Cache fehlgeschlagen', error);
  }

  return null;
}

function ensureHistoryCache(securityUuid: string): SecurityHistoryCache {
  if (!SECURITY_HISTORY_CACHE.has(securityUuid)) {
    SECURITY_HISTORY_CACHE.set(securityUuid, new Map());
  }
  return SECURITY_HISTORY_CACHE.get(securityUuid) as SecurityHistoryCache;
}

function invalidateHistoryCache(securityUuid: string | null | undefined): void {
  if (!securityUuid) {
    return;
  }

  if (SECURITY_HISTORY_CACHE.has(securityUuid)) {
    try {
      const cache = SECURITY_HISTORY_CACHE.get(securityUuid);
      cache?.clear();
    } catch (error) {
      console.warn('invalidateHistoryCache: Konnte Cache nicht leeren', securityUuid, error);
    }
    SECURITY_HISTORY_CACHE.delete(securityUuid);
  }
}

function handleLiveUpdateForSecurity(
  securityUuid: string,
  detail: PortfolioPositionsUpdatedEventDetail,
): void {
  if (!securityUuid || !detail) {
    return;
  }

  const payload = detail.securityUuids;
  const candidates = Array.isArray(payload) ? payload : [];

  if (candidates.includes(securityUuid)) {
    invalidateHistoryCache(securityUuid);
  }
}

function ensureLiveUpdateSubscription(securityUuid: string): void {
  if (!securityUuid || LIVE_UPDATE_HANDLERS.has(securityUuid)) {
    return;
  }

  const handler: LiveUpdateHandler = (event) => {
    if (!(event instanceof CustomEvent)) {
      return;
    }
    const detail = event.detail as PortfolioPositionsUpdatedEventDetail | undefined;
    if (!detail) {
      return;
    }
    handleLiveUpdateForSecurity(securityUuid, detail);
  };

  try {
    window.addEventListener(LIVE_UPDATE_EVENT, handler as EventListener);
    LIVE_UPDATE_HANDLERS.set(securityUuid, handler);
  } catch (error) {
    console.error('ensureLiveUpdateSubscription: Registrierung fehlgeschlagen', error);
  }
}

function removeLiveUpdateSubscription(securityUuid: string): void {
  if (!securityUuid || !LIVE_UPDATE_HANDLERS.has(securityUuid)) {
    return;
  }

  const handler = LIVE_UPDATE_HANDLERS.get(securityUuid);
  try {
    if (handler) {
      window.removeEventListener(LIVE_UPDATE_EVENT, handler as EventListener);
    }
  } catch (error) {
    console.error('removeLiveUpdateSubscription: Entfernen des Listeners fehlgeschlagen', error);
  }

  LIVE_UPDATE_HANDLERS.delete(securityUuid);
}

function cleanupSecurityDetailState(securityUuid: string): void {
  if (!securityUuid) {
    return;
  }

  removeLiveUpdateSubscription(securityUuid);
  invalidateHistoryCache(securityUuid);
  SNAPSHOT_DETAIL_REGISTRY.delete(securityUuid);
  SNAPSHOT_METRICS_REGISTRY.delete(securityUuid);
  // RANGE_STATE_REGISTRY intentionally left intact so the last chosen
  // range remains active when the user reopens the security detail.
}

function setActiveRange(securityUuid: string, rangeKey: SecurityHistoryRangeKey): void {
  if (!RANGE_STATE_REGISTRY.has(securityUuid)) {
    RANGE_STATE_REGISTRY.set(securityUuid, { activeRange: rangeKey });
    return;
  }
  const state = RANGE_STATE_REGISTRY.get(securityUuid);
  if (state) {
    state.activeRange = rangeKey;
  }
}

function getActiveRange(securityUuid: string): SecurityHistoryRangeKey {
  return (
    RANGE_STATE_REGISTRY.get(securityUuid)?.activeRange ?? DEFAULT_HISTORY_RANGE
  );
}

function toEpochDay(date: Date): number {
  const epochMs = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  return Math.floor(epochMs / 86400000);
}

function normaliseDate(date: Date): Date {
  const clone = new Date(date.getTime());
  clone.setUTCHours(0, 0, 0, 0);
  return clone;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function resolveRangeOptions(rangeKey: SecurityHistoryRangeKey): SecurityHistoryOptions {
  const now = normaliseDate(new Date());
  const rangeDays = RANGE_DAY_COUNTS[rangeKey];
  const options: SecurityHistoryOptions = { end_date: toEpochDay(now) };

  if (Number.isFinite(rangeDays) && rangeDays > 0) {
    const start = new Date(now.getTime());
    start.setUTCDate(start.getUTCDate() - (rangeDays - 1));
    options.start_date = toEpochDay(start);
  }

  return options;
}

function parseHistoryDate(raw: unknown): Date | null {
  if (!raw) {
    return null;
  }

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return new Date(raw.getTime());
  }

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const timestamp = raw * 86400000;
    if (Number.isFinite(timestamp)) {
      return new Date(timestamp);
    }
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (/^\d{8}$/.test(trimmed)) {
      const year = Number.parseInt(trimmed.slice(0, 4), 10);
      const month = Number.parseInt(trimmed.slice(4, 6), 10) - 1;
      const day = Number.parseInt(trimmed.slice(6, 8), 10);
      if (
        Number.isFinite(year) &&
        Number.isFinite(month) &&
        Number.isFinite(day)
      ) {
        const date = new Date(Date.UTC(year, month, day));
        if (!Number.isNaN(date.getTime())) {
          return date;
        }
      }
    }

    const parsed = Date.parse(trimmed);
    if (Number.isFinite(parsed)) {
      return new Date(parsed);
    }
  }

  return null;
}

function parseTimestamp(value: unknown): number | null {
  if (!value && value !== 0) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getTime();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > 1e12) {
      return value;
    }

    if (value > 1e9) {
      return value * 1000;
    }
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Date.parse(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function normaliseHistorySeries(prices: unknown): NormalizedHistoryEntry[] {
  if (!Array.isArray(prices)) {
    return [];
  }

  return (prices as RawHistoryEntry[])
    .map((entry) => {
      const numericClose = toFiniteNumber(entry?.close);
      if (numericClose == null) {
        return null;
      }

      const dateValue = parseHistoryDate(entry?.date);

      return {
        date: dateValue ?? (entry?.date as Date | string | number),
        close: numericClose / PRICE_SCALE,
      };
    })
    .filter((entry): entry is NormalizedHistoryEntry => Boolean(entry));
}

function deriveFxRate(
  snapshot: SecuritySnapshotDetail | null,
  latestNativePrice: unknown,
): number | null {
  const currency = String(snapshot?.currency_code || '').toUpperCase();
  if (!currency || currency === 'EUR') {
    return 1;
  }

  const lastPriceEur = toFiniteNumber(snapshot?.last_price_eur);

  if (lastPriceEur == null || lastPriceEur <= 0) {
    return null;
  }

  const snapshotNative = toFiniteNumber(snapshot?.last_price_native);

  if (snapshotNative != null && snapshotNative > 0) {
    return lastPriceEur / snapshotNative;
  }

  const historyNative = toFiniteNumber(latestNativePrice);
  if (historyNative != null && historyNative > 0) {
    return lastPriceEur / historyNative;
  }

  return null;
}

function roundCurrency(value: unknown): number | null {
  const numeric = toFiniteNumber(value);
  if (numeric == null) {
    return null;
  }

  const rounded = Math.round(numeric * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveFinite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function roundPercentage(value: number | null): number | null {
  if (value == null || Number.isNaN(value)) {
    return null;
  }

  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function computeDelta(
  current: number | null | undefined,
  reference: number | null | undefined,
): number | null {
  if (!isFiniteNumber(current) || !isFiniteNumber(reference)) {
    return null;
  }

  return current - reference;
}

function convertNativeDiffToEur(
  diffNative: number | null,
  fxRate: number | null,
): number | null {
  if (!isFiniteNumber(diffNative) || !isPositiveFinite(fxRate)) {
    return null;
  }

  return diffNative * fxRate;
}

function computeHoldingsAdjustedEurChange(
  holdings: number | null,
  diffNative: number | null,
  diffEur: number | null,
  fxRate: number | null,
): number | null {
  if (!isFiniteNumber(holdings)) {
    return null;
  }

  const nativeInEur = convertNativeDiffToEur(diffNative, fxRate);
  if (nativeInEur != null) {
    return roundCurrency(nativeInEur * holdings);
  }

  if (isFiniteNumber(diffEur)) {
    return roundCurrency(diffEur * holdings);
  }

  return null;
}

function computeAveragePurchaseEur(
  purchaseValueEur: number | null,
  holdings: number | null,
): number | null {
  if (!isPositiveFinite(holdings) || !isFiniteNumber(purchaseValueEur)) {
    return null;
  }

  return purchaseValueEur / holdings;
}

function computePercentageChange(
  current: number | null,
  reference: number | null,
): number | null {
  if (!isFiniteNumber(reference) || reference === 0 || !isFiniteNumber(current)) {
    return null;
  }

  return roundPercentage(((current - reference) / reference) * 100);
}

function ensureSnapshotMetrics(
  securityUuid: string | null | undefined,
  snapshot: SecuritySnapshotDetail | null,
): SecuritySnapshotMetrics | null {
  if (!securityUuid) {
    return null;
  }

  if (!snapshot) {
    SNAPSHOT_METRICS_REGISTRY.delete(securityUuid);
    return null;
  }

  const holdingsSource =
    snapshot.total_holdings_precise ?? snapshot.total_holdings ?? null;
  const holdings = toFiniteNumber(holdingsSource);
  const purchaseValueEur = toFiniteNumber(snapshot.purchase_value_eur);
  const currentValueEur =
    toFiniteNumber(snapshot.market_value_eur) ??
    toFiniteNumber(snapshot.current_value_eur);
  const averagePurchaseNative = toFiniteNumber(
    snapshot.average_purchase_price_native,
  );
  const averagePurchaseEur = computeAveragePurchaseEur(purchaseValueEur, holdings);
  const lastPriceNative =
    toFiniteNumber(snapshot.last_price_native) ??
    toFiniteNumber(snapshot.last_price?.native) ??
    null;
  const lastPriceEur = toFiniteNumber(snapshot.last_price_eur);
  const lastCloseNative = toFiniteNumber(snapshot.last_close_native);
  const lastCloseEur = toFiniteNumber(snapshot.last_close_eur);
  const lastPriceFetchedAt =
    parseTimestamp((snapshot as { last_price_fetched_at?: unknown })?.last_price_fetched_at) ??
    parseTimestamp(
      (snapshot.last_price as { fetched_at?: unknown } | null | undefined)?.fetched_at,
    );

  const fxRate = deriveFxRate(snapshot, lastPriceNative);
  const safeFxRate = isPositiveFinite(fxRate) ? fxRate : null;
  const safeHoldings = isFiniteNumber(holdings) ? holdings : null;

  const dayPriceChangeNative = computeDelta(lastPriceNative, lastCloseNative);
  const dayPriceChangeEur = computeDelta(lastPriceEur, lastCloseEur);

  const dayChangePct =
    computePercentageChange(lastPriceNative, lastCloseNative) ??
    computePercentageChange(lastPriceEur, lastCloseEur);

  const totalChangeEurDirect = computeHoldingsAdjustedEurChange(
    safeHoldings,
    computeDelta(lastPriceNative, averagePurchaseNative),
    computeDelta(lastPriceEur, averagePurchaseEur),
    safeFxRate,
  );

  const totalChangeFallbackDiff = computeDelta(currentValueEur, purchaseValueEur);
  const totalChangeEur =
    totalChangeFallbackDiff != null
      ? roundCurrency(totalChangeFallbackDiff)
      : totalChangeEurDirect;

  const totalChangePct =
    computePercentageChange(currentValueEur, purchaseValueEur) ??
    computePercentageChange(lastPriceNative, averagePurchaseNative) ??
    computePercentageChange(lastPriceEur, averagePurchaseEur);

  const metrics: SecuritySnapshotMetrics = {
    holdings: safeHoldings,
    fxRate: safeFxRate,
    purchaseValueEur,
    currentValueEur,
    averagePurchaseNative,
    averagePurchaseEur,
    dayPriceChangeNative,
    dayPriceChangeEur,
    dayChangePct,
    totalChangeEur,
    totalChangePct,
    lastPriceFetchedAt: lastPriceFetchedAt ?? null,
  };

  SNAPSHOT_METRICS_REGISTRY.set(securityUuid, metrics);
  return metrics;
}

function getSnapshotMetrics(
  securityUuid: string | null | undefined,
): SecuritySnapshotMetrics | null {
  if (!securityUuid) {
    return null;
  }

  return SNAPSHOT_METRICS_REGISTRY.get(securityUuid) ?? null;
}

function computePriceChangeMetrics(
  historySeries: readonly NormalizedHistoryEntry[],
  lastPriceNative: number | null,
): { priceChange: number | null; priceChangePct: number | null } {
  if (!Array.isArray(historySeries) || historySeries.length === 0) {
    return { priceChange: null, priceChangePct: null };
  }

  const firstEntry = historySeries[0];
  const baseline = toFiniteNumber(firstEntry?.close);
  if (!isFiniteNumber(baseline) || baseline === 0) {
    return { priceChange: null, priceChangePct: null };
  }

  const lastEntry = historySeries[historySeries.length - 1];
  const fallbackLast = toFiniteNumber(lastEntry?.close);
  const effectiveLast =
    toFiniteNumber(lastPriceNative) ?? fallbackLast;

  if (!isFiniteNumber(effectiveLast)) {
    return { priceChange: null, priceChangePct: null };
  }

  const rawDelta = effectiveLast - baseline;
  const priceChange = Object.is(rawDelta, -0) ? 0 : rawDelta;
  const priceChangePct = computePercentageChange(effectiveLast, baseline);

  return { priceChange, priceChangePct };
}

function computeLatestHistoryDayChange(
  historySeries: readonly NormalizedHistoryEntry[] | null | undefined,
): { diff: number; pct: number | null } | null {
  if (!Array.isArray(historySeries) || historySeries.length < 2) {
    return null;
  }

  let latest: number | null = null;
  let previous: number | null = null;

  for (let index = historySeries.length - 1; index >= 0; index -= 1) {
    const close = toFiniteNumber(historySeries[index]?.close);
    if (!isFiniteNumber(close)) {
      continue;
    }

    if (latest == null) {
      latest = close;
      continue;
    }

    previous = close;
    break;
  }

  if (!isFiniteNumber(latest) || !isFiniteNumber(previous)) {
    return null;
  }

  const rawDiff = latest - previous;
  const diff = Object.is(rawDiff, -0) ? 0 : rawDiff;
  const pct = computePercentageChange(latest, previous);

  return { diff, pct };
}

function extractLatestHistoryTimestamp(
  historySeries: readonly NormalizedHistoryEntry[] | null | undefined,
): number | null {
  if (!Array.isArray(historySeries) || historySeries.length === 0) {
    return null;
  }

  for (let index = historySeries.length - 1; index >= 0; index -= 1) {
    const entry = historySeries[index];
    if (!entry) {
      continue;
    }

    const parsedDate = parseHistoryDate(entry.date);
    if (parsedDate) {
      return parsedDate.getTime();
    }
  }

  return null;
}

function isSnapshotPriceFresh(
  metrics: SecuritySnapshotMetrics | null,
  historySeries: readonly NormalizedHistoryEntry[] | null | undefined,
): boolean {
  if (!metrics) {
    return false;
  }

  const fetchedAt = metrics.lastPriceFetchedAt;
  if (!isFiniteNumber(fetchedAt)) {
    return false;
  }

  const now = Date.now();
  if (now - fetchedAt > MAX_PRICE_STALENESS_MS) {
    return false;
  }

  const latestHistoryTimestamp = extractLatestHistoryTimestamp(historySeries);
  if (
    latestHistoryTimestamp != null &&
    fetchedAt + HISTORY_SYNC_TOLERANCE_MS < latestHistoryTimestamp
  ) {
    return false;
  }

  return true;
}

function shouldReplaceDayChange(value: number | null | undefined): boolean {
  if (!isFiniteNumber(value)) {
    return true;
  }

  return value === 0 || Object.is(value, -0);
}

function applyHistoryDayChangeFallback(
  metrics: SecuritySnapshotMetrics | null,
  historySeries: readonly NormalizedHistoryEntry[] | null | undefined,
): boolean {
  if (!metrics) {
    return false;
  }

  const replaceNative = shouldReplaceDayChange(metrics.dayPriceChangeNative);
  const replaceEur = shouldReplaceDayChange(metrics.dayPriceChangeEur) || replaceNative;
  const replacePct = shouldReplaceDayChange(metrics.dayChangePct);

  if (!replaceNative && !replaceEur && !replacePct) {
    return false;
  }

  if (isSnapshotPriceFresh(metrics, historySeries)) {
    return false;
  }

  const fallback = computeLatestHistoryDayChange(historySeries);
  if (!fallback) {
    return false;
  }

  const { diff, pct } = fallback;

  if (replaceNative) {
    metrics.dayPriceChangeNative = diff;
  }

  if (replaceEur) {
    const converted = convertNativeDiffToEur(diff, metrics.fxRate);
    if (isFiniteNumber(converted)) {
      metrics.dayPriceChangeEur = converted;
    } else if (replaceNative) {
      metrics.dayPriceChangeEur = diff;
    }
  }

  if (replacePct && pct != null) {
    metrics.dayChangePct = pct;
  }

  return true;
}

function formatPriceChangeValue(
  value: number | null,
  currency: string | null | undefined,
): string {
  if (!isFiniteNumber(value)) {
    return '<span class="value neutral">—</span>';
  }

  const formatted = formatPrice(value);
  if (formatted === '—') {
    return '<span class="value neutral">—</span>';
  }

  const trendClass = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
  const suffix = currency ? `&nbsp;${currency}` : '';
  return `<span class="value ${trendClass}">${formatted}${suffix}</span>`;
}

function formatPercentageChangeValue(value: number | null): string {
  if (!isFiniteNumber(value)) {
    return '<span class="value neutral">—</span>';
  }

  const trendClass = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
  return `<span class="value ${trendClass} value--percentage">${formatNumber(value)}&nbsp;%</span>`;
}

function buildInfoBar(
  rangeKey: SecurityHistoryRangeKey | string,
  priceChange: number | null,
  priceChangePct: number | null,
  currency: string | null | undefined,
): string {
  const rangeLabel = rangeKey ? rangeKey : '';
  return `
    <div class="security-info-bar" data-range="${rangeLabel}">
      <div class="security-info-item">
        <span class="label">Preisänderung (${rangeLabel || 'Zeitraum'})</span>
        <div class="value-row">
          ${formatPriceChangeValue(priceChange, currency)}
          ${formatPercentageChangeValue(priceChangePct)}
        </div>
      </div>
    </div>
  `;
}

function buildRangeSelector(activeRange: SecurityHistoryRangeKey): string {
  const buttons = AVAILABLE_HISTORY_RANGES.map((rangeKey) => {
    const activeClass = rangeKey === activeRange ? ' active' : '';
    return `
      <button
        type="button"
        class="security-range-button${activeClass}"
        data-range="${rangeKey}"
        aria-pressed="${rangeKey === activeRange}"
      >
        ${rangeKey}
      </button>
    `;
  });

  return `
    <div class="security-range-selector" role="group" aria-label="Zeitraum">
      ${buttons.join('\n')}
    </div>
  `;
}

function buildHistoryPlaceholder(
  rangeKey: SecurityHistoryRangeKey,
  state: HistoryPlaceholderState = { status: 'empty' },
): string {
  const safeRange = rangeKey || '';

  switch (state.status) {
    case 'loaded':
      return `
        <div
          class="history-chart"
          data-state="loaded"
          data-range="${safeRange}"
          role="img"
          aria-label="Preisverlauf${safeRange ? ` für ${safeRange}` : ''}"
        ></div>
      `;
    case 'error': {
      const message = state?.message
        ? String(state.message)
        : 'Die historischen Daten konnten nicht geladen werden.';
      return `
        <div class="history-placeholder" data-state="error" data-range="${safeRange}">
          <p>${message}</p>
        </div>
      `;
    }
    case 'empty':
    default:
      return `
        <div class="history-placeholder" data-state="empty" data-range="${safeRange}">
          <p>Für dieses Wertpapier liegen im Zeitraum ${safeRange || 'den gewählten Zeitraum'} keine historischen Daten vor.</p>
        </div>
      `;
  }
}

function formatHoldings(value: unknown): string {
  const numeric = toFiniteNumber(value);
  if (numeric == null) {
    return '—';
  }

  const hasFraction = Math.abs(numeric % 1) > 0;
  const minFraction = hasFraction ? 2 : HOLDINGS_FRACTION_DIGITS.min;
  const maxFraction = hasFraction ? HOLDINGS_FRACTION_DIGITS.max : HOLDINGS_FRACTION_DIGITS.min;
  return numeric.toLocaleString('de-DE', {
    minimumFractionDigits: minFraction,
    maximumFractionDigits: maxFraction,
  });
}

function formatPrice(value: unknown): string {
  const numeric = toFiniteNumber(value);
  if (numeric == null) {
    return '—';
  }

  return numeric.toLocaleString('de-DE', {
    minimumFractionDigits: PRICE_FRACTION_DIGITS.min,
    maximumFractionDigits: PRICE_FRACTION_DIGITS.max,
  });
}

function formatPriceChangeWithCurrency(
  value: number,
  currency: string,
): string {
  const formatted = formatPrice(value);
  const suffix = currency ? `&nbsp;${currency}` : '';
  const className = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
  return `<span class="${className}">${formatted}${suffix}</span>`;
}

function buildHeaderMeta(
  snapshot: SecuritySnapshotDetail | null,
  metrics: SecuritySnapshotMetrics | null = null,
): string {
  if (!snapshot) {
    return '<div class="meta-error">Keine Snapshot-Daten verfügbar.</div>';
  }

  const currency = snapshot.currency_code || 'EUR';
  const holdingsSource =
    metrics?.holdings ?? snapshot.total_holdings_precise ?? snapshot.total_holdings;
  const holdings = formatHoldings(holdingsSource);
  const lastPriceNativeRaw =
    snapshot.last_price_native ?? snapshot.last_price?.native ?? snapshot.last_price_eur;
  const lastPriceNative = toFiniteNumber(lastPriceNativeRaw);
  const formattedLastPrice = formatPrice(lastPriceNativeRaw);
  const lastPriceDisplay =
    formattedLastPrice === '—'
      ? null
      : `${formattedLastPrice}${currency ? `&nbsp;${currency}` : ''}`;
  const marketValueRaw =
    toFiniteNumber(snapshot.market_value_eur) ??
    toFiniteNumber(snapshot.current_value_eur) ??
    null;
  const lastCloseNative = toFiniteNumber(snapshot.last_close_native);
  const lastPriceEur = toFiniteNumber(snapshot.last_price_eur);
  const lastCloseEur = toFiniteNumber(snapshot.last_close_eur);
  const dayPriceChangeNative =
    metrics?.dayPriceChangeNative ?? computeDelta(lastPriceNative, lastCloseNative);
  const dayPriceChangeEur =
    metrics?.dayPriceChangeEur ?? computeDelta(lastPriceEur, lastCloseEur);
  const dayChangeValue = isFiniteNumber(dayPriceChangeNative)
    ? dayPriceChangeNative
    : dayPriceChangeEur;
  const dayChangeCurrency = isFiniteNumber(dayPriceChangeNative)
    ? currency
    : 'EUR';

  const wrapValue = (content: string, extraClass = ''): string => {
    const classes = ['value'];
    if (extraClass) {
      classes.push(...extraClass.split(' ').filter(Boolean));
    }
    return `<span class="${classes.join(' ')}">${content}</span>`;
  };

  const wrapMissingValue = (extraClass = ''): string => {
    const classes = ['value--missing'];
    if (extraClass) {
      classes.push(extraClass);
    }
    return wrapValue('—', classes.join(' '));
  };

  const renderGainValue = (
    value: number | null | undefined,
    extraClass = '',
  ): string => {
    if (!isFiniteNumber(value)) {
      return wrapMissingValue(extraClass);
    }

    const classes = ['value--gain'];
    if (extraClass) {
      classes.push(extraClass);
    }
    return wrapValue(formatGain(value), classes.join(' '));
  };

  const renderGainPercentage = (
    value: number | null | undefined,
    extraClass = '',
  ): string => {
    if (!isFiniteNumber(value)) {
      return wrapMissingValue(extraClass);
    }

    const classes = ['value--gain-percentage'];
    if (extraClass) {
      classes.push(extraClass);
    }
    return wrapValue(formatGainPct(value), classes.join(' '));
  };

  const lastPriceValue = lastPriceDisplay
    ? wrapValue(lastPriceDisplay, 'value--price')
    : wrapMissingValue('value--price');
  const holdingsValue =
    holdings === '—'
      ? wrapMissingValue('value--holdings')
      : wrapValue(holdings, 'value--holdings');
  const marketValue = isFiniteNumber(marketValueRaw)
    ? wrapValue(`${formatNumber(marketValueRaw)}&nbsp;€`, 'value--market-value')
    : wrapMissingValue('value--market-value');
  const dayChangeAbsolute = isFiniteNumber(dayChangeValue)
    ? wrapValue(
        formatPriceChangeWithCurrency(dayChangeValue, dayChangeCurrency),
        'value--gain value--absolute',
      )
    : wrapMissingValue('value--absolute');
  const dayChangePercentage = renderGainPercentage(
    metrics?.dayChangePct,
    'value--percentage',
  );
  const totalChangeAbsolute = renderGainValue(
    metrics?.totalChangeEur,
    'value--absolute',
  );
  const totalChangePercentage = renderGainPercentage(
    metrics?.totalChangePct,
    'value--percentage',
  );

  return `
    <div class="security-meta-grid security-meta-grid--expanded">
      <div class="security-meta-item security-meta-item--price">
        <span class="label">Letzter Preis</span>
        <div class="value-group">${lastPriceValue}</div>
      </div>
      <div class="security-meta-item security-meta-item--day-change">
        <span class="label">Tagesänderung</span>
        <div class="value-group">
          ${dayChangeAbsolute}
          ${dayChangePercentage}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--total-change">
        <span class="label">Gesamtänderung</span>
        <div class="value-group">
          ${totalChangeAbsolute}
          ${totalChangePercentage}
        </div>
      </div>
      <div class="security-meta-item security-meta-item--holdings">
        <span class="label">Bestand</span>
        <div class="value-group">${holdingsValue}</div>
      </div>
      <div class="security-meta-item security-meta-item--market-value">
        <span class="label">Marktwert (EUR)</span>
        <div class="value-group">${marketValue}</div>
      </div>
    </div>
  `;
}

function normaliseHistoryError(error: unknown): string | null {
  if (!error) {
    return null;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message || null;
  }

  try {
    return JSON.stringify(error);
  } catch (_jsonError) {
    return String(error);
  }
}

function getHistoryChartOptions(
  host: HTMLElement,
  series: readonly NormalizedHistoryEntry[],
  {
    currency,
    baseline,
  }: { currency?: string | null | undefined; baseline?: number | null | undefined } = {},
): LineChartOptions {
  const measuredWidth = host.clientWidth || host.offsetWidth || 0;
  const width = measuredWidth > 0 ? measuredWidth : 640;
  const height = Math.min(Math.max(Math.floor(width * 0.55), 220), 420);
  const safeCurrency = (currency || '').toUpperCase() || 'EUR';
  const baselineValue = isFiniteNumber(baseline) ? baseline : null;

  return {
    width,
    height,
    margin: { top: 16, right: 20, bottom: 32, left: 20 },
    series,
    yFormatter: (value) => formatPrice(value),
    tooltipRenderer: ({ xFormatted, yFormatted }) => `
      <div class="chart-tooltip-date">${xFormatted}</div>
      <div class="chart-tooltip-value">${yFormatted}&nbsp;${safeCurrency}</div>
    `,
    baseline:
      baselineValue != null
        ? {
            value: baselineValue,
          }
        : null,
  };
}

const HISTORY_CHART_INSTANCES = new WeakMap<
  HTMLElement,
  ReturnType<typeof renderLineChart>
>();

function renderHistoryChart(
  host: HTMLElement,
  series: readonly NormalizedHistoryEntry[],
  options: {
    currency?: string | null | undefined;
    baseline?: number | null | undefined;
  } = {},
): void {
  if (!host || !Array.isArray(series) || series.length === 0) {
    return;
  }

  const chartOptions = getHistoryChartOptions(host, series, options);
  let chartContainer = HISTORY_CHART_INSTANCES.get(host) || null;

  if (!chartContainer || !host.contains(chartContainer)) {
    host.innerHTML = '';
    chartContainer = renderLineChart(host, chartOptions);
    if (chartContainer) {
      HISTORY_CHART_INSTANCES.set(host, chartContainer);
    }
    return;
  }

  updateLineChart(chartContainer, chartOptions);
}

function updateRangeButtons(
  container: HTMLElement | null,
  activeRange: SecurityHistoryRangeKey,
): void {
  if (!container) {
    return;
  }

  container.dataset.activeRange = activeRange;
  container.querySelectorAll<HTMLButtonElement>('.security-range-button').forEach((button) => {
    const rangeKey = button.dataset.range as SecurityHistoryRangeKey | undefined;
    const isActive = rangeKey === activeRange;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    button.disabled = false;
    button.classList.remove('loading');
  });
}

function updateInfoBarContent(
  root: HTMLElement,
  rangeKey: SecurityHistoryRangeKey,
  priceChange: number | null,
  priceChangePct: number | null,
  currency: string | null | undefined,
): void {
  const infoBar = root.querySelector('.security-info-bar');
  if (!infoBar || !infoBar.parentElement) {
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = buildInfoBar(rangeKey, priceChange, priceChangePct, currency).trim();
  const fresh = wrapper.firstElementChild;
  if (!fresh) {
    return;
  }
  infoBar.parentElement.replaceChild(fresh, infoBar);
}

function updateHistoryPlaceholder(
  root: HTMLElement,
  rangeKey: SecurityHistoryRangeKey,
  state: HistoryPlaceholderState,
  historySeries: readonly NormalizedHistoryEntry[],
  options: {
    currency?: string | null | undefined;
    baseline?: number | null | undefined;
  } = {},
): void {
  const placeholderContainer = root.querySelector('.security-detail-placeholder');
  if (!placeholderContainer) {
    return;
  }

  placeholderContainer.innerHTML = `
    <h2>Historie</h2>
    ${buildHistoryPlaceholder(rangeKey, state)}
  `;

  if (state?.status === 'loaded' && Array.isArray(historySeries) && historySeries.length) {
    const host = placeholderContainer.querySelector<HTMLElement>('.history-chart');
    if (host) {
      requestAnimationFrame(() => {
        renderHistoryChart(host, historySeries, options);
      });
    }
  }
}

interface ScheduleRangeSetupOptions {
  root: HTMLElement;
  hass: HomeAssistant | null | undefined;
  panelConfig: PanelConfigLike | null | undefined;
  securityUuid: string;
  snapshot: SecuritySnapshotDetail | null;
  metrics: SecuritySnapshotMetrics | null | undefined;
  initialRange: SecurityHistoryRangeKey;
  initialHistory: NormalizedHistoryEntry[];
  initialHistoryState: HistoryPlaceholderState;
}

function scheduleRangeSetup(options: ScheduleRangeSetupOptions): void {
  const {
    root,
    hass,
    panelConfig,
    securityUuid,
    snapshot,
    metrics,
    initialRange,
    initialHistory,
    initialHistoryState,
  } = options;

  if (!root) {
    return;
  }

  setTimeout(() => {
    const rangeSelector = root.querySelector<HTMLElement>('.security-range-selector');
    if (!rangeSelector) {
      return;
    }

    const cache = ensureHistoryCache(securityUuid);
    const snapshotMetrics = metrics ?? getSnapshotMetrics(securityUuid);
    const shouldCacheInitial =
      Array.isArray(initialHistory) && initialHistoryState?.status !== 'error';
    if (shouldCacheInitial) {
      cache.set(initialRange, initialHistory);
    }

    ensureLiveUpdateSubscription(securityUuid);

    setActiveRange(securityUuid, initialRange);
    updateRangeButtons(rangeSelector, initialRange);
    if (initialHistoryState) {
      updateHistoryPlaceholder(
        root,
        initialRange,
        initialHistoryState,
        initialHistory,
        {
          currency: snapshot?.currency_code,
          baseline: snapshotMetrics?.averagePurchaseNative ?? null,
        },
      );
    }

    const handleRangeClick = async (rangeKey: SecurityHistoryRangeKey): Promise<void> => {
      if (!rangeKey || rangeKey === getActiveRange(securityUuid)) {
        return;
      }

      const button = rangeSelector.querySelector<HTMLButtonElement>(
        `.security-range-button[data-range="${rangeKey}"]`,
      );
      if (button) {
        button.disabled = true;
        button.classList.add('loading');
      }

      let historySeries = cache.get(rangeKey) || null;
      let historyState: HistoryPlaceholderState | null = null;
      if (!historySeries) {
        try {
          const rangeOptions = resolveRangeOptions(rangeKey);
          const historyResponse = await fetchSecurityHistoryWS(
            hass,
            panelConfig,
            securityUuid,
            rangeOptions,
          );
          historySeries = normaliseHistorySeries(historyResponse?.prices);
          cache.set(rangeKey, historySeries);
          historyState = historySeries.length
            ? { status: 'loaded' }
            : { status: 'empty' };
        } catch (error) {
          console.error('Range-Wechsel: Historie konnte nicht geladen werden', error);
          historySeries = [];
          const message = normaliseHistoryError(error);
          historyState = {
            status: 'error',
            message:
              message ||
              'Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden.',
          };
        }
      } else {
        historyState = historySeries.length
          ? { status: 'loaded' }
          : { status: 'empty' };
      }

      const snapshotLastPriceNative =
        toFiniteNumber(snapshot?.last_price_native) ??
        toFiniteNumber(snapshot?.last_price?.native) ??
        null;
      const { priceChange, priceChangePct } = computePriceChangeMetrics(
        historySeries,
        snapshotLastPriceNative,
      );

      setActiveRange(securityUuid, rangeKey);
      updateRangeButtons(rangeSelector, rangeKey);
      updateInfoBarContent(
        root,
        rangeKey,
        priceChange,
        priceChangePct,
        snapshot?.currency_code,
      );
      updateHistoryPlaceholder(
        root,
        rangeKey,
        historyState,
        historySeries,
        {
          currency: snapshot?.currency_code,
          baseline: snapshotMetrics?.averagePurchaseNative ?? null,
        },
      );
    };

    rangeSelector.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('.security-range-button');
      if (!button || button.disabled) {
        return;
      }
      const { range } = button.dataset;
      if (!range || !AVAILABLE_HISTORY_RANGES.includes(range as SecurityHistoryRangeKey)) {
        return;
      }
      handleRangeClick(range as SecurityHistoryRangeKey);
    });
  }, 0);
}

export async function renderSecurityDetail(
  root: HTMLElement,
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
  securityUuid: string | null | undefined,
): Promise<string> {
  if (!securityUuid) {
    console.error('renderSecurityDetail: securityUuid fehlt');
    return '<div class="card"><h2>Fehler</h2><p>Kein Wertpapier angegeben.</p></div>';
  }

  const cachedSnapshot = getCachedSecuritySnapshot(securityUuid);
  let snapshot: SecuritySnapshotDetail | null = null;
  let error: string | null = null;

  try {
    const response: SecuritySnapshotResponse = await fetchSecuritySnapshotWS(
      hass,
      panelConfig,
      securityUuid,
    );
    if (response && typeof response === 'object') {
      snapshot =
        response.snapshot && typeof response.snapshot === 'object'
          ? (response.snapshot as SecuritySnapshotDetail)
          : (response as unknown as SecuritySnapshotDetail);
    } else {
      snapshot = response as unknown as SecuritySnapshotDetail;
    }
  } catch (err) {
    console.error('renderSecurityDetail: Snapshot konnte nicht geladen werden', err);
    error = err instanceof Error ? err.message : String(err);
  }

  const effectiveSnapshot = snapshot || cachedSnapshot;
  const fallbackUsed = Boolean(cachedSnapshot && !snapshot);
  const flaggedAsCache = (effectiveSnapshot?.source ?? '') === 'cache';
  let snapshotMetrics: SecuritySnapshotMetrics | null = null;
  if (securityUuid) {
    cacheSecuritySnapshotDetail(securityUuid, effectiveSnapshot ?? null);
    snapshotMetrics = ensureSnapshotMetrics(securityUuid, effectiveSnapshot ?? null);
  }
  const staleNotice =
    effectiveSnapshot && (fallbackUsed || flaggedAsCache)
      ? buildCachedSnapshotNotice({ fallbackUsed, flaggedAsCache })
      : '';
  const headerTitle = effectiveSnapshot?.name || 'Wertpapierdetails';

  if (error) {
    const headerCard = createHeaderCard(
      headerTitle,
      buildHeaderMeta(effectiveSnapshot, snapshotMetrics),
    );
    return `
      ${headerCard.outerHTML}
      ${staleNotice}
      <div class="card error-card">
        <h2>Fehler beim Laden</h2>
        <p>${error}</p>
      </div>
    `;
  }

  const activeRange = getActiveRange(securityUuid);
  const cache = ensureHistoryCache(securityUuid);
  let historySeries = cache.has(activeRange) ? cache.get(activeRange) ?? null : null;
  let historyState: HistoryPlaceholderState = { status: 'empty' };

  if (Array.isArray(historySeries)) {
    historyState = historySeries.length
      ? { status: 'loaded' }
      : { status: 'empty' };
  } else {
    historySeries = [];
    try {
      const rangeOptions = resolveRangeOptions(activeRange);
      const historyResponse: SecurityHistoryResponse = await fetchSecurityHistoryWS(
        hass,
        panelConfig,
        securityUuid,
        rangeOptions,
      );
      historySeries = normaliseHistorySeries(historyResponse?.prices);
      cache.set(activeRange, historySeries);
      historyState = historySeries.length
        ? { status: 'loaded' }
        : { status: 'empty' };
    } catch (historyError) {
      console.error(
        'renderSecurityDetail: Historie konnte nicht geladen werden',
        historyError,
      );
      const message = normaliseHistoryError(historyError);
      historyState = {
        status: 'error',
        message:
          message ||
          'Die historischen Daten konnten aufgrund eines Fehlers nicht geladen werden.',
      };
    }
  }

  if (
    applyHistoryDayChangeFallback(snapshotMetrics, historySeries) &&
    snapshotMetrics
  ) {
    SNAPSHOT_METRICS_REGISTRY.set(securityUuid, snapshotMetrics);
  }

  const headerCard = createHeaderCard(
    headerTitle,
    buildHeaderMeta(effectiveSnapshot, snapshotMetrics),
  );

  const snapshotLastPriceNative =
    toFiniteNumber(effectiveSnapshot?.last_price_native) ??
    toFiniteNumber(effectiveSnapshot?.last_price?.native) ??
    null;
  const { priceChange, priceChangePct } = computePriceChangeMetrics(
    historySeries,
    snapshotLastPriceNative,
  );
  const infoBar = buildInfoBar(
    activeRange,
    priceChange,
    priceChangePct,
    effectiveSnapshot?.currency_code,
  );

  scheduleRangeSetup({
    root,
    hass,
    panelConfig,
    securityUuid,
    snapshot: effectiveSnapshot,
    metrics: snapshotMetrics,
    initialRange: activeRange,
    initialHistory: historySeries,
    initialHistoryState: historyState,
  });

  return `
    ${headerCard.outerHTML}
    ${staleNotice}
    ${infoBar}
    ${buildRangeSelector(activeRange)}
    <div class="card security-detail-placeholder">
      <h2>Historie</h2>
      ${buildHistoryPlaceholder(activeRange, historyState)}
    </div>
  `;
}

interface RegisterSecurityDetailTabOptions {
  setSecurityDetailTabFactory?: ((
    factory: (securityUuid: string) => {
      title: string;
      render: DashboardTabRenderFn;
      cleanup: (context?: { key: string }) => void;
    },
  ) => void) | null;
}

export function registerSecurityDetailTab(
  options: RegisterSecurityDetailTabOptions,
): void {
  const { setSecurityDetailTabFactory } = options;
  if (typeof setSecurityDetailTabFactory !== 'function') {
    console.error('registerSecurityDetailTab: Ungültige Factory-Funktion übergeben');
    return;
  }

  setSecurityDetailTabFactory((securityUuid) => ({
    title: 'Wertpapier',
    render: (root, hass, panelConfig) => renderSecurityDetail(root, hass, panelConfig, securityUuid),
    cleanup: () => cleanupSecurityDetailState(securityUuid),
  }));
}
