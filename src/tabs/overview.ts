/**
 * Overview tab renderer copied for the TypeScript source tree.
 */

import {
  createHeaderCard,
  makeTable,
  formatNumber,
  formatValue,
} from '../content/elements';
import { openSecurityDetail } from '../dashboard';
import {
  fetchAccountsWS,
  fetchLastFileUpdateWS,
  fetchPortfoliosWS,
  fetchPortfolioPositionsWS,
} from '../data/api';
import type { PortfolioPositionsResponse } from '../data/api';
import { flushPendingPositions, flushAllPendingPositions } from '../data/updateConfigsWS';
import { registerOverviewHelpers } from '../dashboard/registry';
import {
  getPortfolioPositions,
  hasPortfolioPositions,
  normalizePositionRecords,
  setPortfolioPositions,
} from '../data/positionsCache';
import type { PortfolioPositionRecord } from '../data/positionsCache';
import type { HomeAssistant } from '../types/home-assistant';
import type {
  PanelConfigLike,
} from './types';
import { toFiniteCurrency } from '../utils/currency';
import { normalizePerformancePayload } from '../utils/performance';
import {
  replacePortfolioSnapshots,
  setAccountSnapshots,
  setPortfolioPositionsSnapshot,
} from '../lib/store/portfolioStore';
import {
  selectAccountOverviewRows,
  selectPortfolioOverviewRows,
  type AccountOverviewRow,
  type PortfolioOverviewRow,
} from '../lib/store/selectors/portfolio';
import { escapeHtml, renderBadgeList, renderNameWithBadges } from '../lib/ui/badges';


type PortfolioQueryRoot = Document | HTMLElement;

type PortfolioPositionsSortKey =
  | 'name'
  | 'current_holdings'
  | 'average_price'
  | 'purchase_value'
  | 'current_value'
  | 'day_change_abs'
  | 'day_change_pct'
  | 'gain_abs'
  | 'gain_pct';

type PortfolioSortDirection = 'asc' | 'desc';

const PORTFOLIO_SORT_KEYS: readonly PortfolioPositionsSortKey[] = [
  'name',
  'current_holdings',
  'average_price',
  'purchase_value',
  'current_value',
  'day_change_abs',
  'day_change_pct',
  'gain_abs',
  'gain_pct',
];

function isPortfolioPositionsSortKey(
  value: string | null | undefined,
): value is PortfolioPositionsSortKey {
  return PORTFOLIO_SORT_KEYS.includes(value as PortfolioPositionsSortKey);
}

function isPortfolioSortDirection(
  value: string | null | undefined,
): value is PortfolioSortDirection {
  return value === 'asc' || value === 'desc';
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
};

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
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeCurrencyCode(value: unknown): string | null {
  if (typeof value !== 'string') {
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
  if (upper === '€') {
    return 'EUR';
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

  const formatted = value.toLocaleString('de-DE', {
    minimumFractionDigits: PRICE_FRACTION_DIGITS.min,
    maximumFractionDigits: PRICE_FRACTION_DIGITS.max,
  });
  return `${formatted}${currency ? `\u00A0${currency}` : ''}`;
}

function buildPurchasePriceDisplay(
  position: PortfolioPositionRecord,
): { markup: string; sortValue: number; ariaLabel: string } {
  const record = position as Record<string, unknown>;
  const averageCost = position.average_cost ?? null;
  const aggregation = position.aggregation ?? null;

  const securityCurrency = resolveCurrencyFromPosition(record, [
    'security_currency_code',
    'security_currency',
    'native_currency_code',
    'native_currency',
  ], position.currency_code ?? null);

  const accountCurrency =
    resolveCurrencyFromPosition(
      record,
      [
        'account_currency_code',
        'account_currency',
        'purchase_currency_code',
        'currency_code',
      ],
      securityCurrency === 'EUR' ? 'EUR' : null,
    ) ?? 'EUR';

  const averageNative = toNullableNumber(averageCost?.native);
  const averageSecurity = toNullableNumber(averageCost?.security);
  const averageAccount = toNullableNumber(averageCost?.account);
  const averageEur = toNullableNumber(averageCost?.eur);

  const nativeAverage = averageSecurity ?? averageNative;
  const eurAverage = averageEur ?? (accountCurrency === 'EUR' ? averageAccount : null);
  const resolvedSecurityCurrency = securityCurrency ?? accountCurrency;
  const isEurSecurity = resolvedSecurityCurrency === 'EUR';

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
      primaryCurrency = 'EUR';
      primaryValue = eurAverage ?? null;
    }
  } else {
    primaryCurrency = 'EUR';
    primaryValue = eurAverage ?? nativeAverage ?? averageAccount ?? null;
  }

  const primaryText = formatPriceWithCurrency(primaryValue, primaryCurrency);
  const formattedEur = !isEurSecurity
    ? formatPriceWithCurrency(eurAverage, 'EUR')
    : null;

  const shouldRenderAccount =
    !!formattedEur && formattedEur !== primaryText;

  const parts: string[] = [];
  const ariaParts: string[] = [];

  if (primaryText) {
    parts.push(
      `<span class="purchase-price purchase-price--primary">${primaryText}</span>`,
    );
    ariaParts.push(primaryText.replace(/\u00A0/g, ' '));
  } else {
    const missing =
      '<span class="missing-value" role="note" aria-label="Kein Kaufpreis verfügbar" title="Kein Kaufpreis verfügbar">—</span>';
    parts.push(missing);
    ariaParts.push('Kein Kaufpreis verfügbar');
  }

  if (shouldRenderAccount && formattedEur) {
    parts.push(
      `<span class="purchase-price purchase-price--secondary">${formattedEur}</span>`,
    );
    ariaParts.push(formattedEur.replace(/\u00A0/g, ' '));
  }

  const markup = parts.join('<br>');
  const sortValue = toNullableNumber(aggregation?.purchase_value_eur) ?? 0;
  const ariaLabel = ariaParts.join(', ');

  return { markup, sortValue, ariaLabel };
}

export const __TEST_ONLY__ = {
  buildPurchasePriceDisplayForTest: buildPurchasePriceDisplay,
};

function computePositionDayChange(position: PortfolioPositionRecord): { value: number | null; pct: number | null } {
  const holdings = toFiniteCurrency(position.current_holdings);
  if (holdings == null) {
    return { value: null, pct: null };
  }

  const lastPriceEur = toFiniteCurrency((position as { last_price_eur?: unknown }).last_price_eur);
  const lastCloseEur = toFiniteCurrency((position as { last_close_eur?: unknown }).last_close_eur);

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
    dayChangePct != null && Number.isFinite(dayChangePct) ? Math.round(dayChangePct * 100) / 100 : null;

  return { value: roundedValue, pct: roundedPct };
}

// Global cache exports have been removed; cache interactions now flow through
// the shared data/positionsCache module.
const expandedPortfolios = new Set<string>();           // gemerkte geöffnete Depots (persistiert über Re-Renders)

// ENTFERNT: Globaler document-Listener (Section 6 Hardening)
// Stattdessen scoped Listener über attachPortfolioToggleHandler(root)

