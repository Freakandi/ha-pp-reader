/**
 * Selector helpers that expose normalized dashboard state for view controllers.
 *
 * These functions keep all overview tables in sync with the canonical store by
 * providing pre-digested rows plus coverage/provenance badges mirrored from
 * the backend normalization pipeline.
 */

import type {
  NormalizedAccountSnapshot,
  NormalizedPortfolioSnapshot,
} from "../../api/portfolio";
import type { PerformanceMetricsPayload } from "../../../tabs/types";
import { normalizePerformancePayload } from "../../../utils/performance";
import { getPortfolioStoreState } from "../portfolioStore";

export type OverviewBadgeTone = "info" | "warning" | "danger" | "neutral";

export interface OverviewBadge {
  key: string;
  label: string;
  tone: OverviewBadgeTone;
  description?: string;
}

export interface AccountOverviewRow {
  uuid: string;
  name: string;
  currency_code: string | null;
  balance: number | null;
  orig_balance: number | null;
  fx_unavailable: boolean;
  coverage_ratio: number | null;
  provenance: string | null;
  metric_run_uuid: string | null;
  fx_rate: number | null;
  fx_rate_source: string | null;
  fx_rate_timestamp: string | null;
  badges: OverviewBadge[];
}

export interface PortfolioOverviewRow {
  uuid: string;
  name: string;
  position_count: number;
  current_value: number | null;
  purchase_sum: number;
  day_change_abs: number | null;
  day_change_pct: number | null;
  gain_abs: number | null;
  gain_pct: number | null;
  hasValue: boolean;
  fx_unavailable: boolean;
  missing_value_positions: number;
  performance: PerformanceMetricsPayload | null;
  coverage_ratio: number | null;
  provenance: string | null;
  metric_run_uuid: string | null;
  badges: OverviewBadge[];
}

type CoverageScope = "account" | "portfolio";

const FALLBACK_ACCOUNT_ID = "unknown-account";

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function toInteger(value: unknown): number {
  const numeric = toFiniteNumber(value);
  if (numeric == null) {
    return 0;
  }
  return Math.trunc(numeric);
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeLabel(value: unknown, fallback: string): string {
  return toNonEmptyString(value) ?? fallback;
}

function clampRatio(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

function formatPercentageLabel(value: number): string {
  const hasFraction = Math.abs(value % 1) > 0.01;
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: hasFraction ? 1 : 0,
    maximumFractionDigits: 1,
  });
}

function composeCoverageBadge(
  ratio: number | null,
  scope: CoverageScope,
): OverviewBadge | null {
  const clamped = clampRatio(ratio);
  if (clamped == null) {
    return null;
  }
  const percentValue = Math.round(clamped * 1000) / 10;
  let tone: OverviewBadgeTone = "info";
  if (clamped < 0.5) {
    tone = "danger";
  } else if (clamped < 0.9) {
    tone = "warning";
  }

  const labelPrefix = scope === "account" ? "FX-Abdeckung" : "Abdeckung";
  const description =
    scope === "account"
      ? "Anteil der verfügbaren FX-Daten für diese Kontoumrechnung."
      : "Anteil der verfügbaren Kennzahlen für dieses Depot.";

  return {
    key: `${scope}-coverage`,
    label: `${labelPrefix} ${formatPercentageLabel(percentValue)}%`,
    tone,
    description,
  };
}

function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(
      (token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase(),
    )
    .join(" ");
}

function composeProvenanceBadge(provenance: string | null): OverviewBadge | null {
  const normalized = normalizeProvenanceLabel(provenance);
  if (!normalized) {
    return null;
  }

  const friendly = normalized;
  return {
    key: `provenance-${normalized}`,
    label: `Quelle: ${friendly}`,
    tone: "neutral",
    description: "Backend-Provenance zur Nachverfolgung der Kennzahlen.",
  };
}

function normalizeProvenanceLabel(provenance: string | null): string | null {
  const normalized = toNonEmptyString(provenance);
  if (!normalized) {
    return null;
  }

  const structured = parseStructuredProvenance(normalized);
  if (structured) {
    return structured;
  }

  return titleCase(normalized);
}

