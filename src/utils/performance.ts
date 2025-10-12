/**
 * Utilities to normalise backend-provided performance payloads for the PP Reader dashboard.
 */

import type {
  PerformanceDayChangePayload,
  PerformanceMetricsPayload,
} from "../tabs/types";

const toFiniteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const toOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

function normalizeDayChangePayload(raw: unknown): PerformanceDayChangePayload | null {
  const candidate = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!candidate) {
    return null;
  }

  const priceChangeNative = toFiniteNumber(candidate.price_change_native);
  const priceChangeEur = toFiniteNumber(candidate.price_change_eur);
  const changePct = toFiniteNumber(candidate.change_pct);

  if (priceChangeNative == null && priceChangeEur == null && changePct == null) {
    return null;
  }

  const source = toOptionalString(candidate.source) ?? "derived";
  const coverage = toFiniteNumber(candidate.coverage_ratio) ?? null;

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
): PerformanceMetricsPayload | null {
  const candidate = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!candidate) {
    return null;
  }

  const gainAbs = toFiniteNumber(candidate.gain_abs);
  const gainPct = toFiniteNumber(candidate.gain_pct);
  const totalChangeEur = toFiniteNumber(candidate.total_change_eur);
  const totalChangePct = toFiniteNumber(candidate.total_change_pct);

  if (gainAbs == null || gainPct == null || totalChangeEur == null || totalChangePct == null) {
    return null;
  }

  const source = toOptionalString(candidate.source) ?? "derived";
  const coverage = toFiniteNumber(candidate.coverage_ratio) ?? null;
  const dayChange = normalizeDayChangePayload(candidate.day_change);

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
