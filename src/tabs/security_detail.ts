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
  HoldingsAggregationPayload,
  AverageCostPayload,
  AverageCostSource,
} from './types';
import { toFiniteCurrency, normalizePercentValue } from '../utils/currency';
import { normalizePerformancePayload } from '../utils/performance';

const HOLDINGS_FRACTION_DIGITS = { min: 0, max: 6 } as const;
const PRICE_FRACTION_DIGITS = { min: 2, max: 4 } as const;
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
  close_raw?: unknown;
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

const AVERAGE_COST_SOURCE_LABELS: Record<AverageCostSource, string> = {
  aggregation: 'Aggregationsdaten',
  totals: 'Kaufsummen',
  eur_total: 'EUR-Kaufsumme',
};

type LiveUpdateHandler = (event: Event) => void;

const SECURITY_HISTORY_CACHE: HistoryCacheRegistry = new Map();
const RANGE_STATE_REGISTRY: RangeStateRegistry = new Map();
const SNAPSHOT_DETAIL_REGISTRY: SnapshotDetailRegistry = new Map();
const LIVE_UPDATE_EVENT = 'pp-reader:portfolio-positions-updated';
const LIVE_UPDATE_HANDLERS = new Map<string, LiveUpdateHandler>();

function extractAverageCostPayload(
  snapshot: SecuritySnapshotDetail | null | undefined,
): AverageCostPayload | null {
  if (!snapshot) {
    return null;
  }

  const rawAverageCost = snapshot.average_cost;
  if (!rawAverageCost || typeof rawAverageCost !== 'object') {
    return null;
  }

  const candidate = rawAverageCost as Partial<AverageCostPayload> & {
    coverage_ratio?: unknown;
    source?: unknown;
  };

  const native = toFiniteNumber(candidate.native);
  const security = toFiniteNumber(candidate.security);
  const account = toFiniteNumber(candidate.account);
  const eur = toFiniteNumber(candidate.eur);
  const coverageRatio = toFiniteNumber(candidate.coverage_ratio);

  if (
    native == null &&
    security == null &&
    account == null &&
    eur == null &&
    coverageRatio == null
  ) {
    return null;
  }

  const source = candidate.source;
  const normalizedSource: AverageCostSource =
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

function extractAggregationPayload(
  snapshot: SecuritySnapshotDetail | null | undefined,
): HoldingsAggregationPayload | null {
  if (!snapshot) {
    return null;
  }

  const rawAggregation = snapshot.aggregation;
  if (!rawAggregation || typeof rawAggregation !== 'object') {
    return null;
  }

  const candidate = rawAggregation as Partial<HoldingsAggregationPayload> & {
    purchase_value_cents?: unknown;
  };

  const totalHoldings = toFiniteNumber(candidate.total_holdings);
  const positiveHoldings = toFiniteNumber(candidate.positive_holdings);
  const purchaseValueEur = toFiniteNumber(candidate.purchase_value_eur);
  const securityTotal =
    toFiniteNumber(candidate.purchase_total_security) ??
    toFiniteNumber(candidate.security_currency_total);
  const accountTotal =
    toFiniteNumber(candidate.purchase_total_account) ??
    toFiniteNumber(candidate.account_currency_total);

  const rawPurchaseValueCents = candidate.purchase_value_cents;
  let purchaseValueCents = 0;
  if (typeof rawPurchaseValueCents === 'number' && Number.isFinite(rawPurchaseValueCents)) {
    purchaseValueCents = Math.trunc(rawPurchaseValueCents);
  } else if (typeof rawPurchaseValueCents === 'string') {
    const parsed = Number.parseInt(rawPurchaseValueCents, 10);
    if (Number.isFinite(parsed)) {
      purchaseValueCents = parsed;
    }
  }

  const hasAnyValue =
    totalHoldings != null ||
    positiveHoldings != null ||
    purchaseValueEur != null ||
    securityTotal != null ||
    accountTotal != null ||
    purchaseValueCents !== 0;

  if (!hasAnyValue) {
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

export const __TEST_ONLY__ = {
  getHistoryChartOptionsForTest: getHistoryChartOptions,
  mergeHistoryWithSnapshotPriceForTest: (
    historySeries: readonly NormalizedHistoryEntry[] | null | undefined,
    snapshot: SecuritySnapshotDetail | null | undefined,
  ): NormalizedHistoryEntry[] => buildHistorySeriesWithSnapshotPrice(historySeries, snapshot),
  composeAveragePurchaseTooltipForTest: composeAveragePurchaseTooltip,
  selectAveragePurchaseBaselineForTest: selectAveragePurchaseBaseline,
  resolveAccountCurrencyCodeForTest: resolveAccountCurrencyCode,
  resolvePurchaseFxTimestampForTest: resolvePurchaseFxTimestamp,
  buildHeaderMetaForTest: buildHeaderMeta,
};

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

function invalidateSnapshotCaches(securityUuid: string | null | undefined): void {
  if (!securityUuid) {
    return;
  }

  SNAPSHOT_DETAIL_REGISTRY.delete(securityUuid);
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
    invalidateSnapshotCaches(securityUuid);
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
  invalidateSnapshotCaches(securityUuid);
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
  return toFiniteCurrency(value);
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
      const normalizedClose = toFiniteNumber(entry?.close);
      let close = normalizedClose;
      if (close == null) {
        const rawClose = toFiniteNumber(entry?.close_raw);
        if (rawClose != null) {
          close = rawClose / 1e8;
        }
      }

      if (close == null) {
        return null;
      }

      const dateValue = parseHistoryDate(entry?.date);

      return {
        date: dateValue ?? (entry?.date as Date | string | number),
        close,
      };
    })
    .filter((entry): entry is NormalizedHistoryEntry => Boolean(entry));
}

function extractSnapshotLastPriceNative(
  snapshot: SecuritySnapshotDetail | null | undefined,
): number | null {
  const native =
    toFiniteNumber(snapshot?.last_price_native) ??
    toFiniteNumber(snapshot?.last_price?.native) ??
    null;

  if (isFiniteNumber(native)) {
    return native;
  }

  const currency = String(snapshot?.currency_code || '').toUpperCase();
  if (currency === 'EUR') {
    const lastPriceEur = toFiniteNumber(snapshot?.last_price_eur);
    if (isFiniteNumber(lastPriceEur)) {
      return lastPriceEur;
    }
  }

  return null;
}

function extractSnapshotLastPriceTimestamp(
  snapshot: SecuritySnapshotDetail | null | undefined,
): number | null {
  if (!snapshot) {
    return null;
  }

  return (
    parseTimestamp((snapshot as { last_price_fetched_at?: unknown })?.last_price_fetched_at) ??
    parseTimestamp(
      (snapshot.last_price as { fetched_at?: unknown } | null | undefined)?.fetched_at,
    ) ??
    null
  );
}

function buildHistorySeriesWithSnapshotPrice(
  historySeries: readonly NormalizedHistoryEntry[] | null | undefined,
  snapshot: SecuritySnapshotDetail | null | undefined,
): NormalizedHistoryEntry[] {
  const baseSeries = Array.isArray(historySeries) ? historySeries : [];
  const seriesWithSnapshot = baseSeries.slice();

  const lastPriceNative = extractSnapshotLastPriceNative(snapshot);
  if (!isFiniteNumber(lastPriceNative)) {
    return seriesWithSnapshot;
  }

  const lastPriceTimestamp = extractSnapshotLastPriceTimestamp(snapshot) ?? Date.now();
  const candidateDate = new Date(lastPriceTimestamp);
  if (Number.isNaN(candidateDate.getTime())) {
    return seriesWithSnapshot;
  }

  const targetDay = toEpochDay(normaliseDate(candidateDate));
  let latestSeriesDay: number | null = null;

  for (let index = seriesWithSnapshot.length - 1; index >= 0; index -= 1) {
    const entry = seriesWithSnapshot[index];
    if (!entry) {
      continue;
    }

    const parsedDate = parseHistoryDate(entry.date);
    if (!parsedDate) {
      continue;
    }

    const entryDay = toEpochDay(normaliseDate(parsedDate));
    if (latestSeriesDay == null) {
      latestSeriesDay = entryDay;
    }

    if (entryDay === targetDay) {
      if (entry.close !== lastPriceNative) {
        seriesWithSnapshot[index] = { ...entry, close: lastPriceNative };
      }
      return seriesWithSnapshot;
    }

    if (entryDay < targetDay) {
      break;
    }
  }

  if (latestSeriesDay != null && latestSeriesDay > targetDay) {
    return seriesWithSnapshot;
  }

  seriesWithSnapshot.push({
    date: candidateDate,
    close: lastPriceNative,
  });

  return seriesWithSnapshot;
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveFinite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function areNumbersClose(
  first: number | null | undefined,
  second: number | null | undefined,
  tolerance?: number,
): boolean {
  if (!isFiniteNumber(first) || !isFiniteNumber(second)) {
    return false;
  }

  const absoluteDiff = Math.abs(first - second);
  if (tolerance != null) {
    return absoluteDiff <= tolerance;
  }

  const scale = Math.max(Math.abs(first), Math.abs(second), 1);
  return absoluteDiff <= scale * 1e-4;
}

function computePercentageChange(
  current: number | null,
  reference: number | null,
): number | null {
  if (!isFiniteNumber(reference) || reference === 0 || !isFiniteNumber(current)) {
    return null;
  }

  return normalizePercentValue(((current - reference) / reference) * 100);
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

function resolveRoundedTrendClass(
  value: number | null | undefined,
  decimals: number,
): 'positive' | 'negative' | 'neutral' {
  if (!isFiniteNumber(value) || value === 0) {
    return 'neutral';
  }

  const threshold = 0.5 / Math.pow(10, decimals);
  if (Math.abs(value) < threshold) {
    return 'neutral';
  }

  return value > 0 ? 'positive' : 'negative';
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

  const trendClass = resolveRoundedTrendClass(value, PRICE_FRACTION_DIGITS.max);
  const suffix = currency ? `&nbsp;${currency}` : '';
  return `<span class="value ${trendClass}">${formatted}${suffix}</span>`;
}

function formatPercentageChangeValue(value: number | null): string {
  if (!isFiniteNumber(value)) {
    return '<span class="value neutral">—</span>';
  }

  const trendClass = resolveRoundedTrendClass(value, 2);
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
  const className = resolveRoundedTrendClass(value, PRICE_FRACTION_DIGITS.max);
  return `<span class="${className}">${formatted}${suffix}</span>`;
}

function escapeAttribute(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function resolveAccountCurrencyCode(
  snapshot: SecuritySnapshotDetail | null | undefined,
  accountAverage: number | null | undefined,
  securityAverage: number | null | undefined,
): string | null {
  const normalizedAverageCost = extractAverageCostPayload(snapshot);
  const accountAverageNumeric =
    normalizedAverageCost?.account ??
    (isFiniteNumber(accountAverage) ? accountAverage : toFiniteNumber(accountAverage));

  if (!isFiniteNumber(accountAverageNumeric)) {
    return null;
  }

  const rawExplicit =
    (snapshot as { account_currency_code?: unknown } | null | undefined)?.account_currency_code ??
    (snapshot as { account_currency?: unknown } | null | undefined)?.account_currency;
  if (typeof rawExplicit === 'string' && rawExplicit.trim()) {
    return rawExplicit.trim().toUpperCase();
  }

  const securityCurrency = String(snapshot?.currency_code || '').trim().toUpperCase();
  const securityAverageNumeric =
    normalizedAverageCost?.security ??
    normalizedAverageCost?.native ??
    (isFiniteNumber(securityAverage) ? securityAverage : toFiniteNumber(securityAverage));

  const aggregation = extractAggregationPayload(snapshot);
  if (
    securityCurrency &&
    isFiniteNumber(securityAverageNumeric) &&
    areNumbersClose(accountAverageNumeric, securityAverageNumeric)
  ) {
    return securityCurrency;
  }

  const securityTotal =
    toFiniteNumber(aggregation?.purchase_total_security) ??
    toFiniteNumber((snapshot as { purchase_total_security?: unknown } | null | undefined)?.purchase_total_security);
  const accountTotal =
    toFiniteNumber(aggregation?.purchase_total_account) ??
    toFiniteNumber((snapshot as { purchase_total_account?: unknown } | null | undefined)?.purchase_total_account);
  let ratio: number | null = null;
  if (isFiniteNumber(securityTotal) && securityTotal !== 0 && isFiniteNumber(accountTotal)) {
    ratio = accountTotal / securityTotal;
  }

  const averageSource = normalizedAverageCost?.source;
  if (averageSource === 'eur_total') {
    return 'EUR';
  }

  const averageEur = normalizedAverageCost?.eur;
  if (isFiniteNumber(averageEur) && areNumbersClose(accountAverageNumeric, averageEur)) {
    return 'EUR';
  }

  const purchaseValueEur = toFiniteNumber(snapshot?.purchase_value_eur);
  if (isFiniteNumber(purchaseValueEur)) {
    return 'EUR';
  }

  if (ratio != null && areNumbersClose(ratio, 1)) {
    return securityCurrency || null;
  }

  if (securityCurrency === 'EUR') {
    return 'EUR';
  }

  return securityCurrency || 'EUR';
}

function formatFxRate(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value.toLocaleString('de-DE', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

function resolvePurchaseFxTimestamp(
  snapshot: SecuritySnapshotDetail | null | undefined,
): number | null {
  const snapshotRecord = snapshot as Record<string, unknown> | null | undefined;
  const candidateKeys = [
    'purchase_fx_date',
    'purchase_fx_timestamp',
    'purchase_fx_rate_date',
    'purchase_fx_rate_timestamp',
    'avg_price_updated_at',
    'avg_price_timestamp',
    'purchase_updated_at',
    'purchase_updated',
    'purchase_value_updated_at',
    'purchase_value_updated',
    'last_purchase_date',
    'last_purchase_timestamp',
    'last_transaction_date',
    'last_transaction_at',
  ] as const;

  for (const key of candidateKeys) {
    const value = snapshotRecord?.[key];
    const parsed = parseTimestamp(value);
    if (parsed != null) {
      return parsed;
    }
  }

  const fallbackCandidates: unknown[] = [];
  if (snapshotRecord && 'last_price_fetched_at' in snapshotRecord) {
    fallbackCandidates.push(snapshotRecord.last_price_fetched_at);
  }
  const lastPrice = (snapshot as { last_price?: { fetched_at?: unknown } | null } | null)?.last_price;
  if (lastPrice && typeof lastPrice === 'object') {
    fallbackCandidates.push(lastPrice.fetched_at);
  }
  if (snapshotRecord && 'last_price_date' in snapshotRecord) {
    fallbackCandidates.push(snapshotRecord.last_price_date);
  }

  for (const candidate of fallbackCandidates) {
    const parsed = parseTimestamp(candidate);
    if (parsed != null) {
      return parsed;
    }
  }

  return null;
}

function formatFxDateLabel(timestamp: number | null): string | null {
  if (timestamp == null || !Number.isFinite(timestamp)) {
    return null;
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString('de-DE');
}

function composeAveragePurchaseTooltip(
  snapshot: SecuritySnapshotDetail | null | undefined,
  accountCurrency: string | null | undefined,
): string | null {
  const securityCurrency = String(snapshot?.currency_code || '').trim().toUpperCase();
  const accountCurrencySafe = String(accountCurrency || '').trim().toUpperCase();

  if (!securityCurrency || !accountCurrencySafe || securityCurrency === accountCurrencySafe) {
    return null;
  }

  const averageCost = extractAverageCostPayload(snapshot);
  if (!averageCost) {
    return null;
  }

  const securityAverage = averageCost.native ?? averageCost.security ?? null;
  const accountAverage = averageCost.account ?? averageCost.eur ?? null;

  if (!isPositiveFinite(securityAverage) || !isPositiveFinite(accountAverage)) {
    return null;
  }

  const fxRate = accountAverage / securityAverage;
  if (!Number.isFinite(fxRate) || fxRate <= 0) {
    return null;
  }

  const formattedRate = formatFxRate(fxRate);
  if (!formattedRate) {
    return null;
  }

  let inverseRateLabel: string | null = null;
  if (fxRate > 0) {
    const inverse = 1 / fxRate;
    if (Number.isFinite(inverse) && inverse > 0) {
      inverseRateLabel = formatFxRate(inverse);
    }
  }

  const timestamp = resolvePurchaseFxTimestamp(snapshot);
  const dateLabel = formatFxDateLabel(timestamp);

  const parts = [`FX-Kurs (Kauf): 1 ${securityCurrency} = ${formattedRate} ${accountCurrencySafe}`];
  if (inverseRateLabel) {
    parts.push(`1 ${accountCurrencySafe} = ${inverseRateLabel} ${securityCurrency}`);
  }

  const metadataParts: string[] = [];
  const sourceLabel =
    AVERAGE_COST_SOURCE_LABELS[averageCost.source] ?? AVERAGE_COST_SOURCE_LABELS.aggregation;
  metadataParts.push(`Quelle: ${sourceLabel}`);

  if (isFiniteNumber(averageCost.coverage_ratio)) {
    const percentage = Math.min(Math.max(averageCost.coverage_ratio * 100, 0), 100);
    metadataParts.push(
      `Abdeckung: ${percentage.toLocaleString('de-DE', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      })}%`,
    );
  }

  if (metadataParts.length) {
    parts.push(...metadataParts);
  }

  const datePart = dateLabel ?? 'Datum unbekannt';
  return `${parts.join(' · ')} (Stand: ${datePart})`;
}

function selectAveragePurchaseBaseline(
  snapshot: SecuritySnapshotDetail | null | undefined,
): number | null {
  const averageCost = extractAverageCostPayload(snapshot);
  const baseline = averageCost?.native ?? averageCost?.security ?? null;
  return isFiniteNumber(baseline) ? baseline : null;
}

function buildHeaderMeta(snapshot: SecuritySnapshotDetail | null): string {
  if (!snapshot) {
    return '<div class="meta-error">Keine Snapshot-Daten verfügbar.</div>';
  }

  const currency = snapshot.currency_code || 'EUR';
  const holdingsSource = snapshot.total_holdings_precise ?? snapshot.total_holdings;
  const holdings = formatHoldings(holdingsSource);
  const lastPriceNativeRaw =
    snapshot.last_price_native ?? snapshot.last_price?.native ?? snapshot.last_price_eur;
  const formattedLastPrice = formatPrice(lastPriceNativeRaw);
  const lastPriceDisplay =
    formattedLastPrice === '—'
      ? null
      : `${formattedLastPrice}${currency ? `&nbsp;${currency}` : ''}`;
  const marketValueRaw =
    toFiniteNumber(snapshot.market_value_eur) ??
    toFiniteNumber(snapshot.current_value_eur) ??
    null;
  const averageCost = extractAverageCostPayload(snapshot);
  const averagePurchaseNativeRaw =
    averageCost?.native ??
    averageCost?.security ??
    null;
  const averagePurchaseEurRaw = averageCost?.eur ?? null;
  const averagePurchaseAccountRaw = averageCost?.account ?? null;
  const resolvedAccountAverage = averagePurchaseAccountRaw ?? averagePurchaseEurRaw;
  const performancePayload = normalizePerformancePayload(snapshot.performance);
  const dayChangePayload = performancePayload?.day_change ?? null;
  const dayPriceChangeNative = dayChangePayload?.price_change_native ?? null;
  const dayPriceChangeEur = dayChangePayload?.price_change_eur ?? null;
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
    dayChangePayload?.change_pct,
    'value--percentage',
  );
  const totalChangeAbsolute = renderGainValue(
    performancePayload?.total_change_eur,
    'value--absolute',
  );
  const totalChangePercentage = renderGainPercentage(
    performancePayload?.total_change_pct,
    'value--percentage',
  );
  const accountCurrency = resolveAccountCurrencyCode(
    snapshot,
    resolvedAccountAverage,
    averagePurchaseNativeRaw,
  );
  const averagePurchaseTooltip = composeAveragePurchaseTooltip(
    snapshot,
    accountCurrency,
  );
  const averageValueGroupAttributes = averagePurchaseTooltip
    ? ` title="${escapeAttribute(averagePurchaseTooltip)}"`
    : '';
  const averagePurchaseValues: string[] = [];

  if (isFiniteNumber(averagePurchaseNativeRaw)) {
    averagePurchaseValues.push(
      wrapValue(
        `${formatPrice(averagePurchaseNativeRaw)}${
          currency ? `&nbsp;${currency}` : ''
        }`,
        'value--average value--average-native',
      ),
    );
  } else {
    averagePurchaseValues.push(
      wrapMissingValue('value--average value--average-native'),
    );
  }

  const shouldRenderAccountValue =
    isFiniteNumber(resolvedAccountAverage) &&
    (!isFiniteNumber(averagePurchaseNativeRaw) ||
      !accountCurrency ||
      !currency ||
      accountCurrency !== currency ||
      !areNumbersClose(resolvedAccountAverage, averagePurchaseNativeRaw));

  if (shouldRenderAccountValue && isFiniteNumber(resolvedAccountAverage)) {
    averagePurchaseValues.push(
      wrapValue(
        `${formatPrice(resolvedAccountAverage)}${
          accountCurrency ? `&nbsp;${accountCurrency}` : ''
        }`,
        'value--average value--average-eur',
      ),
    );
  }

  return `
    <div class="security-meta-grid security-meta-grid--expanded">
      <div class="security-meta-item security-meta-item--price">
        <span class="label">Letzter Preis</span>
        <div class="value-group">${lastPriceValue}</div>
      </div>
      <div class="security-meta-item security-meta-item--average">
        <span class="label">Durchschnittlicher Kaufpreis</span>
        <div class="value-group"${averageValueGroupAttributes}>
          ${averagePurchaseValues.join('')}
        </div>
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
    const initialBaseline = selectAveragePurchaseBaseline(snapshot);
    const shouldCacheInitial =
      Array.isArray(initialHistory) && initialHistoryState?.status !== 'error';
    if (shouldCacheInitial) {
      cache.set(initialRange, initialHistory);
    }

    ensureLiveUpdateSubscription(securityUuid);

    setActiveRange(securityUuid, initialRange);
    updateRangeButtons(rangeSelector, initialRange);
    if (initialHistoryState) {
      const initialDisplayHistory = buildHistorySeriesWithSnapshotPrice(
        initialHistory,
        snapshot,
      );
      let effectiveInitialState: HistoryPlaceholderState = initialHistoryState;
      if (effectiveInitialState.status !== 'error') {
        effectiveInitialState = initialDisplayHistory.length
          ? { status: 'loaded' }
          : { status: 'empty' };
      }
      updateHistoryPlaceholder(
        root,
        initialRange,
        effectiveInitialState,
        initialDisplayHistory,
        {
          currency: snapshot?.currency_code,
          baseline: initialBaseline,
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
      let displayHistorySeries: NormalizedHistoryEntry[] = [];
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

      displayHistorySeries = buildHistorySeriesWithSnapshotPrice(historySeries, snapshot);
      if (historyState?.status !== 'error') {
        historyState = displayHistorySeries.length
          ? { status: 'loaded' }
          : { status: 'empty' };
      }

      const snapshotLastPriceNative =
        extractSnapshotLastPriceNative(snapshot);
      const { priceChange, priceChangePct } = computePriceChangeMetrics(
        displayHistorySeries,
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
      const rangeBaseline = selectAveragePurchaseBaseline(snapshot);

      updateHistoryPlaceholder(
        root,
        rangeKey,
        historyState,
        displayHistorySeries,
        {
          currency: snapshot?.currency_code,
          baseline: rangeBaseline,
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
  if (securityUuid) {
    cacheSecuritySnapshotDetail(securityUuid, effectiveSnapshot ?? null);
  }
  const staleNotice =
    effectiveSnapshot && (fallbackUsed || flaggedAsCache)
      ? buildCachedSnapshotNotice({ fallbackUsed, flaggedAsCache })
      : '';
  const headerTitle = effectiveSnapshot?.name || 'Wertpapierdetails';

  if (error) {
    const headerCard = createHeaderCard(
      headerTitle,
      buildHeaderMeta(effectiveSnapshot),
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

  const displayHistorySeries = buildHistorySeriesWithSnapshotPrice(
    historySeries,
    effectiveSnapshot,
  );
  if (historyState?.status !== 'error') {
    historyState = displayHistorySeries.length
      ? { status: 'loaded' }
      : { status: 'empty' };
  }

  const headerCard = createHeaderCard(
    headerTitle,
    buildHeaderMeta(effectiveSnapshot),
  );

  const snapshotLastPriceNative = extractSnapshotLastPriceNative(effectiveSnapshot);
  const { priceChange, priceChangePct } = computePriceChangeMetrics(
    displayHistorySeries,
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
