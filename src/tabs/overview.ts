/**
 * Overview tab renderer copied for the TypeScript source tree.
 */

import {
  createHeaderCard,
  createSimpleSortHeader,
  createSortHeader,
  formatNumber,
  makeTable,
  renderLoadingState,
  stack,
} from "../content/elements";
import { openSecurityDetail } from "../dashboard";
import { registerOverviewHelpers } from "../dashboard/registry";
import type { PortfolioPositionsResponse } from "../data/api";
import {
  fetchAccountsWS,
  fetchLastFileUpdateWS,
  fetchPortfolioPositionsWS,
  fetchPortfoliosWS,
} from "../data/api";
import type { PortfolioPositionRecord } from "../data/positionsCache";
import {
  getPortfolioPositions,
  hasPortfolioPositions,
  normalizePositionRecords,
  setPortfolioPositions,
} from "../data/positionsCache";
import {
  flushAllPendingPositions,
  flushPendingPositions,
} from "../data/updateConfigsWS";
import {
  replacePortfolioSnapshots,
  setAccountSnapshots,
  setPortfolioPositionsSnapshot,
} from "../lib/store/portfolioStore";
import {
  selectAccountOverviewRows,
  selectPortfolioOverviewRows,
  type AccountOverviewRow,
  type PortfolioOverviewRow,
} from "../lib/store/selectors/portfolio";
import { renderBadgeList, renderNameWithBadges } from "../lib/ui/badges";
import type { HomeAssistant } from "../types/home-assistant";
import { toFiniteCurrency } from "../utils/currency";
import { formatCurrency, formatPercent } from "../utils/format";
import { escapeAttribute, escapeHtml } from "../utils/html";
import { normalizePerformancePayload } from "../utils/performance";
import type { PanelConfigLike } from "./types";

const ICON_CHEVRON_DOWN =
  "M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z";
const ICON_CHEVRON_RIGHT =
  "M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z";

// CSS for stacked columns and sorting (Copied from trades.ts)
const STYLES = `
<style>
  .portfolio-toggle .caret {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    width: 24px !important;
    height: 24px !important;
  }
  .portfolio-toggle .caret svg {
    width: 24px;
    height: 24px;
    fill: currentColor;
    display: block;
  }
  .sort-stack {
    display: flex;
    flex-direction: column;
    gap: 4px;
    line-height: 1.2;
    padding: 4px 0;
  }
  .sort-item {
    cursor: pointer;
    white-space: nowrap;
    opacity: 0.7;
    transition: opacity 0.2s;
    display: inline-block;
  }
  .sort-item:hover {
    opacity: 1;
    text-decoration: underline;
  }
  .sort-item:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
    border-radius: 2px;
    opacity: 1;
  }
  .sort-item.sort-active {
    opacity: 1;
    font-weight: bold;
    color: var(--primary-color);
  }

  /* SVG Icon Styles */
  .sort-icon {
    width: 16px;
    height: 16px;
    fill: currentColor;
    display: inline-block;
    vertical-align: middle;
    margin-left: 2px;
    opacity: 0;
    transition: opacity 0.2s, transform 0.2s;
  }
  .sort-active .sort-icon {
    opacity: 1;
  }
  .sort-active.dir-desc .sort-icon {
    transform: rotate(180deg);
  }
  .sort-item:hover .sort-icon,
  .simple-sort-header:hover .sort-icon {
      opacity: 0.5;
  }
  .sort-item.sort-active:hover .sort-icon,
  .simple-sort-header.sort-active:hover .sort-icon {
      opacity: 1;
  }

  .simple-sort-header {
    cursor: pointer;
  }
  .simple-sort-header:hover {
    text-decoration: underline;
  }
  .simple-sort-header:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
    border-radius: 2px;
  }
  .simple-sort-header.sort-active {
     font-weight: bold;
     color: var(--primary-color);
  }

  .cell-stack {
    display: flex;
    flex-direction: column;
    gap: 4px;
    line-height: 1.2;
  }
  .val-top {
    display: block;
    font-weight: 500;
  }
  .val-bottom {
    display: block;
    color: var(--secondary-text-color);
    font-size: 0.9em;
  }

  /* Ensure trend colors carry over */
  .val-top .positive, .val-bottom .positive { color: var(--success-color); }
  .val-top .negative, .val-bottom .negative { color: var(--error-color); }

  .empty-state {
    padding: 32px;
    text-align: center;
    color: var(--secondary-text-color);
  }
  .empty-state__icon {
    opacity: 0.5;
    width: 48px;
    height: 48px;
    margin-bottom: 16px;
    fill: currentColor;
  }
  .empty-state__title {
    margin: 0;
    font-size: 1.1em;
  }
  .empty-state__text {
    margin: 4px 0 0 0;
    font-size: 0.9em;
    opacity: 0.8;
  }
</style>
`;

// Helper functions for stacked columns
function renderTrend(value: number, formatted: string): string {
  const cls = value > 0 ? "positive" : value < 0 ? "negative" : "neutral";
  return `<span class="${cls}">${formatted}</span>`;
}


type PortfolioQueryRoot = Document | HTMLElement;

type PortfolioPositionsSortKey =
  | "name"
  | "current_holdings"
  | "average_price"
  | "purchase_value"
  | "current_value"
  | "day_change_abs"
  | "day_change_pct"
  | "gain_abs"
  | "gain_pct"
  | "last_price";

type PortfolioSortDirection = "asc" | "desc";

const PORTFOLIO_SORT_KEYS: readonly PortfolioPositionsSortKey[] = [
  "name",
  "current_holdings",
  "last_price",
  "average_price",
  "purchase_value",
  "current_value",
  "day_change_abs",
  "day_change_pct",
  "gain_abs",
  "gain_pct",
];

function isPortfolioPositionsSortKey(
  value: string | null | undefined,
): value is PortfolioPositionsSortKey {
  return PORTFOLIO_SORT_KEYS.includes(value as PortfolioPositionsSortKey);
}

function isPortfolioSortDirection(
  value: string | null | undefined,
): value is PortfolioSortDirection {
  return value === "asc" || value === "desc";
}

type ToggleContainerElement = HTMLElement & {
  __ppReaderSecurityClickBound?: boolean;
  __ppReaderPortfolioToggleBound?: boolean;
};

type ToggleRootElement = HTMLElement & {
  __ppReaderAttachToken?: number;
  __ppReaderAttachInProgress?: boolean;
};

type SortableTableElement = HTMLTableElement & {
  __ppReaderSortingBound?: boolean;
  __ppReaderPortfolioFallbackBound?: boolean;
  __ppReaderOverviewSortingBound?: boolean;
};

type OverviewBadgeList = AccountOverviewRow["badges"];

function withoutCoverageBadges(
  badges: OverviewBadgeList | undefined,
): OverviewBadgeList {
  return (badges ?? []).filter((badge) => !badge.key.endsWith("-coverage"));
}

function stripAccountBadges(
  badges: OverviewBadgeList | undefined,
): OverviewBadgeList {
  return withoutCoverageBadges(badges).filter(
    (badge) => !badge.key.startsWith("provenance-"),
  );
}

// === Modul-weiter State für Expand/Collapse & Lazy Load ===
// On-Demand Aggregation liefert frische Portfolio-Werte; nur Positionen bleiben Lazy-Loaded.
let _hassRef: HomeAssistant | null = null;
let _panelConfigRef: PanelConfigLike | null = null;

// --- Security-Aggregation für Detail-Ansicht ---
const PRICE_FRACTION_DIGITS = { min: 2, max: 6 } as const;

