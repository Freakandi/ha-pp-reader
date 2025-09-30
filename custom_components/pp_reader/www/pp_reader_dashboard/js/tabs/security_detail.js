/**
 * Security detail tab renderer and registration.
 *
 * Provides the render function used by dynamic security tabs and
 * exposes a helper to register the descriptor factory with the
 * dashboard controller.
 */
import { createHeaderCard, formatNumber } from '../content/elements.js';
import { fetchSecuritySnapshotWS } from '../data/api.js';

const HOLDINGS_FRACTION_DIGITS = { min: 0, max: 6 };
const PRICE_FRACTION_DIGITS = { min: 2, max: 4 };

function formatHoldings(value) {
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
  const holdings = formatHoldings(snapshot.total_holdings ?? 0);
  const lastPriceEur = formatPrice(snapshot.last_price_eur ?? 0);
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
        <span class="label">Letzter Preis (EUR)</span>
        <span class="value">${lastPriceEur}&nbsp;€</span>
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

  return `
    ${headerCard.outerHTML}
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
