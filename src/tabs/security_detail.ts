// @ts-nocheck

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
import { createHeaderCard, formatNumber, formatGain } from '../content/elements.js';
import { renderLineChart, updateLineChart } from '../content/charting.js';
import { fetchSecuritySnapshotWS, fetchSecurityHistoryWS } from '../data/api.js';

const HOLDINGS_FRACTION_DIGITS = { min: 0, max: 6 };
const PRICE_FRACTION_DIGITS = { min: 2, max: 4 };
const PRICE_SCALE = 1e8;
const DEFAULT_HISTORY_RANGE = '1Y';
const AVAILABLE_HISTORY_RANGES = ['1M', '6M', '1Y', '5Y'];
const RANGE_DAY_COUNTS = {
  '1M': 30,
  '6M': 182,
  '1Y': 365,
  '5Y': 1826,
};

const SECURITY_HISTORY_CACHE = new Map(); // securityUuid -> Map(rangeKey -> series[])
const RANGE_STATE_REGISTRY = new Map(); // securityUuid -> { activeRange }
const LIVE_UPDATE_EVENT = 'pp-reader:portfolio-positions-updated';
const LIVE_UPDATE_HANDLERS = new Map(); // securityUuid -> handler

function buildCachedSnapshotNotice({ fallbackUsed, flaggedAsCache }) {
  const reasons = [];
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

function getCachedSecuritySnapshot(securityUuid) {
  if (!securityUuid || typeof window === 'undefined') {
    return null;
  }

  try {
    const getter = window.__ppReaderGetSecuritySnapshotFromCache;
    if (typeof getter === 'function') {
      const snapshot = getter(securityUuid);
      return snapshot && typeof snapshot === 'object' ? snapshot : null;
    }
  } catch (error) {
    console.warn('getCachedSecuritySnapshot: Zugriff auf Cache fehlgeschlagen', error);
  }

  return null;
}

function ensureHistoryCache(securityUuid) {
  if (!SECURITY_HISTORY_CACHE.has(securityUuid)) {
    SECURITY_HISTORY_CACHE.set(securityUuid, new Map());
  }
  return SECURITY_HISTORY_CACHE.get(securityUuid);
}

function invalidateHistoryCache(securityUuid) {
  if (!securityUuid) {
    return;
  }

  if (SECURITY_HISTORY_CACHE.has(securityUuid)) {
    try {
      const cache = SECURITY_HISTORY_CACHE.get(securityUuid);
      if (cache && typeof cache.clear === 'function') {
        cache.clear();
      }
    } catch (error) {
      console.warn('invalidateHistoryCache: Konnte Cache nicht leeren', securityUuid, error);
    }
    SECURITY_HISTORY_CACHE.delete(securityUuid);
  }
}

function handleLiveUpdateForSecurity(securityUuid, detail) {
  if (!securityUuid || !detail) {
    return;
  }

  const payload = detail.securityUuids;
  const candidates = Array.isArray(payload) ? payload : [];

  if (candidates.includes(securityUuid)) {
    invalidateHistoryCache(securityUuid);
  }
}

function ensureLiveUpdateSubscription(securityUuid) {
  if (!securityUuid || LIVE_UPDATE_HANDLERS.has(securityUuid)) {
    return;
  }

  const handler = (event) => {
    if (!event || !event.detail) {
      return;
    }
    handleLiveUpdateForSecurity(securityUuid, event.detail);
  };

  try {
    window.addEventListener(LIVE_UPDATE_EVENT, handler);
    LIVE_UPDATE_HANDLERS.set(securityUuid, handler);
  } catch (error) {
    console.error('ensureLiveUpdateSubscription: Registrierung fehlgeschlagen', error);
  }
}

function removeLiveUpdateSubscription(securityUuid) {
  if (!securityUuid || !LIVE_UPDATE_HANDLERS.has(securityUuid)) {
    return;
  }

  const handler = LIVE_UPDATE_HANDLERS.get(securityUuid);
  try {
    window.removeEventListener(LIVE_UPDATE_EVENT, handler);
  } catch (error) {
    console.error('removeLiveUpdateSubscription: Entfernen des Listeners fehlgeschlagen', error);
  }

  LIVE_UPDATE_HANDLERS.delete(securityUuid);
}

function cleanupSecurityDetailState(securityUuid) {
  if (!securityUuid) {
    return;
  }

  removeLiveUpdateSubscription(securityUuid);
  invalidateHistoryCache(securityUuid);
  // RANGE_STATE_REGISTRY intentionally left intact so the last chosen
  // range remains active when the user reopens the security detail.
}

function setActiveRange(securityUuid, rangeKey) {
  if (!RANGE_STATE_REGISTRY.has(securityUuid)) {
    RANGE_STATE_REGISTRY.set(securityUuid, { activeRange: rangeKey });
    return;
  }
  const state = RANGE_STATE_REGISTRY.get(securityUuid);
  state.activeRange = rangeKey;
}

function getActiveRange(securityUuid) {
  return RANGE_STATE_REGISTRY.get(securityUuid)?.activeRange || DEFAULT_HISTORY_RANGE;
}

function toEpochDay(date) {
  // Portfolio Performance liefert Datumswerte als epoch day (Tage seit 1970-01-01).
  // Vorher wurde ein "YYYYMMDD" Format verwendet, wodurch alle Filter leer liefen
  // und die Historie im Frontend dauerhaft als leer angezeigt wurde. Mit der
  // Umstellung auf eine echte Epoch-Day-Berechnung sprechen Frontend und Backend
  // wieder dieselbe Sprache und historische Kurse werden korrekt geladen.
  const epochMs = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  return Math.floor(epochMs / 86400000);
}

function normaliseDate(date) {
  const clone = new Date(date.getTime());
  clone.setUTCHours(0, 0, 0, 0);
  return clone;
}

function resolveRangeOptions(rangeKey) {
  const now = normaliseDate(new Date());
  const rangeDays = RANGE_DAY_COUNTS[rangeKey];
  const options = { end_date: toEpochDay(now) };

  if (Number.isFinite(rangeDays) && rangeDays > 0) {
    const start = new Date(now.getTime());
    start.setUTCDate(start.getUTCDate() - (rangeDays - 1));
    options.start_date = toEpochDay(start);
  }

  return options;
}

function parseHistoryDate(raw) {
  if (!raw) {
    return null;
  }

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return new Date(raw.getTime());
  }

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    // Backend liefert Epoch Days (Tage seit 1970-01-01).
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

function normaliseHistorySeries(prices) {
  if (!Array.isArray(prices)) {
    return [];
  }

  return prices
    .map(entry => {
      const rawClose = Number(entry?.close);
      if (!Number.isFinite(rawClose)) {
        return null;
      }

      const dateValue = parseHistoryDate(entry?.date);

      return {
        date: dateValue || entry?.date,
        close: rawClose / PRICE_SCALE,
      };
    })
    .filter(Boolean);
}

function deriveFxRate(snapshot, latestNativePrice) {
  const currency = String(snapshot?.currency_code || '').toUpperCase();
  if (!currency || currency === 'EUR') {
    // Kein Fremdwährungsrisiko – Werte liegen bereits in EUR vor.
    return 1;
  }

  const lastPriceEurRaw = snapshot?.last_price_eur;
  const lastPriceEur = Number.isFinite(lastPriceEurRaw)
    ? lastPriceEurRaw
    : Number.parseFloat(lastPriceEurRaw);

  if (!Number.isFinite(lastPriceEur) || lastPriceEur <= 0) {
    // Ohne EUR-Referenzkurs können wir nicht in EUR umrechnen.
    return null;
  }

  const snapshotNativeRaw = snapshot?.last_price_native;
  const snapshotNative = Number.isFinite(snapshotNativeRaw)
    ? snapshotNativeRaw
    : Number.parseFloat(snapshotNativeRaw);

  if (Number.isFinite(snapshotNative) && snapshotNative > 0) {
    return lastPriceEur / snapshotNative;
  }

  const historyNative = Number.isFinite(latestNativePrice)
    ? latestNativePrice
    : Number.parseFloat(latestNativePrice);
  if (Number.isFinite(historyNative) && historyNative > 0) {
    return lastPriceEur / historyNative;
  }

  return null;
}

function roundCurrency(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function computeGainValues(historySeries, holdings, fxRate) {
  if (!Array.isArray(historySeries) || historySeries.length === 0) {
    return { periodGain: null, dailyGain: null };
  }

  const holdingsNumeric = Number.isFinite(holdings)
    ? holdings
    : Number.parseFloat(holdings);
  const safeHoldings = Number.isFinite(holdingsNumeric) ? holdingsNumeric : 0;
  const safeFx = Number.isFinite(fxRate) && fxRate > 0 ? fxRate : null;

  if (safeFx == null) {
    return { periodGain: null, dailyGain: null };
  }

  const lastEntry = historySeries[historySeries.length - 1];
  const firstEntry = historySeries[0];
  const previousEntry =
    historySeries.length >= 2 ? historySeries[historySeries.length - 2] : null;

  const periodDiff = (lastEntry.close - firstEntry.close) * safeHoldings * safeFx;
  const dailyDiff = previousEntry
    ? (lastEntry.close - previousEntry.close) * safeHoldings * safeFx
    : null;

  return {
    periodGain: roundCurrency(periodDiff),
    dailyGain: roundCurrency(dailyDiff),
  };
}

function formatGainValue(value) {
  if (value == null || Number.isNaN(value)) {
    return '<span class="value neutral">—</span>';
  }

  return `<span class="value">${formatGain(value)}</span>`;
}

function buildInfoBar(rangeKey, periodGain, dailyGain) {
  const rangeLabel = rangeKey ? rangeKey : '';
  return `
    <div class="security-info-bar" data-range="${rangeLabel}">
      <div class="security-info-item">
        <span class="label">Gesamt (${rangeLabel || 'Zeitraum'})</span>
        ${formatGainValue(periodGain)}
      </div>
      <div class="security-info-item">
        <span class="label">Letzter Tag</span>
        ${formatGainValue(dailyGain)}
      </div>
    </div>
  `;
}

function buildRangeSelector(activeRange) {
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

function buildHistoryPlaceholder(rangeKey, state = { status: 'empty' }) {
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

function formatHoldings(value) {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }

  const numeric = Number.isFinite(value) ? value : Number.parseFloat(value) || 0;
  const hasFraction = Math.abs(numeric % 1) > 0;
  const minFraction = hasFraction ? 2 : HOLDINGS_FRACTION_DIGITS.min;
  const maxFraction = hasFraction ? HOLDINGS_FRACTION_DIGITS.max : HOLDINGS_FRACTION_DIGITS.min;
  return numeric.toLocaleString('de-DE', {
    minimumFractionDigits: minFraction,
    maximumFractionDigits: maxFraction,
  });
}

function formatPrice(value) {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }

  const numeric = Number.isFinite(value) ? value : Number.parseFloat(value) || 0;
  return numeric.toLocaleString('de-DE', {
    minimumFractionDigits: PRICE_FRACTION_DIGITS.min,
    maximumFractionDigits: PRICE_FRACTION_DIGITS.max,
  });
}

function buildHeaderMeta(snapshot) {
  if (!snapshot) {
    return '<div class="meta-error">Keine Snapshot-Daten verfügbar.</div>';
  }

  const currency = snapshot.currency_code || 'EUR';
  const holdings = formatHoldings(snapshot.total_holdings);
  const lastPriceNative =
    snapshot.last_price_native ?? snapshot.last_price?.native ?? snapshot.last_price_eur;
  const formattedLastPrice = formatPrice(lastPriceNative);
  const lastPriceDisplay =
    formattedLastPrice === '—'
      ? '—'
      : `${formattedLastPrice}${currency ? `&nbsp;${currency}` : ''}`;
  const marketValue = formatNumber(
    snapshot.market_value_eur ?? snapshot.current_value_eur ?? 0,
  );

  return `
    <div class="security-meta-grid">
      <div class="security-meta-item">
        <span class="label">Währung</span>
        <span class="value">${currency}</span>
      </div>
      <div class="security-meta-item">
        <span class="label">Bestand</span>
        <span class="value">${holdings}</span>
      </div>
      <div class="security-meta-item">
        <span class="label">Letzter Preis (${currency})</span>
        <span class="value">${lastPriceDisplay}</span>
      </div>
      <div class="security-meta-item">
        <span class="label">Marktwert (EUR)</span>
        <span class="value">${marketValue}&nbsp;€</span>
      </div>
    </div>
  `;
}

function normaliseHistoryError(error) {
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

export async function renderSecurityDetail(root, hass, panelConfig, securityUuid) {
  if (!securityUuid) {
    console.error('renderSecurityDetail: securityUuid fehlt');
    return '<div class="card"><h2>Fehler</h2><p>Kein Wertpapier angegeben.</p></div>';
  }

  const cachedSnapshot = getCachedSecuritySnapshot(securityUuid);
  let snapshot = null;
  let error = null;

  try {
    const response = await fetchSecuritySnapshotWS(
      hass,
      panelConfig,
      securityUuid,
    );
    if (response && typeof response === 'object') {
      snapshot =
        response.snapshot && typeof response.snapshot === 'object'
          ? response.snapshot
          : response;
    } else {
      snapshot = response;
    }
  } catch (err) {
    console.error('renderSecurityDetail: Snapshot konnte nicht geladen werden', err);
    error = err instanceof Error ? err.message : String(err);
  }

  const effectiveSnapshot = snapshot || cachedSnapshot;
  const fallbackUsed = Boolean(cachedSnapshot && !snapshot);
  const flaggedAsCache = effectiveSnapshot?.source === 'cache';
  const staleNotice =
    effectiveSnapshot && (fallbackUsed || flaggedAsCache)
      ? buildCachedSnapshotNotice({ fallbackUsed, flaggedAsCache })
      : '';
  const headerTitle = effectiveSnapshot?.name || 'Wertpapierdetails';
  const headerCard = createHeaderCard(headerTitle, buildHeaderMeta(effectiveSnapshot));

  if (error) {
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
  let historySeries = cache.has(activeRange) ? cache.get(activeRange) : null;
  let historyState = { status: 'empty' };

  if (Array.isArray(historySeries)) {
    historyState = historySeries.length
      ? { status: 'loaded' }
      : { status: 'empty' };
  } else {
    historySeries = [];
    try {
      const rangeOptions = resolveRangeOptions(activeRange);
      const historyResponse = await fetchSecurityHistoryWS(
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

  const latestNativePrice =
    historySeries.length > 0
      ? historySeries[historySeries.length - 1].close
      : effectiveSnapshot?.last_price_native;
  const fxRate = deriveFxRate(effectiveSnapshot, latestNativePrice);
  const holdings = effectiveSnapshot?.total_holdings ?? 0;
  const { periodGain, dailyGain } = computeGainValues(
    historySeries,
    holdings,
    fxRate,
  );
  const infoBar = buildInfoBar(activeRange, periodGain, dailyGain);

  scheduleRangeSetup({
    root,
    hass,
    panelConfig,
    securityUuid,
    snapshot: effectiveSnapshot,
    holdings,
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

function updateRangeButtons(container, activeRange) {
  if (!container) {
    return;
  }

  container.dataset.activeRange = activeRange;
  container.querySelectorAll('.security-range-button').forEach((button) => {
    const rangeKey = button.dataset.range;
    const isActive = rangeKey === activeRange;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    button.disabled = false;
    button.classList.remove('loading');
  });
}

function updateInfoBarContent(root, rangeKey, periodGain, dailyGain) {
  const infoBar = root.querySelector('.security-info-bar');
  if (!infoBar || !infoBar.parentElement) {
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = buildInfoBar(rangeKey, periodGain, dailyGain).trim();
  const fresh = wrapper.firstElementChild;
  if (!fresh) {
    return;
  }
  infoBar.parentElement.replaceChild(fresh, infoBar);
}

const HISTORY_CHART_INSTANCES = new WeakMap();

function getHistoryChartOptions(host, series, { currency } = {}) {
  const measuredWidth = host.clientWidth || host.offsetWidth || 0;
  const width = measuredWidth > 0 ? measuredWidth : 640;
  const height = Math.min(Math.max(Math.floor(width * 0.55), 220), 420);
  const safeCurrency = (currency || '').toUpperCase() || 'EUR';

  return {
    width,
    height,
    margin: { top: 16, right: 20, bottom: 32, left: 20 },
    series,
    yFormatter: formatPrice,
    tooltipRenderer: ({ xFormatted, yFormatted }) => `
      <div class="chart-tooltip-date">${xFormatted}</div>
      <div class="chart-tooltip-value">${yFormatted}&nbsp;${safeCurrency}</div>
    `,
  };
}

function renderHistoryChart(host, series, options) {
  if (!host || !Array.isArray(series) || series.length === 0) {
    return;
  }

  const chartOptions = getHistoryChartOptions(host, series, options);
  let chartContainer = HISTORY_CHART_INSTANCES.get(host);

  if (!chartContainer || !host.contains(chartContainer)) {
    host.innerHTML = '';
    chartContainer = renderLineChart(host, chartOptions) || null;
    if (chartContainer) {
      HISTORY_CHART_INSTANCES.set(host, chartContainer);
    }
    return;
  }

  updateLineChart(chartContainer, chartOptions);
}

function updateHistoryPlaceholder(root, rangeKey, state, historySeries, options = {}) {
  const placeholderContainer = root.querySelector('.security-detail-placeholder');
  if (!placeholderContainer) {
    return;
  }

  placeholderContainer.innerHTML = `
    <h2>Historie</h2>
    ${buildHistoryPlaceholder(rangeKey, state)}
  `;

  if (state?.status === 'loaded' && Array.isArray(historySeries) && historySeries.length) {
    const host = placeholderContainer.querySelector('.history-chart');
    if (host) {
      requestAnimationFrame(() => {
        renderHistoryChart(host, historySeries, options);
      });
    }
  }
}

function scheduleRangeSetup({
  root,
  hass,
  panelConfig,
  securityUuid,
  snapshot,
  holdings,
  initialRange,
  initialHistory,
  initialHistoryState,
}) {
  if (!root) {
    return;
  }

  setTimeout(() => {
    const rangeSelector = root.querySelector('.security-range-selector');
    if (!rangeSelector) {
      return;
    }

    const cache = ensureHistoryCache(securityUuid);
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
        { currency: snapshot?.currency_code },
      );
    }

    const handleRangeClick = async (rangeKey) => {
      if (!rangeKey || rangeKey === getActiveRange(securityUuid)) {
        return;
      }

      const button = rangeSelector.querySelector(
        `.security-range-button[data-range="${rangeKey}"]`,
      );
      if (button) {
        button.disabled = true;
        button.classList.add('loading');
      }

      let historySeries = cache.get(rangeKey) || null;
      let historyState = null;
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

      const lastClose = historySeries.length
        ? historySeries[historySeries.length - 1].close
        : snapshot?.last_price_native;
      const activeFxRate = deriveFxRate(snapshot, lastClose);
      const { periodGain, dailyGain } = computeGainValues(
        historySeries,
        holdings,
        activeFxRate,
      );

      setActiveRange(securityUuid, rangeKey);
      updateRangeButtons(rangeSelector, rangeKey);
      updateInfoBarContent(root, rangeKey, periodGain, dailyGain);
      updateHistoryPlaceholder(
        root,
        rangeKey,
        historyState,
        historySeries,
        { currency: snapshot?.currency_code },
      );
    };

    rangeSelector.addEventListener('click', (event) => {
      const button = event.target.closest('.security-range-button');
      if (!button || button.disabled) {
        return;
      }
      const { range } = button.dataset;
      handleRangeClick(range);
    });
  }, 0);
}

export function registerSecurityDetailTab({ setSecurityDetailTabFactory }) {
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
