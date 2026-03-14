/**
 * Helper utilities to deserialize canonical normalization payloads.
 */
import type { NormalizedAccountSnapshot, NormalizedDashboardSnapshot, NormalizedPayloadMetadata, NormalizedPortfolioSnapshot, NormalizedPositionSnapshot, NormalizationDiagnostics } from './types';
export declare function deserializeAccountSnapshot(value: unknown): NormalizedAccountSnapshot | null;
export declare function deserializeAccountSnapshots(value: unknown): NormalizedAccountSnapshot[];
export declare function deserializePositionSnapshot(value: unknown): NormalizedPositionSnapshot | null;
export declare function deserializePositionSnapshots(value: unknown): NormalizedPositionSnapshot[];
export declare function deserializePortfolioSnapshot(value: unknown): NormalizedPortfolioSnapshot | null;
export declare function deserializePortfolioSnapshots(value: unknown): NormalizedPortfolioSnapshot[];
export declare function deserializeNormalizedPayloadMetadata(value: unknown): NormalizedPayloadMetadata | null;
export declare function deserializeNormalizationDiagnostics(value: unknown): NormalizationDiagnostics | null;
export declare function deserializeNormalizedDashboardSnapshot(value: unknown): NormalizedDashboardSnapshot | null;
//# sourceMappingURL=deserializers.d.ts.map