// Rendert die Positions-Tabelle für ein Depot
  function applyGainPctMetadata(tableEl: HTMLTableElement | null | undefined): void {
    if (!tableEl) {
      return;
  }
  const bodyRows = Array.from(tableEl.querySelectorAll<HTMLTableRowElement>('tbody tr'));
  bodyRows.forEach(row => {
      const gainAbsCell = row.cells.item(7);
      const gainPctCell = row.cells.item(8);
      if (!gainAbsCell || !gainPctCell) {
        return;
      }
      if (gainAbsCell.dataset.gainPct && gainAbsCell.dataset.gainSign) {
        return;
      }
      const pctText = (gainPctCell.textContent || '').trim() || '—';
      let pctSign: 'positive' | 'negative' | 'neutral' = 'neutral';
      if (gainPctCell.querySelector('.positive')) {
        pctSign = 'positive';
      } else if (gainPctCell.querySelector('.negative')) {
        pctSign = 'negative';
      }
      gainAbsCell.dataset.gainPct = pctText;
      gainAbsCell.dataset.gainSign = pctSign;
    });
  }

function renderPositionsTable(positions: readonly PortfolioPositionRecord[]): string {
  if (positions.length === 0) {
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  }
  // Mapping für makeTable
  const cols = [
    { key: 'name', label: 'Wertpapier' },
    { key: 'current_holdings', label: 'Bestand', align: 'right' as const },
    { key: 'average_price', label: 'Ø Kaufpreis', align: 'right' as const },
    { key: 'purchase_value', label: 'Kaufpreis (EUR)', align: 'right' as const },
    { key: 'current_value', label: 'Aktueller Wert', align: 'right' as const },
    { key: 'day_change_abs', label: 'Heute +/-', align: 'right' as const },
    { key: 'day_change_pct', label: 'Heute %', align: 'right' as const },
    { key: 'gain_abs', label: 'Gesamt +/-', align: 'right' as const },
    { key: 'gain_pct', label: 'Gesamt %', align: 'right' as const }
  ];
  const rows = positions.map((p) => {
    const performance = normalizePerformancePayload(p.performance);
    const gainAbs = typeof performance?.gain_abs === 'number' ? performance.gain_abs : null;
    const gainPct = typeof performance?.gain_pct === 'number' ? performance.gain_pct : null;
    const dayChange = computePositionDayChange(p);
    const purchaseTotal =
      typeof p.purchase_value === 'number' || typeof p.purchase_value === 'string'
        ? p.purchase_value
        : null;

    return {
      name:
          typeof p.name === 'string'
            ? p.name
            : typeof p.name === 'number'
              ? String(p.name)
              : '',
      current_holdings:
        typeof p.current_holdings === 'number' || typeof p.current_holdings === 'string'
          ? p.current_holdings
          : null,
      average_price:
        typeof p.purchase_value === 'number' || typeof p.purchase_value === 'string'
          ? p.purchase_value
          : null,
      purchase_value: purchaseTotal,
      current_value:
        typeof p.current_value === 'number' || typeof p.current_value === 'string'
          ? p.current_value
          : null,
      day_change_abs: dayChange.value,
      day_change_pct: dayChange.pct,
      gain_abs: gainAbs,
      gain_pct: gainPct,
      performance,
    };
  });

  // Basis-HTML über makeTable erzeugen
  const raw = makeTable(rows, cols, ['purchase_value', 'current_value', 'day_change_abs', 'gain_abs']);

  // Header um data-sort-key ergänzen + sortable Klasse setzen
  try {
    const tpl = document.createElement('template');
    tpl.innerHTML = raw.trim();
    const table = tpl.content.querySelector<HTMLTableElement>('table');
    if (table) {
      table.classList.add('sortable-positions');
        const ths = Array.from(table.querySelectorAll<HTMLElement>('thead th'));
        cols.forEach((col, i) => {
          const th = ths.at(i);
          if (!th) {
            return;
          }
          th.setAttribute('data-sort-key', col.key);
          th.classList.add('sortable-col');
        });
    const bodyRows = table.querySelectorAll<HTMLTableRowElement>('tbody tr');
    bodyRows.forEach((tr, idx) => {
      if (tr.classList.contains('footer-row')) {
        return;
      }
      if (idx >= positions.length) {
        return;
      }
      const pos = positions[idx];
      const securityUuid = typeof pos.security_uuid === 'string' ? pos.security_uuid : null;
      if (securityUuid) {
        tr.dataset.security = securityUuid;
      }
          tr.classList.add('position-row');
          const purchaseCell = tr.cells.item(2);
        if (purchaseCell) {
          const { markup, sortValue, ariaLabel } = buildPurchasePriceDisplay(pos);
          purchaseCell.innerHTML = markup;
          purchaseCell.dataset.sortValue = String(sortValue);
          if (ariaLabel) {
            purchaseCell.setAttribute('aria-label', ariaLabel);
          } else {
            purchaseCell.removeAttribute('aria-label');
          }
        }
          const gainCell = tr.cells.item(7);
        if (gainCell) {
          const performance = normalizePerformancePayload(pos.performance);
          const gainPctValue =
            typeof performance?.gain_pct === 'number' && Number.isFinite(performance.gain_pct)
              ? performance.gain_pct
              : null;
          const pctLabel =
            gainPctValue != null
              ? `${gainPctValue.toLocaleString('de-DE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} %`
              : '—';
          const pctSign =
            gainPctValue == null
              ? 'neutral'
              : gainPctValue > 0
                ? 'positive'
                : gainPctValue < 0
                  ? 'negative'
                  : 'neutral';
          gainCell.dataset.gainPct = pctLabel;
          gainCell.dataset.gainSign = pctSign;
        }
          const gainPctCell = tr.cells.item(8);
        if (gainPctCell) {
          gainPctCell.classList.add('gain-pct-cell');
        }
      });
      // Default-Sortierung (nach Name asc) – bereits durch SQL geliefert, aber markieren
      table.dataset.defaultSort = 'name';
      table.dataset.defaultDir = 'asc';
      applyGainPctMetadata(table);
      return table.outerHTML;
    }
  } catch (e) {
    // Fallback: unverändertes Markup
    console.warn("renderPositionsTable: Konnte Sortier-Metadaten nicht injizieren:", e);
  }
  return raw;
}

// NEU: Export / Global bereitstellen für Push-Handler (Konsistenz Push vs Lazy)
export function renderPortfolioPositions(
  positions: readonly (PortfolioPositionRecord | Record<string, unknown>)[] | null | undefined,
): string {
  const normalized = normalizePositionRecords(positions ?? []);
  return renderPositionsTable(normalized);
}

function attachSecurityDetailDelegation(root: PortfolioQueryRoot, portfolioUuid: string): void {
  if (!portfolioUuid) return;
  const detailsRow = root.querySelector<HTMLTableRowElement>(
    `.portfolio-details[data-portfolio="${portfolioUuid}"]`,
  );
  if (!detailsRow) return;
    const container = detailsRow.querySelector<ToggleContainerElement>('.positions-container');
    if (!container) return;
    if (container.__ppReaderSecurityClickBound) return;

    container.__ppReaderSecurityClickBound = true;

  container.addEventListener('click', (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const interactive = target.closest('button, a');
    if (interactive && container.contains(interactive)) {
      return;
    }

    const row = target.closest<HTMLTableRowElement>('tr[data-security]');
    if (!row || !container.contains(row)) {
      return;
    }

    const securityUuid = row.getAttribute('data-security');
    if (!securityUuid) {
      return;
    }

    try {
      const opened = openSecurityDetail(securityUuid);
      if (!opened) {
        console.warn('attachSecurityDetailDelegation: Detail-Tab konnte nicht geöffnet werden für', securityUuid);
      }
    } catch (err) {
      console.error('attachSecurityDetailDelegation: Fehler beim Öffnen des Detail-Tabs', err);
    }
  });
}

