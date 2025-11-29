/**
 * Helper utilities to deserialize canonical normalization payloads.
 */

import type {
  NormalizedAccountSnapshot,
  NormalizedDashboardSnapshot,
  NormalizedPayloadMetadata,
  NormalizedPortfolioSnapshot,
  NormalizedPositionSnapshot,
  NormalizationDiagnostics,
  SnapshotDataState,
} from './types';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function toStringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function toNullableString(value: unknown): string | null {
  return value === null ? null : toStringValue(value);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    const normalized = Number(trimmed.replace(',', '.'));
    return Number.isFinite(normalized) ? normalized : null;
  }
  return null;
}

function toInteger(value: unknown): number | null {
  const numeric = toFiniteNumber(value);
  if (numeric == null) {
    return null;
  }
  const truncated = Math.trunc(numeric);
  return Number.isFinite(truncated) ? truncated : null;
}

function cloneRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? { ...value } : null;
}

function deserializeDataState(value: unknown): SnapshotDataState | null {
  return isRecord(value) ? { ...value } : null;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

export function deserializeAccountSnapshot(value: unknown): NormalizedAccountSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = toStringValue(value.name);
  const currencyCode = toStringValue(value.currency_code);
  const origBalance = toFiniteNumber(value.orig_balance);

  if (!name || !currencyCode || origBalance == null) {
    return null;
  }

  const balance = value.balance === null ? null : toFiniteNumber(value.balance);

  const snapshot: NormalizedAccountSnapshot = {
    uuid: toStringValue(value.uuid) ?? undefined,
    name,
    currency_code: currencyCode,
    orig_balance: origBalance,
    balance: balance ?? null,
  };

  const fxRate = toFiniteNumber(value.fx_rate);
  if (fxRate != null) {
    snapshot.fx_rate = fxRate;
  }
  const fxRateSource = toStringValue(value.fx_rate_source);
  if (fxRateSource) {
    snapshot.fx_rate_source = fxRateSource;
  }
  const fxRateTimestamp = toStringValue(value.fx_rate_timestamp);
  if (fxRateTimestamp) {
    snapshot.fx_rate_timestamp = fxRateTimestamp;
  }

  const coverageRatio = toFiniteNumber(value.coverage_ratio);
  if (coverageRatio != null) {
    snapshot.coverage_ratio = coverageRatio;
  }
  const provenance = toStringValue(value.provenance);
  if (provenance) {
    snapshot.provenance = provenance;
  }
  const metricRunUuid = toNullableString(value.metric_run_uuid);
  if (metricRunUuid !== null) {
    snapshot.metric_run_uuid = metricRunUuid;
  }

  const fxUnavailable = readBoolean(value.fx_unavailable);
  if (typeof fxUnavailable === 'boolean') {
    snapshot.fx_unavailable = fxUnavailable;
  }

  return snapshot;
}

export function deserializeAccountSnapshots(value: unknown): NormalizedAccountSnapshot[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const snapshots: NormalizedAccountSnapshot[] = [];
  for (const entry of value) {
    const snapshot = deserializeAccountSnapshot(entry);
    if (snapshot) {
      snapshots.push(snapshot);
    }
  }
  return snapshots;
}

export function deserializePositionSnapshot(value: unknown): NormalizedPositionSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }
  const aggregationRaw = value.aggregation;
  const securityUuid = toStringValue(value.security_uuid);
  const name = toStringValue(value.name);
  const currentHoldings = toFiniteNumber(value.current_holdings);
  const purchaseValue =
    toFiniteNumber(value.purchase_value_eur) ??
    (isRecord(aggregationRaw)
      ? toFiniteNumber(aggregationRaw.purchase_value_eur) ??
        toFiniteNumber(aggregationRaw.purchase_total_account) ??
        toFiniteNumber(aggregationRaw.account_currency_total)
      : null) ??
    toFiniteNumber(value.purchase_value);
  const currentValue = toFiniteNumber(value.current_value);

  if (!securityUuid || !name || currentHoldings == null || purchaseValue == null || currentValue == null) {
    return null;
  }

  const snapshot: NormalizedPositionSnapshot = {
    portfolio_uuid: toStringValue(value.portfolio_uuid) ?? undefined,
    security_uuid: securityUuid,
    name,
    currency_code: toStringValue(value.currency_code),
    current_holdings: currentHoldings,
    purchase_value: purchaseValue,
    current_value: currentValue,
    average_cost: cloneRecord(value.average_cost),
    performance: cloneRecord(value.performance),
    aggregation: cloneRecord(value.aggregation),
    data_state: deserializeDataState(value.data_state),
  };

  const coverageRatio = toFiniteNumber(value.coverage_ratio);
  if (coverageRatio != null) {
    snapshot.coverage_ratio = coverageRatio;
  }
  const provenance = toStringValue(value.provenance);
  if (provenance) {
    snapshot.provenance = provenance;
  }
  const metricRunUuid = toNullableString(value.metric_run_uuid);
  if (metricRunUuid !== null) {
    snapshot.metric_run_uuid = metricRunUuid;
  }

  const lastPriceNative = toFiniteNumber(value.last_price_native);
  if (lastPriceNative != null) {
    snapshot.last_price_native = lastPriceNative;
  }
  const lastPriceEur = toFiniteNumber(value.last_price_eur);
  if (lastPriceEur != null) {
    snapshot.last_price_eur = lastPriceEur;
  }
  const lastCloseNative = toFiniteNumber(value.last_close_native);
  if (lastCloseNative != null) {
    snapshot.last_close_native = lastCloseNative;
  }
  const lastCloseEur = toFiniteNumber(value.last_close_eur);
  if (lastCloseEur != null) {
    snapshot.last_close_eur = lastCloseEur;
  }

  return snapshot;
}

