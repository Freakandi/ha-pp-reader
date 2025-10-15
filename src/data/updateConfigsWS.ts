/**
 * Live update handlers mirrored from the legacy websocket client.
 */

import { makeTable } from '../content/elements';
import { sortTableRows } from '../content/elements'; // NEU: generische Sortier-Utility
import { formatValue } from '../content/elements';
import type { SortDirection } from '../content/elements';
import { getOverviewHelpers } from '../dashboard/registry';
import type {
  AverageCostPayload,
  HoldingsAggregationPayload,
  PerformanceMetricsPayload,
  PortfolioPositionsUpdatedEventDetail,
} from '../tabs/types';
import { normalizeCurrencyValue, roundCurrency, toFiniteCurrency } from '../utils/currency';
import { normalizePerformancePayload } from '../utils/performance';
import type { AccountSummary, PortfolioSummary } from './api';
import {
  clearAllPortfolioPositions,
  getPortfolioPositionsSnapshot,
  setPortfolioPositions,
} from './positionsCache';
import type { PortfolioPositionRecord } from './positionsCache';

export type { PortfolioPositionsUpdatedEventDetail } from '../tabs/types';

type QueryRoot = HTMLElement | Document;

interface PortfolioPositionData {
  security_uuid?: string | null;
  name?: string | null;
  current_holdings?: number | null;
  purchase_value?: number | null;
  current_value?: number | null;
  average_cost?: AverageCostPayload | null;
  performance?: PerformanceMetricsPayload | null;
  aggregation?: HoldingsAggregationPayload | null;
  [key: string]: unknown;
}

interface PortfolioPositionsUpdatePayload {
  portfolio_uuid?: string | null;
  portfolioUuid?: string | null;
  positions?: PortfolioPositionData[] | null;
  error?: unknown;
  [key: string]: unknown;
}

interface PendingPortfolioUpdate {
  positions: PortfolioPositionData[];
  error?: unknown;
}

interface PendingRetryMeta {
  attempts: number;
  timer: ReturnType<typeof setTimeout> | null;
}

interface ApplyPositionsResult {
  applied: boolean;
  reason?: 'invalid' | 'missing' | 'hidden';
}

const pendingPortfolioUpdates = new Map<string, PendingPortfolioUpdate>();
const pendingRetryMetaMap = new Map<string, PendingRetryMeta>();

function formatErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    const trimmed = error.trim();
    return trimmed.length > 0 ? trimmed : 'Unbekannter Fehler';
  }
  if (error instanceof Error) {
    const trimmed = error.message.trim();
    return trimmed.length > 0 ? trimmed : 'Unbekannter Fehler';
  }
  if (error != null) {
    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== '{}') {
        return serialized;
      }
    } catch {
      // Ignore serialization issues and fall through to default label.
    }
  }
  return 'Unbekannter Fehler';
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePerformanceMetrics(
  position: PortfolioPositionData,
): PerformanceMetricsPayload | null {
  return normalizePerformancePayload(position.performance);
}

function cloneAggregationPayload(
  value: PortfolioPositionData['aggregation'],
): HoldingsAggregationPayload | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const clone: HoldingsAggregationPayload = { ...value };
  return clone;
}

function cloneAverageCostPayload(
  value: PortfolioPositionData['average_cost'],
): AverageCostPayload | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const clone: AverageCostPayload = { ...value };
  return clone;
}

function sanitizePosition(position: PortfolioPositionData): PortfolioPositionRecord | null {
  const securityUuid = toNonEmptyString(position.security_uuid);
  const name = toNonEmptyString(position.name);
  const currentHoldings = toFiniteCurrency(position.current_holdings);
  const purchaseValue = normalizeCurrencyValue(position.purchase_value);
  const currentValue = normalizeCurrencyValue(position.current_value);
  if (
    !securityUuid ||
    !name ||
    currentHoldings == null ||
    purchaseValue == null ||
    currentValue == null
  ) {
    return null;
  }

  const aggregation = cloneAggregationPayload(position.aggregation);
  const averageCost = cloneAverageCostPayload(position.average_cost);
  const performance = normalizePerformanceMetrics(position);

  const gainAbs = typeof performance?.gain_abs === 'number' ? performance.gain_abs : null;
  const gainPct = typeof performance?.gain_pct === 'number' ? performance.gain_pct : null;

  return {
    ...position,
    security_uuid: securityUuid,
    name,
    current_holdings: currentHoldings,
    purchase_value: purchaseValue,
    current_value: currentValue,
    average_cost: averageCost,
    aggregation,
    performance,
    gain_abs: gainAbs,
    gain_pct: gainPct,
  } as PortfolioPositionRecord;
}

function sanitizePositions(positions: PortfolioPositionData[]): PortfolioPositionRecord[] {
  const sanitized: PortfolioPositionRecord[] = [];
  for (const position of positions) {
    const normalized = sanitizePosition(position);
    if (normalized) {
      sanitized.push(normalized);
    }
  }
  return sanitized;
}