export function attachSecurityDetailListener(root: PortfolioQueryRoot, portfolioUuid: string): void {
  attachSecurityDetailDelegation(root, portfolioUuid);
}

// (1) Entferne evtl. doppelte frühere Definitionen von buildExpandablePortfolioTable – nur diese Version behalten
function buildExpandablePortfolioTable(depots: readonly PortfolioOverviewRow[]): string {
  console.debug('buildExpandablePortfolioTable: render', depots.length, 'portfolios');
    const escapeAttribute = (value: unknown): string => {
      if (value == null) {
        return '';
      }
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
        return '';
      }
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;');
    };

  let html = '<table class="expandable-portfolio-table"><thead><tr>';
  const cols = [
    { key: 'name', label: 'Name' },
    { key: 'position_count', label: 'Anzahl Positionen', align: 'right' },
    { key: 'purchase_value', label: 'Kaufwert', align: 'right' },
    { key: 'current_value', label: 'Aktueller Wert', align: 'right' },
    { key: 'day_change_abs', label: 'Heute +/-', align: 'right' },
    { key: 'day_change_pct', label: 'Heute %', align: 'right' },
    { key: 'gain_abs', label: 'Gesamt +/-', align: 'right' },
    { key: 'gain_pct', label: 'Gesamt %', align: 'right' }
  ];
  cols.forEach(c => {
    const align = c.align === 'right' ? ' class="align-right"' : '';
    html += `<th${align}>${c.label}</th>`;
  });
  html += '</tr></thead><tbody>';

    depots.forEach(d => {
      const positionCount = Number.isFinite(d.position_count) ? d.position_count : 0;
      const purchaseSum = Number.isFinite(d.purchase_sum) ? d.purchase_sum : 0;
      const currentValue =
        d.hasValue && typeof d.current_value === 'number' && Number.isFinite(d.current_value)
          ? d.current_value
          : null;
      const hasValue = currentValue !== null;
    const performance = d.performance;
    const gainAbs =
      typeof d.gain_abs === 'number'
        ? d.gain_abs
        : typeof performance?.gain_abs === 'number'
          ? performance.gain_abs
          : null;
    const gainPct =
      typeof d.gain_pct === 'number'
        ? d.gain_pct
        : typeof performance?.gain_pct === 'number'
          ? performance.gain_pct
          : null;
    const dayChangePayload =
      performance && typeof performance === 'object'
        ? (performance as Record<string, unknown>).day_change
        : null;
    const dayChangeAbs =
      typeof d.day_change_abs === 'number'
        ? d.day_change_abs
        : dayChangePayload && typeof dayChangePayload === 'object'
          ? ((dayChangePayload as Record<string, unknown>).value_change_eur ??
            (dayChangePayload as Record<string, unknown>).price_change_eur)
          : null;
    const dayChangePct =
      typeof d.day_change_pct === 'number'
        ? d.day_change_pct
        : dayChangePayload && typeof dayChangePayload === 'object' && typeof (dayChangePayload as Record<string, unknown>).change_pct === 'number'
          ? (dayChangePayload as Record<string, unknown>).change_pct as number
          : null;
    const partialValue = d.fx_unavailable && hasValue;
    const datasetCoverageRatio =
      typeof d.coverage_ratio === 'number' && Number.isFinite(d.coverage_ratio)
        ? d.coverage_ratio
        : '';
    const datasetProvenance = typeof d.provenance === 'string' ? d.provenance : '';
    const datasetMetricRunUuid =
      typeof d.metric_run_uuid === 'string' ? d.metric_run_uuid : '';

    const expanded = expandedPortfolios.has(d.uuid);
    const toggleClass = expanded ? 'portfolio-toggle expanded' : 'portfolio-toggle';
    const detailId = `portfolio-details-${d.uuid}`;
    const rowData = {
      fx_unavailable: d.fx_unavailable,
      purchase_value: purchaseSum,
      current_value: currentValue,
      day_change_abs: dayChangeAbs,
      day_change_pct: dayChangePct,
      gain_abs: gainAbs,
      gain_pct: gainPct
    };
    const valueContext = { hasValue };
    const purchaseValueCell = formatValue('purchase_value', rowData.purchase_value, rowData, valueContext);
    const currentValueCell = formatValue('current_value', rowData.current_value, rowData, valueContext);
    const dayChangeAbsCell = formatValue('day_change_abs', rowData.day_change_abs, rowData, valueContext);
    const dayChangePctCell = formatValue('day_change_pct', rowData.day_change_pct, rowData, valueContext);
    const gainAbsCell = formatValue('gain_abs', rowData.gain_abs, rowData, valueContext);
    const gainPctCell = formatValue('gain_pct', rowData.gain_pct, rowData, valueContext);

    const gainPctLabel = hasValue && typeof gainPct === 'number' && Number.isFinite(gainPct)
      ? `${formatNumber(gainPct)} %`
      : '';
    const gainPctSign = hasValue && typeof gainPct === 'number' && Number.isFinite(gainPct)
      ? (gainPct > 0 ? 'positive' : gainPct < 0 ? 'negative' : 'neutral')
      : '';

      const datasetCurrentValue = hasValue && typeof currentValue === 'number' && Number.isFinite(currentValue)
        ? currentValue
        : '';
      const datasetGainAbs = hasValue && typeof gainAbs === 'number' && Number.isFinite(gainAbs) ? gainAbs : '';
      const datasetGainPct = hasValue && typeof gainPct === 'number' && Number.isFinite(gainPct) ? gainPct : '';
      const datasetDayChangeAbs =
        hasValue && typeof dayChangeAbs === 'number' && Number.isFinite(dayChangeAbs) ? dayChangeAbs : '';
      const datasetDayChangePct =
        hasValue && typeof dayChangePct === 'number' && Number.isFinite(dayChangePct) ? dayChangePct : '';
      const positionCountAttr = String(positionCount);

    let gainAbsAttributes = '';
    if (gainPctLabel) {
      gainAbsAttributes = ` data-gain-pct="${escapeAttribute(gainPctLabel)}" data-gain-sign="${escapeAttribute(gainPctSign)}"`;
    }
    if (partialValue) {
      gainAbsAttributes += ' data-partial="true"';
    }

      html += `<tr class="portfolio-row"
                  data-portfolio="${d.uuid}"
                  data-position-count="${positionCountAttr}"
                  data-current-value="${escapeAttribute(datasetCurrentValue)}"
                  data-purchase-sum="${escapeAttribute(purchaseSum)}"
                  data-day-change="${escapeAttribute(datasetDayChangeAbs)}"
                  data-day-change-pct="${escapeAttribute(datasetDayChangePct)}"
                  data-gain-abs="${escapeAttribute(datasetGainAbs)}"
                data-gain-pct="${escapeAttribute(datasetGainPct)}"
                data-has-value="${hasValue ? 'true' : 'false'}"
                data-fx-unavailable="${d.fx_unavailable ? 'true' : 'false'}"
                data-coverage-ratio="${escapeAttribute(datasetCoverageRatio)}"
                data-provenance="${escapeAttribute(datasetProvenance)}"
                data-metric-run-uuid="${escapeAttribute(datasetMetricRunUuid)}">`;
    const safeName = escapeHtml(d.name);
    const badgeMarkup = renderBadgeList(d.badges, { containerClass: 'portfolio-badges' });
    html += `<td>
        <button type="button"
                class="${toggleClass}"
                data-portfolio="${d.uuid}"
                aria-expanded="${expanded ? 'true' : 'false'}"
                aria-controls="${detailId}">
          <span class="caret">${expanded ? '▼' : '▶'}</span>
          <span class="portfolio-name">${safeName}</span>${badgeMarkup}
        </button>
      </td>`;
      const positionCountDisplay = positionCount.toLocaleString('de-DE');
      html += `<td class="align-right">${positionCountDisplay}</td>`;
    html += `<td class="align-right">${purchaseValueCell}</td>`;
    html += `<td class="align-right">${currentValueCell}</td>`;
    html += `<td class="align-right">${dayChangeAbsCell}</td>`;
    html += `<td class="align-right">${dayChangePctCell}</td>`;
    html += `<td class="align-right"${gainAbsAttributes}>${gainAbsCell}</td>`;
    html += `<td class="align-right gain-pct-cell">${gainPctCell}</td>`;
    html += '</tr>';

    html += `<tr class="portfolio-details${expanded ? '' : ' hidden'}"
                data-portfolio="${d.uuid}"
                id="${detailId}"
                role="region"
                aria-label="Positionen für ${d.name}">
      <td colspan="${cols.length.toString()}">
        <div class="positions-container">${expanded
        ? (hasPortfolioPositions(d.uuid)
          ? renderPositionsTable(getPortfolioPositions(d.uuid))
          : '<div class=\"loading\">Lade Positionen...</div>')
        : ''
      }</div>
      </td>
    </tr>`;
  });

    const availableDepots = depots.filter(d => typeof d.current_value === 'number' && Number.isFinite(d.current_value));
    const sumPositions = depots.reduce((a, d) => a + (Number.isFinite(d.position_count) ? d.position_count : 0), 0);
  const sumCurrent = availableDepots.reduce((a, d) => {
    if (typeof d.current_value === 'number' && Number.isFinite(d.current_value)) {
      return a + d.current_value;
    }
    return a;
  }, 0);
  const sumPurchase = availableDepots.reduce((a, d) => {
    if (typeof d.purchase_sum === 'number' && Number.isFinite(d.purchase_sum)) {
      return a + d.purchase_sum;
    }
    return a;
  }, 0);
  const dayChangeValues = availableDepots
    .map(d => {
      if (typeof d.day_change_abs === 'number') {
        return d.day_change_abs;
      }
      const perfDayChange = d.performance && typeof d.performance === 'object'
        ? (d.performance as Record<string, unknown>).day_change
        : null;
      if (perfDayChange && typeof perfDayChange === 'object') {
        const valueChange = (perfDayChange as Record<string, unknown>).value_change_eur;
        if (typeof valueChange === 'number' && Number.isFinite(valueChange)) {
          return valueChange;
        }
      }
      return null;
    })
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const sumDayChangeAbs = dayChangeValues.reduce((a, value) => a + value, 0);
  const sumGainAbs = availableDepots.reduce((a, d) => {
    if (typeof d.performance?.gain_abs === 'number' && Number.isFinite(d.performance.gain_abs)) {
      return a + d.performance.gain_abs;
    }
    const current = typeof d.current_value === 'number' && Number.isFinite(d.current_value) ? d.current_value : 0;
    const purchase = typeof d.purchase_sum === 'number' && Number.isFinite(d.purchase_sum) ? d.purchase_sum : 0;
    return a + (current - purchase);
  }, 0);
  const sumHasValue = availableDepots.length > 0;
  const sumIsPartial = availableDepots.length !== depots.length;
  const dayChangeHasValue = dayChangeValues.length > 0;
  const sumDayChangePct =
    dayChangeHasValue && sumHasValue && sumCurrent !== 0
      ? (() => {
          const previousClose = sumCurrent - sumDayChangeAbs;
          if (!previousClose) {
            return null;
          }
          return (sumDayChangeAbs / previousClose) * 100;
        })()
      : null;
  const sumGainPct = sumHasValue && sumPurchase > 0 ? (sumGainAbs / sumPurchase) * 100 : null;

  const sumRowData = {
    fx_unavailable: sumIsPartial,
    purchase_value: sumHasValue ? sumPurchase : null,
    current_value: sumHasValue ? sumCurrent : null,
    day_change_abs: dayChangeHasValue ? sumDayChangeAbs : null,
    day_change_pct: dayChangeHasValue ? sumDayChangePct : null,
    gain_abs: sumHasValue ? sumGainAbs : null,
    gain_pct: sumHasValue ? sumGainPct : null
  };
  const sumContext = { hasValue: sumHasValue };
  const dayChangeContext = { hasValue: dayChangeHasValue };
  const sumPurchaseCell = formatValue('purchase_value', sumRowData.purchase_value, sumRowData, sumContext);
  const sumCurrentCell = formatValue('current_value', sumRowData.current_value, sumRowData, sumContext);
  const sumDayChangeAbsCell = formatValue('day_change_abs', sumRowData.day_change_abs, sumRowData, dayChangeContext);
  const sumDayChangePctCell = formatValue('day_change_pct', sumRowData.day_change_pct, sumRowData, dayChangeContext);
  const sumGainAbsCell = formatValue('gain_abs', sumRowData.gain_abs, sumRowData, sumContext);
  const sumGainPctCell = formatValue('gain_pct', sumRowData.gain_pct, sumRowData, sumContext);

  let sumGainAbsAttributes = '';
  if (sumHasValue && typeof sumGainPct === 'number' && Number.isFinite(sumGainPct)) {
    const sumGainPctLabel = `${formatNumber(sumGainPct)} %`;
    const sumGainPctSign = sumGainPct > 0 ? 'positive' : sumGainPct < 0 ? 'negative' : 'neutral';
    sumGainAbsAttributes = ` data-gain-pct="${escapeAttribute(sumGainPctLabel)}" data-gain-sign="${escapeAttribute(sumGainPctSign)}"`;
  }
  if (sumIsPartial) {
    sumGainAbsAttributes += ' data-partial="true"';
  }

    const sumPositionAttr = String(Math.round(sumPositions));
    const sumCurrentAttr = sumHasValue ? String(sumCurrent) : '';
    const sumPurchaseAttr = sumHasValue ? String(sumPurchase) : '';
    const sumDayChangeAttr = dayChangeHasValue ? String(sumDayChangeAbs) : '';
    const sumDayChangePctAttr =
      dayChangeHasValue && typeof sumDayChangePct === 'number' && Number.isFinite(sumDayChangePct)
        ? String(sumDayChangePct)
        : '';
    const sumGainAbsAttr = sumHasValue ? String(sumGainAbs) : '';
    const sumGainPctAttr = sumHasValue && typeof sumGainPct === 'number' && Number.isFinite(sumGainPct)
      ? String(sumGainPct)
      : '';

    html += `<tr class="footer-row"
      data-position-count="${sumPositionAttr}"
      data-current-value="${escapeAttribute(sumCurrentAttr)}"
      data-purchase-sum="${escapeAttribute(sumPurchaseAttr)}"
      data-day-change="${escapeAttribute(sumDayChangeAttr)}"
      data-day-change-pct="${escapeAttribute(sumDayChangePctAttr)}"
      data-gain-abs="${escapeAttribute(sumGainAbsAttr)}"
      data-gain-pct="${escapeAttribute(sumGainPctAttr)}"
      data-has-value="${sumHasValue ? 'true' : 'false'}"
      data-fx-unavailable="${sumIsPartial ? 'true' : 'false'}">
      <td>Summe</td>
      <td class="align-right">${Math.round(sumPositions).toLocaleString('de-DE')}</td>
    <td class="align-right">${sumPurchaseCell}</td>
    <td class="align-right">${sumCurrentCell}</td>
    <td class="align-right">${sumDayChangeAbsCell}</td>
    <td class="align-right">${sumDayChangePctCell}</td>
    <td class="align-right"${sumGainAbsAttributes}>${sumGainAbsCell}</td>
    <td class="align-right gain-pct-cell">${sumGainPctCell}</td>
  </tr>`;

  html += '</tbody></table>';
  return html;
}

