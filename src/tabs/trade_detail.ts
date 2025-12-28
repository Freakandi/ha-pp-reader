/**
 * Trade detail tab renderer.
 *
 * Implements a detailed view for a realized trade, including:
 * - Header with the security name (centered).
 * - Metadata grid (Last Sell Price, Change since Sell) matching Security Detail design.
 * - Interactive chart with range selectors and Purchase/Sell markers.
 * - "Copy prompt for ChatGPT" functionality.
 * - Info bar showing change in the selected range period.
 */
import type { LineChartMarker, LineChartOptions } from '../content/charting';
import { renderLineChart, updateLineChart } from '../content/charting';
import {
  createHeaderCard,
  createInlineSpinner,
  formatNumber,
} from '../content/elements';
import type {
  NewsPromptResponse,
  RealizedTrade,
  SecurityHistoryOptions,
  SecurityHistoryTransaction
} from '../data/api';
import {
  fetchNewsPromptWS,
  fetchRealizedPerformance,
  fetchSecurityHistoryWS
} from '../data/api';
import type { HomeAssistant } from '../types/home-assistant';
import { escapeAttribute, escapeHtml } from '../utils/html';
import type { DashboardTabRenderFn, PanelConfigLike, SecurityHistoryRangeKey, SecurityHistoryRangeState } from './types';

// --- Types & Constants matching Security Detail ---

interface NormalizedHistoryEntry {
  date: Date | string | number;
  close: number;
}

type HistoryPlaceholderState =
  | { status: 'loaded' }
  | { status: 'empty' }
  | { status: 'error'; message?: string };

const PRICE_FRACTION_DIGITS = { min: 2, max: 4 } as const;
const HOLDINGS_FRACTION_DIGITS = { min: 0, max: 6 } as const;

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
  'ALL': Number.POSITIVE_INFINITY, // 'ALL' handled separately
};

const PURCHASE_TYPES = new Set([0, 2]);
const SALE_TYPES = new Set([1, 3]);
const MARKER_COLOR_PURCHASE = 'var(--pp-reader-chart-marker-buy, #2e7d32)';
const MARKER_COLOR_SALE = 'var(--pp-reader-chart-marker-sell, #c0392b)';
const NEWS_PROMPT_PLACEHOLDER_FALLBACK = '{TICKER}';
const NEWS_PROMPT_FALLBACK_LINK = 'https://chatgpt.com/';

// --- Local Caches (Module Scope to persist state across renders) ---

const SECURITY_HISTORY_CACHE = new Map<string, Map<SecurityHistoryRangeKey, NormalizedHistoryEntry[]>>();
const SECURITY_HISTORY_MARKER_CACHE = new Map<
  string,
  Map<SecurityHistoryRangeKey, LineChartMarker[]>
>();
const RANGE_STATE_REGISTRY = new Map<string, SecurityHistoryRangeState>();
const HISTORY_CHART_INSTANCES = new WeakMap<HTMLElement, ReturnType<typeof renderLineChart>>();

export const __TEST_ONLY__ = {
  buildTradeMetaCard,
};

// --- Helper Functions Copied/Adapted from security_detail.ts ---

function ensureHistoryCache(securityUuid: string): Map<SecurityHistoryRangeKey, NormalizedHistoryEntry[]> {
  let cache = SECURITY_HISTORY_CACHE.get(securityUuid);
  if (!cache) {
    cache = new Map();
    SECURITY_HISTORY_CACHE.set(securityUuid, cache);
  }
  return cache;
}

function ensureHistoryMarkerCache(securityUuid: string): Map<SecurityHistoryRangeKey, LineChartMarker[]> {
  let cache = SECURITY_HISTORY_MARKER_CACHE.get(securityUuid);
  if (!cache) {
    cache = new Map();
    SECURITY_HISTORY_MARKER_CACHE.set(securityUuid, cache);
  }
  return cache;
}

function setActiveRange(securityUuid: string, rangeKey: SecurityHistoryRangeKey): void {
  const state = RANGE_STATE_REGISTRY.get(securityUuid);
  if (state) {
    state.activeRange = rangeKey;
  } else {
    RANGE_STATE_REGISTRY.set(securityUuid, { activeRange: rangeKey });
  }
}

function getActiveRange(securityUuid: string): SecurityHistoryRangeKey {
  return RANGE_STATE_REGISTRY.get(securityUuid)?.activeRange ?? DEFAULT_HISTORY_RANGE;
}