interface PortfolioUpdatePayload extends Partial<PortfolioSummary> {
  uuid?: string | null;
  value?: number | null;
  purchaseSum?: number | null;
  count?: number | null;
  position_count?: number | null;
  [key: string]: unknown;
}

const PENDING_RETRY_INTERVAL = 500;
const PENDING_MAX_ATTEMPTS = 10;
export const PORTFOLIO_POSITIONS_UPDATED_EVENT = 'pp-reader:portfolio-positions-updated';

function renderPositionsError(error: unknown, portfolioUuid: string): string {
  const safeError = formatErrorMessage(error);
  return `<div class="error">${safeError} <button class="retry-pos" data-portfolio="${portfolioUuid}">Erneut laden</button></div>`;
}

function restoreSortAndInit(containerEl: HTMLElement, rootEl: QueryRoot, pid: string): void {
  const table = containerEl.querySelector<HTMLTableElement>('table.sortable-positions');
  if (!table) return;

  const key = containerEl.dataset.sortKey || table.dataset.defaultSort || 'name';
  const dirValue = containerEl.dataset.sortDir || table.dataset.defaultDir || 'asc';
  const direction: SortDirection = dirValue === 'desc' ? 'desc' : 'asc';
  containerEl.dataset.sortKey = key;
  containerEl.dataset.sortDir = direction;

  try {
    sortTableRows(table, key, direction, true);
  } catch (e) {
    console.warn('restoreSortAndInit: sortTableRows Fehler:', e);
  }

  const { attachPortfolioPositionsSorting, attachSecurityDetailListener } = getOverviewHelpers();

  if (attachPortfolioPositionsSorting) {
    try {
      attachPortfolioPositionsSorting(rootEl, pid);
    } catch (e) {
      console.warn('restoreSortAndInit: attachPortfolioPositionsSorting Fehler:', e);
    }
  }

  if (attachSecurityDetailListener) {
    try {
      attachSecurityDetailListener(rootEl, pid);
    } catch (e) {
      console.warn('restoreSortAndInit: attachSecurityDetailListener Fehler:', e);
    }
  }
}

function applyPortfolioPositionsToDom(
  root: QueryRoot | null | undefined,
  portfolioUuid: string | null | undefined,
  positions: PortfolioPositionData[],
  error?: unknown,
): ApplyPositionsResult {
  if (!root || !portfolioUuid) {
    return { applied: false, reason: 'invalid' };
  }

  const detailsRow = root.querySelector<HTMLTableRowElement>(
    `.portfolio-table .portfolio-details[data-portfolio="${portfolioUuid}"]`
  );
  if (!detailsRow) {
    return { applied: false, reason: 'missing' };
  }

  const container = detailsRow.querySelector<HTMLElement>('.positions-container');
  if (!container) {
    return { applied: false, reason: 'missing' };
  }

  if (detailsRow.classList.contains('hidden')) {
    return { applied: false, reason: 'hidden' };
  }

  if (error) {
    container.innerHTML = renderPositionsError(error, portfolioUuid);
    return { applied: true };
  }

  const prevKey = container.dataset.sortKey;
  const prevDir = container.dataset.sortDir;

  container.innerHTML = renderPositionsTableInline(positions);

  if (prevKey) container.dataset.sortKey = prevKey;
  if (prevDir) container.dataset.sortDir = prevDir;

  restoreSortAndInit(container, root, portfolioUuid);
  return { applied: true };
}

export function flushPendingPositions(root: QueryRoot | null | undefined, portfolioUuid: string): boolean {
  const pending = pendingPortfolioUpdates.get(portfolioUuid);
  if (!pending) return false;

  const result = applyPortfolioPositionsToDom(
    root,
    portfolioUuid,
    pending.positions,
    pending.error
  );
  if (result.applied) {
    pendingPortfolioUpdates.delete(portfolioUuid);
  }
  return result.applied;
}

export function flushAllPendingPositions(root: QueryRoot | null | undefined): boolean {
  let appliedAny = false;
  for (const [portfolioUuid] of pendingPortfolioUpdates) {
    if (flushPendingPositions(root, portfolioUuid)) {
      appliedAny = true;
    }
  }
  return appliedAny;
}

function schedulePendingRetry(root: QueryRoot | null | undefined, portfolioUuid: string): void {
  const meta: PendingRetryMeta = pendingRetryMetaMap.get(portfolioUuid) ?? {
    attempts: 0,
    timer: null,
  };

  if (meta.timer) {
    return;
  }

  meta.timer = setTimeout(() => {
    meta.timer = null;
    meta.attempts += 1;

    const success = flushPendingPositions(root, portfolioUuid);
    if (success || meta.attempts >= PENDING_MAX_ATTEMPTS) {
      pendingRetryMetaMap.delete(portfolioUuid);
      if (!success) {
        pendingPortfolioUpdates.delete(portfolioUuid);
      }
    } else {
      schedulePendingRetry(root, portfolioUuid);
    }
  }, PENDING_RETRY_INTERVAL);

  pendingRetryMetaMap.set(portfolioUuid, meta);
}