function resolvePortfolioTable(target: Element | PortfolioQueryRoot | null | undefined): HTMLTableElement | null {
  if (target instanceof HTMLTableElement) {
    return target;
  }
  if (target && 'querySelector' in target) {
    const scoped = (target as ParentNode).querySelector<HTMLTableElement>('table.expandable-portfolio-table');
    if (scoped) {
      return scoped;
    }
    const nested = (target as ParentNode).querySelector<HTMLTableElement>('.portfolio-table table');
    if (nested) {
      return nested;
    }
    const generic = (target as ParentNode).querySelector<HTMLTableElement>('table');
    if (generic) {
      return generic;
    }
  }
  return document.querySelector<HTMLTableElement>('.portfolio-table table.expandable-portfolio-table') ||
    document.querySelector<HTMLTableElement>('.portfolio-table table');
}

function readDatasetNumber(value: string | undefined): number | null {
  if (value === undefined) {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function updatePortfolioFooterFromDom(target: Element | PortfolioQueryRoot | null | undefined): void {
    const table = resolvePortfolioTable(target);
    if (!table) {
      return;
    }
    const tbody = table.tBodies.item(0);
  if (!tbody) {
    return;
  }
  const rows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>('tr.portfolio-row'));
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

    if (row.dataset.fxUnavailable === 'true') {
      fxUnavailable = true;
    }

    const hasValueAttr = row.dataset.hasValue;
    const hasValue = !(hasValueAttr === 'false' || hasValueAttr === '0' || hasValueAttr === '' || hasValueAttr == null);
    if (!hasValue) {
      allRowsComplete = false;
      continue;
    }

    hasValueRow = true;

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
  const sumGainPct = totalsComplete && sumPurchase > 0 ? (sumGainAbs / sumPurchase) * 100 : null;
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

  let footer = Array.from(tbody.children).find((child): child is HTMLTableRowElement =>
    child instanceof HTMLTableRowElement && child.classList.contains('footer-row')
  );
  if (!footer) {
    footer = document.createElement('tr');
    footer.classList.add('footer-row');
    tbody.appendChild(footer);
  }

  const sumPositionsDisplay = Math.round(sumPositions).toLocaleString('de-DE');

  const footerRowData = {
    fx_unavailable: fxUnavailable || !totalsComplete,
    purchase_value: totalsComplete ? sumPurchase : null,
    current_value: totalsComplete ? sumCurrent : null,
    day_change_abs: hasDayChangeRow && totalsComplete ? sumDayChange : null,
    day_change_pct: hasDayChangeRow && totalsComplete ? sumDayChangePct : null,
    gain_abs: totalsComplete ? sumGainAbs : null,
    gain_pct: totalsComplete ? sumGainPct : null,
  };
  const footerContext = { hasValue: totalsComplete };
  const dayChangeContext = { hasValue: hasDayChangeRow && totalsComplete };

  const purchaseValueHtml = formatValue('purchase_value', footerRowData.purchase_value, footerRowData, footerContext);
  const currentValueHtml = formatValue('current_value', footerRowData.current_value, footerRowData, footerContext);
  const dayChangeAbsHtml = formatValue('day_change_abs', footerRowData.day_change_abs, footerRowData, dayChangeContext);
  const dayChangePctHtml = formatValue('day_change_pct', footerRowData.day_change_pct, footerRowData, dayChangeContext);
  const gainAbsHtml = formatValue('gain_abs', footerRowData.gain_abs, footerRowData, footerContext);
  const gainPctHtml = formatValue('gain_pct', footerRowData.gain_pct, footerRowData, footerContext);

  const headerRow = table.tHead ? table.tHead.rows.item(0) : null;
  const headerCellCount = headerRow ? headerRow.cells.length : 0;
  const footerCellCount = footer.cells.length;
  const layoutColumns = headerCellCount || footerCellCount;
  const useCompactLayout = layoutColumns > 0 ? layoutColumns <= 5 : false;

  const gainPctLabel =
    totalsComplete && typeof sumGainPct === 'number' ? `${formatNumber(sumGainPct)} %` : '';
  const gainPctSign =
    totalsComplete && typeof sumGainPct === 'number'
      ? sumGainPct > 0
        ? 'positive'
        : sumGainPct < 0
          ? 'negative'
          : 'neutral'
      : 'neutral';

  if (useCompactLayout) {
    footer.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${sumPositionsDisplay}</td>
      <td class="align-right">${currentValueHtml}</td>
      <td class="align-right">${gainAbsHtml}</td>
      <td class="align-right gain-pct-cell">${gainPctHtml}</td>
    `;
  } else {
    footer.innerHTML = `
      <td>Summe</td>
      <td class="align-right">${sumPositionsDisplay}</td>
      <td class="align-right">${purchaseValueHtml}</td>
      <td class="align-right">${currentValueHtml}</td>
      <td class="align-right">${dayChangeAbsHtml}</td>
      <td class="align-right">${dayChangePctHtml}</td>
      <td class="align-right">${gainAbsHtml}</td>
      <td class="align-right">${gainPctHtml}</td>
    `;
  }

  const footerGainAbsCell = footer.cells.item(useCompactLayout ? 3 : 6);
  if (footerGainAbsCell) {
    footerGainAbsCell.dataset.gainPct = gainPctLabel || '—';
    footerGainAbsCell.dataset.gainSign = gainPctSign;
  }
  footer.dataset.positionCount = String(Math.round(sumPositions));
  footer.dataset.currentValue = totalsComplete ? String(sumCurrent) : '';
  footer.dataset.purchaseSum = totalsComplete ? String(sumPurchase) : '';
  footer.dataset.dayChange = totalsComplete && hasDayChangeRow ? String(sumDayChange) : '';
  footer.dataset.dayChangePct =
    totalsComplete && hasDayChangeRow && typeof sumDayChangePct === 'number'
      ? String(sumDayChangePct)
      : '';
  footer.dataset.gainAbs = totalsComplete ? String(sumGainAbs) : '';
  footer.dataset.gainPct = totalsComplete && typeof sumGainPct === 'number' ? String(sumGainPct) : '';
  footer.dataset.hasValue = totalsComplete ? 'true' : 'false';
  footer.dataset.fxUnavailable = fxUnavailable ? 'true' : 'false';
}

/**
 * Utility-Funktionen zum Auslesen und Wiederherstellen des Expand-States.
 * Perspektivisch nutzbar, falls ein vollständiger Neu-Render (Hard Refresh) der
 * Depot-Tabelle nötig wird (z.B. beim späteren Hinzufügen von Filter-/Sortierlogik).
 */
export function getExpandedPortfolios(): string[] {
  // Primär DOM lesen (falls Tabelle gerendert), Fallback: interner Set
  const domRows = Array.from(
    document.querySelectorAll<HTMLTableRowElement>('.portfolio-details:not(.hidden)[data-portfolio]'),
  );
  if (domRows.length) {
    return domRows
      .map((row) => row.getAttribute('data-portfolio'))
      .filter((value): value is string => Boolean(value));
  }
  return Array.from(expandedPortfolios.values());
}

export function setExpandedPortfolios(portfolioIds: Array<string | null | undefined> | null | undefined): void {
  expandedPortfolios.clear();
  if (Array.isArray(portfolioIds)) {
    portfolioIds.forEach(id => {
      if (id) {
        expandedPortfolios.add(id);
      }
    });
  }
}

// NEU: Helper zum Anhängen der Sortier-Logik an eine Positions-Tabelle eines bestimmten Portfolios
export function attachPortfolioPositionsSorting(root: PortfolioQueryRoot, portfolioUuid: string): void {
  if (!portfolioUuid) return;
  const detailsRow = root.querySelector<HTMLTableRowElement>(
    `.portfolio-details[data-portfolio="${portfolioUuid}"]`,
  );
  if (!detailsRow) return;
    const container = detailsRow.querySelector<ToggleContainerElement>('.positions-container');
    if (!container) return;
    const table = container.querySelector<SortableTableElement>('table.sortable-positions');
  if (!table || table.__ppReaderSortingBound) return;

  table.__ppReaderSortingBound = true;

  const applySort = (
    key: PortfolioPositionsSortKey,
    dir: PortfolioSortDirection,
  ): void => {
    const tbody = table.querySelector<HTMLTableSectionElement>('tbody');
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>('tr'))
      .filter(r => !r.classList.contains('footer-row'));
    const footer = tbody.querySelector<HTMLTableRowElement>('tr.footer-row');

    const parseNum = (txt: string | null | undefined): number => {
      if (txt == null) return 0;
      // Entferne Währungs-/Prozent-Symbole, geschützte Leerzeichen
      const cleaned = txt
        .replace(/\u00A0/g, ' ')
        .replace(/[%€]/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
        .replace(/[^\d.-]/g, '');
      const numeric = Number.parseFloat(cleaned);
      return Number.isFinite(numeric) ? numeric : 0;
    };

    rows.sort((a, b) => {
        const idxMap: Record<PortfolioPositionsSortKey, number> = {
          name: 0,
          current_holdings: 1,
          average_price: 2,
          purchase_value: 3,
          current_value: 4,
          day_change_abs: 5,
          day_change_pct: 6,
          gain_abs: 7,
          gain_pct: 8,
        };
        const colIdx = idxMap[key];
          const aCellEl = a.cells.item(colIdx);
          const bCellEl = b.cells.item(colIdx);

        let aCell = '';
        if (aCellEl) {
          const raw = aCellEl.textContent;
          if (typeof raw === 'string') {
            aCell = raw.trim();
          }
        }

        let bCell = '';
        if (bCellEl) {
          const raw = bCellEl.textContent;
          if (typeof raw === 'string') {
            bCell = raw.trim();
          }
        }

          const resolveSortValue = (
            cell: HTMLTableCellElement | null | undefined,
            text: string,
          ): number => {
            const sortAttr = cell ? cell.dataset.sortValue : undefined;
            if (sortAttr != null && sortAttr !== '') {
              const numericAttr = Number(sortAttr);
              if (Number.isFinite(numericAttr)) {
                return numericAttr;
              }
            }
            return parseNum(text);
          };

      let comp: number;
      if (key === 'name') {
        comp = aCell.localeCompare(bCell, 'de', { sensitivity: 'base' });
      } else {
        const aValue = resolveSortValue(aCellEl, aCell);
        const bValue = resolveSortValue(bCellEl, bCell);
        comp = aValue - bValue;
      }
      return dir === 'asc' ? comp : -comp;
    });

    // Visuelle Indikatoren zurücksetzen
    table.querySelectorAll('thead th.sort-active').forEach(th => {
      th.classList.remove('sort-active', 'dir-asc', 'dir-desc');
    });

    // Aktives TH markieren
    const th = table.querySelector<HTMLElement>(`thead th[data-sort-key="${key}"]`);
    if (th) {
      th.classList.add('sort-active', dir === 'asc' ? 'dir-asc' : 'dir-desc');
    }

    // Neu einfügen
    rows.forEach(r => tbody.appendChild(r));
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
      : 'name';
  const currentDir = isPortfolioSortDirection(containerDir)
    ? containerDir
    : isPortfolioSortDirection(defaultDir)
      ? defaultDir
      : 'asc';

  applySort(currentKey, currentDir);

  table.addEventListener('click', (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const th = target.closest('th[data-sort-key]');
    if (!th || !table.contains(th)) return;
    const keyAttr = th.getAttribute('data-sort-key');
    if (!isPortfolioPositionsSortKey(keyAttr)) {
      return;
    }

    let dir: PortfolioSortDirection = 'asc';
    if (container.dataset.sortKey === keyAttr) {
      const existing = isPortfolioSortDirection(container.dataset.sortDir)
        ? container.dataset.sortDir
        : 'asc';
      dir = existing === 'asc' ? 'desc' : 'asc';
    }
    container.dataset.sortKey = keyAttr;
    container.dataset.sortDir = dir;
    applySort(keyAttr, dir);
  });
}

// NEU: Funktion zum erneuten Laden der Positionsdaten
async function reloadPortfolioPositions(
  portfolioUuid: string,
  containerEl: HTMLElement | null | undefined,
  root: HTMLElement,
): Promise<void> {
  if (!portfolioUuid || !_hassRef || !_panelConfigRef) return;

  const targetContainer = containerEl || root.querySelector<HTMLElement>(
    `.portfolio-details[data-portfolio="${portfolioUuid}"] .positions-container`
  );
  if (!targetContainer) {
    return;
  }

  const detailsRow = targetContainer.closest<HTMLTableRowElement>('.portfolio-details');
  if (detailsRow && detailsRow.classList.contains('hidden')) {
    return; // Hidden Rows sollen keinen Silent-Preload anstoßen
  }

  targetContainer.innerHTML = '<div class="loading">Neu laden...</div>';
  try {
    const resp: PortfolioPositionsResponse = await fetchPortfolioPositionsWS(
      _hassRef,
      _panelConfigRef,
      portfolioUuid,
    );
    if (resp.error) {
      const errorText = typeof resp.error === 'string' ? resp.error : String(resp.error);
      targetContainer.innerHTML = `<div class="error">${errorText} <button class="retry-pos" data-portfolio="${portfolioUuid}">Erneut laden</button></div>`;
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
      console.warn('attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:', error);
    }
    try {
      attachSecurityDetailListener(root, portfolioUuid);
    } catch (error) {
      console.warn('reloadPortfolioPositions: Security-Listener konnte nicht gebunden werden:', error);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    targetContainer.innerHTML = `<div class="error">Fehler: ${message} <button class="retry-pos" data-portfolio="${portfolioUuid}">Retry</button></div>`;
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

  export function attachPortfolioToggleHandler(root: ToggleRootElement): void {
    const previousToken = typeof root.__ppReaderAttachToken === 'number' ? root.__ppReaderAttachToken : 0;
    const token = previousToken + 1;
  root.__ppReaderAttachToken = token;
  root.__ppReaderAttachInProgress = true;

    void (async () => {
    try {
        const container = await waitForElement<ToggleContainerElement>(root, '.portfolio-table');
      if (token !== root.__ppReaderAttachToken) {
        return; // Ein neuer Versuch läuft bereits – diesen abbrechen
      }
      if (!container) {
        console.warn("attachPortfolioToggleHandler: .portfolio-table nicht gefunden (Timeout)");
        return;
      }

      // Buttons generiert?
      const btnCount = container.querySelectorAll('.portfolio-toggle').length;
      if (btnCount === 0) {
        console.debug("attachPortfolioToggleHandler: Noch keine Buttons – evtl. Recovery später");
      }

        if (container.__ppReaderPortfolioToggleBound) {
          return;
        }
        container.__ppReaderPortfolioToggleBound = true;
      console.debug("attachPortfolioToggleHandler: Listener registriert");

      container.addEventListener('click', (event: MouseEvent) => {
        void (async () => {
          try {
            const target = event.target;
            if (!(target instanceof Element)) {
              return;
            }

              const retryBtn = target.closest<HTMLButtonElement>('.retry-pos');
            if (retryBtn && container.contains(retryBtn)) {
              const pid = retryBtn.getAttribute('data-portfolio');
              if (pid) {
                const detailsRow = root.querySelector<HTMLTableRowElement>(
                  `.portfolio-details[data-portfolio="${pid}"]`,
                );
                const cont = detailsRow?.querySelector<ToggleContainerElement>('.positions-container');
                await reloadPortfolioPositions(pid, cont ?? null, root);
              }
              return;
            }

            const btn = target.closest<HTMLButtonElement>('.portfolio-toggle');
            if (!btn || !container.contains(btn)) return;

            const portfolioUuid = btn.getAttribute('data-portfolio');
            if (!portfolioUuid) return;

              const detailsRow = root.querySelector<HTMLTableRowElement>(
              `.portfolio-details[data-portfolio="${portfolioUuid}"]`,
            );
            if (!detailsRow) return;

            const caretEl = btn.querySelector<HTMLElement>('.caret');
            const isHidden = detailsRow.classList.contains('hidden');

            if (isHidden) {
              detailsRow.classList.remove('hidden');
              btn.classList.add('expanded');
              btn.setAttribute('aria-expanded', 'true');
              if (caretEl) caretEl.textContent = '▼';
              expandedPortfolios.add(portfolioUuid);

              try {
                flushPendingPositions(root, portfolioUuid);
              } catch (error) {
                console.warn('attachPortfolioToggleHandler: Pending-Flush fehlgeschlagen:', error);
              }

              if (!hasPortfolioPositions(portfolioUuid)) {
                const containerEl = detailsRow.querySelector<ToggleContainerElement>('.positions-container');
                if (containerEl) {
                  containerEl.innerHTML = '<div class="loading">Lade Positionen...</div>';
                }
                try {
                  const resp: PortfolioPositionsResponse = await fetchPortfolioPositionsWS(
                    _hassRef,
                    _panelConfigRef,
                    portfolioUuid,
                  );
                  if (resp.error) {
                    const errorText = typeof resp.error === 'string' ? resp.error : String(resp.error);
                    if (containerEl) {
                      containerEl.innerHTML = `<div class="error">${errorText} <button class="retry-pos" data-portfolio="${portfolioUuid}">Erneut laden</button></div>`;
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
                    containerEl.innerHTML = renderPositionsTable(normalizedPositions);
                    // Änderung 11: Nach erstmaligem Lazy-Load Sortierung initialisieren
                    try {
                      attachPortfolioPositionsSorting(root, portfolioUuid);
                    } catch (error) {
                      console.warn('attachPortfolioToggleHandler: Sort-Init (Lazy) fehlgeschlagen:', error);
                    }
                    try {
                      attachSecurityDetailListener(root, portfolioUuid);
                    } catch (error) {
                      console.warn('attachPortfolioToggleHandler: Security-Listener konnte nicht gebunden werden:', error);
                    }
                  }
                } catch (error) {
                  const message = error instanceof Error ? error.message : String(error);
                  const containerEl = detailsRow.querySelector<ToggleContainerElement>('.positions-container');
                  if (containerEl) {
                    containerEl.innerHTML = `<div class="error">Fehler beim Laden: ${message} <button class="retry-pos" data-portfolio="${portfolioUuid}">Retry</button></div>`;
                  }
                  console.error('Fehler beim Lazy Load für', portfolioUuid, error);
                }
              } else {
                const containerEl = detailsRow.querySelector<HTMLElement>('.positions-container');
                if (containerEl) {
                  containerEl.innerHTML = renderPositionsTable(
                    getPortfolioPositions(portfolioUuid),
                  );
                  attachPortfolioPositionsSorting(root, portfolioUuid);
                  try {
                    attachSecurityDetailListener(root, portfolioUuid);
                  } catch (error) {
                    console.warn('attachPortfolioToggleHandler: Security-Listener (Cache) Fehler:', error);
                  }
                }
              }
            } else {
              detailsRow.classList.add('hidden');
              btn.classList.remove('expanded');
              btn.setAttribute('aria-expanded', 'false');
              if (caretEl) caretEl.textContent = '▶';
              expandedPortfolios.delete(portfolioUuid);
            }
            } catch (error) {
              console.error('attachPortfolioToggleHandler: Ungefangener Fehler im Click-Handler', error);
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
  export function ensurePortfolioRowFallbackListener(root: ToggleRootElement): void {
    const table = root.querySelector<SortableTableElement>('.expandable-portfolio-table');
    if (!table) return;
    if (table.__ppReaderPortfolioFallbackBound) return;
    table.__ppReaderPortfolioFallbackBound = true;
  table.addEventListener('click', (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const btn = target.closest<HTMLButtonElement>('.portfolio-toggle');
    if (!btn) return;
    // Falls der Haupt-Listener schon aktiv war, nichts doppelt machen
      const primaryContainer = root.querySelector<ToggleContainerElement>('.portfolio-table');
    if (primaryContainer?.__ppReaderPortfolioToggleBound) return;
    console.debug('Fallback-Listener aktiv – re-attach Hauptlistener');
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
    'renderDashboard: start – panelConfig:',
    panelConfig?.config,
    'derived entry_id?',
    panelConfig?.config?._panel_custom?.config?.entry_id,
  );

  const accountsResp = await fetchAccountsWS(hass, panelConfig);
  setAccountSnapshots(accountsResp.accounts);
  const accountRows: AccountOverviewRow[] = selectAccountOverviewRows();

  const portfoliosResp = await fetchPortfoliosWS(hass, panelConfig);
  replacePortfolioSnapshots(portfoliosResp.portfolios);
  const depots = selectPortfolioOverviewRows();

  // 3. Last file update (optional – falls bereits WS-Command vorhanden)
  let lastFileUpdate = '';
  try {
    lastFileUpdate = await fetchLastFileUpdateWS(hass, panelConfig);
  } catch {
    lastFileUpdate = '';
  }

  // 4. Gesamtvermögen berechnen (nur Anzeige)
  const totalAccounts = accountRows.reduce(
    (sum, account) => sum + (typeof account.balance === 'number' && Number.isFinite(account.balance) ? account.balance : 0),
    0,
  );
  const anyPortfolioMissing = depots.some(depot => depot.fx_unavailable);
  const anyAccountMissing = accountRows.some(account => account.fx_unavailable && (account.balance == null || !Number.isFinite(account.balance)));
  const totalDepots = depots.reduce((sum, depot) => {
    if (depot.hasValue && typeof depot.current_value === 'number' && Number.isFinite(depot.current_value)) {
      return sum + depot.current_value;
    }
    return sum;
  }, 0);
  const totalWealth = totalAccounts + totalDepots;
  const missingWealthReason = 'Teilw. fehlende FX-Kurse – Gesamtvermögen abweichend';
  const wealthValueAvailable = depots.some(depot => depot.hasValue && typeof depot.current_value === 'number' && Number.isFinite(depot.current_value))
    || accountRows.some(account => typeof account.balance === 'number' && Number.isFinite(account.balance));
  const wealthValueMarkup = wealthValueAvailable
    ? `${formatNumber(totalWealth)}&nbsp;€`
    : `<span class="missing-value" role="note" aria-label="${missingWealthReason}" title="${missingWealthReason}">—</span>`;
  const wealthNote = (anyPortfolioMissing || anyAccountMissing)
    ? `<span class="total-wealth-note">${missingWealthReason}</span>`
    : '';

  // 5. Header (ohne Last-File-Update – kommt jetzt wieder in Footer-Karte)
  const headerMeta = `
    <div class="header-meta-row">
      💰 Gesamtvermögen: <strong class="total-wealth-value">${wealthValueMarkup}</strong>${wealthNote}
    </div>
  `;
  const headerCard = createHeaderCard('Übersicht', headerMeta);

  // 6. Sicherstellen, dass die Struktur exakt der erwartet wird:
  //    - .portfolio-table (Wrapper)
  //    - darin eine <table class="expandable-portfolio-table"> mit <tr class="portfolio-row" data-portfolio="UUID">
  const portfolioTableHtml = buildExpandablePortfolioTable(depots);

  // 7. Konten-Tabellen
  const eurAccounts = accountRows.filter(a => (a.currency_code ?? 'EUR') === 'EUR');
  const fxAccounts = accountRows.filter(a => (a.currency_code ?? 'EUR') !== 'EUR');

  const fxWarningNeeded = fxAccounts.some(a => a.fx_unavailable);
  const fxWarning = fxWarningNeeded
    ? `
        <p class="table-note" role="note">
          <span class="table-note__icon" aria-hidden="true">⚠️</span>
          <span>Wechselkurse konnten nicht geladen werden. EUR-Werte werden derzeit nicht angezeigt.</span>
        </p>
      `
    : '';

  const accountsHtml = `
    <div class="card">
      <h2>Liquidität</h2>
      <div class="scroll-container account-table">
        ${makeTable(
    eurAccounts.map(account => ({
      name: renderNameWithBadges(account.name, account.badges, {
        containerClass: 'account-name',
        labelClass: 'account-name__label',
      }),
      balance: account.balance ?? null,
    })),
    [
      { key: 'name', label: 'Name' },
      { key: 'balance', label: 'Kontostand (EUR)', align: 'right' as const },
    ],
    ['balance'],
  )}
      </div>
    </div>
    ${fxAccounts.length ? `
      <div class="card">
        <h2>Fremdwährungen</h2>
        <div class="scroll-container fx-account-table">
          ${makeTable(
    fxAccounts.map(account => {
      const origBalance = account.orig_balance;
      const hasOrigBalance = typeof origBalance === 'number' && Number.isFinite(origBalance);
      const fxDisplay = hasOrigBalance
        ? `${origBalance.toLocaleString('de-DE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}&nbsp;${account.currency_code ?? ''}`
        : '';

      return {
        name: renderNameWithBadges(account.name, account.badges, {
          containerClass: 'account-name',
          labelClass: 'account-name__label',
        }),
        fx_display: fxDisplay,
        balance: account.balance ?? null,
      };
    }),
    [
      { key: 'name', label: 'Name' },
      { key: 'fx_display', label: 'Betrag (FX)' },
      { key: 'balance', label: 'EUR', align: 'right' as const },
    ],
    ['balance'],
  )}
        </div>
        ${fxWarning}
      </div>` : ''}
  `;

  // 8. Footer-Karte mit letztem Datei-Änderungszeitpunkt (reintroduziert)
  const footerCard = `
    <div class="card footer-card">
      <div class="meta">
        <div class="last-file-update">
          📂 Letzte Aktualisierung der Datei: <strong>${lastFileUpdate || 'Unbekannt'}</strong>
        </div>
      </div>
    </div>
  `;

  const markup = `
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

  function schedulePostRenderSetup(root: ToggleRootElement | null, depots: readonly PortfolioOverviewRow[]): void {
  if (!root) {
    return;
  }

  const run = () => {
    try {
      const wrapper = root;
      const tableHost = wrapper.querySelector<HTMLElement>('.portfolio-table');
      if (tableHost && tableHost.querySelectorAll('.portfolio-toggle').length === 0) {
        console.debug('Recovery: Tabelle ohne Buttons – erneuter Aufbau');
        tableHost.innerHTML = buildExpandablePortfolioTable(depots);
      }

      attachPortfolioToggleHandler(root);
      ensurePortfolioRowFallbackListener(root);

      expandedPortfolios.forEach((pid) => {
        try {
          if (hasPortfolioPositions(pid)) {
            attachPortfolioPositionsSorting(root, pid);
            attachSecurityDetailListener(root, pid);
          }
        } catch (error) {
          console.warn('Init-Sortierung für expandiertes Depot fehlgeschlagen:', pid, error);
        }
      });

      try {
        updatePortfolioFooterFromDom(wrapper);
      } catch (footerErr) {
        console.warn('renderDashboard: Footer-Summe konnte nicht aktualisiert werden:', footerErr);
      }

      try {
        flushAllPendingPositions(root);
      } catch (pendingErr) {
        console.warn('renderDashboard: Pending-Positions konnten nicht angewendet werden:', pendingErr);
      }

      console.debug('renderDashboard: portfolio-toggle Buttons:', wrapper.querySelectorAll('.portfolio-toggle').length);
    } catch (error) {
      console.error('renderDashboard: Fehler bei Recovery/Listener', error);
    }
  };

  const schedule = typeof requestAnimationFrame === 'function'
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