function normaliseDate(date: Date): Date {
  const clone = new Date(date.getTime());
  clone.setUTCHours(0, 0, 0, 0);
  return clone;
}

function toEpochDay(date: Date): number {
  const epochMs = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  return Math.floor(epochMs / 86400000);
}

function toHistoryDateCode(date: Date): number | null {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }
  return toEpochDay(normaliseDate(date));
}

function parseHistoryDate(raw: unknown): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : new Date(raw.getTime());
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const integerValue = Math.trunc(raw);
    if (integerValue >= 1_000_000 && integerValue <= 99_999_999) {
      const year = Math.floor(integerValue / 10_000);
      const month = Math.floor((integerValue % 10_000) / 100);
      const day = integerValue % 100;
      const candidate = new Date(Date.UTC(year, month - 1, day));
      return Number.isNaN(candidate.getTime()) ? null : candidate;
    }
    if (integerValue >= 0 && integerValue <= 100_000) {
      const candidate = new Date(integerValue * 86400000);
      return Number.isNaN(candidate.getTime()) ? null : normaliseDate(candidate);
    }
    if (integerValue > 1e12) return new Date(integerValue);
    if (integerValue > 1e9) return new Date(integerValue * 1000);
    return null;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (/^\d{1,6}$/.test(trimmed)) {
      const numeric = Number.parseInt(trimmed, 10);
      if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 100_000) {
        return normaliseDate(new Date(numeric * 86400000));
      }
    }
    if (/^\d{8}$/.test(trimmed)) {
      const year = Number.parseInt(trimmed.slice(0, 4), 10);
      const month = Number.parseInt(trimmed.slice(4, 6), 10) - 1;
      const day = Number.parseInt(trimmed.slice(6, 8), 10);
      return new Date(Date.UTC(year, month, day));
    }
  }
  return null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function toNonEmptyTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toUppercaseCode(value: unknown): string | null {
  const normalized = toNonEmptyTrimmedString(value);
  return normalized ? normalized.toUpperCase() : null;
}

function resolveRangeOptions(
  rangeKey: SecurityHistoryRangeKey,
  today: Date = new Date(),
): SecurityHistoryOptions {
  const now = normaliseDate(today instanceof Date ? today : new Date());
  const rangeDays = RANGE_DAY_COUNTS[rangeKey];
  const endDateCode = toHistoryDateCode(now);
  const options: SecurityHistoryOptions = {};
  if (endDateCode != null) {
    options.end_date = endDateCode;
  }

  if (Number.isFinite(rangeDays) && rangeDays > 0) {
    const start = new Date(now.getTime());
    start.setUTCDate(start.getUTCDate() - (rangeDays - 1));
    const startDateCode = toHistoryDateCode(start);
    if (startDateCode != null) {
      options.start_date = startDateCode;
    }
  }
  return options;
}

function normaliseHistorySeries(prices: unknown): NormalizedHistoryEntry[] {
  if (!Array.isArray(prices)) return [];
  return (prices as { close: unknown; date: unknown; close_raw?: unknown }[])
    .map((entry): NormalizedHistoryEntry | null => {
      let close = toFiniteNumber(entry.close);
      if (close == null) {
        const rawClose = toFiniteNumber(entry.close_raw);
        if (rawClose != null) close = rawClose / 1e8;
      }
      if (close == null) return null;
      const dateValue = parseHistoryDate(entry.date);
      return {
        date: dateValue ?? (entry.date as Date | string | number),
        close,
      };
    })
    .filter((entry): entry is NormalizedHistoryEntry => Boolean(entry));
}

function parseTransactionDate(raw: unknown): Date | null {
  const parsed = parseHistoryDate(raw);
  if (parsed) return parsed;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const isoParsed = Date.parse(trimmed);
    if (Number.isFinite(isoParsed)) return new Date(isoParsed);
  }
  return null;
}

function formatPrice(value: unknown): string {
  const numeric = toFiniteNumber(value);
  if (numeric == null) return '—';
  return numeric.toLocaleString('de-DE', {
    minimumFractionDigits: PRICE_FRACTION_DIGITS.min,
    maximumFractionDigits: PRICE_FRACTION_DIGITS.max,
  });
}

function formatHoldings(value: unknown): string {
  const numeric = toFiniteNumber(value);
  if (numeric == null) return '—';
  const hasFraction = Math.abs(numeric % 1) > 0;
  return numeric.toLocaleString('de-DE', {
    minimumFractionDigits: hasFraction ? 2 : HOLDINGS_FRACTION_DIGITS.min,
    maximumFractionDigits: hasFraction
      ? HOLDINGS_FRACTION_DIGITS.max
      : HOLDINGS_FRACTION_DIGITS.min,
  });
}

