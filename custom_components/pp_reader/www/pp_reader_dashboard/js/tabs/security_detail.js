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
const RANGE_DAY_COUNTS = {
  '1M': 30,
  '6M': 182,
  '1Y': 365,
  '5Y': 1826,
};

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

export async function renderSecurityDetail(root, hass, panelConfig, securityUuid) {
  if (!securityUuid) {
    console.error('renderSecurityDetail: securityUuid fehlt');
    return '<div class="card"><h2>Fehler</h2><p>Kein Wertpapier angegeben.</p></div>';
  }

  let snapshot = null;
  let error = null;

  try {
    snapshot = await fetchSecuritySnapshotWS(hass, panelConfig, securityUuid);
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
  let historySeries = [];

  try {
    const rangeOptions = resolveRangeOptions(activeRange);
    const historyResponse = await fetchSecurityHistoryWS(
      hass,
      panelConfig,
      securityUuid,
      rangeOptions,
    );
    historySeries = normaliseHistorySeries(historyResponse?.prices);
  } catch (historyError) {
    console.error(
      'renderSecurityDetail: Historie konnte nicht geladen werden',
      historyError,
    );
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

  return `
    ${headerCard.outerHTML}
    ${infoBar}
    <div class="card security-detail-placeholder">
      <h2>Historie</h2>
      <p>Für dieses Wertpapier liegen derzeit keine historischen Daten vor.</p>
    </div>
  `;
}

export function registerSecurityDetailTab({ setSecurityDetailTabFactory }) {
  if (typeof setSecurityDetailTabFactory !== 'function') {
    console.error('registerSecurityDetailTab: Ungültige Factory-Funktion übergeben');
    return;
  }

  setSecurityDetailTabFactory((securityUuid) => ({
    title: 'Wertpapier',
    render: (root, hass, panelConfig) => renderSecurityDetail(root, hass, panelConfig, securityUuid),
  }));
}