/**
 * Handler für Kontodaten-Updates (Accounts, inkl. FX).
 * @param update Die empfangenen Kontodaten (mit currency_code, orig_balance, balance(EUR)).
 * @param root Das Root-Element des Dashboards.
 */
export function handleAccountUpdate(
  update: AccountSummary[] | null | undefined,
  root: QueryRoot | null | undefined,
): void {
  console.log('updateConfigsWS: Kontodaten-Update erhalten:', update);
  const updatedAccounts = Array.isArray(update) ? update : [];

  if (!root) {
    return;
  }

  // Tabellen aktualisieren (EUR + FX)
  updateAccountTable(updatedAccounts, root);

  // Portfolios aus aktueller Tabelle lesen (für Total-Neuberechnung)
  const portfolioTable = root.querySelector<HTMLTableElement>('.portfolio-table table');
  const portfolios = portfolioTable
    ? Array.from(
        portfolioTable.querySelectorAll<HTMLTableRowElement>('tbody tr:not(.footer-row)'),
      ).map(row => {
        // Spalten: Name | position_count | current_value | gain_abs | gain_pct
        const currentValueCell = row.cells.item(2);
        const textContent = currentValueCell?.textContent ?? '';
        const numeric = parseFloat(
          textContent.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''),
        );
        return {
          current_value: Number.isFinite(numeric) ? numeric : 0,
        };
      })
    : [];

  updateTotalWealth(updatedAccounts, portfolios, root);
}

/**
 * Aktualisiert die Tabellen mit den Kontodaten (EUR + FX).
 * @param {Array} accounts - Alle Kontodaten.
 * @param {HTMLElement} root - Root-Element.
 */
function updateAccountTable(accounts: AccountSummary[], root: QueryRoot): void {
  const eurContainer = root.querySelector<HTMLElement>('.account-table');
  const fxContainer = root.querySelector<HTMLElement>('.fx-account-table');

  const eurAccounts = accounts.filter(account => (account.currency_code || 'EUR') === 'EUR');
  const fxAccounts = accounts.filter(account => (account.currency_code || 'EUR') !== 'EUR');

  if (eurContainer) {
    eurContainer.innerHTML = makeTable(
      eurAccounts,
      [
        { key: 'name', label: 'Name' },
        { key: 'balance', label: 'Kontostand (EUR)', align: 'right' },
      ],
      ['balance'],
    );
  } else {
    console.warn('updateAccountTable: .account-table nicht gefunden.');
  }

  if (fxContainer) {
    fxContainer.innerHTML = makeTable(
      fxAccounts.map(account => {
        const origBalance = account.orig_balance;
        const hasOrigBalance = typeof origBalance === 'number' && Number.isFinite(origBalance);
        const currencyCode = toNonEmptyString(account.currency_code);
        const amountLabel = hasOrigBalance
          ? origBalance.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : null;
        const fxDisplay = amountLabel
          ? currencyCode
            ? `${amountLabel}\u00A0${currencyCode}`
            : amountLabel
          : '';

        return {
          ...account,
          fx_display: fxDisplay,
        };
      }),
      [
        { key: 'name', label: 'Name' },
        { key: 'fx_display', label: 'Betrag (FX)' },
        { key: 'balance', label: 'EUR', align: 'right' },
      ],
      ['balance'],
    );
  } else if (fxAccounts.length) {
    console.warn('updateAccountTable: .fx-account-table nicht gefunden, obwohl FX-Konten vorhanden sind.');
  }
}

/**
 * Handler für Depot-Updates (aggregierte Portfolio-Werte).
 * Ersetzt die bisherige komplette Tabellen-Neuerstellung durch ein gezieltes Patchen
 * der vorhandenen expandierbaren Tabelle (gebaut in overview.js).
 */