function normaliseTransactionMarkers(
  transactions: unknown,
  fallbackCurrency: string | null | undefined,
): LineChartMarker[] {
  if (!Array.isArray(transactions)) return [];

  const markers: LineChartMarker[] = [];
  const securityCurrency = toUppercaseCode(fallbackCurrency);
  const defaultCurrency = securityCurrency || 'EUR';

  (transactions as SecurityHistoryTransaction[]).forEach((tx, index) => {
    const typeValue = typeof tx.type === 'number' ? tx.type : Number(tx.type);
    const isPurchase = PURCHASE_TYPES.has(typeValue);
    const isSale = SALE_TYPES.has(typeValue);
    if (!isPurchase && !isSale) return;

    const parsedDate = parseTransactionDate(tx.date);
    const price = toFiniteNumber(tx.price);
    if (!parsedDate || price == null) return;

    const transactionCurrency = toUppercaseCode(tx.currency_code);
    const currency = securityCurrency ?? transactionCurrency ?? defaultCurrency;
    const shares = toFiniteNumber(tx.shares);
    const netPriceEur = toFiniteNumber(tx.net_price_eur);

    const typeLabel = isPurchase ? 'Kauf' : 'Verkauf';
    const sharesPart = shares != null ? `${formatHoldings(shares)} @ ` : '';
    const baseLabel = `${typeLabel} ${sharesPart}${formatPrice(price)} ${currency}`;
    const label =
      isSale && netPriceEur != null
        ? `${baseLabel} (netto ${formatPrice(netPriceEur)} EUR)`
        : baseLabel;

    const color = isPurchase ? MARKER_COLOR_PURCHASE : MARKER_COLOR_SALE;
    const markerId =
      (typeof tx.uuid === 'string' && tx.uuid.trim()) ||
      `${typeLabel}-${parsedDate.getTime().toString()}-${index.toString()}`;

    markers.push({
      id: markerId,
      x: parsedDate.getTime(),
      y: price,
      color,
      label,
      payload: {
        type: typeLabel,
        currency,
        transactionCurrency,
        shares,
        price,
        netPriceEur,
        date: parsedDate.toISOString(),
      },
    });
  });

  return markers;
}

function resolveRoundedTrendClass(
  value: number | null | undefined,
  decimals: number,
): 'positive' | 'negative' | 'neutral' {
  if (!isFiniteNumber(value) || value === 0) return 'neutral';
  const threshold = 0.5 / Math.pow(10, decimals);
  if (Math.abs(value) < threshold) return 'neutral';
  return value > 0 ? 'positive' : 'negative';
}

function formatPriceChangeValue(
  value: number | null,
  currency: string | null | undefined,
): string {
  if (!isFiniteNumber(value)) return '<span class="value neutral">—</span>';
  const formatted = formatPrice(value);
  if (formatted === '—') return '<span class="value neutral">—</span>';
  const trendClass = resolveRoundedTrendClass(value, PRICE_FRACTION_DIGITS.max);
  const suffix = currency ? `&nbsp;${escapeHtml(currency)}` : '';
  return `<span class="value ${trendClass}">${formatted}${suffix}</span>`;
}

function formatPercentageChangeValue(value: number | null): string {
  if (!isFiniteNumber(value)) return '<span class="value neutral">—</span>';
  const trendClass = resolveRoundedTrendClass(value, 2);
  return `<span class="value ${trendClass} value--percentage">${formatNumber(value)}&nbsp;%</span>`;
}

function computePercentageChange(current: number | null, reference: number | null): number | null {
  if (!isFiniteNumber(reference) || reference === 0 || !isFiniteNumber(current)) return null;
  return ((current - reference) / reference) * 100;
}

function computePriceChangeMetrics(
  historySeries: readonly NormalizedHistoryEntry[],
  lastPrice: number | null,
): { priceChange: number | null; priceChangePct: number | null } {
  if (historySeries.length === 0) return { priceChange: null, priceChangePct: null };
  const firstEntry = historySeries[0];
  const baseline = toFiniteNumber(firstEntry.close);
  if (!isFiniteNumber(baseline) || baseline === 0) return { priceChange: null, priceChangePct: null };

  const lastEntry = historySeries[historySeries.length - 1];
  const fallbackLast = toFiniteNumber(lastEntry.close);
  const effectiveLast = toFiniteNumber(lastPrice) ?? fallbackLast;

  if (!isFiniteNumber(effectiveLast)) return { priceChange: null, priceChangePct: null };

  const rawDelta = effectiveLast - baseline;
  const priceChange = Object.is(rawDelta, -0) ? 0 : rawDelta;
  const priceChangePct = computePercentageChange(effectiveLast, baseline);

  return { priceChange, priceChangePct };
}

