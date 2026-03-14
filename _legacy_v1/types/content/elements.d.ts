export type SortDirection = "asc" | "desc";
export type TableAlignment = "left" | "right" | "center";
export interface TableColumn {
    key: string;
    label: string;
    align?: TableAlignment;
}
export interface TableFooterContext {
    hasValue?: boolean;
}
export interface TableOptions {
    sortable?: boolean;
    defaultSort?: {
        key: string;
        dir?: SortDirection;
    };
    rowAttributes?: (row: TableRow) => Record<string, string>;
    footerValues?: Record<string, string | number | null | undefined>;
}
export type TableRow = Record<string, unknown>;
export declare function formatValue(key: string, value: unknown, row?: TableRow | undefined, context?: TableFooterContext | undefined): string;
export declare function makeTable(rows: TableRow[], cols: TableColumn[], sumColumns?: readonly string[], options?: TableOptions): string;
export declare function createHeaderCard(headerTitle: string, meta: string, options?: {
    includeMeta?: boolean;
    subtitle?: string;
}): HTMLDivElement;
export declare function formatNumber(value: number, minFrac?: number, maxFrac?: number): string;
export declare function formatGain(value: number): string;
export declare function formatGainPct(value: number): string;
export declare function createInlineSpinner(): string;
export declare function renderLoadingState(message?: string): string;
export declare function stack(topVal: number | string, topFmt: string, botVal: number | string, botFmt: string): string;
export declare function createSortHeader(labelTop: string, selectorTop: string, labelBottom: string, selectorBottom: string): string;
export declare function createSimpleSortHeader(label: string, key: string): string;
/**
 * Neue Utility: sortTableRows
 * Sortiert die Datenzeilen (<tr>) einer Tabelle anhand eines Keys.
 *
 * @param {HTMLTableElement} tableEl  Ziel-Tabelle
 * @param {string} key                Daten-Key (muss mit data-sort-key im TH oder Positions-Mapping übereinstimmen)
 * @param {'asc'|'desc'} dir          Sortierrichtung
 * @param {boolean} isPositions       true => Positions-Spalten-Mapping verwenden
 * @returns {HTMLTableRowElement[]}   Array der neu angeordneten Daten-Zeilen (ohne Footer)
 *
 * Erkennung Zahl vs. String:
 *  - Entfernt NBSP, €, %, Tausenderpunkte
 *  - Wandelt Komma in Punkt
 *  - Wenn parseFloat ein valides Zahlenergebnis liefert und der ursprüngliche Text
 *    nicht komplett alphabetisch ist -> numerischer Vergleich; sonst localeCompare.
 *
 * Footer-Zeile ('.footer-row') bleibt am Ende erhalten.
 */
export declare function sortTableRows(tableEl: HTMLTableElement | null | undefined, key: string, dir?: SortDirection, isPositions?: boolean): HTMLTableRowElement[];
export declare function renderRetryButton(portfolioUuid: string, label?: string): string;
//# sourceMappingURL=elements.d.ts.map