export function handlePortfolioUpdate(
  update: PortfolioUpdatePayload[] | null | undefined,
  root: QueryRoot | null | undefined,
): void {
  if (!Array.isArray(update)) {
    console.warn('handlePortfolioUpdate: Update ist kein Array:', update);
    return;
  }

  try {
    console.debug('handlePortfolioUpdate: payload=', update);
  } catch {
    // no-op for browsers without console.debug
  }

  if (!root) {
    return;
  }

  // Tabelle finden (neuer Selektor unterstützt beide Varianten)
  const table =
    root.querySelector<HTMLTableElement>('.portfolio-table table') ||
    root.querySelector<HTMLTableElement>('table.expandable-portfolio-table');
  if (!table) {
    const overviewHost = root.querySelector('.portfolio-table');
    const detailViewActive =
      !overviewHost &&
      (root.querySelector('.security-range-selector') ||
        root.querySelector('.security-detail-placeholder'));

    if (detailViewActive) {
      console.debug(
        'handlePortfolioUpdate: Übersicht nicht aktiv – Update wird später angewendet.',
      );
    } else {
      console.warn('handlePortfolioUpdate: Keine Portfolio-Tabelle gefunden.');
    }
    return;
  }

  const tbody = table.tBodies.item(0) ?? table.querySelector('tbody');
  if (!tbody) {
    console.warn('handlePortfolioUpdate: Kein <tbody> in Tabelle.');
    return;
  }

  // Helper Formatierer (lokal oder einfacher Fallback)
  const formatNumberLocal = (val: number): string => {
    if (typeof Intl !== 'undefined') {
      try {
        const locale = typeof navigator !== 'undefined' && navigator.language
          ? navigator.language
          : 'de-DE';
        return new Intl.NumberFormat(locale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(val);
      } catch {
        // fallback below
      }
    }
    const rounded = roundCurrency(val, { fallback: 0 }) ?? 0;
    return rounded.toFixed(2).replace('.', ',');
  };

  // Map: uuid -> Row
  const rowMap = new Map<string, HTMLTableRowElement>();
  const portfolioRows = tbody.querySelectorAll<HTMLTableRowElement>('tr.portfolio-row');
  portfolioRows.forEach(row => {
    const portfolio = row.dataset.portfolio;
    if (portfolio) {
      rowMap.set(portfolio, row);
    }
  });

  let patched = 0;

  const formatPositionCount = (value: number | null | undefined): string => {
    const numeric = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    try {
      return numeric.toLocaleString('de-DE');
    } catch {
      return numeric.toString();
    }
  };

  for (const entry of update) {
    const uuid = entry.uuid;
    if (typeof uuid !== 'string' || !uuid) {
      continue;
    }
    const row = rowMap.get(uuid);
    if (!row) {
      continue;
    }

    if (row.cells.length < 3) {
      continue;
    }

    const posCountCell = row.cells.item(1);
    const curValCell = row.cells.item(2);
    const gainAbsCell = row.cells.item(3);
    const gainPctCell = row.cells.item(4);

    if (!posCountCell || !curValCell) {
      continue;
    }

    // Normalisierung (Full Sync nutzt value/purchase_sum; Price Events current_value/purchase_sum)
    const posCount = toFiniteNumber(entry.position_count ?? entry.count);
    const curVal = toFiniteNumber(entry.current_value ?? entry.value);
    const entryRecord = entry as Record<string, unknown>;
    const performance = normalizePerformancePayload(entryRecord['performance']);
    const gainAbs = typeof performance?.gain_abs === 'number' ? performance.gain_abs : null;
    const gainPct = typeof performance?.gain_pct === 'number' ? performance.gain_pct : null;
    const purchaseRaw = entry.purchase_sum ?? entry.purchaseSum ?? null;
    const purchase = typeof purchaseRaw === 'number' && Number.isFinite(purchaseRaw)
      ? purchaseRaw
      : null;

    const oldCur = parseNumLoose(curValCell.textContent);
    const oldCnt = parseNumLoose(posCountCell.textContent);

    if (oldCnt !== posCount) {
      posCountCell.textContent = formatPositionCount(posCount);
    }
    const hasValue = Number.isFinite(curVal);
    const rowData = {
      fx_unavailable: Boolean(entryRecord['fx_unavailable']),
      current_value: hasValue ? curVal : null,
      performance,
    };
    const rowContext = { hasValue };
    const currentMarkup = formatValue('current_value', rowData.current_value, rowData, rowContext);
    if (Math.abs(oldCur - curVal) >= 0.005 || curValCell.innerHTML !== currentMarkup) {
      curValCell.innerHTML = currentMarkup;
      row.classList.add('flash-update');
      setTimeout(() => {
        row.classList.remove('flash-update');
      }, 800);
    }
    if (gainAbsCell) {
      const gainMarkup = formatValue('gain_abs', gainAbs, rowData, rowContext);
      gainAbsCell.innerHTML = gainMarkup;
      const hasGainPct = typeof gainPct === 'number' && Number.isFinite(gainPct);
      const pctValue = hasGainPct ? gainPct : null;
      gainAbsCell.dataset.gainPct = pctValue != null
        ? `${formatNumberLocal(pctValue)} %`
        : '—';
      gainAbsCell.dataset.gainSign = pctValue != null
        ? pctValue > 0
          ? 'positive'
          : pctValue < 0
            ? 'negative'
            : 'neutral'
        : 'neutral';
    }
    if (gainPctCell) {
      gainPctCell.innerHTML = formatValue('gain_pct', gainPct, rowData, rowContext);
    }

    row.dataset.positionCount = posCount.toString();
    row.dataset.currentValue = hasValue ? curVal.toString() : '';
    row.dataset.purchaseSum = purchase != null ? purchase.toString() : '';
    row.dataset.gainAbs = gainAbs != null ? gainAbs.toString() : '';
    row.dataset.gainPct = gainPct != null ? gainPct.toString() : '';

    patched += 1;
  }

  if (patched === 0) {
    console.debug('handlePortfolioUpdate: Keine passenden Zeilen gefunden / keine Änderungen.');
  } else {
    const patchedLabel = patched.toLocaleString('de-DE');
    console.debug(`handlePortfolioUpdate: ${patchedLabel} Zeile(n) gepatcht.`);
  }

  try {
    updatePortfolioFooter(table);
  } catch (error) {
    console.warn('handlePortfolioUpdate: Fehler bei Summen-Neuberechnung:', error);
  }

  // Total-Wealth neu berechnen (Accounts + Portfolios)
  try {
    const findTable = (...selectors: Array<string | null | undefined>): HTMLTableElement | null => {
      for (const selector of selectors) {
        if (!selector) continue;
        const tableEl = root.querySelector<HTMLTableElement>(selector);
        if (tableEl) return tableEl;
      }
      return null;
    };

    const eurTable = findTable(
      '.account-table table',
      '.accounts-eur-table table',
      '.accounts-table table',
    );
    const fxTable = findTable(
      '.fx-account-table table',
      '.accounts-fx-table table',
    );

    const extractAccounts = (tbl: HTMLTableElement | null, isFx: boolean): Array<{ balance: number }> => {
      if (!tbl) return [];
      const accountRows = tbl.querySelectorAll<HTMLTableRowElement>('tbody tr.account-row');
      const rows = accountRows.length
        ? Array.from(accountRows)
        : Array.from(tbl.querySelectorAll<HTMLTableRowElement>('tbody tr:not(.footer-row)'));

      return rows.map(row => {
        const cell = isFx ? row.cells.item(2) : row.cells.item(1);
        return { balance: parseNumLoose(cell?.textContent) };
      });
    };
    const accounts = [
      ...extractAccounts(eurTable, false),
      ...extractAccounts(fxTable, true),
    ];

    const portfolioDomValues = Array.from(
      table.querySelectorAll<HTMLTableRowElement>('tbody tr.portfolio-row'),
    ).map(row => {
      const currentValueRaw = row.dataset.currentValue;
      const purchaseSumRaw = row.dataset.purchaseSum;
      const currentValue = currentValueRaw ? Number.parseFloat(currentValueRaw) : Number.NaN;
      const purchaseSum = purchaseSumRaw ? Number.parseFloat(purchaseSumRaw) : Number.NaN;
      return {
        current_value: Number.isFinite(currentValue) ? currentValue : 0,
        purchase_sum: Number.isFinite(purchaseSum) ? purchaseSum : 0,
      };
    });

    updateTotalWealth(accounts, portfolioDomValues, root);
  } catch (error) {
    console.warn('handlePortfolioUpdate: Fehler bei Total-Neuberechnung:', error);
  }
}

/**
 * NEU: Handler für Einzel-Positions-Updates (Event: portfolio_positions).
 * @param {{portfolio_uuid: string, positions: Array}} update
 * @param {HTMLElement} root
 */
function normalizePortfolioUuid(payload: PortfolioPositionsUpdatePayload | null | undefined): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const direct = payload.portfolio_uuid;
  if (typeof direct === 'string' && direct) {
    return direct;
  }
  const camelCase = payload.portfolioUuid;
  if (typeof camelCase === 'string' && camelCase) {
    return camelCase;
  }
  return null;
}