function buildInfoBar(
  rangeKey: SecurityHistoryRangeKey,
  priceChange: number | null,
  priceChangePct: number | null,
  currency: string | null | undefined,
): string {
  const rangeLabel = rangeKey;
  const rangeCaption = rangeLabel.length > 0 ? rangeLabel : 'Zeitraum';
  return `
    <div class="security-info-bar" data-range="${escapeAttribute(rangeLabel)}">
      <div class="security-info-item">
        <span class="label">Preisänderung (${escapeHtml(rangeCaption)})</span>
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
        data-range="${escapeAttribute(rangeKey)}"
        aria-pressed="${rangeKey === activeRange ? 'true' : 'false'}"
      >
        ${escapeHtml(rangeKey)}
      </button>
    `;
  });
  return `
    <div class="security-range-selector" role="group" aria-label="Zeitraum">
      ${buttons.join('\n')}
    </div>
  `;
}

function formatErrorLabel(error: unknown, fallback = 'Unbekannter Fehler'): string {
  if (typeof error === 'string') return error.trim() || fallback;
  if (error instanceof Error) return error.message.trim() || fallback;
  return fallback;
}

function buildHistoryPlaceholder(
  rangeKey: SecurityHistoryRangeKey,
  state: HistoryPlaceholderState = { status: 'empty' },
): string {
  const safeRange = escapeAttribute(rangeKey);
  switch (state.status) {
    case 'loaded':
      return `<div class="history-chart" data-state="loaded" data-range="${safeRange}" role="img"></div>`;
    case 'error':
      return `<div class="history-placeholder" data-state="error"><p>${escapeHtml(formatErrorLabel(state.message))}</p></div>`;
    case 'empty':
    default:
      return `<div class="history-placeholder" data-state="empty"><p>Keine historischen Daten verfügbar.</p></div>`;
  }
}

function getHistoryChartOptions(
  host: HTMLElement,
  series: readonly NormalizedHistoryEntry[],
  options: {
    currency?: string | null | undefined;
    baseline?: number | null | undefined;
    markers?: readonly LineChartMarker[];
  } = {},
): LineChartOptions {
  const measuredWidth = host.clientWidth || host.offsetWidth || 0;
  const width = measuredWidth > 0 ? measuredWidth : 640;
  const height = Math.min(Math.max(Math.floor(width * 0.5), 240), 440);
  const safeCurrency = (options.currency || '').toUpperCase() || 'EUR';
  const baselineValue = isFiniteNumber(options.baseline) ? options.baseline : null;
  const marginLeft = Math.max(48, Math.min(72, Math.round(width * 0.075)));

  return {
    width,
    height,
    margin: { top: 18, right: Math.max(28, Math.round(width * 0.05)), bottom: 40, left: marginLeft },
    series,
    yFormatter: (value) => formatPrice(value),
    tooltipRenderer: ({ xFormatted, yFormatted }) => `
      <div class="chart-tooltip-date">${escapeHtml(xFormatted)}</div>
      <div class="chart-tooltip-value">${escapeHtml(yFormatted)}&nbsp;${escapeHtml(safeCurrency)}</div>
    `,
    baseline: baselineValue != null ? { value: baselineValue, includeInDomain: false } : null,
    markers: Array.isArray(options.markers) ? options.markers : [],
  };
}

function renderHistoryChart(
  host: HTMLElement,
  series: readonly NormalizedHistoryEntry[],
  options: { currency?: string | null; baseline?: number | null; markers?: readonly LineChartMarker[] } = {},
): void {
  if (series.length === 0) return;
  const chartOptions = getHistoryChartOptions(host, series, options);
  let chartContainer = HISTORY_CHART_INSTANCES.get(host) ?? null;
  if (!chartContainer || !host.contains(chartContainer)) {
    host.innerHTML = '';
    chartContainer = renderLineChart(host, chartOptions);
    if (chartContainer) HISTORY_CHART_INSTANCES.set(host, chartContainer);
    return;
  }
  updateLineChart(chartContainer, chartOptions);
}

// --- Trade Specific UI ---



