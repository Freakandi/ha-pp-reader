/**
 * Shared currency helpers for Portfolio Performance Reader dashboard logic.
 */
export interface RoundCurrencyOptions {
    decimals?: number;
    fallback?: number | null;
}
export declare function toFiniteCurrency(value: unknown): number | null;
export declare function roundCurrency(value: unknown, { decimals, fallback }?: RoundCurrencyOptions): number | null;
export declare function normalizeCurrencyValue(value: unknown, options?: RoundCurrencyOptions): number | null;
export declare function normalizePercentValue(value: unknown, options?: RoundCurrencyOptions): number | null;
//# sourceMappingURL=currency.d.ts.map