function processPortfolioPositionsUpdate(
  update: PortfolioPositionsUpdatePayload | null | undefined,
  root: QueryRoot | null | undefined,
): boolean {
  const portfolioUuid = normalizePortfolioUuid(update);
  if (!portfolioUuid) {
    console.warn('handlePortfolioPositionsUpdate: Ungültiges Update:', update);
    return false;
  }

  const error = update?.error;
  const positions = Array.isArray(update?.positions)
    ? update.positions.filter((pos): pos is PortfolioPositionData => Boolean(pos))
    : [];
  const normalizedPositions = sanitizePositions(positions);

  if (!error) {
    setPortfolioPositions(portfolioUuid, normalizedPositions);
  }

  const result = applyPortfolioPositionsToDom(root, portfolioUuid, normalizedPositions, error);

  if (result.applied) {
    pendingPortfolioUpdates.delete(portfolioUuid);
  } else {
    pendingPortfolioUpdates.set(portfolioUuid, { positions: normalizedPositions, error });
    if (result.reason !== 'hidden') {
      schedulePendingRetry(root, portfolioUuid);
    }
  }

  if (!error && normalizedPositions.length > 0) {
    const securityUuids = Array.from(
      new Set(
        normalizedPositions
          .map(pos => pos.security_uuid)
          .filter((uuid): uuid is string => typeof uuid === 'string' && uuid.length > 0),
      ),
    );

    if (securityUuids.length && typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent<PortfolioPositionsUpdatedEventDetail>(
            PORTFOLIO_POSITIONS_UPDATED_EVENT,
            {
              detail: {
                portfolioUuid,
                securityUuids,
              },
            },
          ),
        );
      } catch (dispatchError) {
        console.warn(
          'handlePortfolioPositionsUpdate: Dispatch des Portfolio-Events fehlgeschlagen',
          dispatchError,
        );
      }
    }
  }

  return true;
}

export function handlePortfolioPositionsUpdate(
  update: PortfolioPositionsUpdatePayload | PortfolioPositionsUpdatePayload[] | null | undefined,
  root: QueryRoot | null | undefined,
): void {
  if (Array.isArray(update)) {
    let handled = false;
    for (const item of update) {
      if (processPortfolioPositionsUpdate(item, root)) {
        handled = true;
      }
    }
    if (!handled && update.length) {
      console.warn('handlePortfolioPositionsUpdate: Kein gültiges Element im Array:', update);
    }
    return;
  }

  processPortfolioPositionsUpdate(update, root);
}

