/**
 * Shared helpers for computing average purchase price displays.
 */

const PRICE_FRACTION_DIGITS = { min: 2, max: 6 } as const;

type PositionRecord = Record<string, unknown>;

const SECURITY_CURRENCY_KEYS = [
  'security_currency_code',
  'security_currency',
  'native_currency_code',
  'native_currency',
] as const;

const ACCOUNT_CURRENCY_KEYS = [
  'account_currency_code',
  'account_currency',
  'purchase_currency_code',
  'currency_code',
] as const;

function normalizeCurrencyCode(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const upper = trimmed.toUpperCase();
  if (/^[A-Z]{3}$/.test(upper)) {
    return upper;
  }

  if (upper === '€') {
    return 'EUR';
  }

  return null;
}

export function toNullableNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const normalised = trimmed
      .replace(/\s+/g, '')
      .replace(/[^0-9,.-]/g, '')
      .replace(/\.(?=\d{3}(\D|$))/g, '')
      .replace(',', '.');
    const parsed = Number(normalised);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function resolveCurrency(
  position: PositionRecord,
  keys: readonly string[],
  fallback: string | null = null,
): string | null {
  for (const key of keys) {
    const candidate = normalizeCurrencyCode(position[key]);
    if (candidate) {
      return candidate;
    }
  }

  return fallback;
}

function computeAverageFromTotal(
  total: unknown,
  holdings: number | null,
): number | null {
  const totalNumeric = toNullableNumber(total);
  if (totalNumeric == null || !isFiniteNumber(holdings) || holdings <= 0) {
    return null;
  }

  return totalNumeric / holdings;
}

function resolveSecurityAverage(
  position: PositionRecord,
  holdings: number | null,
): number | null {
  return (
    toNullableNumber(position['avg_price_security']) ??
    toNullableNumber(position['average_purchase_price_native']) ??
    computeAverageFromTotal(position['purchase_total_security'], holdings)
  );
}

function resolveAccountAverage(
  position: PositionRecord,
  holdings: number | null,
): number | null {
  return (
    toNullableNumber(position['avg_price_account']) ??
    computeAverageFromTotal(position['purchase_total_account'], holdings) ??
    computeAverageFromTotal(position['purchase_value'], holdings)
  );
}

function formatPriceWithCurrency(
  value: number | null,
  currency: string | null,
): string | null {
  if (!isFiniteNumber(value)) {
    return null;
  }

  const formatted = value.toLocaleString('de-DE', {
    minimumFractionDigits: PRICE_FRACTION_DIGITS.min,
    maximumFractionDigits: PRICE_FRACTION_DIGITS.max,
  });

  return `${formatted}${currency ? `\u00A0${currency}` : ''}`;
}

function areNumbersClose(a: number | null, b: number | null): boolean {
  if (!isFiniteNumber(a) || !isFiniteNumber(b)) {
    return false;
  }

  return Math.abs(a - b) <= 1e-6;
}

export interface AveragePurchaseDisplayResult {
  markup: string;
  ariaLabel: string;
  sortValue: number;
}

export function buildAveragePurchaseDisplay(
  position: PositionRecord,
): AveragePurchaseDisplayResult {
  const holdings = toNullableNumber(position['current_holdings']);

  const securityCurrency = resolveCurrency(position, SECURITY_CURRENCY_KEYS);
  const accountCurrency =
    resolveCurrency(position, ACCOUNT_CURRENCY_KEYS, securityCurrency === 'EUR' ? 'EUR' : null) ??
    'EUR';

  const securityAverage = resolveSecurityAverage(position, holdings);
  const accountAverage = resolveAccountAverage(position, holdings);

  const securityText = formatPriceWithCurrency(securityAverage, securityCurrency);
  const accountText = formatPriceWithCurrency(accountAverage, accountCurrency);

  const parts: string[] = [];
  const ariaParts: string[] = [];

  if (securityText) {
    parts.push(
      `<span class="purchase-price purchase-price--primary">${securityText}</span>`,
    );
    ariaParts.push(securityText.replace(/\u00A0/g, ' '));
  } else {
    const missing =
      '<span class="missing-value" role="note" aria-label="Kein Kaufpreis verfügbar" title="Kein Kaufpreis verfügbar">—</span>';
    parts.push(missing);
    ariaParts.push('Kein Kaufpreis verfügbar');
  }

  const shouldRenderAccount =
    !!accountText &&
    (!securityText ||
      !securityCurrency ||
      !accountCurrency ||
      accountCurrency !== securityCurrency ||
      !areNumbersClose(securityAverage, accountAverage));

  if (shouldRenderAccount && accountText && accountText !== securityText) {
    parts.push(
      `<span class="purchase-price purchase-price--secondary">${accountText}</span>`,
    );
    ariaParts.push(accountText.replace(/\u00A0/g, ' '));
  }

  const markup = parts.join('<br>');
  const sortValue = toNullableNumber(position['purchase_value']) ?? 0;
  const ariaLabel = ariaParts.join(', ');

  return { markup, ariaLabel, sortValue };
}

export const __TEST_ONLY__ = {
  buildAveragePurchaseDisplay,
  toNullableNumber,
};

