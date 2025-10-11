/**
 * Utilities to normalise backend-provided performance payloads for the PP Reader dashboard.
 */

import type {
  PerformanceDayChangePayload,
  PerformanceMetricsPayload,
} from "../tabs/types";

export interface PerformanceNormalizationFallback {
  gain_abs?: unknown;
  gain_pct?: unknown;
  total_change_eur?: unknown;
  total_change_pct?: unknown;
  coverage_ratio?: unknown;
  source?: unknown;
  day_change?: unknown;
}

const toFiniteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const toOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

function normalizeDayChangePayload(
  raw: unknown,
  fallback: unknown,
): PerformanceDayChangePayload | null {
  const candidate = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  const legacy = fallback && typeof fallback === "object" ? (fallback as Record<string, unknown>) : null;

  const priceChangeNative =
    toFiniteNumber(candidate?.price_change_native) ?? toFiniteNumber(legacy?.price_change_native);
  const priceChangeEur =
    toFiniteNumber(candidate?.price_change_eur) ?? toFiniteNumber(legacy?.price_change_eur);
  const changePct =
    toFiniteNumber(candidate?.change_pct) ?? toFiniteNumber(legacy?.change_pct);

  if (priceChangeNative == null && priceChangeEur == null && changePct == null) {
    return null;
  }

  const source =
    toOptionalString(candidate?.source) ??
    toOptionalString(legacy?.source) ??
    "derived";
  const coverage =
    toFiniteNumber(candidate?.coverage_ratio) ??
    toFiniteNumber(legacy?.coverage_ratio) ??
    null;

  return {
    price_change_native: priceChangeNative,
    price_change_eur: priceChangeEur,
    change_pct: changePct,
    source,
    coverage_ratio: coverage,
  };
}

export function normalizePerformancePayload(
  raw: unknown,
  fallback: PerformanceNormalizationFallback = {},
): PerformanceMetricsPayload | null {
  const candidate = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;

  const resolveNumber = (key: string, fallbackValue?: unknown): number | null => {
    const candidateValue = candidate ? toFiniteNumber(candidate[key]) : null;
    if (candidateValue != null) {
      return candidateValue;
    }
    if (fallbackValue !== undefined) {
      const fallbackNumber = toFiniteNumber(fallbackValue);
      if (fallbackNumber != null) {
        return fallbackNumber;
      }
    }
    return null;
  };

  const gainAbs = resolveNumber("gain_abs", fallback.gain_abs);
  const gainPct = resolveNumber("gain_pct", fallback.gain_pct);
  const totalChangeEur = resolveNumber("total_change_eur", fallback.total_change_eur ?? gainAbs);
  const totalChangePct = resolveNumber("total_change_pct", fallback.total_change_pct ?? gainPct);

  if (gainAbs == null || gainPct == null || totalChangeEur == null || totalChangePct == null) {
    return null;
  }

  const source =
    toOptionalString(candidate?.source) ??
    toOptionalString(fallback.source) ??
    "derived";
  const coverage =
    toFiniteNumber(candidate?.coverage_ratio) ??
    toFiniteNumber(fallback.coverage_ratio) ??
    null;

  const dayChange = normalizeDayChangePayload(candidate?.day_change, fallback.day_change);

  return {
    gain_abs: gainAbs,
    gain_pct: gainPct,
    total_change_eur: totalChangeEur,
    total_change_pct: totalChangePct,
    source,
    coverage_ratio: coverage,
    day_change: dayChange,
  };
}