/* ------------------ Hilfsfunktionen (lokal) ------------------ */

function renderPositionsTableInline(positions: PortfolioPositionData[]): string {
  // Konsistenz Push vs Lazy:
  const { renderPositionsTable, applyGainPctMetadata } = getOverviewHelpers();
  try {
    if (typeof renderPositionsTable === 'function') {
      return renderPositionsTable(positions);
    }
  } catch (_) {}

  if (positions.length === 0) {
    return '<div class="no-positions">Keine Positionen vorhanden.</div>';
  }
  const rows = positions.map(position => {
    const performance = normalizePerformanceMetrics(position);

    return {
      name: position.name,
      current_holdings: position.current_holdings,
      purchase_value: position.purchase_value,
      current_value: position.current_value,
      performance,
    };
  });

  // Basis HTML
  const raw = makeTable(
    rows,
    [
      { key: 'name', label: 'Wertpapier' },
      { key: 'current_holdings', label: 'Bestand', align: 'right' },
      { key: 'purchase_value', label: 'Kaufwert', align: 'right' },
      { key: 'current_value', label: 'Aktueller Wert', align: 'right' },
      { key: 'gain_abs', label: '+/-', align: 'right' },
      { key: 'gain_pct', label: '%', align: 'right' }
    ],
    ['purchase_value', 'current_value', 'gain_abs']
  );

  // Sortier-Metadaten wie in overview.js renderPositionsTable injizieren
  try {
    const tpl = document.createElement('template');
    tpl.innerHTML = raw.trim();
    const table = tpl.content.querySelector<HTMLTableElement>('table');
    if (table) {
      table.classList.add('sortable-positions');
      const ths = table.querySelectorAll<HTMLTableCellElement>('thead th');
      const colKeys = ['name', 'current_holdings', 'purchase_value', 'current_value', 'gain_abs', 'gain_pct'];
      ths.forEach((th, i) => {
        const key = colKeys[i];
        if (!key) return;
        th.setAttribute('data-sort-key', key);
        th.classList.add('sortable-col');
      });
      const bodyRows = table.querySelectorAll<HTMLTableRowElement>('tbody tr');
      bodyRows.forEach((tr, idx) => {
        if (tr.classList.contains('footer-row')) {
          return;
        }
        const pos = positions[idx];
        if (pos.security_uuid) {
          tr.dataset.security = pos.security_uuid;
        }
        tr.classList.add('position-row');
      });
      table.dataset.defaultSort = 'name';
      table.dataset.defaultDir = 'asc';
      const gainPctMetadata = applyGainPctMetadata;
      if (gainPctMetadata) {
        try {
          gainPctMetadata(table);
        } catch (err) {
          console.warn('renderPositionsTableInline: applyGainPctMetadata failed', err);
        }
      } else {
        const rows = table.querySelectorAll<HTMLTableRowElement>('tbody tr');
        rows.forEach((row, idx) => {
          if (row.classList.contains('footer-row')) {
            return;
          }
          const gainCell = row.cells.item(4);
          if (!gainCell) {
            return;
          }
          const position = positions[idx];
          const performance = normalizePerformanceMetrics(position);
          const gainPctValue =
            typeof performance?.gain_pct === 'number' &&
            Number.isFinite(performance.gain_pct)
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
        });
      }
      return table.outerHTML;
    }
  } catch (e) {
    console.warn("renderPositionsTableInline: Sortier-Metadaten Injection fehlgeschlagen:", e);
  }
  return raw;
}