function buildTradeMetaCard(trade: RealizedTrade): string {
  // Letzter Verkaufspreis Calculation
  // 1. Find the last executed lot
  // Filter lots to find the last sell transaction. Ideally backend provides this reliability.
  // We'll trust trade.lots if available, else fallback to trade.last_sell_price (aggregate).
  let grossNative: number | null = null;
  let grossEur: number | null = null;
  let netEur: number | null = null;

  if (trade.lots.length > 0) {
    // Sort lots by date to ensure we pick the last one
    const sortedLots = [...trade.lots].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const lastLot = sortedLots[sortedLots.length - 1];

    grossNative = toFiniteNumber(lastLot.sell_price_native) ?? null;
    grossEur = toFiniteNumber(lastLot.sell_price) ?? null;
    const netTotal = toFiniteNumber(lastLot.sales_value_net);
    const shares = toFiniteNumber(lastLot.shares);
    if (netTotal != null && shares != null && shares > 0) {
      netEur = netTotal / shares;
    }
  }

  // Fallback to top-level if lots logic failed or lots empty
  if (grossEur == null) {
    grossEur = toFiniteNumber(trade.last_sell_price);
  }
  if (grossNative == null) {
    grossNative = toFiniteNumber(trade.last_sell_price_native);
  }

  const currency = trade.currency_code;
  const values: string[] = [];

  // Line 1: [Gross Native/Eur] [Curr] (Netto: [Net Eur] EUR)
  // If native is available, use it. Else EUR.
  // Exception: If Native == EUR, we use EUR.
  let line1Value = grossNative;
  let line1Curr = currency;
  if (!isFiniteNumber(line1Value)) {
    line1Value = grossEur;
    line1Curr = 'EUR';
  } else if (currency === 'EUR') {
    line1Value = grossEur; // Ensure consistency
    line1Curr = 'EUR';
  }

  if (isFiniteNumber(line1Value)) {
    let line1Html = `${formatPrice(line1Value)} ${line1Curr ? escapeHtml(line1Curr) : ''}`;

    const isFx = line1Curr !== 'EUR';

    if (!isFx && isFiniteNumber(netEur)) {
      line1Html += ` <span class="secondary-text" style="font-size: 0.85em; opacity: 0.8;">(Netto: ${formatPrice(netEur)} EUR)</span>`;
    }
    values.push(`<span class="value value--price">${line1Html}</span>`);
  } else {
    values.push('<span class="value neutral">—</span>');
  }

  // Line 2: [Gross Eur] EUR (only if different from Line 1)
  // Logic: Show if Line 1 was Non-EUR.
  if (line1Curr !== 'EUR' && isFiniteNumber(grossEur) && isFiniteNumber(line1Value)) {
    let line2Html = `${formatPrice(grossEur)} €`;

    if (isFiniteNumber(netEur)) {
      line2Html += ` <span class="secondary-text" style="font-size: 0.85em; opacity: 0.8;">(Netto: ${formatPrice(netEur)} EUR)</span>`;
    }

    values.push(`<span class="value value--average value--average-eur" style="display: block; font-size: 0.85em; margin-top: 2px;">${line2Html}</span>`);
  }

  const lastSellPriceDisplay = values.join('');

  // Letzter Preis (aktueller Marktpreis wenn verfügbar)
  const currentPrice = toFiniteNumber(trade.current_price);
  let currentPriceDisplay = '—';
  if (currentPrice != null) {
    currentPriceDisplay = `${formatPrice(currentPrice)} ${currency ? escapeHtml(currency) : ''}`;
  }

  const changeAbs = toFiniteNumber(trade.since_sell_abs);
  const changePct = toFiniteNumber(trade.since_sell_pct);
  let changeDisplay = '';
  if (changeAbs != null && changePct != null) {
    const absClass = resolveRoundedTrendClass(changeAbs, 2);
    const pctClass = resolveRoundedTrendClass(changePct, 2);
    changeDisplay = `
      <span class="value ${absClass}">${formatPrice(changeAbs)} €</span>
      <span class="value ${pctClass} value--percentage">${formatNumber(changePct)} %</span>
    `;
  } else {
    changeDisplay = '<span class="value neutral">—</span>';
  }

  // Matching security-meta-grid layout
  return `
    <div class="card security-meta-card">
      <div id="headerMeta" class="meta">
        <div class="security-meta-grid security-meta-grid--expanded">
          <div class="security-meta-item">
            <span class="label">Letzter Preis</span>
            <div class="value-group"><span class="value value--price">${currentPriceDisplay}</span></div>
          </div>
          <div class="security-meta-item">
            <span class="label">Letzter Verkaufspreis</span>
            <div class="value-group" style="display: flex; flex-direction: column; align-items: flex-start;">${lastSellPriceDisplay}</div>
          </div>
          <div class="security-meta-item">
            <span class="label">Änderung seit Verkauf</span>
            <div class="value-group">${changeDisplay}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// --- Dynamics & Interactions ---

function updateInfoBarContent(
  root: HTMLElement,
  rangeKey: SecurityHistoryRangeKey,
  priceChange: number | null,
  priceChangePct: number | null,
  currency: string | null | undefined,
): void {
  const infoBar = root.querySelector('.security-info-bar');
  if (!infoBar || !infoBar.parentElement) return;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = buildInfoBar(rangeKey, priceChange, priceChangePct, currency).trim();
  const fresh = wrapper.firstElementChild;
  if (fresh) infoBar.parentElement.replaceChild(fresh, infoBar);
}

function updateHistoryPlaceholder(
  root: HTMLElement,
  rangeKey: SecurityHistoryRangeKey,
  state: HistoryPlaceholderState,
  historySeries: readonly NormalizedHistoryEntry[],
  options: { currency?: string | null; baseline?: number | null; markers?: readonly LineChartMarker[] } = {},
): void {
  const placeholderContainer = root.querySelector('.security-detail-placeholder');
  if (!placeholderContainer) return;

  placeholderContainer.innerHTML = `
    <h2>Historie</h2>
    ${buildHistoryPlaceholder(rangeKey, state)}
  `;

  if (state.status === 'loaded' && Array.isArray(historySeries) && historySeries.length) {
    const host = placeholderContainer.querySelector<HTMLElement>('.history-chart');
    if (host) {
      requestAnimationFrame(() => { renderHistoryChart(host, historySeries, options); });
    }
  }
}

function updateRangeButtons(container: HTMLElement | null, activeRange: SecurityHistoryRangeKey): void {
  if (!container) return;
  container.querySelectorAll<HTMLButtonElement>('.security-range-button').forEach((button) => {
    const rangeKey = button.dataset.range as SecurityHistoryRangeKey | undefined;
    const isActive = rangeKey === activeRange;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    button.disabled = false;
    button.classList.remove('loading');
    if (rangeKey) button.textContent = rangeKey;
  });
}

function scheduleRangeSetup(options: {
  root: HTMLElement;
  hass: HomeAssistant | null | undefined;
  panelConfig: PanelConfigLike | null | undefined;
  securityUuid: string;
  currencyCode?: string;
  baseline?: number | null;
}): void {
  const { root, hass, panelConfig, securityUuid, currencyCode, baseline } = options;

  setTimeout(() => {
    const rangeSelector = root.querySelector<HTMLElement>('.security-range-selector');
    if (!rangeSelector) return;

    // Load caches if empty
    const cache = ensureHistoryCache(securityUuid);
    const markerCache = ensureHistoryMarkerCache(securityUuid);

    const loadDataForRange = async (rangeKey: SecurityHistoryRangeKey) => {
      const rangeOptions = resolveRangeOptions(rangeKey);
      const historyResponse = await fetchSecurityHistoryWS(hass, panelConfig, securityUuid, rangeOptions);
      const historySeries = normaliseHistorySeries(historyResponse.prices);
      const markers = normaliseTransactionMarkers(historyResponse.transactions, currencyCode);
      cache.set(rangeKey, historySeries);
      markerCache.set(rangeKey, markers);
      return { historySeries, markers };
    };

    const display = (rangeKey: SecurityHistoryRangeKey) => {
      const historySeries = cache.get(rangeKey) ?? [];
      const markers = markerCache.get(rangeKey) ?? [];
      const state: HistoryPlaceholderState = historySeries.length ? { status: 'loaded' } : { status: 'empty' };
      const { priceChange, priceChangePct } = computePriceChangeMetrics(historySeries, baseline ?? null); // Use baseline as proxy for last price if needed, or calc from series

      setActiveRange(securityUuid, rangeKey);
      updateRangeButtons(rangeSelector, rangeKey);
      updateInfoBarContent(root, rangeKey, priceChange, priceChangePct, currencyCode);
      updateHistoryPlaceholder(root, rangeKey, state, historySeries, {
        currency: currencyCode,
        baseline: baseline ?? undefined,
        markers,
      });
    };

    // Initial display handled by main render, this is for interaction

    rangeSelector.addEventListener('click', (event) => {
      void (async () => {
        const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.security-range-button');
        if (!button || button.disabled) return;

        const rangeKey = button.dataset.range as SecurityHistoryRangeKey | undefined;
        if (!rangeKey || !AVAILABLE_HISTORY_RANGES.includes(rangeKey)) return;
        if (rangeKey === getActiveRange(securityUuid)) return;

        button.disabled = true;
        button.classList.add('loading');
        button.innerHTML = createInlineSpinner();

        try {
          if (!cache.has(rangeKey)) {
            await loadDataForRange(rangeKey);
          }
          display(rangeKey);
        } catch (e) {
          console.error('Failed to load history range', e);
          // Fallback or error state
          setActiveRange(securityUuid, rangeKey);
          updateRangeButtons(rangeSelector, rangeKey);
          updateHistoryPlaceholder(root, rangeKey, { status: 'error', message: 'Laden fehlgeschlagen' }, [], { currency: currencyCode });
        }
      })();
    });

  }, 0);
}

// --- News Prompt (Copied from security_detail) ---

async function copyTextToClipboard(text: string): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch { /* ignore */ }
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const successful = document.execCommand('copy');
  document.body.removeChild(textarea);
  return successful;
}

function buildNewsPromptButton(tickerSymbol: string): string {
  const safeSymbol = escapeAttribute(tickerSymbol);
  return `
    <div class="news-prompt-container">
      <button type="button" class="news-prompt-button" data-symbol="${safeSymbol}">
        Copy prompt &amp; open ChatGPT
      </button>
    </div>
  `;
}

function scheduleNewsPromptSetup(options: {
  root: HTMLElement;
  hass: HomeAssistant | null | undefined;
  panelConfig: PanelConfigLike | null | undefined;
  tickerSymbol: string;
}): void {
  const { root, hass, panelConfig, tickerSymbol } = options;
  let cachedPrompt: NewsPromptResponse | null = null;

  const preloadPrompt = async () => {
    try { cachedPrompt = await fetchNewsPromptWS(hass, panelConfig); } catch (e) { console.warn(e); }
  };
  void preloadPrompt();

  setTimeout(() => {
    const button = root.querySelector<HTMLButtonElement>('.news-prompt-button');
    if (!button) return;

    button.addEventListener('click', () => {
      void (async () => {
        const symbol = (button.dataset.symbol || tickerSymbol || '').trim();
        if (!symbol || button.classList.contains('loading')) return;

        button.disabled = true;
        button.classList.add('loading');
        const originalText = button.textContent;

        try {
          const placeholder = (cachedPrompt?.placeholder || NEWS_PROMPT_PLACEHOLDER_FALLBACK).trim() || NEWS_PROMPT_PLACEHOLDER_FALLBACK;
          const template = (cachedPrompt?.prompt_template || '').trim();
          const body = template
            ? (template.includes(placeholder) ? template.split(placeholder).join(symbol) : `${template}\n\nTicker: ${symbol}`)
            : `Ticker: ${symbol}`;

          await copyTextToClipboard(body);
          button.textContent = '✅ Copied! Opening...';
          await new Promise(r => setTimeout(r, 800));

          const link = (cachedPrompt?.link || '').trim() || NEWS_PROMPT_FALLBACK_LINK;
          window.open(link, '_blank');
        } catch (e) {
          console.error(e);
        } finally {
          button.classList.remove('loading');
          button.disabled = false;
          if (originalText) setTimeout(() => { button.textContent = originalText; }, 2000);
        }
      })();
    });
  }, 0);
}

// --- Main Render Function ---

const STYLES = `
<style>
  .trade-detail-container {
    user-select: none;
  }
</style>
`;

async function renderTradeDetail(
  root: HTMLElement,
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
  securityUuid: string | null | undefined,
): Promise<string> {
  if (!securityUuid) {
    return '<div class="card"><h2>Fehler</h2><p>Kein Wertpapier angegeben.</p></div>';
  }

  // 1. Fetch Trade Data
  const trades = await fetchRealizedPerformance(hass, panelConfig);
  const trade = trades.find(t => t.security_uuid === securityUuid);

  if (!trade) {
    return '<div class="card"><h2>Fehler</h2><p>Trade-Daten nicht gefunden.</p></div>';
  }

  // 2. Fetch History & Markers for Initial Range
  // Need ticker symbol from snapshot or trade data? Trade has ticker_symbol.
  // Using '1Y' as default initial range or last active
  const activeRange = getActiveRange(securityUuid);
  const rangeOptions = resolveRangeOptions(activeRange);

  let historySeries: NormalizedHistoryEntry[] = [];
  let markers: LineChartMarker[] = [];
  let historyState: HistoryPlaceholderState = { status: 'empty' };

  // Check cache first
  const cache = ensureHistoryCache(securityUuid);
  const markerCache = ensureHistoryMarkerCache(securityUuid);

  if (cache.has(activeRange)) {
    historySeries = cache.get(activeRange) ?? [];
    markers = markerCache.get(activeRange) ?? [];
    historyState = { status: historySeries.length ? 'loaded' : 'empty' };
  } else {
    try {
      const historyResponse = await fetchSecurityHistoryWS(hass, panelConfig, securityUuid, rangeOptions);
      historySeries = normaliseHistorySeries(historyResponse.prices);
      markers = normaliseTransactionMarkers(historyResponse.transactions, trade.currency_code);

      cache.set(activeRange, historySeries);
      markerCache.set(activeRange, markers);
      historyState = { status: historySeries.length ? 'loaded' : 'empty' };
    } catch (err) {
      console.error('Error fetching trade history', err);
      historyState = { status: 'error', message: formatErrorLabel(err) };
    }
  }

  // 3. Construct UI Elements

  // Header with centered name (passing name to createHeaderCard)
  // Header with centered name (passing name to createHeaderCard)
  const headerCard = createHeaderCard(trade.name, '', {
    includeMeta: false,
    subtitle: 'Watchlist Details',
  });
  headerCard.classList.add('security-detail-header'); // Reuse security detail styling if global

  const metaCard = buildTradeMetaCard(trade);

  const priceChangeMetrics = computePriceChangeMetrics(historySeries, null); // null -> use last entry
  const infoBar = buildInfoBar(activeRange, priceChangeMetrics.priceChange, priceChangeMetrics.priceChangePct, trade.currency_code);

  const rangeSelector = buildRangeSelector(activeRange);
  const historyPlaceholder = buildHistoryPlaceholder(activeRange, historyState);

  const tickerSymbol = trade.ticker_symbol || trade.name;
  const newsPrompt = buildNewsPromptButton(tickerSymbol);

  const content = `
    <div class="trade-detail-container">
      ${STYLES}
      ${headerCard.outerHTML}
      ${metaCard}
      ${newsPrompt}
      ${infoBar}
      ${rangeSelector}
      <div class="card security-detail-placeholder">
        <h2>Historie</h2>
        ${historyPlaceholder}
      </div>
    </div>
  `;

  // 4. Schedule Hydration
  setTimeout(() => {
    // Initial Chart Render
    const placeholderContainer = root.querySelector('.security-detail-placeholder .history-chart');
    if (placeholderContainer && historyState.status === 'loaded') {
      renderHistoryChart(placeholderContainer as HTMLElement, historySeries, {
        currency: trade.currency_code,
        baseline: toFiniteNumber(trade.last_sell_price_native) ?? trade.last_sell_price,
        markers
      });
    }

    // Interactive Components
    scheduleRangeSetup({
      root,
      hass,
      panelConfig,
      securityUuid,
      currencyCode: trade.currency_code,
      baseline: toFiniteNumber(trade.last_sell_price_native) ?? trade.last_sell_price,
    });

    scheduleNewsPromptSetup({
      root,
      hass,
      panelConfig,
      tickerSymbol,
    });
  }, 0);

  return content;
}


interface RegisterTradeDetailTabOptions {
  setTradeDetailTabFactory?: ((
    factory: (securityUuid: string) => {
      title: string;
      render: DashboardTabRenderFn;
      cleanup: (context?: { key: string }) => void;
    },
  ) => void) | null;
}

export function registerTradeDetailTab(options: RegisterTradeDetailTabOptions): void {
  const { setTradeDetailTabFactory } = options;

  if (typeof setTradeDetailTabFactory !== 'function') {
    console.error('registerTradeDetailTab: Ungültige Factory-Funktion übergeben');
    return;
  }

  setTradeDetailTabFactory((securityUuid: string) => ({
    title: 'Trade-Details',
    render: (root: HTMLElement, hass: HomeAssistant | null | undefined, panelConfig: PanelConfigLike | null | undefined) =>
      renderTradeDetail(root, hass, panelConfig, securityUuid),
    cleanup: () => {
      // Clean up caches? Maybe keep them for user convenience when going back/forth
    },
  }));
}