function parseStructuredProvenance(provenance: string): string | null {
  const trimmed = provenance.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return null;
  }

  try {
    const payload = JSON.parse(trimmed) as unknown;
    const currencies = extractCurrencyCodes(payload);
    const provider =
      payload && typeof payload === "object"
        ? toNonEmptyString(
            (payload as Record<string, unknown>).provider ??
              (payload as Record<string, unknown>).source,
          )
        : null;

    if (currencies.length && provider) {
      return `${titleCase(provider)} (${currencies.join(", ")})`;
    }
    if (currencies.length) {
      return `FX (${currencies.join(", ")})`;
    }
  } catch {
    return null;
  }

  return null;
}

function extractCurrencyCodes(payload: unknown): string[] {
  const normalizeCode = (value: unknown): string | null => {
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed.toUpperCase() : null;
  };

  const fromArray = (values: unknown[]): string[] =>
    values
      .map(normalizeCode)
      .filter((code): code is string => Boolean(code));

  if (Array.isArray(payload)) {
    return fromArray(payload);
  }

  if (payload && typeof payload === "object") {
    const currencies = (payload as Record<string, unknown>).currencies;
    if (Array.isArray(currencies)) {
      return fromArray(currencies);
    }
  }

  return [];
}

function buildAccountRow(
  snapshot: NormalizedAccountSnapshot | null | undefined,
): AccountOverviewRow | null {
  if (!snapshot) {
    return null;
  }

  const uuid =
    toNonEmptyString(snapshot.uuid) ?? `${FALLBACK_ACCOUNT_ID}-${snapshot.name ?? "0"}`;
  const name = sanitizeLabel(snapshot.name, "Unbenanntes Konto");
  const currencyCode = toNonEmptyString(snapshot.currency_code);
  const balance = toFiniteNumber(snapshot.balance);
  const origBalance = toFiniteNumber(snapshot.orig_balance);

  const coverageRatio =
    "coverage_ratio" in snapshot
      ? clampRatio(toFiniteNumber(snapshot.coverage_ratio))
      : null;
  const provenance = toNonEmptyString(snapshot.provenance);
  const metricRunUuid: string | null = toNonEmptyString(snapshot.metric_run_uuid);
  const fxUnavailable = snapshot.fx_unavailable === true;
  const fxRate = toFiniteNumber(snapshot.fx_rate);
  const fxRateSource = toNonEmptyString(snapshot.fx_rate_source);
  const fxRateTimestamp = toNonEmptyString(snapshot.fx_rate_timestamp);

  const badges: OverviewBadge[] = [];
  const coverageBadge = composeCoverageBadge(coverageRatio, "account");
  if (coverageBadge) {
    badges.push(coverageBadge);
  }
  const provenanceBadge = composeProvenanceBadge(provenance);
  if (provenanceBadge) {
    badges.push(provenanceBadge);
  }

  const row: AccountOverviewRow = {
    uuid,
    name,
    currency_code: currencyCode,
    balance,
    orig_balance: origBalance,
    fx_unavailable: fxUnavailable,
    coverage_ratio: coverageRatio,
    provenance,
    metric_run_uuid: null,
    fx_rate: fxRate,
    fx_rate_source: fxRateSource,
    fx_rate_timestamp: fxRateTimestamp,
    badges,
  };

  const normalizedMetricRunUuid: string | null =
    typeof metricRunUuid === "string" ? metricRunUuid : null;
  row.metric_run_uuid = normalizedMetricRunUuid;

  return row;
}