export function deserializePositionSnapshots(value: unknown): NormalizedPositionSnapshot[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const snapshots: NormalizedPositionSnapshot[] = [];
  for (const entry of value) {
    const snapshot = deserializePositionSnapshot(entry);
    if (snapshot) {
      snapshots.push(snapshot);
    }
  }
  return snapshots;
}

export function deserializePortfolioSnapshot(value: unknown): NormalizedPortfolioSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = toStringValue(value.name);
  const currentValue = toFiniteNumber(value.current_value ?? value.value);

  if (!name || currentValue == null) {
    return null;
  }

  const purchaseValueRaw = toFiniteNumber(
    value.purchase_sum ?? value.purchase_value_eur ?? value.purchase_value ?? value.purchaseSum,
  );
  const purchaseValue = purchaseValueRaw ?? 0;

  const snapshot: NormalizedPortfolioSnapshot = {
    uuid: toStringValue(value.uuid) ?? undefined,
    name,
    current_value: currentValue,
    purchase_value: purchaseValue,
    purchase_sum: purchaseValue,
    day_change_abs: toFiniteNumber(
      (value as { day_change_abs?: unknown })?.day_change_abs ??
        (value as { day_change_eur?: unknown })?.day_change_eur,
    ) ?? undefined,
    day_change_pct: toFiniteNumber((value as { day_change_pct?: unknown })?.day_change_pct) ?? undefined,
    position_count: toInteger(value.position_count ?? value.count) ?? undefined,
    missing_value_positions: toInteger(value.missing_value_positions) ?? undefined,
    has_current_value: readBoolean(value.has_current_value),
    performance: cloneRecord(value.performance),
    coverage_ratio: toFiniteNumber(value.coverage_ratio) ?? undefined,
    provenance: toStringValue(value.provenance) ?? undefined,
    metric_run_uuid: toNullableString(value.metric_run_uuid) ?? undefined,
    data_state: deserializeDataState(value.data_state),
  };

  if (Array.isArray(value.positions)) {
    snapshot.positions = deserializePositionSnapshots(value.positions);
  }

  return snapshot;
}

export function deserializePortfolioSnapshots(value: unknown): NormalizedPortfolioSnapshot[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const snapshots: NormalizedPortfolioSnapshot[] = [];
  for (const entry of value) {
    const snapshot = deserializePortfolioSnapshot(entry);
    if (snapshot) {
      snapshots.push(snapshot);
    }
  }
  return snapshots;
}

export function deserializeNormalizedPayloadMetadata(value: unknown): NormalizedPayloadMetadata | null {
  if (!isRecord(value)) {
    return null;
  }
  const metadata: NormalizedPayloadMetadata = { ...value };
  const metricRunUuid = toNullableString(value.metric_run_uuid);
  if (metricRunUuid !== null) {
    metadata.metric_run_uuid = metricRunUuid;
  } else {
    delete metadata.metric_run_uuid;
  }
  const coverageRatio = toFiniteNumber(value.coverage_ratio);
  if (coverageRatio != null) {
    metadata.coverage_ratio = coverageRatio;
  } else {
    delete metadata.coverage_ratio;
  }
  const provenance = toStringValue(value.provenance);
  if (provenance) {
    metadata.provenance = provenance;
  } else {
    delete metadata.provenance;
  }
  const generatedAt = toStringValue(value.generated_at ?? value.snapshot_generated_at);
  if (generatedAt) {
    metadata.generated_at = generatedAt;
  } else {
    delete metadata.generated_at;
  }
  return metadata;
}

export function deserializeNormalizationDiagnostics(
  value: unknown,
): NormalizationDiagnostics | null {
  if (!isRecord(value)) {
    return null;
  }
  const diagnostics: NormalizationDiagnostics = { ...value };
  const normalizedPayload = deserializeNormalizedPayloadMetadata(value.normalized_payload);
  if (normalizedPayload) {
    diagnostics.normalized_payload = normalizedPayload;
  } else if ('normalized_payload' in diagnostics) {
    delete diagnostics.normalized_payload;
  }
  return diagnostics;
}

export function deserializeNormalizedDashboardSnapshot(value: unknown): NormalizedDashboardSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  const generatedAt = toStringValue(value.generated_at);
  if (!generatedAt) {
    return null;
  }
  const metricRunUuid = toNullableString(value.metric_run_uuid);

  const accounts = deserializeAccountSnapshots(value.accounts);
  const portfolios = deserializePortfolioSnapshots(value.portfolios);
  const diagnostics = deserializeNormalizationDiagnostics(value.diagnostics);

  const snapshot: NormalizedDashboardSnapshot = {
    generated_at: generatedAt,
    metric_run_uuid: metricRunUuid,
    accounts,
    portfolios,
  };
  if (diagnostics) {
    snapshot.diagnostics = diagnostics;
  }
  return snapshot;
}
