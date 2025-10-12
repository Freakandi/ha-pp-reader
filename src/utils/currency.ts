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
    const trimmed = value.trim().replace(/\u00a0/g, '');
    if (!trimmed) {
      return null;
    }

    const direct = Number(trimmed);
    if (Number.isFinite(direct)) {
      return direct;
    }

    const stripped = trimmed.replace(/[^0-9.,+-]/g, '');
    if (!stripped) {
      return null;
    }

    const lastComma = stripped.lastIndexOf(',');
    const lastDot = stripped.lastIndexOf('.');
    let normalized = stripped;

    const hasComma = lastComma !== -1;
    const hasDot = lastDot !== -1;

    if (hasComma && (!hasDot || lastComma > lastDot)) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (hasDot && hasComma && lastDot > lastComma) {
      normalized = normalized.replace(/,/g, '');
    } else if (hasComma && !hasDot) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (hasDot) {
      const decimals = normalized.length - lastDot - 1;
      if (decimals === 3 && /\d{4,}/.test(normalized.replace(/\./g, ''))) {
        normalized = normalized.replace(/\./g, '');
      }
    }

    if (normalized === '-' || normalized === '+') {
      return null;
    }

    const localized = Number.parseFloat(normalized);
    if (Number.isFinite(localized)) {
      return localized;
    }

    const relaxed = Number.parseFloat(stripped.replace(',', '.'));
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