function updatePortfolioFooter(table: HTMLTableElement | null): void {
  if (!table) return;
  const { updatePortfolioFooter: helper } = getOverviewHelpers();
  if (typeof helper === 'function') {
    try {
      helper(table);
      return;
    } catch (err) {
      console.warn('updatePortfolioFooter: helper schlug fehl:', err);
    }
  }

  const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr.portfolio-row'));

  const parseDatasetNumber = (value: string | undefined): number | null => {
    if (value === undefined) {
      return null;
    }
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const metrics = rows.reduce(
    (acc, row) => {

      const positionCount = parseDatasetNumber(row.dataset.positionCount);
      if (positionCount != null) {
        acc.sumPositions += positionCount;
      }

      if (row.dataset.fxUnavailable === 'true') {
        acc.fxUnavailable = true;
      }

      if (row.dataset.hasValue !== 'true') {
        acc.incompleteRows += 1;
        return acc;
      }

      acc.valueRows += 1;

      const currentValue = parseDatasetNumber(row.dataset.currentValue);
      const gainAbs = parseDatasetNumber(row.dataset.gainAbs);
      const purchaseSum = parseDatasetNumber(row.dataset.purchaseSum);

      if (currentValue == null || gainAbs == null || purchaseSum == null) {
        acc.incompleteRows += 1;
        return acc;
      }

      acc.sumCurrent += currentValue;
      acc.sumGainAbs += gainAbs;
      acc.sumPurchase += purchaseSum;

      return acc;
    },
    {
      sumCurrent: 0,
      sumGainAbs: 0,
      sumPurchase: 0,
      sumPositions: 0,
      valueRows: 0,
      incompleteRows: 0,
      fxUnavailable: false,
    },
  );

  const totalsComplete = metrics.valueRows > 0 && metrics.incompleteRows === 0;
  const sumGainPct = totalsComplete && metrics.sumPurchase > 0 ? (metrics.sumGainAbs / metrics.sumPurchase) * 100 : null;

  let footer = table.querySelector<HTMLTableRowElement>('tr.footer-row');
  if (!footer) {
    footer = document.createElement('tr');
    footer.className = 'footer-row';
    table.querySelector('tbody')?.appendChild(footer);
  }
  const sumPositionsDisplay = Math.round(metrics.sumPositions).toLocaleString('de-DE');
  const footerRowData = {
    fx_unavailable: metrics.fxUnavailable || !totalsComplete,
    current_value: totalsComplete ? metrics.sumCurrent : null,
    performance: totalsComplete
      ? {
          gain_abs: metrics.sumGainAbs,
          gain_pct: sumGainPct,
          total_change_eur: metrics.sumGainAbs,
          total_change_pct: sumGainPct,
          source: 'aggregated',
          coverage_ratio: 1,
        }
      : null,
  } as Record<string, unknown>;
  const footerContext = { hasValue: totalsComplete };

  const currentValueCell = formatValue('current_value', footerRowData.current_value, footerRowData, footerContext);
  const gainAbsValue = totalsComplete ? metrics.sumGainAbs : null;
  const gainPctValue = totalsComplete ? sumGainPct : null;
  const gainAbsCellMarkup = formatValue('gain_abs', gainAbsValue, footerRowData, footerContext);
  const gainPctCellMarkup = formatValue('gain_pct', gainPctValue, footerRowData, footerContext);

  footer.innerHTML = `
    <td>Summe</td>
    <td class="align-right">${sumPositionsDisplay}</td>
    <td class="align-right">${currentValueCell}</td>
    <td class="align-right">${gainAbsCellMarkup}</td>
    <td class="align-right">${gainPctCellMarkup}</td>
  `;
  const footerGainAbsCell = footer.cells.item(3);
  if (footerGainAbsCell) {
    footerGainAbsCell.dataset.gainPct = totalsComplete && typeof sumGainPct === 'number'
      ? `${formatNumber(sumGainPct)} %`
      : '—';
    footerGainAbsCell.dataset.gainSign = totalsComplete && typeof sumGainPct === 'number'
      ? sumGainPct > 0
        ? 'positive'
        : sumGainPct < 0
          ? 'negative'
          : 'neutral'
      : 'neutral';
  }
  footer.dataset.positionCount = Math.round(metrics.sumPositions).toString();
  footer.dataset.currentValue = totalsComplete ? metrics.sumCurrent.toString() : '';
  footer.dataset.purchaseSum = totalsComplete ? metrics.sumPurchase.toString() : '';
  footer.dataset.gainAbs = totalsComplete ? metrics.sumGainAbs.toString() : '';
  footer.dataset.gainPct = totalsComplete && typeof sumGainPct === 'number' ? sumGainPct.toString() : '';
  footer.dataset.hasValue = totalsComplete ? 'true' : 'false';
  footer.dataset.fxUnavailable = metrics.fxUnavailable || !totalsComplete ? 'true' : 'false';
}

function toFiniteNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatNumber(v: number): string {
  const rounded = roundCurrency(v, { fallback: 0 }) ?? 0;
  return rounded.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function updateTotalWealth(
  accounts: Array<{ balance?: number | null; current_value?: number | null; value?: number | null }> | null | undefined,
  portfolios: Array<{ current_value?: number | null; value?: number | null; purchase_sum?: number | null }> | null | undefined,
  root: QueryRoot | null | undefined,
): void {
  const targetRoot: QueryRoot = root ?? document;

  const accountEntries = Array.isArray(accounts) ? accounts : [];
  const accountSum = accountEntries.reduce((acc, entry) => {
    const candidate = entry.balance ?? entry.current_value ?? entry.value ?? 0;
    return acc + toFiniteNumber(candidate);
  }, 0);

  const portfolioEntries = Array.isArray(portfolios) ? portfolios : [];
  const portfolioSum = portfolioEntries.reduce((acc, entry) => {
    const candidate = entry.current_value ?? entry.value ?? 0;
    return acc + toFiniteNumber(candidate);
  }, 0);

  const totalWealth = accountSum + portfolioSum;

  const headerMeta = targetRoot.querySelector<HTMLElement>('#headerMeta');
  if (!headerMeta) {
    console.warn('updateTotalWealth: #headerMeta nicht gefunden.');
    return;
  }

  const valueElement =
    headerMeta.querySelector<HTMLElement>('strong') ||
    headerMeta.querySelector<HTMLElement>('.total-wealth-value');
  if (valueElement) {
    valueElement.textContent = `${formatNumber(totalWealth)}\u00A0€`;
  } else {
    headerMeta.textContent = `💰 Gesamtvermögen: ${formatNumber(totalWealth)}\u00A0€`;
  }

  headerMeta.dataset.totalWealthEur = totalWealth.toString();
}

/**
 * HINWEIS (2025-09):
 * Die frühere Funktion updatePortfolioTable (vollständiger Neuaufbau der Depot-Tabelle)
 * wurde durch inkrementelles Patchen via handlePortfolioUpdate + Lazy-Load der Positions-
 * daten ersetzt. Alte Implementierung entfernt, um doppelte Logik und Render-Flashes
 * zu vermeiden.
 *
 * Falls noch Referenzen auf updatePortfolioTable existieren, bitte auf handlePortfolioUpdate
 * umstellen. (Das Dashboard-Modul ruft bereits nur noch _doRender -> handlePortfolioUpdate auf.)
 */
// Entfernte Legacy-Funktion:
// function updatePortfolioTable(...) { /* veraltet, entfernt */ }

// ==== Last File Update Handler (canonical) ====
// (Ändere zu export function, damit unten kein Sammel-Export nötig ist)
export function handleLastFileUpdate(
  update: string | { last_file_update?: string | null } | null | undefined,
  root: QueryRoot | null | undefined,
): void {
  const resolvedUpdate = typeof update === 'string' ? update : update?.last_file_update;
  const value = toNonEmptyString(resolvedUpdate) ?? '';

  if (!root) {
    console.warn('handleLastFileUpdate: root fehlt');
    return;
  }

  // Bevorzugt Footer-Karte, sonst erste passende Stelle
  let el =
    root.querySelector<HTMLElement>('.footer-card .last-file-update') ||
    root.querySelector<HTMLElement>('.last-file-update');

  if (!el) {
    // Fallback: existierende Meta-Hosts durchsuchen
    const metaHost =
      root.querySelector<HTMLElement>('.footer-card .meta') ||
      root.querySelector<HTMLElement>('#headerMeta') ||
      root.querySelector<HTMLElement>('.header-card .meta') ||
      root.querySelector<HTMLElement>('.header-card');
    if (!metaHost) {
      console.warn('handleLastFileUpdate: Kein Einfügepunkt gefunden.');
      return;
    }
    el = document.createElement('div');
    el.className = 'last-file-update';
    metaHost.appendChild(el);
  }

  // Format abhängig vom Ort (Footer behält <strong>)
  if (el.closest('.footer-card')) {
    el.innerHTML = value
      ? `📂 Letzte Aktualisierung der Datei: <strong>${value}</strong>`
      : '📂 Letzte Aktualisierung der Datei: <strong>Unbekannt</strong>';
  } else {
    // Header/Meta-Version (schlichter Text)
    el.textContent = value
      ? `📂 Letzte Aktualisierung: ${value}`
      : '📂 Letzte Aktualisierung: Unbekannt';
  }
}
/// END handleLastFileUpdate (canonical)

/**
 * NEUER HELPER (Änderung 8):
 * Re-applied die gespeicherte Sortierung einer Positions-Tabelle.
 * Liest container.dataset.sortKey / sortDir oder Default-Werte vom <table>.
 * Nutzt sortTableRows(..., true) für Positions-Mapping.
 * @param {HTMLElement} containerEl .positions-container
 */
export function reapplyPositionsSort(containerEl: HTMLElement | null | undefined): void {
  if (containerEl == null) {
    return;
  }
  const table = containerEl.querySelector<HTMLTableElement>('table.sortable-positions');
  if (table == null) {
    return;
  }
  const key = containerEl.dataset.sortKey || table.dataset.defaultSort || 'name';
  const dirValue = containerEl.dataset.sortDir || table.dataset.defaultDir || 'asc';
  const direction: SortDirection = dirValue === 'desc' ? 'desc' : 'asc';
  // Persistiere (falls erstmalig)
  containerEl.dataset.sortKey = key;
  containerEl.dataset.sortDir = direction;
  sortTableRows(table, key, direction, true);
}

export const __TEST_ONLY__ = {
  getPortfolioPositionsCacheSnapshot: getPortfolioPositionsSnapshot,
  clearPortfolioPositionsCache: clearAllPortfolioPositions,
  getPendingUpdateCount(): number {
    return pendingPortfolioUpdates.size;
  },
  queuePendingUpdate(
    portfolioUuid: string,
    positions: PortfolioPositionData[],
    error?: unknown,
  ): void {
    pendingPortfolioUpdates.set(portfolioUuid, { positions, error });
  },
  clearPendingUpdates(): void {
    pendingPortfolioUpdates.clear();
    pendingRetryMetaMap.clear();
  },
};

// === Globale / modulweite Utilities ===
function parseNumLoose(txt: string | null | undefined): number {
  if (txt == null) return 0;
  const rawText = txt;
  return parseFloat(
    rawText
      .replace(/\u00A0/g, ' ')
      .replace(/[€%]/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/[^\d.-]/g, '')
  ) || 0;
}
