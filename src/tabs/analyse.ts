/**
 * Analyse tab renderer for backdating UI.
 */

import { renderLineChart, updateLineChart, type LineChartOptions } from '../content/charting';
import { createHeaderCard, formatNumber } from '../content/elements';
import type {
  DailyWealthRecord,
  DailyWealthResponse,
  DailyWealthScopeRecord,
  DailyWealthSlices,
} from '../data/api';
import {
  getDailyWealthState,
  loadDailyWealth,
  type DailyWealthSelection,
  type DailyWealthState,
} from '../data/dailyWealthStore';
import type { HomeAssistant } from '../types/home-assistant';
import type { PanelConfigLike } from './types';

type SelectionMode = 'date' | 'range';
type PerformanceRowKey =
  | 'startValue'
  | 'endValue'
  | 'marketGain'
  | 'realizedGains'
  | 'unrealizedGains'
  | 'dividends'
  | 'interest'
  | 'ertraege'
  | 'fees'
  | 'taxes'
  | 'netTransfers'
  | 'neutral';

type PerformanceBreakdown = Record<PerformanceRowKey, number>;

const DEFAULT_RANGE_DAYS = 30;

let lastSelection: DailyWealthSelection | null = null;
let lastMode: SelectionMode = 'range';
let lastWealthData: DailyWealthResponse | null = null;
const selectedScopeKeys = new Set<string>();
let pendingLoadTimer: number | null = null;

type WealthSeries = {
  key: string;
  label: string;
  color: string;
  points: { date: string; value: number }[];
};

type ChartContainerWithState = HTMLElement & {
  __chartState?: {
    range?: {
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
      boundedWidth: number;
      boundedHeight: number;
    } | null;
    margin?: { top: number; right: number; bottom: number; left: number };
  };
};

const SLICE_COLORS = [
  '#1976d2',
  '#c2185b',
  '#7b1fa2',
  '#00796b',
  '#ef6c00',
  '#5d4037',
  '#512da8',
  '#0097a7',
] as const;

function toIsoDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${String(year)}-${month}-${day}`;
}

function buildDefaultSelection(): DailyWealthSelection {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (DEFAULT_RANGE_DAYS - 1));
  return {
    range: {
      start: toIsoDateString(start),
      end: toIsoDateString(end),
    },
    includeSlices: true,
    includeScopes: true,
  };
}

function renderCoverageBadges(records: DailyWealthRecord[]): string {
  if (!records.length) {
    return '';
  }
  const fxIssue = records.some((record) => record.fx_coverage_ratio != null && record.fx_coverage_ratio < 1);
  const priceIssue = records.some((record) => record.price_coverage_ratio != null && record.price_coverage_ratio < 1);
  const staleIssue = records.some((record) => record.stale_price);

  const badges: string[] = [];
  if (fxIssue) {
    badges.push('<span class="meta-badge meta-badge--warning" title="Wechselkurse fehlen teilweise">FX-Abdeckung</span>');
  }
  if (priceIssue) {
    badges.push('<span class="meta-badge meta-badge--warning" title="Preisdaten unvollständig">Preisabdeckung</span>');
  }
  if (staleIssue) {
    badges.push('<span class="meta-badge meta-badge--neutral" title="Letzte Kurse sind veraltet">Stale Kurse</span>');
  }

  if (!badges.length) {
    return '<span class="meta-badge meta-badge--positive">Volle Abdeckung</span>';
  }

  return `<span class="meta-badges">${badges.join('')}</span>`;
}

function formatCurrency(value: number): string {
  return `${formatNumber(value)}&nbsp;€`;
}

function sumField(records: DailyWealthRecord[], key: keyof DailyWealthRecord): number {
  return records.reduce((sum, record) => {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return sum + value;
    }
    return sum;
  }, 0);
}

function setStatus(card: HTMLElement, status: DailyWealthState['status'], message = ''): void {
  const statusEl = card.querySelector<HTMLElement>('#analyse-status');
  if (!statusEl) {
    return;
  }
  statusEl.dataset.state = status;
  if (status === 'loading') {
    statusEl.textContent = 'Lade Vermögensdaten …';
  } else if (status === 'error') {
    statusEl.textContent = message || 'Daten konnten nicht geladen werden.';
  } else if (status === 'loaded') {
    statusEl.textContent = '';
  } else {
    statusEl.textContent = '';
  }
}

function renderTotals(
  card: HTMLElement,
  selectionLabel: string,
  records: DailyWealthRecord[],
): void {
  const valueEl = card.querySelector<HTMLElement>('#analyse-total-wealth');
  const coverageEl = card.querySelector<HTMLElement>('#analyse-coverage');
  const selectionEl = card.querySelector<HTMLElement>('#analyse-selection-label');

  if (!valueEl || !coverageEl || !selectionEl) {
    return;
  }

  selectionEl.textContent = selectionLabel;

  if (!records.length) {
    valueEl.innerHTML = '—';
    coverageEl.innerHTML = '';
    return;
  }

  const latest = records[records.length - 1];
  valueEl.innerHTML = formatCurrency(latest.total_wealth_eur);
  coverageEl.innerHTML = renderCoverageBadges(records);
}



function renderMetrics(card: HTMLElement, records: DailyWealthRecord[]): void {
  const container = card.querySelector<HTMLElement>('.analyse-metrics-grid');
  if (!container) return;

  if (!records.length) {
    container.innerHTML = '<div class="metrics-empty">Keine Daten verfügbar</div>';
    return;
  }

  const bd = derivePerformance(records);
  if (!bd) return;

  // const rows removed - direct usage via mkRow


  // Let's stick to the requested layout: clear structure.
  // We can group Cashflows and Performance.

  const mkRow = (label: string, value: number | string, cls = '', id = ''): string => `
    <div class="metric-row ${cls}" ${id ? `id="${id}"` : ''}>
      <span class="metric-label">${label}</span>
      <span class="metric-value">${typeof value === 'number' ? formatCurrency(value) : value}</span>
    </div>`;

  const html = `
    <div class="metrics-section">
      <h3>Performance-Berechnung</h3>
      ${mkRow('Anfangswert', bd.startValue, '', 'perf-startValue')}
      ${mkRow('Kurserfolge (Gesamt)', bd.marketGain, 'sub-header')}
      ${mkRow('&nbsp;&nbsp;↳ Realisiert', bd.realizedGains, 'indent')}
      ${mkRow('&nbsp;&nbsp;↳ Nicht realisiert', bd.unrealizedGains, 'indent')}
      ${mkRow('Dividenden', bd.dividends)}
      ${mkRow('Zinsen', bd.interest)}
      ${mkRow('Gebühren', bd.fees)}
      ${mkRow('Steuern', bd.taxes)}
      ${mkRow('Performanceneutrale Bew.', bd.neutral + bd.netTransfers)}
      ${mkRow('Endwert', bd.endValue, 'highlight', 'perf-endValue')}
    </div>
  `;

  container.innerHTML = html;
}


function debounceLoad(
  callback: () => void,
  delay = 200,
): void {
  if (pendingLoadTimer != null) {
    window.clearTimeout(pendingLoadTimer);
  }
  pendingLoadTimer = window.setTimeout(() => {
    pendingLoadTimer = null;
    callback();
  }, delay);
}

function buildScopeKey(type: DailyWealthScopeRecord['scope_type'] | null, id: string | null): string | null {
  if (!type || !id) {
    return null;
  }
  return `${type}:${id}`;
}

function ensureScopeSelection(slices: DailyWealthSlices | undefined): void {
  if (!slices) {
    selectedScopeKeys.clear();
    return;
  }

  const availableKeys = new Set<string>();
  const addKeys = (records: DailyWealthScopeRecord[], type: 'account' | 'portfolio') => {
    records.forEach((record) => {
      const key = buildScopeKey(type, record.scope_id);
      if (key) {
        availableKeys.add(key);
      }
    });
  };
  addKeys(slices.accounts, 'account');
  addKeys(slices.portfolios, 'portfolio');

  if (selectedScopeKeys.size === 0) {
    availableKeys.forEach((key) => selectedScopeKeys.add(key));
  } else {
    Array.from(selectedScopeKeys).forEach((key) => {
      if (!availableKeys.has(key)) {
        selectedScopeKeys.delete(key);
      }
    });
  }
}

function renderScopeFilters(card: HTMLElement, slices: DailyWealthSlices | undefined): void {
  const existing = card.querySelector<HTMLElement>('.analyse-scope-filters');
  if (!existing) {
    return;
  }
  const container = existing.cloneNode(false) as HTMLElement;
  existing.replaceWith(container);
  container.innerHTML = '';
  const hasAccounts = slices ? slices.accounts.length > 0 : false;
  const hasPortfolios = slices ? slices.portfolios.length > 0 : false;
  if (!slices || (!hasAccounts && !hasPortfolios)) {
    container.innerHTML = '<p class="table-note" role="note"><span class="table-note__icon" aria-hidden="true">ℹ️</span><span>Keine Slices verfügbar.</span></p>';
    return;
  }

  const renderGroup = (
    title: string,
    records: DailyWealthScopeRecord[],
    type: 'account' | 'portfolio',
  ): string => {
    const uniqueRecords = new Map<string, DailyWealthScopeRecord>();
    records.forEach((record) => {
      const key = buildScopeKey(type, record.scope_id);
      if (key && !uniqueRecords.has(key)) {
        uniqueRecords.set(key, record);
      }
    });

    if (uniqueRecords.size === 0) {
      return '';
    }

    const items = Array.from(uniqueRecords.values())
      .map((record) => {
        const key = buildScopeKey(type, record.scope_id);
        if (!key) {
          return '';
        }
        const checked = selectedScopeKeys.has(key) ? 'checked' : '';
        const label = record.scope_name ?? record.scope_id;
        return `
          <label class="scope-option">
            <input type="checkbox" data-scope-key="${key}" ${checked}>
            <span>${label}</span>
          </label>
        `;
      })
      .join('');
    return `<div class="scope-group"><div class="scope-title">${title}</div>${items}</div>`;
  };

  container.innerHTML = `
    ${renderGroup('Konten', slices.accounts, 'account')}
    ${renderGroup('Depots', slices.portfolios, 'portfolio')}
  `;

  container.addEventListener('change', (event) => {
    const input = (event.target as HTMLElement | null)?.closest<HTMLInputElement>('input[type="checkbox"][data-scope-key]');
    if (!input || !input.dataset.scopeKey) {
      return;
    }
    const { scopeKey } = input.dataset;
    if (!scopeKey) {
      return;
    }
    if (input.checked) {
      selectedScopeKeys.add(scopeKey);
    } else {
      selectedScopeKeys.delete(scopeKey);
    }
    const chartCard = card.closest<HTMLElement>('#analyse-chart-card');
    if (chartCard && lastWealthData) {
      renderWealthChart(chartCard, lastWealthData);
    }
  });
}

function toTimestamp(value: string | number): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildSeries(
  data: DailyWealthResponse,
): WealthSeries[] {
  const palette = Array.from(SLICE_COLORS);
  const totalSeries: WealthSeries = {
    key: 'total',
    label: 'Gesamtvermögen',
    color: '#2c3e50',
    points: data.records.map((record) => ({
      date: record.date,
      value: record.total_wealth_eur,
    })),
  };

  const sliceSeries: WealthSeries[] = [];
  const sliceIndex = new Map<string, Map<string, DailyWealthScopeRecord>>();
  const addToIndex = (records: DailyWealthScopeRecord[], type: 'account' | 'portfolio') => {
    records.forEach((record) => {
      const key = buildScopeKey(type, record.scope_id);
      if (!key) {
        return;
      }
      if (!sliceIndex.has(key)) {
        sliceIndex.set(key, new Map());
      }
      sliceIndex.get(key)?.set(record.date, record);
    });
  };

  if (data.slices) {
    addToIndex(data.slices.accounts, 'account');
    addToIndex(data.slices.portfolios, 'portfolio');
  }

  sliceIndex.forEach((byDate, key) => {
    if (!selectedScopeKeys.has(key)) {
      return;
    }
    const color = palette.shift() ?? '#607d8b';
    const isAccount = key.startsWith('account:');
    const scopeId = key.split(':')[1] ?? '';
    const labelPrefix = isAccount ? 'Konto' : 'Depot';
    const nameFallback = `${labelPrefix} ${scopeId}`.trim();
    const firstIterator = byDate.values().next();
    const firstRecord = firstIterator.done ? undefined : firstIterator.value;
    const scopeName = firstRecord?.scope_name ?? nameFallback;
    sliceSeries.push({
      key,
      label: scopeName,
      color,
      points: data.records
        .map((base) => {
          const record = byDate.get(base.date);
          if (!record || !Number.isFinite(record.total_wealth_eur)) {
            return null;
          }
          return { date: base.date, value: record.total_wealth_eur };
        })
        .filter((entry): entry is { date: string; value: number } => Boolean(entry)),
    });
  });

  return [totalSeries, ...sliceSeries];
}

function renderSliceSeries(
  chartContainer: ChartContainerWithState,
  series: WealthSeries[],
): void {
  const state = chartContainer.__chartState;
  const svg = chartContainer.querySelector<SVGSVGElement>('svg');
  if (!state || !state.range || !state.margin || !svg) {
    return;
  }
  const { range, margin } = state;
  svg.querySelectorAll('.analyse-slice-series').forEach((node) => {
    node.remove();
  });

  series
    .filter((entry) => entry.key !== 'total')
    .forEach((entry) => {
      const path = entry.points
        .map((point, index) => {
          const timestamp = toTimestamp(point.date);
          if (timestamp == null || !Number.isFinite(point.value)) {
            return null;
          }
          const ratioX = range.maxX === range.minX ? 0.5 : (timestamp - range.minX) / (range.maxX - range.minX);
          const ratioY = range.maxY === range.minY ? 0.5 : (point.value - range.minY) / (range.maxY - range.minY);
          const x = margin.left + ratioX * range.boundedWidth;
          const y = margin.top + (1 - ratioY) * range.boundedHeight;
          const cmd = `${index === 0 ? 'M' : 'L'}${String(x)},${String(y)}`;
          return cmd;
        })
        .filter(Boolean)
        .join(' ');

      if (!path) {
        return;
      }

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'analyse-slice-series');
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      line.setAttribute('d', path);
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke', entry.color);
      line.setAttribute('stroke-width', '2');
      line.setAttribute('stroke-linejoin', 'round');
      line.setAttribute('stroke-linecap', 'round');
      g.appendChild(line);
      svg.appendChild(g);
    });
}

function renderWealthChart(chartCard: HTMLElement, data: DailyWealthResponse): void {
  const container = chartCard.querySelector<HTMLElement>('.line-chart-container');
  if (!container) {
    return;
  }

  const series = buildSeries(data);
  const totalSeries = series[0];

  if (!totalSeries.points.length) {
    container.innerHTML = `
      <div class="history-placeholder" data-state="empty">
        <p>Keine Chart-Daten verfügbar.</p>
      </div>
    `;
    return;
  }

  const chartOptions: LineChartOptions = {
    series: totalSeries.points,
    xAccessor: (entry: unknown) => (entry as { date: string }).date,
    yAccessor: (entry: unknown) => (entry as { value: number }).value,
    xFormatter: (value: number) => {
      const date = new Date(value);
      return Number.isFinite(date.getTime()) ? date.toLocaleDateString('de-DE') : '';
    },
    yFormatter: (value: number) => formatNumber(value),
    color: totalSeries.color,
    areaColor: 'rgba(44, 62, 80, 0.12)',
  };

  const existing = container as ChartContainerWithState;
  let chartHost: ReturnType<typeof renderLineChart> | null = existing as unknown as ReturnType<typeof renderLineChart> | null;

  if (!existing.__chartState || !container.querySelector('svg')) {
    container.innerHTML = '';
    chartHost = renderLineChart(container, chartOptions);
  } else {
    updateLineChart(existing as unknown as ReturnType<typeof renderLineChart>, chartOptions);
    chartHost = existing as unknown as ReturnType<typeof renderLineChart>;
  }

  if (chartHost) {
    renderSliceSeries(chartHost as unknown as ChartContainerWithState, series);
  }
}


function derivePerformance(records: DailyWealthRecord[]): PerformanceBreakdown | null {
  if (!records.length) {
    return null;
  }
  const startValue = records[0]?.total_wealth_eur ?? 0;
  const endValue = records[records.length - 1]?.total_wealth_eur ?? 0;
  const dividends = sumField(records, 'dividends_eur');
  const interest = sumField(records, 'interest_eur');
  const ertraege = dividends + interest;
  const fees = -Math.abs(sumField(records, 'fees_eur'));
  const taxes = -Math.abs(sumField(records, 'taxes_eur'));
  const netTransfers = sumField(records, 'inbound_transfers_eur') - sumField(records, 'outbound_transfers_eur');
  const neutral = sumField(records, 'performance_neutral_movements');

  const marketGain = endValue - startValue - ertraege - fees - taxes - netTransfers - neutral;

  const realizedGains = sumField(records, 'realized_gains_eur');
  const unrealizedGains = marketGain - realizedGains;

  return {
    startValue,
    endValue,
    marketGain,
    realizedGains,
    unrealizedGains,
    dividends,
    interest,
    ertraege,
    fees,
    taxes,
    netTransfers,
    neutral,
  };
}

// renderPerformance removed, merged into renderMetrics

function readSelectionFromInputs(card: HTMLElement): DailyWealthSelection | null {
  const modeInput = card.querySelector<HTMLInputElement>('input[name="analyse-range-mode"]:checked');
  const mode = (modeInput?.value === 'date' ? 'date' : 'range') as SelectionMode;
  lastMode = mode;

  const singleDateInput = card.querySelector<HTMLInputElement>('#analyse-date-single');
  const startInput = card.querySelector<HTMLInputElement>('#analyse-date-start');
  const endInput = card.querySelector<HTMLInputElement>('#analyse-date-end');

  const parseDate = (value: string | null | undefined): string | null => {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length === 10 ? trimmed : null;
  };

  if (mode === 'date') {
    let date = parseDate(singleDateInput?.value);
    if (!date) {
      // Fallback: Use start date or today if switching to date mode with empty input
      const fallback = parseDate(startInput?.value) ?? new Date().toISOString().slice(0, 10);
      date = fallback;
      if (singleDateInput) {
        singleDateInput.value = fallback; // Auto-fill the input
      }
    }
    return { date, includeSlices: true, includeScopes: true };
  }

  let start = parseDate(startInput?.value);
  let end = parseDate(endInput?.value);

  if (!start || !end) {
    // Fallback: Use today's date if inputs are empty when switching to range mode
    const today = new Date().toISOString().slice(0, 10);
    if (!start) start = today;
    if (!end) end = today;

    if (startInput && !startInput.value) startInput.value = start;
    if (endInput && !endInput.value) endInput.value = end;
  }

  if (!start || !end) {
    return null;
  }
  if (start > end) {
    return { range: { start: end, end: start }, includeSlices: true, includeScopes: true };
  }
  return { range: { start, end }, includeSlices: true, includeScopes: true };
}

function applySelectionToInputs(card: HTMLElement, selection: DailyWealthSelection): void {
  const mode = selection.date ? 'date' : 'range';
  const dateRadio = card.querySelector<HTMLInputElement>('input[name="analyse-range-mode"][value="date"]');
  const rangeRadio = card.querySelector<HTMLInputElement>('input[name="analyse-range-mode"][value="range"]');
  if (dateRadio && rangeRadio) {
    dateRadio.checked = mode === 'date';
    rangeRadio.checked = mode === 'range';
  }

  const singleDateInput = card.querySelector<HTMLInputElement>('#analyse-date-single');
  const startInput = card.querySelector<HTMLInputElement>('#analyse-date-start');
  const endInput = card.querySelector<HTMLInputElement>('#analyse-date-end');

  if (singleDateInput && selection.date) {
    singleDateInput.value = selection.date;
  }
  if (startInput && endInput && selection.range) {
    startInput.value = selection.range.start;
    endInput.value = selection.range.end;
  }

  const rangeFields = card.querySelector<HTMLElement>('.analyse-range-fields');
  const singleField = card.querySelector<HTMLElement>('.analyse-single-field');
  if (rangeFields && singleField) {
    if (mode === 'date') {
      rangeFields.style.display = 'none';
      singleField.style.display = '';
    } else {
      rangeFields.style.display = '';
      singleField.style.display = 'none';
    }
  }
}

function selectionLabel(selection: DailyWealthSelection): string {
  if (selection.date) {
    return `Tag: ${selection.date}`;
  }
  if (selection.range) {
    return `Zeitraum: ${selection.range.start} – ${selection.range.end}`;
  }
  return '';
}

async function loadAndRender(
  card: HTMLElement,
  chartCard: HTMLElement | null,
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
  selection: DailyWealthSelection,
): Promise<void> {
  setStatus(card, 'loading');
  const state = await loadDailyWealth(hass, panelConfig, selection);

  if (state.status === 'error') {
    setStatus(card, 'error', state.error ?? undefined);
    if (chartCard) {
      const chartContainer = chartCard.querySelector('.line-chart-container');
      if (chartContainer) {
        chartContainer.replaceChildren();
      }
    }
    return;
  }

  const data = state.data;
  if (!data || !Array.isArray(data.records) || data.records.length === 0) {
    renderTotals(card, selectionLabel(selection), []);
    renderMetrics(card, []);
    setStatus(card, 'loaded', 'Keine Daten für den gewählten Zeitraum.');
    if (chartCard) {
      const chartContainer = chartCard.querySelector('.line-chart-container');
      if (chartContainer) {
        chartContainer.replaceChildren();
      }
    }
    return;
  }

  lastSelection = selection;
  lastWealthData = data;
  ensureScopeSelection(data.slices);

  renderTotals(card, selectionLabel(selection), data.records);
  renderMetrics(card, data.records);

  if (chartCard) {
    renderScopeFilters(chartCard, data.slices);
    renderWealthChart(chartCard, data);
  }
  setStatus(card, 'loaded');
}

function initRangeCard(
  card: HTMLElement,
  // performanceCard removed
  chartCard: HTMLElement | null,
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
): void {
  const applyButton = card.querySelector<HTMLButtonElement>('#analyse-range-apply');
  const modeRadios = card.querySelectorAll<HTMLInputElement>('input[name="analyse-range-mode"]');

  const selection = lastSelection ?? getDailyWealthState().selection ?? buildDefaultSelection();
  applySelectionToInputs(card, selection);

  const handleModeChange = (): void => {
    const currentSelection = readSelectionFromInputs(card);
    if (currentSelection) {
      applySelectionToInputs(card, currentSelection);
    }
  };

  modeRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      handleModeChange();
      const currentSelection = readSelectionFromInputs(card);
      if (currentSelection) {
        debounceLoad(() => {
          applySelectionToInputs(card, currentSelection);
          void loadAndRender(card, chartCard, hass, panelConfig, currentSelection);
        });
      }
    });
  });

  if (applyButton) {
    applyButton.addEventListener('click', () => {
      const currentSelection = readSelectionFromInputs(card) ?? selection;
      applySelectionToInputs(card, currentSelection);
      debounceLoad(() => {
        void loadAndRender(card, chartCard, hass, panelConfig, currentSelection);
      });
    });
  }

  const dateInputs = card.querySelectorAll<HTMLInputElement>('input[type="date"]');
  dateInputs.forEach((input) => {
    input.addEventListener('change', () => {
      const currentSelection = readSelectionFromInputs(card);
      if (!currentSelection) {
        return;
      }
      debounceLoad(() => {
        void loadAndRender(card, chartCard, hass, panelConfig, currentSelection);
      });
    });
  });

  // Initial load after DOM is ready
  void loadAndRender(card, chartCard, hass, panelConfig, selection);
}

export function renderAnalyse(
  root: HTMLElement,
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
): string {
  const headerMeta = `
    <div class="header-meta-row">
      <span>Vermögensverlauf &amp; Cashflows (Backdating)</span>
    </div>
  `;
  const headerCard = createHeaderCard('Analyse', headerMeta);

  const style = `
    <style>
      .analyse-metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid var(--divider-color, #e0e0e0);
      }
      .metrics-section h3 {
        margin: 0 0 0.75rem 0;
        font-size: 0.9rem;
        font-weight: 500;
        text-transform: uppercase;
        color: var(--secondary-text-color, #727272);
        letter-spacing: 0.05em;
      }
      .metric-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.25rem 0;
        font-size: 0.95rem;
      }
      .metric-label {
        color: var(--primary-text-color, #212121);
      }
      .metric-value {
        font-weight: 500;
        font-family: var(--code-font-family, monospace); /* Tabular figures preferred */
      }
      .metric-row.highlight {
        font-weight: 600;
        color: var(--primary-color, #03a9f4);
      }
      .metric-row.highlight .metric-value {
        font-weight: 700;
      }
      .metrics-empty {
        text-align: center;
        color: var(--secondary-text-color);
        padding: 2rem;
        font-style: italic;
      }
      @media (max-width: 600px) {
        .analyse-metrics-grid {
          grid-template-columns: 1fr;
          gap: 1rem;
        }
      }
    </style>
  `;

  const rangeCard = `
    <div class="card" id="analyse-range-card" data-section="range">
      <h2>Zeitraum &amp; Kennzahlen</h2>
      <div class="analyse-range-form" role="group" aria-label="Zeitraum wählen">
        <div class="analyse-mode-toggle">
          <label><input type="radio" name="analyse-range-mode" value="range" ${lastMode === 'range' ? 'checked' : ''}> Zeitraum</label>
          <label><input type="radio" name="analyse-range-mode" value="date" ${lastMode === 'date' ? 'checked' : ''}> Ein Tag</label>
        </div>
        <div class="analyse-range-fields">
          <label for="analyse-date-start">Start</label>
          <input type="date" id="analyse-date-start" aria-label="Startdatum">
          <label for="analyse-date-end">Ende</label>
          <input type="date" id="analyse-date-end" aria-label="Enddatum">
        </div>
        <div class="analyse-single-field" style="display: none;">
          <label for="analyse-date-single">Datum</label>
          <input type="date" id="analyse-date-single" aria-label="Datum">
        </div>
        <button type="button" id="analyse-range-apply" aria-label="Auswahl übernehmen">Übernehmen</button>
      </div>

      <div class="analyse-headline">
        <div class="headline-value" id="analyse-total-wealth">—</div>
        <div class="headline-meta">
          <span id="analyse-selection-label" class="selection-label"></span>
          <span id="analyse-coverage" class="coverage"></span>
        </div>
      </div>

      <div class="analyse-metrics-grid">
        <!-- Filled via renderMetrics -->
      </div>

      <div class="analyse-status" id="analyse-status" data-state="idle" role="status" aria-live="polite"></div>
    </div>
  `;


  const chartCard = `
    <div class="card" id="analyse-chart-card" data-section="chart">
      <h2>Vermögensverlauf</h2>
      <div class="analyse-scope-filters" role="group" aria-label="Scopes auswählen"></div>
      <div class="line-chart-container" role="img" aria-label="Zeitreihen-Chart" aria-live="polite"></div>
      <p class="table-note" role="note" id="chart-note">
        <span class="table-note__icon" aria-hidden="true">ℹ️</span>
        <span>Gesamtvermögen wird immer dargestellt; wähle zusätzliche Konten/Depots für Vergleich.</span>
      </p>
    </div>
  `;

  const markup = `
    ${style}
    ${headerCard.outerHTML}
    ${rangeCard}
    ${chartCard}
  `;

  setTimeout(() => {
    if (!hass) {
      return;
    }
    const card = root.querySelector<HTMLElement>('#analyse-range-card');
    const chartHost = root.querySelector<HTMLElement>('#analyse-chart-card');
    if (!card) {
      return;
    }
    initRangeCard(card, chartHost, hass, panelConfig);
  }, 0);

  return markup;
}

export const __TEST_ONLY__ = {
  derivePerformanceForTest: derivePerformance,
  buildSeriesForTest: buildSeries,
  renderCoverageBadgesForTest: renderCoverageBadges,
  renderAnalyseWithDataForTest: (
    root: HTMLElement,
    data: DailyWealthResponse,
    selection: DailyWealthSelection = buildDefaultSelection(),
  ): void => {
    root.innerHTML = renderAnalyse(root, null, null);
    const rangeCard = root.querySelector<HTMLElement>('#analyse-range-card');
    const chartCard = root.querySelector<HTMLElement>('#analyse-chart-card');
    lastWealthData = data;
    ensureScopeSelection(data.slices);
    if (rangeCard) {
      renderTotals(rangeCard, selectionLabel(selection), data.records);
      renderMetrics(rangeCard, data.records);
      setStatus(rangeCard, 'loaded');
    }
    // perfCard removed from test helper
    if (chartCard) {
      renderScopeFilters(chartCard, data.slices);
      renderWealthChart(chartCard, data);
    }
  },
};
