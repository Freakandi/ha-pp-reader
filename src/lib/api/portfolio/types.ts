/**
 * Canonical TypeScript contracts for normalized dashboard payloads.
 */

export interface SnapshotDataState {
  status?: string | null;
  message?: string | null;
  [key: string]: unknown;
}

export interface NormalizedPayloadMetadata {
  metric_run_uuid?: string | null;
  coverage_ratio?: number | null;
  provenance?: string | null;
  generated_at?: string | null;
  [key: string]: unknown;
}

export type NormalizationDiagnostics = {
  normalized_payload?: NormalizedPayloadMetadata | null;
  [key: string]: unknown;
};

export interface NormalizedAccountSnapshot {
  uuid?: string;
  name?: string;
  currency_code?: string;
  orig_balance?: number;
  balance?: number | null;
  fx_rate?: number | null;
  fx_rate_source?: string | null;
  fx_rate_timestamp?: string | null;
  coverage_ratio?: number | null;
  provenance?: string | null;
  metric_run_uuid?: string | null;
  fx_unavailable?: boolean;
}

export interface NormalizedPortfolioSnapshot {
  uuid?: string | null;
  name?: string;
  current_value?: number | null;
  purchase_value?: number | null;
  purchase_sum?: number | null;
  position_count?: number | null;
  missing_value_positions?: number | null;
  has_current_value?: boolean;
  performance?: Record<string, unknown> | null;
  coverage_ratio?: number | null;
  provenance?: string | null;
  metric_run_uuid?: string | null;
  positions?: NormalizedPositionSnapshot[];
  data_state?: SnapshotDataState | null;
}

export interface NormalizedPositionSnapshot {
  portfolio_uuid?: string;
  security_uuid?: string;
  name?: string;
  currency_code?: string | null;
  current_holdings?: number;
  purchase_value?: number;
  current_value?: number;
  average_cost?: Record<string, unknown> | null;
  performance?: Record<string, unknown> | null;
  aggregation?: Record<string, unknown> | null;
  coverage_ratio?: number | null;
  provenance?: string | null;
  metric_run_uuid?: string | null;
  last_price_native?: number | null;
  last_price_eur?: number | null;
  last_close_native?: number | null;
  last_close_eur?: number | null;
  data_state?: SnapshotDataState | null;
}

export interface NormalizedDashboardSnapshot {
  generated_at: string;
  metric_run_uuid: string | null;
  accounts: NormalizedAccountSnapshot[];
  portfolios: NormalizedPortfolioSnapshot[];
  diagnostics?: NormalizationDiagnostics | null;
}
