/**
 * Selector helpers that expose normalized dashboard state for view controllers.
 *
 * These functions keep all overview tables in sync with the canonical store by
 * providing pre-digested rows plus provenance badges mirrored from
 * the backend normalization pipeline.
 */
import type { PerformanceMetricsPayload } from "../../../tabs/types";
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
export declare function selectAccountOverviewRows(): AccountOverviewRow[];
export declare function selectPortfolioOverviewRows(): PortfolioOverviewRow[];
//# sourceMappingURL=portfolio.d.ts.map