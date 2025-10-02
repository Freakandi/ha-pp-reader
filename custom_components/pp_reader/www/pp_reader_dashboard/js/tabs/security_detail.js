/**
 * Security detail tab renderer and registration.
 *
 * Provides the render function used by dynamic security tabs and
 * exposes a helper to register the descriptor factory with the
 * dashboard controller.
 */
import { createHeaderCard, formatNumber, formatGain } from '../content/elements.js';
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
  RANGE_STATE_REGISTRY.delete(securityUuid);
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
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return year * 10000 + month * 100 + day;
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

      return {
        date: entry?.date,
        close: rawClose / PRICE_SCALE,
      };
    })
    .filter(Boolean);
}

function deriveFxRate(snapshot, latestNativePrice) {
  const lastPriceEurRaw = snapshot?.last_price_eur;
  const lastPriceEur = Number.isFinite(lastPriceEurRaw)
    ? lastPriceEurRaw
    : Number.parseFloat(lastPriceEurRaw);

  if (!Number.isFinite(lastPriceEur) || lastPriceEur <= 0) {
    return 1;
  }

  const snapshotNativeRaw = snapshot?.last_price_native;
  const snapshotNative = Number.isFinite(snapshotNativeRaw)
    ? snapshotNativeRaw
    : Number.parseFloat(snapshotNativeRaw);

  if (Number.isFinite(snapshotNative) && snapshotNative > 0) {
    return lastPriceEur / snapshotNative;
  }

  if (Number.isFinite(latestNativePrice) && latestNativePrice > 0) {
    return lastPriceEur / latestNativePrice;
  }

  return 1;
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
  const safeFx = Number.isFinite(fxRate) && fxRate > 0 ? fxRate : 1;

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
        <div class="history-placeholder" data-state="loaded" data-range="${safeRange}">
          <p>Daten für ${safeRange || 'den gewählten Zeitraum'} geladen. Chart folgt im nächsten Schritt.</p>
        </div>
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
  const marketValue = formatNumber(snapshot.market_value_eur ?? 0);

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

  const headerTitle = snapshot?.name || 'Wertpapierdetails';
  const headerCard = createHeaderCard(headerTitle, buildHeaderMeta(snapshot));

  if (error) {
    return `
      ${headerCard.outerHTML}
      <div class="card error-card">
        <h2>Fehler beim Laden</h2>
        <p>${error}</p>
      </div>
    `;
  }

  const activeRange = DEFAULT_HISTORY_RANGE;
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
      : snapshot?.last_price_native;
  const fxRate = deriveFxRate(snapshot, latestNativePrice);
  const holdings = snapshot?.total_holdings ?? 0;
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
    snapshot,
    holdings,
    initialRange: activeRange,
    initialHistory: historySeries,
    initialHistoryState: historyState,
  });

  return `
    ${headerCard.outerHTML}
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

function updateHistoryPlaceholder(root, rangeKey, state) {
  const placeholderContainer = root.querySelector('.security-detail-placeholder');
  if (!placeholderContainer) {
    return;
  }

  placeholderContainer.innerHTML = `
    <h2>Historie</h2>
    ${buildHistoryPlaceholder(rangeKey, state)}
  `;
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
      updateHistoryPlaceholder(root, initialRange, initialHistoryState);
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
      updateHistoryPlaceholder(root, rangeKey, historyState);
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
