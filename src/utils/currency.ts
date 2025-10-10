/**
 * Shared currency helpers for Portfolio Performance Reader dashboard logic.
 */

const DEFAULT_DECIMALS = 2;

export interface RoundCurrencyOptions {
  decimals?: number;
  fallback?: number | null;
}

export function toFiniteCurrency(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }

    const relaxed = Number.parseFloat(trimmed);
    if (Number.isFinite(relaxed)) {
      return relaxed;
    }
  }

  return null;
}

export function roundCurrency(
  value: unknown,
  { decimals = DEFAULT_DECIMALS, fallback = null }: RoundCurrencyOptions = {},
): number | null {
  const numeric = toFiniteCurrency(value);
  if (numeric == null) {
    return fallback ?? null;
  }

  const factor = 10 ** decimals;
  const rounded = Math.round(numeric * factor) / factor;
  if (Object.is(rounded, -0)) {
    return 0;
  }

  return rounded;
}

export function normalizeCurrencyValue(
  value: unknown,
  options: RoundCurrencyOptions = {},
): number | null {
  return roundCurrency(value, options);
}

export function normalizePercentValue(
  value: unknown,
  options: RoundCurrencyOptions = {},
): number | null {
  return roundCurrency(value, options);
}