function toNullableNumber(value: unknown): number | null {
  return toFiniteCurrency(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeCurrencyCode(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const upper = trimmed.toUpperCase();
  if (/^[A-Z]{3}$/.test(upper)) {
    return upper;
  }
  if (upper === "€") {
    return "EUR";
  }
  return null;
}

function resolveCurrencyFromPosition(
  position: Record<string, unknown>,
  keys: readonly string[],
  fallback: string | null = null,
): string | null {
  for (const key of keys) {
    const candidate = normalizeCurrencyCode(position[key]);
    if (candidate) {
      return candidate;
    }
  }
  return fallback;
}

function formatPriceWithCurrency(
  value: number | null,
  currency: string | null,
): string | null {
  if (!isFiniteNumber(value)) {
    return null;
  }

  const formatted = value.toLocaleString("de-DE", {
    minimumFractionDigits: PRICE_FRACTION_DIGITS.min,
    maximumFractionDigits: PRICE_FRACTION_DIGITS.max,
  });
  return `${formatted}${currency ? `\u00A0${escapeHtml(currency)}` : ""}`;
}

function buildPurchasePriceDisplay(position: PortfolioPositionRecord): {
  markup: string;
  sortValue: number;
  ariaLabel: string;
} {
  const record = position as Record<string, unknown>;
  const averageCost = position.average_cost ?? null;
  const aggregation = position.aggregation ?? null;

  const securityCurrency = resolveCurrencyFromPosition(
    record,
    [
      "security_currency_code",
      "security_currency",
      "native_currency_code",
      "native_currency",
    ],
    position.currency_code ?? null,
  );

  const accountCurrency =
    resolveCurrencyFromPosition(
      record,
      [
        "account_currency_code",
        "account_currency",
        "purchase_currency_code",
        "currency_code",
      ],
      securityCurrency === "EUR" ? "EUR" : null,
    ) ?? "EUR";

  const averageNative = toNullableNumber(averageCost?.native);
  const averageSecurity = toNullableNumber(averageCost?.security);
  const averageAccount = toNullableNumber(averageCost?.account);
  const averageEur = toNullableNumber(averageCost?.eur);

  const nativeAverage = averageSecurity ?? averageNative;
  const eurAverage =
    averageEur ?? (accountCurrency === "EUR" ? averageAccount : null);
  const resolvedSecurityCurrency = securityCurrency ?? accountCurrency;
  const isEurSecurity = resolvedSecurityCurrency === "EUR";

  let primaryCurrency: string | null;
  let primaryValue: number | null;

  if (!isEurSecurity) {
    if (nativeAverage != null) {
      primaryCurrency = resolvedSecurityCurrency;
      primaryValue = nativeAverage;
    } else if (averageAccount != null) {
      primaryCurrency = accountCurrency;
      primaryValue = averageAccount;
    } else {
      primaryCurrency = "EUR";
      primaryValue = eurAverage ?? null;
    }
  } else {
    primaryCurrency = "EUR";
    primaryValue = eurAverage ?? nativeAverage ?? averageAccount ?? null;
  }

  const primaryText = formatPriceWithCurrency(primaryValue, primaryCurrency);
  const formattedEur = !isEurSecurity
    ? formatPriceWithCurrency(eurAverage, "EUR")
    : null;

  const shouldRenderAccount = !!formattedEur && formattedEur !== primaryText;

  const parts: string[] = [];
  const ariaParts: string[] = [];

  if (primaryText) {
    parts.push(
      `<span class="purchase-price purchase-price--primary">${primaryText}</span>`,
    );
    ariaParts.push(primaryText.replace(/\u00A0/g, " "));
  } else {
    const missing =
      '<span class="missing-value" role="note" aria-label="Kein Kaufpreis verfügbar" title="Kein Kaufpreis verfügbar">—</span>';
    parts.push(missing);
    ariaParts.push("Kein Kaufpreis verfügbar");
  }

  if (shouldRenderAccount && formattedEur) {
    parts.push(
      `<span class="purchase-price purchase-price--secondary">${formattedEur}</span>`,
    );
    ariaParts.push(formattedEur.replace(/\u00A0/g, " "));
  }

  const markup = parts.join("<br>");
  const sortValue = toNullableNumber(aggregation?.purchase_value_eur) ?? 0;
  const ariaLabel = ariaParts.join(", ");

  return { markup, sortValue, ariaLabel };
}

function buildLastPriceDisplay(position: PortfolioPositionRecord): {
  markup: string;
  sortValue: number;
  ariaLabel: string;
} {
  const nativePrice = toNullableNumber(position.last_price_native);
  const eurPrice = toNullableNumber(position.last_price_eur);
  const currency = position.currency_code ?? "EUR";
  const isEur = currency === "EUR";

  const parts: string[] = [];
  const ariaParts: string[] = [];

  let sortValue = 0;

  if (isEur) {
    // Case 1: EUR security
    // Use native if available, else eurPrice (which should be same), or fallback
    const val = nativePrice ?? eurPrice;
    sortValue = val ?? 0;

    if (val != null) {
      const formatted = formatPriceWithCurrency(val, "EUR");
      if (formatted) {
        parts.push(`<span class="val-top">${formatted}</span>`);
        ariaParts.push(formatted.replace(/\u00A0/g, " "));
      }
    }
  } else {
    // Case 2: Non-EUR security
    // Line 1: Native Price
    if (nativePrice != null) {
      sortValue = eurPrice ?? 0; // Sort by EUR equivalent usually makes sense for value comparison, but here maybe just EUR price? Actually for "Last Price" column, usually people sort by the visible number, but since currencies differ, sorting by EUR equivalent allows valid cross-security comparison.

      const formattedNative = formatPriceWithCurrency(nativePrice, currency);
      if (formattedNative) {
        parts.push(`<span class="val-top">${formattedNative}</span>`);
        ariaParts.push(formattedNative.replace(/\u00A0/g, " "));
      }
    }

    // Line 2: EUR Price
    if (eurPrice != null) {
      const formattedEur = formatPriceWithCurrency(eurPrice, "EUR");
      if (formattedEur) {
        parts.push(`<span class="val-bottom">${formattedEur}</span>`);
        ariaParts.push(formattedEur.replace(/\u00A0/g, " "));
      }
    }
  }

  if (parts.length === 0) {
    parts.push('<span class="missing-value">—</span>');
    ariaParts.push("Kein aktueller Kurs");
  }

  return {
    markup: `<div class="cell-stack">${parts.join("")}</div>`,
    sortValue, // Using EUR value for consistent sorting across different currencies
    ariaLabel: ariaParts.join(", "),
  };
}

export const __TEST_ONLY__ = {
  buildPurchasePriceDisplayForTest: buildPurchasePriceDisplay,
  buildLastPriceDisplayForTest: buildLastPriceDisplay,
  attachPortfolioOverviewSorting,
  buildExpandablePortfolioTableForTest: buildExpandablePortfolioTable,
};

function computePositionDayChange(position: PortfolioPositionRecord): {
  value: number | null;
  pct: number | null;
} {
  const holdings = toFiniteCurrency(position.current_holdings);
  if (holdings == null) {
    return { value: null, pct: null };
  }

  const lastPriceEur = toFiniteCurrency(
    (position as { last_price_eur?: unknown }).last_price_eur,
  );
  const lastCloseEur = toFiniteCurrency(
    (position as { last_close_eur?: unknown }).last_close_eur,
  );

  let dayChangeValue: number | null = null;
  let dayChangePct: number | null = null;

  if (lastPriceEur != null && lastCloseEur != null) {
    const priceDelta = lastPriceEur - lastCloseEur;
    dayChangeValue = priceDelta * holdings;
    const closeValue = lastCloseEur * holdings;
    if (closeValue) {
      dayChangePct = (dayChangeValue / closeValue) * 100;
    }
  }

  const performance = normalizePerformancePayload(position.performance);
  const dayChangePayload = performance?.day_change ?? null;

  if (dayChangeValue == null && dayChangePayload?.price_change_eur != null) {
    dayChangeValue = dayChangePayload.price_change_eur * holdings;
  }

  if (dayChangePct == null && dayChangePayload?.change_pct != null) {
    dayChangePct = dayChangePayload.change_pct;
  }

  if (dayChangeValue == null && dayChangePct != null) {
    const currentValue = toFiniteCurrency(position.current_value);
    if (currentValue != null) {
      const baseline = currentValue / (1 + dayChangePct / 100);
      if (baseline) {
        dayChangeValue = currentValue - baseline;
      }
    }
  }

  const roundedValue =
    dayChangeValue != null && Number.isFinite(dayChangeValue)
      ? Math.round(dayChangeValue * 100) / 100
      : null;
  const roundedPct =
    dayChangePct != null && Number.isFinite(dayChangePct)
      ? Math.round(dayChangePct * 100) / 100
      : null;

  return { value: roundedValue, pct: roundedPct };
}

// Global cache exports have been removed; cache interactions now flow through
// the shared data/positionsCache module.
const expandedPortfolios = new Set<string>(); // gemerkte geöffnete Depots (persistiert über Re-Renders)

// ENTFERNT: Globaler document-Listener (Section 6 Hardening)
// Stattdessen scoped Listener über attachPortfolioToggleHandler(root)

// Rendert die Positions-Tabelle für ein Depot
function applyGainPctMetadata(
  tableEl: HTMLTableElement | null | undefined,
): void {
  if (!tableEl) {
    return;
  }
  const bodyRows = Array.from(
    tableEl.querySelectorAll<HTMLTableRowElement>("tbody tr"),
  );
  bodyRows.forEach((row) => {
    const gainAbsCell = row.cells.item(7);
    const gainPctCell = row.cells.item(8);
    if (!gainAbsCell || !gainPctCell) {
      return;
    }
    if (gainAbsCell.dataset.gainPct && gainAbsCell.dataset.gainSign) {
      return;
    }
    const pctText = (gainPctCell.textContent || "").trim() || "—";
    let pctSign: "positive" | "negative" | "neutral" = "neutral";
    if (gainPctCell.querySelector(".positive")) {
      pctSign = "positive";
    } else if (gainPctCell.querySelector(".negative")) {
      pctSign = "negative";
    }
    gainAbsCell.dataset.gainPct = pctText;
    gainAbsCell.dataset.gainSign = pctSign;
  });
}

function renderPositionsTable(
  positions: readonly PortfolioPositionRecord[],
): string {
  const activePositions = positions.filter(
    (p) => Number(p.current_holdings) > 0,
  );

  if (activePositions.length === 0) {
    const emptyState = `
      <div class="empty-state">
        <svg class="empty-state__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5M12,4.15L6.04,7.5L12,10.85L17.96,7.5L12,4.15M5,15.91L11,19.29V12.58L5,9.21V15.91M19,15.91V9.21L13,12.58V19.29L19,15.91Z" />
        </svg>
        <p class="empty-state__title">Keine Positionen vorhanden</p>
        <p class="empty-state__text">In diesem Depot befinden sich aktuell keine Wertpapiere.</p>
      </div>
    `;
    return STYLES + emptyState;
  }

  // --- Footer Calculation ---
  let totalPurchase = 0;
  let totalCurrent = 0;
  let totalDayChangeAbs = 0;
  let totalGainAbs = 0;

  const rows = activePositions.map((p) => {
    const performance = normalizePerformancePayload(p.performance);
    const gainAbs =
      typeof performance?.gain_abs === "number" ? performance.gain_abs : 0;
    const gainPct =
      typeof performance?.gain_pct === "number" ? performance.gain_pct : 0;
    const dayChange = computePositionDayChange(p);
    const dayChangeAbs = dayChange.value ?? 0;
    const dayChangePct = dayChange.pct ?? 0;

    const purchaseVal =
      typeof p.purchase_value === "number" ? p.purchase_value : 0;
    const currentVal =
      typeof p.current_value === "number" ? p.current_value : 0;

    if (typeof p.purchase_value === "number") {
      totalPurchase += purchaseVal;
    }
    if (typeof p.current_value === "number") {
      totalCurrent += currentVal;
    }
    if (dayChange.value != null) totalDayChangeAbs += dayChangeAbs;
    if (typeof performance?.gain_abs === "number") totalGainAbs += gainAbs;

    // Build stacked cells
    const valueCombo = stack(
      purchaseVal,
      formatCurrency(purchaseVal),
      currentVal,
      formatCurrency(currentVal),
    );

    const dayCombo = stack(
      dayChangeAbs,
      renderTrend(dayChangeAbs, formatCurrency(dayChangeAbs)),
      dayChangePct,
      renderTrend(dayChangePct, formatPercent(dayChangePct / 100)),
    );

    const gainCombo = stack(
      gainAbs,
      renderTrend(gainAbs, formatCurrency(gainAbs)),
      gainPct,
      renderTrend(gainPct, formatPercent(gainPct / 100)),
    );

    // Reuse buildPurchasePriceDisplay to get the complex average price display
    const { markup: avgPriceMarkup, sortValue: avgPriceSortVal } =
      buildPurchasePriceDisplay(p);

    // Build Last Price display
    const { markup: lastPriceMarkup, sortValue: lastPriceSortVal } =
      buildLastPriceDisplay(p);

    const row: Record<string, unknown> = {
      _uuid: typeof p.security_uuid === "string" ? p.security_uuid : "",
      name:
        typeof p.name === "string"
          ? escapeHtml(p.name)
          : typeof p.name === "number"
            ? String(p.name)
            : "",
      current_holdings:
        typeof p.current_holdings === "number" ||
        typeof p.current_holdings === "string"
          ? p.current_holdings
          : null,
      last_price: `<span data-sort-value="${String(lastPriceSortVal)}">${lastPriceMarkup}</span>`,
      average_price: `<span data-sort-value="${String(avgPriceSortVal)}">${avgPriceMarkup}</span>`,

      // Stacked columns
      value_combo: valueCombo,
      day_combo: dayCombo,
      gain_combo: gainCombo,
    };
    return row;
  });

  // Calculate Footer Aggregates
  const totalDayChangePct =
    totalCurrent - totalDayChangeAbs !== 0
      ? (totalDayChangeAbs / (totalCurrent - totalDayChangeAbs)) * 100
      : 0;

  const totalGainPct =
    totalPurchase !== 0 ? (totalGainAbs / totalPurchase) * 100 : 0;

  const footerValues = {
    name: "Summe",
    current_holdings: "",
    last_price: "",
    average_price: "",
    value_combo: stack(
      totalPurchase,
      formatCurrency(totalPurchase),
      totalCurrent,
      formatCurrency(totalCurrent),
    ),
    day_combo: stack(
      totalDayChangeAbs,
      renderTrend(totalDayChangeAbs, formatCurrency(totalDayChangeAbs)),
      totalDayChangePct,
      renderTrend(totalDayChangePct, formatPercent(totalDayChangePct / 100)),
    ),
    gain_combo: stack(
      totalGainAbs,
      renderTrend(totalGainAbs, formatCurrency(totalGainAbs)),
      totalGainPct,
      renderTrend(totalGainPct, formatPercent(totalGainPct / 100)),
    ),
  };

  // Define Columns
  const cols = [
    { key: "name", label: createSimpleSortHeader("Wertpapier", "name") },
    {
      key: "current_holdings",
      label: createSimpleSortHeader("Bestand", "current_holdings"),
      align: "right" as const,
    },
    {
      key: "last_price",
      label: createSimpleSortHeader("Letzter Kurs", "last_price"),
      align: "right" as const,
    },
    {
      key: "average_price",
      label: createSimpleSortHeader("Ø Kaufpreis", "average_price"),
      align: "right" as const,
    },

    // Stacked Columns
    {
      key: "value_combo",
      label: createSortHeader(
        "Kaufwert",
        "purchase_value",
        "Aktueller Wert",
        "current_value",
      ),
      align: "right" as const,
    },
    {
      key: "day_combo",
      label: createSortHeader(
        "Heute +/-",
        "day_change_abs",
        "Heute %",
        "day_change_pct",
      ),
      align: "right" as const,
    },
    {
      key: "gain_combo",
      label: createSortHeader("Gesamt +/-", "gain_abs", "Gesamt %", "gain_pct"),
      align: "right" as const,
    },
  ];

  return (
    STYLES +
    makeTable(rows, cols, ["sortable-positions"], {
      sortable: false,
      footerValues,
      rowAttributes: (row: Record<string, unknown>) => {
        const uuid = row._uuid as string;
        const attrs: Record<string, string> = { class: "position-row" };
        if (uuid) attrs["data-security"] = uuid;
        return attrs;
      },
    }).replace("<table", '<table class="sortable-positions"')
  );
}

// NEU: Export / Global bereitstellen für Push-Handler (Konsistenz Push vs Lazy)
export function renderPortfolioPositions(
  positions:
    | readonly (PortfolioPositionRecord | Record<string, unknown>)[]
    | null
    | undefined,
): string {
  const normalized = normalizePositionRecords(positions ?? []);
  return renderPositionsTable(normalized);
}

function attachSecurityDetailDelegation(
  root: PortfolioQueryRoot,
  portfolioUuid: string,
): void {
  if (!portfolioUuid) return;
  const detailsRow = root.querySelector<HTMLTableRowElement>(
    `.portfolio-details[data-portfolio="${portfolioUuid}"]`,
  );
  if (!detailsRow) return;
  const container = detailsRow.querySelector<ToggleContainerElement>(
    ".positions-container",
  );
  if (!container) return;
  if (container.__ppReaderSecurityClickBound) return;

  container.__ppReaderSecurityClickBound = true;

  container.addEventListener("click", (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const interactive = target.closest("button, a");
    if (interactive && container.contains(interactive)) {
      return;
    }

    const row = target.closest<HTMLTableRowElement>("tr[data-security]");
    if (!row || !container.contains(row)) {
      return;
    }

    const securityUuid = row.getAttribute("data-security");
    if (!securityUuid) {
      return;
    }

    try {
      const opened = openSecurityDetail(securityUuid);
      if (!opened) {
        console.warn(
          "attachSecurityDetailDelegation: Detail-Tab konnte nicht geöffnet werden für",
          securityUuid,
        );
      }
    } catch (err) {
      console.error(
        "attachSecurityDetailDelegation: Fehler beim Öffnen des Detail-Tabs",
        err,
      );
    }
  });
}

export function attachSecurityDetailListener(
  root: PortfolioQueryRoot,
  portfolioUuid: string,
): void {
  attachSecurityDetailDelegation(root, portfolioUuid);
}

// (1) Entferne evtl. doppelte frühere Definitionen von buildExpandablePortfolioTable – nur diese Version behalten
function buildExpandablePortfolioTable(
  depots: readonly PortfolioOverviewRow[],
): string {
  console.debug(
    "buildExpandablePortfolioTable: render",
    depots.length,
    "portfolios",
  );

  if (depots.length === 0) {
    return `
      <div class="empty-state">
        <svg class="empty-state__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
        </svg>
        <p class="empty-state__title">Keine Depots gefunden</p>
        <p class="empty-state__text">Bitte konfigurieren Sie Portfolio Performance in Home Assistant oder laden Sie eine Datei hoch.</p>
      </div>
    `;
  }

  let html =
    '<table class="expandable-portfolio-table sortable-table"><thead><tr>';
  const cols = [
    { key: "name", label: createSimpleSortHeader("Name", "name") },
    {
      key: "position_count",
      label: createSimpleSortHeader("Anzahl Positionen", "position_count"),
      align: "right" as const,
    },
    {
      key: "value_combo",
      label: createSortHeader(
        "Kaufwert",
        ".val-top",
        "Aktueller Wert",
        ".val-bottom",
      ),
      align: "right" as const,
    },
    {
      key: "day_combo",
      label: createSortHeader(
        "Heute +/-",
        ".val-top",
        "Heute %",
        ".val-bottom",
      ),
      align: "right" as const,
    },
    {
      key: "gain_combo",
      label: createSortHeader(
        "Gesamt +/-",
        ".val-top",
        "Gesamt %",
        ".val-bottom",
      ),
      align: "right" as const,
    },
  ];
  cols.forEach((c) => {
    const align = c.align === "right" ? ' class="align-right"' : "";
    html += `<th${align}>${c.label}</th>`;
  });
  html += "</tr></thead><tbody>";

  depots.forEach((d) => {
    const positionCount = Number.isFinite(d.position_count)
      ? d.position_count
      : 0;
    const purchaseSum = Number.isFinite(d.purchase_sum) ? d.purchase_sum : 0;
    const currentValue =
      d.hasValue &&
      typeof d.current_value === "number" &&
      Number.isFinite(d.current_value)
        ? d.current_value
        : null;
    const hasValue = currentValue !== null;
    const performance = d.performance;
    const gainAbs =
      typeof d.gain_abs === "number"
        ? d.gain_abs
        : typeof performance?.gain_abs === "number"
          ? performance.gain_abs
          : null;
    const gainPct =
      typeof d.gain_pct === "number"
        ? d.gain_pct
        : typeof performance?.gain_pct === "number"
          ? performance.gain_pct
          : null;
    const dayChangePayload =
      performance && typeof performance === "object"
        ? (performance as Record<string, unknown>).day_change
        : null;
    const dayChangeAbs =
      typeof d.day_change_abs === "number"
        ? d.day_change_abs
        : dayChangePayload && typeof dayChangePayload === "object"
          ? (((dayChangePayload as Record<string, unknown>).value_change_eur as
              | number
              | null) ??
            ((dayChangePayload as Record<string, unknown>).price_change_eur as
              | number
              | null))
          : null;
    const dayChangePct =
      typeof d.day_change_pct === "number"
        ? d.day_change_pct
        : dayChangePayload &&
            typeof dayChangePayload === "object" &&
            typeof (dayChangePayload as Record<string, unknown>).change_pct ===
              "number"
          ? ((dayChangePayload as Record<string, unknown>).change_pct as number)
          : null;
    const partialValue = d.fx_unavailable && hasValue;
    const datasetProvenance =
      typeof d.provenance === "string" ? d.provenance : "";
    const datasetMetricRunUuid =
      typeof d.metric_run_uuid === "string" ? d.metric_run_uuid : "";

    const expanded = expandedPortfolios.has(d.uuid);
    const toggleClass = expanded
      ? "portfolio-toggle expanded"
      : "portfolio-toggle";
    const detailId = `portfolio-details-${d.uuid}`;

    // Stacked Cells
    const valueCombo = stack(
      purchaseSum,
      formatCurrency(purchaseSum),
      currentValue ?? 0,
      currentValue != null ? formatCurrency(currentValue) : "—",
    );

    const dayCombo = stack(
      dayChangeAbs ?? 0,
      dayChangeAbs != null
        ? renderTrend(dayChangeAbs, formatCurrency(dayChangeAbs))
        : "—",
      dayChangePct ?? 0,
      dayChangePct != null
        ? renderTrend(dayChangePct, formatPercent(dayChangePct / 100))
        : "—",
    );

    const gainCombo = stack(
      gainAbs ?? 0,
      gainAbs != null ? renderTrend(gainAbs, formatCurrency(gainAbs)) : "—",
      gainPct ?? 0,
      gainPct != null
        ? renderTrend(gainPct, formatPercent(gainPct / 100))
        : "—",
    );

    // Dataset values for sorting (using simple properties, logic maps later)
    const datasetCurrentValue =
      hasValue && typeof currentValue === "number" ? currentValue : "";
    const datasetGainAbs =
      hasValue && typeof gainAbs === "number" ? gainAbs : "";
    const datasetGainPct =
      hasValue && typeof gainPct === "number" ? gainPct : "";
    const datasetDayChangeAbs =
      hasValue && typeof dayChangeAbs === "number" ? dayChangeAbs : "";
    const datasetDayChangePct =
      hasValue && typeof dayChangePct === "number" ? dayChangePct : "";
    const positionCountAttr = String(positionCount);

    let rowAttributes = "";
    if (d.fx_unavailable) rowAttributes += ' data-fx-unavailable="true"';
    if (partialValue) rowAttributes += ' data-partial="true"';

    html += `<tr class="portfolio-row"
                  data-portfolio="${escapeAttribute(d.uuid)}"
                  data-position-count="${positionCountAttr}"
                  data-current-value="${escapeAttribute(datasetCurrentValue)}"
                  data-purchase-sum="${escapeAttribute(purchaseSum)}"
                  data-day-change="${escapeAttribute(datasetDayChangeAbs)}"
                  data-day-change-pct="${escapeAttribute(datasetDayChangePct)}"
                  data-gain-abs="${escapeAttribute(datasetGainAbs)}"
                data-gain-pct="${escapeAttribute(datasetGainPct)}"
                data-has-value="${hasValue ? "true" : "false"}"
                data-provenance="${escapeAttribute(datasetProvenance)}"
                data-metric-run-uuid="${escapeAttribute(datasetMetricRunUuid)}"
                ${rowAttributes}>`;
    const safeName = escapeHtml(d.name);
    const badgeMarkup = renderBadgeList(withoutCoverageBadges(d.badges), {
      containerClass: "portfolio-badges",
    });
    html += `<td>
        <button type="button"
                class="${toggleClass}"
                data-portfolio="${escapeAttribute(d.uuid)}"
                aria-expanded="${expanded ? "true" : "false"}"
                aria-controls="${escapeAttribute(detailId)}">
          <span class="caret" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="${expanded ? ICON_CHEVRON_DOWN : ICON_CHEVRON_RIGHT}" /></svg></span>
          <span class="portfolio-name">${safeName}</span>${badgeMarkup}
        </button>
      </td>`;
    const positionCountDisplay = positionCount.toLocaleString("de-DE");
    html += `<td class="align-right"><span data-val="${String(positionCount)}">${positionCountDisplay}</span></td>`;
    html += `<td class="align-right">${valueCombo}</td>`;
    html += `<td class="align-right">${dayCombo}</td>`;
    html += `<td class="align-right">${gainCombo}</td>`;
    html += "</tr>";

    html += `<tr class="portfolio-details${expanded ? "" : " hidden"}"
                data-portfolio="${escapeAttribute(d.uuid)}"
                id="${escapeAttribute(detailId)}"
                role="region"
                aria-label="Positionen für ${d.name}">
      <td colspan="${cols.length.toString()}">
        <div class="positions-container">${
          expanded
            ? hasPortfolioPositions(d.uuid)
              ? renderPositionsTable(getPortfolioPositions(d.uuid))
              : renderLoadingState("Lade Positionen...")
            : ""
        }</div>
      </td>
    </tr>`;
  });

  const availableDepots = depots.filter(
    (d) =>
      typeof d.current_value === "number" && Number.isFinite(d.current_value),
  );
  const sumPositions = depots.reduce(
    (a, d) => a + (Number.isFinite(d.position_count) ? d.position_count : 0),
    0,
  );
  const sumCurrent = availableDepots.reduce((a, d) => {
    if (
      typeof d.current_value === "number" &&
      Number.isFinite(d.current_value)
    ) {
      return a + d.current_value;
    }
    return a;
  }, 0);
  const sumPurchase = availableDepots.reduce(
    (a, d) => a + (d.purchase_sum || 0),
    0,
  );

  const dayChangeValues = availableDepots.map((d) => {
    const perfDayChange =
      d.performance && typeof d.performance === "object"
        ? (d.performance as Record<string, unknown>).day_change
        : null;
    if (typeof d.day_change_abs === "number") return d.day_change_abs;
    if (perfDayChange && typeof perfDayChange === "object") {
      const vc = (perfDayChange as Record<string, unknown>).value_change_eur;
      return typeof vc === "number" ? vc : 0;
    }
    return 0;
  });

  const sumDayChangeAbs = dayChangeValues.reduce((a, value) => a + value, 0);
  const sumGainAbs = availableDepots.reduce((a, d) => {
    // Logic for gain sum
    if (typeof d.performance?.gain_abs === "number")
      return a + d.performance.gain_abs;
    // fallback
    const cur = d.current_value as number;
    const pur = d.purchase_sum;
    return a + (cur - pur);
  }, 0);

  const sumHasValue = availableDepots.length > 0;
  const dayChangeHasValue = dayChangeValues.length > 0;

  const sumDayChangePct =
    dayChangeHasValue && sumHasValue && sumCurrent !== 0
      ? (() => {
          const previousClose = sumCurrent - sumDayChangeAbs;
          if (!previousClose) return 0;
          return (sumDayChangeAbs / previousClose) * 100;
        })()
      : 0;
  const sumGainPct =
    sumHasValue && sumPurchase > 0 ? (sumGainAbs / sumPurchase) * 100 : 0;

  // Footer Row
  const footerValueCombo = stack(
    sumPurchase,
    formatCurrency(sumPurchase),
    sumCurrent,
    formatCurrency(sumCurrent),
  );
  const footerDayCombo = stack(
    sumDayChangeAbs,
    renderTrend(sumDayChangeAbs, formatCurrency(sumDayChangeAbs)),
    sumDayChangePct,
    renderTrend(sumDayChangePct, formatPercent(sumDayChangePct / 100)),
  );
  const footerGainCombo = stack(
    sumGainAbs,
    renderTrend(sumGainAbs, formatCurrency(sumGainAbs)),
    sumGainPct,
    renderTrend(sumGainPct, formatPercent(sumGainPct / 100)),
  );

  html += '<tr class="footer-row">';
  html += "<td>Summe</td>";
  html += `<td class="align-right">${sumPositions.toLocaleString("de-DE")}</td>`;
  html += `<td class="align-right">${footerValueCombo}</td>`;
  html += `<td class="align-right">${footerDayCombo}</td>`;
  html += `<td class="align-right">${footerGainCombo}</td>`;

  html += "</tr>";
  html += "</tbody></table>";

  return html;
}

function resolvePortfolioTable(
  target: Element | PortfolioQueryRoot | null | undefined,
): HTMLTableElement | null {
  if (target instanceof HTMLTableElement) {
    return target;
  }
  if (target && "querySelector" in target) {
    const scoped = (target as ParentNode).querySelector<HTMLTableElement>(
      "table.expandable-portfolio-table",
    );
    if (scoped) {
      return scoped;
    }
    const nested = (target as ParentNode).querySelector<HTMLTableElement>(
      ".portfolio-table table",
    );
    if (nested) {
      return nested;
    }
    const generic = (target as ParentNode).querySelector<HTMLTableElement>(
      "table",
    );
    if (generic) {
      return generic;
    }
  }
  return (
    document.querySelector<HTMLTableElement>(
      ".portfolio-table table.expandable-portfolio-table",
    ) || document.querySelector<HTMLTableElement>(".portfolio-table table")
  );
}

function readDatasetNumber(value: string | undefined): number | null {
  if (value === undefined) {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function updatePortfolioFooterFromDom(
  target: Element | PortfolioQueryRoot | null | undefined,
): void {
  const table = resolvePortfolioTable(target);
  if (!table) {
    return;
  }
  const tbody = table.tBodies.item(0);
  if (!tbody) {
    return;
  }
  const rows = Array.from(
    tbody.querySelectorAll<HTMLTableRowElement>("tr.portfolio-row"),
  );
  if (!rows.length) {
    return;
  }

  let sumPositions = 0;
  let sumCurrent = 0;
  let sumPurchase = 0;
  let sumGainAbs = 0;
  let sumDayChange = 0;
  let hasValueRow = false;
  let hasDayChangeRow = false;
  let allRowsComplete = true;
  let fxUnavailable = false;

  for (const row of rows) {
    const posCount = readDatasetNumber(row.dataset.positionCount);
    if (posCount != null) {
      sumPositions += posCount;
    }

    if (row.dataset.fxUnavailable === "true") {
      fxUnavailable = true;
    }

    const hasValueAttr = row.dataset.hasValue;
    const hasValue = !(
      hasValueAttr === "false" ||
      hasValueAttr === "0" ||
      hasValueAttr === "" ||
      hasValueAttr == null
    );
    if (!hasValue) {
      // Only if we expect a value but don't have it, we might mark incomplete.
      // But typically partial rows just skip accumulation.
    } else {
      hasValueRow = true;
    }

    const currentValue = readDatasetNumber(row.dataset.currentValue);
    const gainAbs = readDatasetNumber(row.dataset.gainAbs);
    const purchaseSum = readDatasetNumber(row.dataset.purchaseSum);
    const dayChange = readDatasetNumber(row.dataset.dayChange);

    if (currentValue == null || gainAbs == null || purchaseSum == null) {
      allRowsComplete = false;
      continue;
    }

    sumCurrent += currentValue;
    sumGainAbs += gainAbs;
    sumPurchase += purchaseSum;
    if (dayChange != null) {
      sumDayChange += dayChange;
      hasDayChangeRow = true;
    }
  }

  const totalsComplete = hasValueRow && allRowsComplete;
  const sumGainPct =
    totalsComplete && sumPurchase > 0 ? (sumGainAbs / sumPurchase) * 100 : null;
  const sumDayChangePct =
    hasDayChangeRow && totalsComplete && sumCurrent !== 0
      ? (() => {
          const previousClose = sumCurrent - sumDayChange;
          if (!previousClose) {
            return null;
          }
          return (sumDayChange / previousClose) * 100;
        })()
      : null;

  // Ensure unique footer by only selecting direct children
  const existingFooters = Array.from(tbody.children).filter(
    (child): child is HTMLTableRowElement =>
      child.tagName === "TR" && child.classList.contains("footer-row"),
  );

  if (existingFooters.length > 1) {
    // Remove duplicates, keep first
    for (let i = 1; i < existingFooters.length; i++) {
      existingFooters[i].remove();
    }
  }

  let footer =
    existingFooters.length > 0
      ? existingFooters[0]
      : null;

  if (!footer) {
    footer = document.createElement("tr");
    footer.classList.add("footer-row");
    tbody.appendChild(footer);
  }

  const sumPositionsDisplay = Math.round(sumPositions).toLocaleString("de-DE");

  // Build Stacked Cells
  // Note: formatValue internally handles escaping somewhat, but here we use simple formatters + stack

  const footerValueCombo = stack(
    totalsComplete ? sumPurchase : 0,
    totalsComplete ? formatCurrency(sumPurchase) : "—",
    totalsComplete ? sumCurrent : 0,
    totalsComplete ? formatCurrency(sumCurrent) : "—",
  );

  const footerDayCombo = stack(
    hasDayChangeRow && totalsComplete ? sumDayChange : 0,
    hasDayChangeRow && totalsComplete
      ? renderTrend(sumDayChange, formatCurrency(sumDayChange))
      : "—",
    hasDayChangeRow && totalsComplete && sumDayChangePct != null
      ? sumDayChangePct
      : 0,
    hasDayChangeRow && totalsComplete && sumDayChangePct != null
      ? renderTrend(sumDayChangePct, formatPercent(sumDayChangePct / 100))
      : "—",
  );

  const footerGainCombo = stack(
    totalsComplete ? sumGainAbs : 0,
    totalsComplete ? renderTrend(sumGainAbs, formatCurrency(sumGainAbs)) : "—",
    totalsComplete && sumGainPct != null ? sumGainPct : 0,
    totalsComplete && sumGainPct != null
      ? renderTrend(sumGainPct, formatPercent(sumGainPct / 100))
      : "—",
  );

  footer.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${sumPositionsDisplay}</td>
      <td class="align-right">${footerValueCombo}</td>
      <td class="align-right">${footerDayCombo}</td>
      <td class="align-right">${footerGainCombo}</td>
    `;

  footer.dataset.positionCount = String(Math.round(sumPositions));
  footer.dataset.currentValue = totalsComplete ? String(sumCurrent) : "";
  footer.dataset.purchaseSum = totalsComplete ? String(sumPurchase) : "";
  footer.dataset.dayChange =
    totalsComplete && hasDayChangeRow ? String(sumDayChange) : "";
  footer.dataset.dayChangePct =
    totalsComplete && hasDayChangeRow && typeof sumDayChangePct === "number"
      ? String(sumDayChangePct)
      : "";
  footer.dataset.gainAbs = totalsComplete ? String(sumGainAbs) : "";
  footer.dataset.gainPct =
    totalsComplete && typeof sumGainPct === "number" ? String(sumGainPct) : "";
  footer.dataset.hasValue = totalsComplete ? "true" : "false";
  footer.dataset.fxUnavailable =
    fxUnavailable || !totalsComplete ? "true" : "false";
}

/**
 * Utility-Funktionen zum Auslesen und Wiederherstellen des Expand-States.
 * Perspektivisch nutzbar, falls ein vollständiger Neu-Render (Hard Refresh) der
 * Depot-Tabelle nötig wird (z.B. beim späteren Hinzufügen von Filter-/Sortierlogik).
 */
export function getExpandedPortfolios(): string[] {
  // Primär DOM lesen (falls Tabelle gerendert), Fallback: interner Set
  const domRows = Array.from(
    document.querySelectorAll<HTMLTableRowElement>(
      ".portfolio-details:not(.hidden)[data-portfolio]",
    ),
  );
  if (domRows.length) {
    return domRows
      .map((row) => row.getAttribute("data-portfolio"))
      .filter((value): value is string => Boolean(value));
  }
  return Array.from(expandedPortfolios.values());
}

export function setExpandedPortfolios(
  portfolioIds: Array<string | null | undefined> | null | undefined,
): void {
  expandedPortfolios.clear();
  if (Array.isArray(portfolioIds)) {
    portfolioIds.forEach((id) => {
      if (id) {
        expandedPortfolios.add(id);
      }
    });
  }
}

// NEU: Helper zum Anhängen der Sortier-Logik an eine Positions-Tabelle eines bestimmten Portfolios
export function attachPortfolioPositionsSorting(
  root: PortfolioQueryRoot,
  portfolioUuid: string,
): void {
  if (!portfolioUuid) return;
  const detailsRow = root.querySelector<HTMLTableRowElement>(
    `.portfolio-details[data-portfolio="${portfolioUuid}"]`,
  );
  if (!detailsRow) return;
  const container = detailsRow.querySelector<ToggleContainerElement>(
    ".positions-container",
  );
  if (!container) return;
  const table = container.querySelector<SortableTableElement>(
    "table.sortable-positions",
  );
  if (!table || table.__ppReaderSortingBound) return;

  table.__ppReaderSortingBound = true;

  const applySort = (
    key: PortfolioPositionsSortKey,
    dir: PortfolioSortDirection,
  ): void => {
    const tbody = table.querySelector<HTMLTableSectionElement>("tbody");
    if (!tbody) return;
    const rows = Array.from(
      tbody.querySelectorAll<HTMLTableRowElement>("tr"),
    ).filter((r) => !r.classList.contains("footer-row"));
    const footer = tbody.querySelector<HTMLTableRowElement>("tr.footer-row");

    const parseNum = (txt: string | null | undefined): number => {
      if (txt == null) return 0;
      // Entferne Währungs-/Prozent-Symbole, geschützte Leerzeichen
      const cleaned = txt
        .replace(/\u00A0/g, " ")
        .replace(/[%€]/g, "")
        .replace(/\./g, "")
        .replace(",", ".")
        .replace(/[^\d.-]/g, "");
      const numeric = Number.parseFloat(cleaned);
      return Number.isFinite(numeric) ? numeric : 0;
    };

    rows.sort((a, b) => {
      const idxMap: Record<PortfolioPositionsSortKey, number> = {
        name: 0,
        current_holdings: 1,
        last_price: 2,
        average_price: 3,
        purchase_value: 4,
        current_value: 4,
        day_change_abs: 5,
        day_change_pct: 5,
        gain_abs: 6,
        gain_pct: 6,
      };

      const subSelectorMap: Record<PortfolioPositionsSortKey, string | null> = {
        name: null,
        current_holdings: null,
        last_price: null,
        average_price: null,
        purchase_value: ".val-top",
        current_value: ".val-bottom",
        day_change_abs: ".val-top",
        day_change_pct: ".val-bottom",
        gain_abs: ".val-top",
        gain_pct: ".val-bottom",
      };
      const colIdx = idxMap[key];
      const aCellEl = a.cells.item(colIdx);
      const bCellEl = b.cells.item(colIdx);

      const subSel = subSelectorMap[key];

      let aCell = "";
      if (aCellEl) {
        let raw: string | null = null;
        if (subSel) {
          const subEl = aCellEl.querySelector(subSel);
          raw = subEl
            ? subEl.getAttribute("data-val") || subEl.textContent
            : null;
        } else {
          // For simple columns like Name, just text
          // But average_price/holdings might have data-sort-value on inner span?
          // Existing logic read textContent. Let's stick closer to textContent but check data-val
          const el =
            aCellEl.querySelector("[data-sort-value]") ||
            aCellEl.querySelector("[data-val]");
          raw = el
            ? el.getAttribute("data-sort-value") || el.getAttribute("data-val")
            : aCellEl.textContent;
        }

        if (typeof raw === "string") {
          aCell = raw.trim();
        }
      }

      let bCell = "";
      if (bCellEl) {
        let raw: string | null = null;
        if (subSel) {
          const subEl = bCellEl.querySelector(subSel);
          raw = subEl
            ? subEl.getAttribute("data-val") || subEl.textContent
            : null;
        } else {
          const el =
            bCellEl.querySelector("[data-sort-value]") ||
            bCellEl.querySelector("[data-val]");
          raw = el
            ? el.getAttribute("data-sort-value") || el.getAttribute("data-val")
            : bCellEl.textContent;
        }

        if (typeof raw === "string") {
          bCell = raw.trim();
        }
      }

      const resolveSortValue = (text: string): number => {
        // Try parsing as standard float first (e.g. from data-val="1234.56")
        // Standard JS float format: optional minus, digits, optional dot, digits.
        if (/^-?\d+(\.\d+)?$/.test(text)) {
          return Number.parseFloat(text);
        }
        return parseNum(text);
      };

      let comp: number;
      if (key === "name") {
        comp = aCell.localeCompare(bCell, "de", { sensitivity: "base" });
      } else {
        const aValue = resolveSortValue(aCell);
        const bValue = resolveSortValue(bCell);
        comp = aValue - bValue;
      }
      return dir === "asc" ? comp : -comp;
    });

    // Visuelle Indikatoren zurücksetzen
    table.querySelectorAll("thead th.sort-active").forEach((th) => {
      th.classList.remove("sort-active", "dir-asc", "dir-desc");
    });
    // A11y Indikatoren zurücksetzen & Restore default aria-labels
    table.querySelectorAll(".sort-active").forEach((el) => {
      el.classList.remove("sort-active", "dir-asc", "dir-desc");
      const label = el.getAttribute("data-label");
      if (label) {
        el.setAttribute("aria-label", `${label} sortieren`);
      }
    });

    // Aktives TH markieren
    // Aktives Element markieren
    // Wir suchen entweder TH mit data-sort-key ODER ein .sort-item mit dem selector
    const sortTrigger = table.querySelector(
      `[data-sort-key="${key}"], [data-sort-selector="${key}"]`,
    );
    if (sortTrigger) {
      sortTrigger.classList.add("sort-active");
      sortTrigger.classList.remove("dir-asc", "dir-desc");
      sortTrigger.classList.add(dir === "asc" ? "dir-asc" : "dir-desc");

      const label = sortTrigger.getAttribute("data-label");
      if (label) {
        const stateText =
          dir === "asc" ? "aufsteigend sortiert" : "absteigend sortiert";
        sortTrigger.setAttribute("aria-label", `${label} ${stateText}`);
      }
    }
    const th = sortTrigger?.closest("th");
    if (th) {
      th.setAttribute("aria-sort", dir === "asc" ? "ascending" : "descending");
    }

    // Neu einfügen
    rows.forEach((r) => tbody.appendChild(r));
    if (footer) tbody.appendChild(footer);
  };

  // Initial ggf. gespeicherten Zustand anwenden
  const containerKey = container.dataset.sortKey;
  const containerDir = container.dataset.sortDir;
  const defaultKey = table.dataset.defaultSort;
  const defaultDir = table.dataset.defaultDir;

  const currentKey = isPortfolioPositionsSortKey(containerKey)
    ? containerKey
    : isPortfolioPositionsSortKey(defaultKey)
      ? defaultKey
      : "name";
  const currentDir = isPortfolioSortDirection(containerDir)
    ? containerDir
    : isPortfolioSortDirection(defaultDir)
      ? defaultDir
      : "asc";

  applySort(currentKey, currentDir);

  const handleSort = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const sortItem = target.closest("[data-sort-key], [data-sort-selector]");
    if (!sortItem || !table.contains(sortItem)) return;

    const keyAttr =
      sortItem.getAttribute("data-sort-key") ||
      sortItem.getAttribute("data-sort-selector");
    if (!isPortfolioPositionsSortKey(keyAttr)) {
      return;
    }

    let dir: PortfolioSortDirection = "asc";
    if (container.dataset.sortKey === keyAttr) {
      const existing = isPortfolioSortDirection(container.dataset.sortDir)
        ? container.dataset.sortDir
        : "asc";
      dir = existing === "asc" ? "desc" : "asc";
    }
    container.dataset.sortKey = keyAttr;
    container.dataset.sortDir = dir;
    applySort(keyAttr, dir);
  };

  table.addEventListener("click", (event: MouseEvent) => {
    handleSort(event);
  });

  table.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault(); // Prevent page scroll on Space
      handleSort(event);
    }
  });
}

// NEU: Funktion zum erneuten Laden der Positionsdaten
async function reloadPortfolioPositions(
  portfolioUuid: string,
  containerEl: HTMLElement | null | undefined,
  root: HTMLElement,
): Promise<void> {
  if (!portfolioUuid || !_hassRef || !_panelConfigRef) return;

  const targetContainer =
    containerEl ||
    root.querySelector<HTMLElement>(
      `.portfolio-details[data-portfolio="${portfolioUuid}"] .positions-container`,
    );
  if (!targetContainer) {
    return;
  }

  const detailsRow =
    targetContainer.closest<HTMLTableRowElement>(".portfolio-details");
  if (detailsRow && detailsRow.classList.contains("hidden")) {
    return; // Hidden Rows sollen keinen Silent-Preload anstoßen
  }

  targetContainer.innerHTML = renderLoadingState("Neu laden...");
  try {
    const resp: PortfolioPositionsResponse = await fetchPortfolioPositionsWS(
      _hassRef,
      _panelConfigRef,
      portfolioUuid,
    );
    if (resp.error) {
      const errorText =
        typeof resp.error === "string" ? resp.error : String(resp.error);
      const safeUuid = escapeAttribute(portfolioUuid);
      targetContainer.innerHTML = `<div class="error">${escapeHtml(errorText)} <button class="retry-pos" data-portfolio="${safeUuid}">Erneut laden</button></div>`;
      return;
    }
    const normalizedPositions = normalizePositionRecords(
      Array.isArray(resp.positions) ? resp.positions : [],
    );
    setPortfolioPositions(portfolioUuid, normalizedPositions);
    setPortfolioPositionsSnapshot(portfolioUuid, normalizedPositions);
    targetContainer.innerHTML = renderPositionsTable(normalizedPositions);
    // Änderung 11: Nach erstmaligem Lazy-Load Sortierung initialisieren
    try {
      attachPortfolioPositionsSorting(root, portfolioUuid);
    } catch (error) {
      console.warn(
        "attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:",
        error,
      );
    }
    try {
      attachSecurityDetailListener(root, portfolioUuid);
    } catch (error) {
      console.warn(
        "reloadPortfolioPositions: Security-Listener konnte nicht gebunden werden:",
        error,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const safeUuid = escapeAttribute(portfolioUuid);
    targetContainer.innerHTML = `<div class="error">Fehler: ${escapeHtml(message)} <button class="retry-pos" data-portfolio="${safeUuid}">Retry</button></div>`;
  }
}

// Hilfsfunktion: wartet bis ein Selektor im root existiert
async function waitForElement<T extends Element>(
  root: HTMLElement,
  selector: string,
  timeoutMs = 3000,
  intervalMs = 50,
): Promise<T | null> {
  const start = performance.now();
  return new Promise((resolve) => {
    const tick = () => {
      const el = root.querySelector<T>(selector);
      if (el) {
        resolve(el);
        return;
      }
      if (performance.now() - start > timeoutMs) {
        resolve(null);
        return;
      }
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}

function sortOverviewTable(
  table: HTMLTableElement,
  colIndex: number,
  valueSelector: string | null,
  dir: "asc" | "desc",
) {
  const tbody = table.tBodies[0];
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!tbody) return;

  // Move ALL footer rows to the end (cleanup if multiple exist)
  const footers = Array.from(tbody.children).filter((child) =>
    child.classList.contains("footer-row"),
  );

  // Pairs of rows { main, detail }
  const rowPairs: { main: HTMLTableRowElement; detail: HTMLTableRowElement }[] =
    [];
  let currentMain: HTMLTableRowElement | null = null;

  Array.from(tbody.children).forEach((child) => {
    if (child.classList.contains("footer-row")) return;
    if (child instanceof HTMLTableRowElement) {
      if (child.classList.contains("portfolio-row")) {
        currentMain = child;
      } else if (child.classList.contains("portfolio-details") && currentMain) {
        rowPairs.push({ main: currentMain, detail: child });
        currentMain = null;
      }
    }
  });

  rowPairs.sort((aP, bP) => {
    const a = aP.main;
    const b = bP.main;
    const aCell = a.cells[colIndex];
    const bCell = b.cells[colIndex];

    let aValText = "";
    let bValText = "";

    if (valueSelector) {
      const aEl = aCell.querySelector<HTMLElement>(valueSelector);
      const bEl = bCell.querySelector<HTMLElement>(valueSelector);
      aValText = aEl?.getAttribute("data-val") || "";
      bValText = bEl?.getAttribute("data-val") || "";
    } else {
      const aEl = aCell.querySelector<HTMLElement>("[data-val]");
      const bEl = bCell.querySelector<HTMLElement>("[data-val]");
      aValText = aEl?.getAttribute("data-val") || aCell.textContent || "";
      bValText = bEl?.getAttribute("data-val") || bCell.textContent || "";
    }

    const aNum = Number(aValText);
    const bNum = Number(bValText);

    if (!isNaN(aNum) && !isNaN(bNum)) {
      return (aNum - bNum) * (dir === "asc" ? 1 : -1);
    }
    return aValText.localeCompare(bValText) * (dir === "asc" ? 1 : -1);
  });

  rowPairs.forEach((pair) => {
    tbody.appendChild(pair.main);
    tbody.appendChild(pair.detail);
  });

  // Re-append unique footer
  if (footers.length > 0) {
    tbody.appendChild(footers[0]);
    // Remove others if any
    for (let i = 1; i < footers.length; i++) footers[i].remove();
  }
}

function attachPortfolioOverviewSorting(root: HTMLElement) {
  const table = root.querySelector<HTMLTableElement>(
    ".expandable-portfolio-table",
  );
  if (!table) return;
  const sortableTable = table as SortableTableElement;
  if (sortableTable.__ppReaderOverviewSortingBound) return;
  sortableTable.__ppReaderOverviewSortingBound = true;

  const handleSort = (event: Event) => {
    const target = event.target as HTMLElement;
    const sortTrigger =
      target.closest("[data-sort-selector]") ||
      target.closest("[data-sort-key]");
    if (sortTrigger) {
      // Ensure the event came from this table's header, not a nested table
      const triggerTable = sortTrigger.closest("table");
      if (triggerTable !== table) return;

      // Clean up previous sort indicators
      table.querySelectorAll(".sort-active").forEach((el) => {
        if (el !== sortTrigger) {
          el.classList.remove("sort-active", "dir-asc", "dir-desc");
          const label = el.getAttribute("data-label");
          if (label) {
            el.setAttribute("aria-label", `${label} sortieren`);
          }
        }
      });

      let dir: "asc" | "desc" = "asc";
      if (
        sortTrigger.classList.contains("sort-active") &&
        sortTrigger.classList.contains("dir-asc")
      ) {
        dir = "desc";
      }

      sortTrigger.classList.add("sort-active");
      sortTrigger.classList.remove("dir-asc", "dir-desc");
      sortTrigger.classList.add(`dir-${dir}`);

      const label = sortTrigger.getAttribute("data-label");
      if (label) {
        const stateText =
          dir === "asc" ? "aufsteigend sortiert" : "absteigend sortiert";
        sortTrigger.setAttribute("aria-label", `${label} ${stateText}`);
      }

      const th = sortTrigger.closest("th");
      const colIndex = th
        ? Array.from(th.parentElement?.children ?? []).indexOf(th)
        : -1;

      if (colIndex >= 0) {
        const selector =
          (sortTrigger as HTMLElement).dataset.sortSelector || null;
        sortOverviewTable(table, colIndex, selector, dir);
      }
    }
  };

  table.addEventListener("click", (event) => {
    handleSort(event);
  });

  table.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSort(event);
    }
  });
}

export function attachPortfolioToggleHandler(root: ToggleRootElement): void {
  const previousToken =
    typeof root.__ppReaderAttachToken === "number"
      ? root.__ppReaderAttachToken
      : 0;
  const token = previousToken + 1;
  root.__ppReaderAttachToken = token;
  root.__ppReaderAttachInProgress = true;

  void (async () => {
    try {
      const container = await waitForElement<ToggleContainerElement>(
        root,
        ".portfolio-table",
      );
      if (token !== root.__ppReaderAttachToken) {
        return; // Ein neuer Versuch läuft bereits – diesen abbrechen
      }
      if (!container) {
        console.warn(
          "attachPortfolioToggleHandler: .portfolio-table nicht gefunden (Timeout)",
        );
        return;
      }

      // Buttons generiert?
      const btnCount = container.querySelectorAll(".portfolio-toggle").length;
      if (btnCount === 0) {
        console.debug(
          "attachPortfolioToggleHandler: Noch keine Buttons – evtl. Recovery später",
        );
      }

      if (container.__ppReaderPortfolioToggleBound) {
        return;
      }
      container.__ppReaderPortfolioToggleBound = true;
      console.debug("attachPortfolioToggleHandler: Listener registriert");

      container.addEventListener("click", (event: MouseEvent) => {
        void (async () => {
          try {
            const target = event.target;
            if (!(target instanceof Element)) {
              return;
            }

            const retryBtn = target.closest<HTMLButtonElement>(".retry-pos");
            if (retryBtn && container.contains(retryBtn)) {
              const pid = retryBtn.getAttribute("data-portfolio");
              if (pid) {
                const detailsRow = root.querySelector<HTMLTableRowElement>(
                  `.portfolio-details[data-portfolio="${pid}"]`,
                );
                const cont = detailsRow?.querySelector<ToggleContainerElement>(
                  ".positions-container",
                );
                await reloadPortfolioPositions(pid, cont ?? null, root);
              }
              return;
            }

            const btn = target.closest<HTMLButtonElement>(".portfolio-toggle");
            if (!btn || !container.contains(btn)) return;

            const portfolioUuid = btn.getAttribute("data-portfolio");
            if (!portfolioUuid) return;

            const detailsRow = root.querySelector<HTMLTableRowElement>(
              `.portfolio-details[data-portfolio="${portfolioUuid}"]`,
            );
            if (!detailsRow) return;

            const caretEl = btn.querySelector<HTMLElement>(".caret");
            const isHidden = detailsRow.classList.contains("hidden");

            if (isHidden) {
              detailsRow.classList.remove("hidden");
              btn.classList.add("expanded");
              btn.setAttribute("aria-expanded", "true");
              if (caretEl)
                caretEl.innerHTML = `<svg viewBox="0 0 24 24"><path d="${ICON_CHEVRON_DOWN}" /></svg>`;
              expandedPortfolios.add(portfolioUuid);

              try {
                flushPendingPositions(root, portfolioUuid);
              } catch (error) {
                console.warn(
                  "attachPortfolioToggleHandler: Pending-Flush fehlgeschlagen:",
                  error,
                );
              }

              if (!hasPortfolioPositions(portfolioUuid)) {
                const containerEl =
                  detailsRow.querySelector<ToggleContainerElement>(
                    ".positions-container",
                  );
                if (containerEl) {
                  containerEl.innerHTML =
                    renderLoadingState("Lade Positionen...");
                }
                try {
                  const resp: PortfolioPositionsResponse =
                    await fetchPortfolioPositionsWS(
                      _hassRef,
                      _panelConfigRef,
                      portfolioUuid,
                    );
                  if (resp.error) {
                    const errorText =
                      typeof resp.error === "string"
                        ? resp.error
                        : String(resp.error);
                    if (containerEl) {
                      const safeUuid = escapeAttribute(portfolioUuid);
                      containerEl.innerHTML = `<div class="error">${escapeHtml(errorText)} <button class="retry-pos" data-portfolio="${safeUuid}">Erneut laden</button></div>`;
                    }
                    return;
                  }
                  const normalizedPositions = normalizePositionRecords(
                    Array.isArray(resp.positions) ? resp.positions : [],
                  );
                  setPortfolioPositions(portfolioUuid, normalizedPositions);
                  setPortfolioPositionsSnapshot(
                    portfolioUuid,
                    normalizedPositions,
                  );
                  if (containerEl) {
                    containerEl.innerHTML =
                      renderPositionsTable(normalizedPositions);
                    // Änderung 11: Nach erstmaligem Lazy-Load Sortierung initialisieren
                    try {
                      attachPortfolioPositionsSorting(root, portfolioUuid);
                    } catch (error) {
                      console.warn(
                        "attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:",
                        error,
                      );
                    }
                    try {
                      attachSecurityDetailListener(root, portfolioUuid);
                    } catch (error) {
                      console.warn(
                        "attachPortfolioToggleHandler: Security-Listener konnte nicht gebunden werden:",
                        error,
                      );
                    }
                  }
                } catch (error) {
                  const message =
                    error instanceof Error ? error.message : String(error);
                  const containerEl =
                    detailsRow.querySelector<ToggleContainerElement>(
                      ".positions-container",
                    );
                  if (containerEl) {
                    const safeUuid = escapeAttribute(portfolioUuid);
                    containerEl.innerHTML = `<div class="error">Fehler beim Laden: ${escapeHtml(message)} <button class="retry-pos" data-portfolio="${safeUuid}">Retry</button></div>`;
                  }
                  console.error(
                    "Fehler beim Lazy Load für",
                    portfolioUuid,
                    error,
                  );
                }
              } else {
                const containerEl = detailsRow.querySelector<HTMLElement>(
                  ".positions-container",
                );
                if (containerEl) {
                  containerEl.innerHTML = renderPositionsTable(
                    getPortfolioPositions(portfolioUuid),
                  );
                  attachPortfolioPositionsSorting(root, portfolioUuid);
                  try {
                    attachSecurityDetailListener(root, portfolioUuid);
                  } catch (error) {
                    console.warn(
                      "attachPortfolioToggleHandler: Security-Listener (Cache) Fehler:",
                      error,
                    );
                  }
                }
              }
            } else {
              detailsRow.classList.add("hidden");
              btn.classList.remove("expanded");
              btn.setAttribute("aria-expanded", "false");
              if (caretEl)
                caretEl.innerHTML = `<svg viewBox="0 0 24 24"><path d="${ICON_CHEVRON_RIGHT}" /></svg>`;
              expandedPortfolios.delete(portfolioUuid);
            }
          } catch (error) {
            console.error(
              "attachPortfolioToggleHandler: Ungefangener Fehler im Click-Handler",
              error,
            );
          }
        })();
      });
    } finally {
      if (token === root.__ppReaderAttachToken) {
        root.__ppReaderAttachInProgress = false;
      }
    }
  })();
}

// Fallback: direkter Listener auf die Tabelle selbst (falls outer container nicht klickt)
export function ensurePortfolioRowFallbackListener(
  root: ToggleRootElement,
): void {
  const table = root.querySelector<SortableTableElement>(
    ".expandable-portfolio-table",
  );
  if (!table) return;
  if (table.__ppReaderPortfolioFallbackBound) return;
  table.__ppReaderPortfolioFallbackBound = true;
  table.addEventListener("click", (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const btn = target.closest<HTMLButtonElement>(".portfolio-toggle");
    if (!btn) return;
    // Falls der Haupt-Listener schon aktiv war, nichts doppelt machen
    const primaryContainer =
      root.querySelector<ToggleContainerElement>(".portfolio-table");
    if (primaryContainer?.__ppReaderPortfolioToggleBound) return;
    console.debug("Fallback-Listener aktiv – re-attach Hauptlistener");
    attachPortfolioToggleHandler(root);
  });
}

export async function renderDashboard(
  root: HTMLElement,
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
): Promise<string> {
  _hassRef = hass ?? null;
  _panelConfigRef = panelConfig ?? null;
  console.debug(
    "renderDashboard: start – panelConfig:",
    panelConfig?.config,
    "derived entry_id?",
    panelConfig?.config?._panel_custom?.config?.entry_id,
  );

  const accountsResp = await fetchAccountsWS(hass, panelConfig);
  setAccountSnapshots(accountsResp.accounts);
  const accountRows: AccountOverviewRow[] = selectAccountOverviewRows();

  const portfoliosResp = await fetchPortfoliosWS(hass, panelConfig);
  replacePortfolioSnapshots(portfoliosResp.portfolios);
  const depots = selectPortfolioOverviewRows();

  // 3. Last file update (optional – falls bereits WS-Command vorhanden)
  let lastFileUpdate = "";
  try {
    lastFileUpdate = await fetchLastFileUpdateWS(hass, panelConfig);
  } catch {
    lastFileUpdate = "";
  }

  // 4. Gesamtvermögen berechnen (nur Anzeige)
  const totalAccounts = accountRows.reduce(
    (sum, account) =>
      sum +
      (typeof account.balance === "number" && Number.isFinite(account.balance)
        ? account.balance
        : 0),
    0,
  );
  const anyPortfolioMissing = depots.some((depot) => depot.fx_unavailable);
  const anyAccountMissing = accountRows.some(
    (account) =>
      account.fx_unavailable &&
      (account.balance == null || !Number.isFinite(account.balance)),
  );
  const totalDepots = depots.reduce((sum, depot) => {
    if (
      depot.hasValue &&
      typeof depot.current_value === "number" &&
      Number.isFinite(depot.current_value)
    ) {
      return sum + depot.current_value;
    }
    return sum;
  }, 0);
  const totalWealth = totalAccounts + totalDepots;
  const missingWealthReason =
    "Teilw. fehlende FX-Kurse – Gesamtvermögen abweichend";
  const wealthValueAvailable =
    depots.some(
      (depot) =>
        depot.hasValue &&
        typeof depot.current_value === "number" &&
        Number.isFinite(depot.current_value),
    ) ||
    accountRows.some(
      (account) =>
        typeof account.balance === "number" && Number.isFinite(account.balance),
    );
  const wealthValueMarkup = wealthValueAvailable
    ? `${formatNumber(totalWealth)}&nbsp;€`
    : `<span class="missing-value" role="note" aria-label="${missingWealthReason}" title="${missingWealthReason}">—</span>`;
  const wealthNote =
    anyPortfolioMissing || anyAccountMissing
      ? `<span class="total-wealth-note">${missingWealthReason}</span>`
      : "";

  // 5. Header (ohne Last-File-Update – kommt jetzt wieder in Footer-Karte)
  const headerMeta = `
    <div class="header-meta-row">
      💰 Gesamtvermögen: <strong class="total-wealth-value">${wealthValueMarkup}</strong>${wealthNote}
    </div>
  `;
  const headerCard = createHeaderCard("Übersicht", headerMeta);

  // 6. Sicherstellen, dass die Struktur exakt der erwartet wird:
  //    - .portfolio-table (Wrapper)
  //    - darin eine <table class="expandable-portfolio-table"> mit <tr class="portfolio-row" data-portfolio="UUID">
  const portfolioTableHtml = buildExpandablePortfolioTable(depots);

  // 7. Konten-Tabellen
  const eurAccounts = accountRows.filter(
    (a) => (a.currency_code ?? "EUR") === "EUR",
  );
  const fxAccounts = accountRows.filter(
    (a) => (a.currency_code ?? "EUR") !== "EUR",
  );

  const fxWarningNeeded = fxAccounts.some((a) => a.fx_unavailable);
  const fxWarning = fxWarningNeeded
    ? `
        <p class="table-note" role="note">
          <span class="table-note__icon" aria-hidden="true">⚠️</span>
          <span>Wechselkurse konnten nicht geladen werden. EUR-Werte werden derzeit nicht angezeigt.</span>
        </p>
      `
    : "";

  const accountsHtml = `
    <div class="card">
      <h2>Liquidität</h2>
      <div class="scroll-container account-table">
        ${makeTable(
          eurAccounts.map((account) => ({
            name: renderNameWithBadges(
              account.name,
              stripAccountBadges(account.badges),
              {
                containerClass: "account-name",
                labelClass: "account-name__label",
              },
            ),
            balance: account.balance ?? null,
          })),
          [
            { key: "name", label: "Name" },
            {
              key: "balance",
              label: "Kontostand (EUR)",
              align: "right" as const,
            },
          ],
          ["balance"],
        )}
      </div>
    </div>
    ${
      fxAccounts.length
        ? `
      <div class="card">
        <h2>Fremdwährungen</h2>
        <div class="scroll-container fx-account-table">
          ${makeTable(
            fxAccounts.map((account) => {
              const origBalance = account.orig_balance;
              const hasOrigBalance =
                typeof origBalance === "number" && Number.isFinite(origBalance);
              const fxDisplay = hasOrigBalance
                ? `${origBalance.toLocaleString("de-DE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}&nbsp;${account.currency_code ?? ""}`
                : "";

              return {
                name: renderNameWithBadges(
                  account.name,
                  stripAccountBadges(account.badges),
                  {
                    containerClass: "account-name",
                    labelClass: "account-name__label",
                  },
                ),
                fx_display: fxDisplay,
                balance: account.balance ?? null,
              };
            }),
            [
              { key: "name", label: "Name" },
              { key: "fx_display", label: "Betrag (FX)" },
              { key: "balance", label: "EUR", align: "right" as const },
            ],
            ["balance"],
          )}
        </div>
        ${fxWarning}
      </div>`
        : ""
    }
  `;

  // 8. Footer-Karte mit letztem Datei-Änderungszeitpunkt (reintroduziert)
  const footerCard = `
    <div class="card footer-card">
      <div class="meta">
        <div class="last-file-update">
          📂 Letzte Aktualisierung der Datei: <strong>${escapeHtml(lastFileUpdate) || "Unbekannt"}</strong>
        </div>
      </div>
    </div>
  `;

  const markup = `
    ${STYLES}
    ${headerCard.outerHTML}
    <div class="card">
      <h2>Investment</h2>
      <div class="scroll-container portfolio-table">
        ${portfolioTableHtml}
      </div>
    </div>
    ${accountsHtml}
    ${footerCard}
  `;

  schedulePostRenderSetup(root as ToggleRootElement, depots);

  return markup;
}

function schedulePostRenderSetup(
  root: ToggleRootElement | null,
  depots: readonly PortfolioOverviewRow[],
): void {
  if (!root) {
    return;
  }

  const run = () => {
    try {
      const wrapper = root;
      const tableHost = wrapper.querySelector<HTMLElement>(".portfolio-table");
      if (
        tableHost &&
        tableHost.querySelectorAll(".portfolio-toggle").length === 0
      ) {
        console.debug("Recovery: Tabelle ohne Buttons – erneuter Aufbau");
        tableHost.innerHTML = buildExpandablePortfolioTable(depots);
      }

      attachPortfolioToggleHandler(root);
      attachPortfolioOverviewSorting(root);
      ensurePortfolioRowFallbackListener(root);

      expandedPortfolios.forEach((pid) => {
        try {
          if (hasPortfolioPositions(pid)) {
            attachPortfolioPositionsSorting(root, pid);
            attachSecurityDetailListener(root, pid);
          }
        } catch (error) {
          console.warn(
            "Init-Sortierung für expandiertes Depot fehlgeschlagen:",
            pid,
            error,
          );
        }
      });

      try {
        updatePortfolioFooterFromDom(wrapper);
      } catch (footerErr) {
        console.warn(
          "renderDashboard: Footer-Summe konnte nicht aktualisiert werden:",
          footerErr,
        );
      }

      try {
        flushAllPendingPositions(root);
      } catch (pendingErr) {
        console.warn(
          "renderDashboard: Pending-Positions konnten nicht angewendet werden:",
          pendingErr,
        );
      }

      console.debug(
        "renderDashboard: portfolio-toggle Buttons:",
        wrapper.querySelectorAll(".portfolio-toggle").length,
      );
    } catch (error) {
      console.error("renderDashboard: Fehler bei Recovery/Listener", error);
    }
  };

  const schedule =
    typeof requestAnimationFrame === "function"
      ? (cb: () => void) => requestAnimationFrame(cb)
      : (cb: () => void) => setTimeout(cb, 0);

  schedule(() => schedule(run));
}

registerOverviewHelpers({
  renderPositionsTable: (positions) =>
    renderPortfolioPositions(positions as readonly PortfolioPositionRecord[]),
  applyGainPctMetadata,
  attachSecurityDetailListener,
  attachPortfolioPositionsSorting,
  updatePortfolioFooter: (table) => {
    if (table) {
      updatePortfolioFooterFromDom(table);
    }
  },
});