function buildPortfolioRow(
  snapshot: NormalizedPortfolioSnapshot | null | undefined,
): PortfolioOverviewRow | null {
  if (!snapshot) {
    return null;
  }
  const uuid = toNonEmptyString(snapshot.uuid);
  if (!uuid) {
    return null;
  }

  const name = sanitizeLabel(snapshot.name, "Unbenanntes Depot");
  const positionCount = toInteger(snapshot.position_count);
  const missingValuePositions = toInteger(snapshot.missing_value_positions);
  const currentValue = toFiniteNumber(snapshot.current_value);
  const purchaseSum =
    toFiniteNumber(snapshot.purchase_sum) ??
    toFiniteNumber((snapshot as { purchase_value_eur?: unknown })?.purchase_value_eur) ??
    toFiniteNumber(snapshot.purchase_value) ??
    0;
  const dayChangeAbs =
    toFiniteNumber((snapshot as { day_change_abs?: unknown }).day_change_abs) ?? null;
  const dayChangePct =
    toFiniteNumber((snapshot as { day_change_pct?: unknown }).day_change_pct) ?? null;

  const performance = normalizePerformancePayload(snapshot.performance);
  const gainAbs = performance?.gain_abs ?? null;
  const gainPct = performance?.gain_pct ?? null;
  const performanceDayChange = performance?.day_change ?? null;
  let resolvedDayChangeAbs =
    dayChangeAbs ??
    (performanceDayChange?.value_change_eur != null
      ? toFiniteNumber(performanceDayChange.value_change_eur)
      : null);
  let resolvedDayChangePct =
    dayChangePct ??
    (performanceDayChange?.change_pct != null
      ? toFiniteNumber(performanceDayChange.change_pct)
      : null);

  if (resolvedDayChangeAbs == null && resolvedDayChangePct != null && currentValue != null) {
    const baseline = currentValue / (1 + resolvedDayChangePct / 100);
    if (baseline) {
      resolvedDayChangeAbs = currentValue - baseline;
    }
  }

  if (resolvedDayChangePct == null && resolvedDayChangeAbs != null && currentValue != null) {
    const baseline = currentValue - resolvedDayChangeAbs;
    if (baseline) {
      resolvedDayChangePct = (resolvedDayChangeAbs / baseline) * 100;
    }
  }

  const hasValue = currentValue != null;
  const fxUnavailable = snapshot.has_current_value === false || !hasValue;

  const coverageRatio =
    "coverage_ratio" in snapshot
      ? clampRatio(toFiniteNumber(snapshot.coverage_ratio))
      : null;
  const provenance = toNonEmptyString(snapshot.provenance);
  const metricRunUuid = toNonEmptyString(snapshot.metric_run_uuid);

  const badges: OverviewBadge[] = [];
  const coverageBadge = composeCoverageBadge(coverageRatio, "portfolio");
  if (coverageBadge) {
    badges.push(coverageBadge);
  }
  const provenanceBadge = composeProvenanceBadge(provenance);
  if (provenanceBadge) {
    badges.push(provenanceBadge);
  }

  const row: PortfolioOverviewRow = {
    uuid,
    name,
    position_count: positionCount,
    current_value: currentValue,
    purchase_sum: purchaseSum,
    day_change_abs: resolvedDayChangeAbs ?? null,
    day_change_pct: resolvedDayChangePct ?? null,
    gain_abs: gainAbs,
    gain_pct: gainPct,
    hasValue,
    fx_unavailable: fxUnavailable || missingValuePositions > 0,
    missing_value_positions: missingValuePositions,
    performance,
    coverage_ratio: coverageRatio,
    provenance,
    metric_run_uuid: null,
    badges,
  };

  const normalizedMetricRunUuid: string | null =
    typeof metricRunUuid === "string" ? metricRunUuid : null;
  row.metric_run_uuid = normalizedMetricRunUuid;

  return row;
}

export function selectAccountOverviewRows(): AccountOverviewRow[] {
  const { accounts } = getPortfolioStoreState();
  return accounts
    .map(buildAccountRow)
    .filter((row): row is AccountOverviewRow => Boolean(row));
}

export function selectPortfolioOverviewRows(): PortfolioOverviewRow[] {
  const { portfolios } = getPortfolioStoreState();
  return portfolios
    .map(buildPortfolioRow)
    .filter((row): row is PortfolioOverviewRow => Boolean(row));
}
