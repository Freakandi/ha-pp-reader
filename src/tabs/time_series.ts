/**
 * Analyse tab renderer for backdating UI.
 */

import { renderLineChart, updateLineChart, type LineChartOptions } from '../content/charting';
import { DateRangePicker, type DateRange } from '../content/date-range-picker';
import { createHeaderCard, formatNumber } from '../content/elements';
import type {
  DailyWealthRecord,
  DailyWealthResponse,
  DailyWealthScopeRecord,
  DailyWealthSlices,
} from '../data/api';
import { getEntryId } from '../data/api';
import {
  getDailyWealthState,
  loadDailyWealth,
  type DailyWealthSelection,
  type DailyWealthState,
} from '../data/dailyWealthStore';
import type { HomeAssistant } from '../types/home-assistant';
import { escapeAttribute, escapeHtml } from '../utils/html';
import type { PanelConfigLike } from './types';


type PerformanceRowKey =
  | 'startValue'
  | 'endValue'
  | 'marketGain'
  | 'realizedGains'
  | 'unrealizedGains'
  | 'unrealizedPriceGains'
  | 'fxGains'
  | 'dividends'
  | 'interest'
  | 'ertraege'
  | 'fees'
  | 'taxes'
  | 'netTransfers'
  | 'neutral'
  | 'twr'
  | 'irr';

type PerformanceBreakdown = Record<PerformanceRowKey, number>;

interface BreakdownItem { label: string; amount: number; }
type BreakdownResponse = Record<string, BreakdownItem[]>;

const DEFAULT_RANGE_DAYS = 30;

let lastSelection: DailyWealthSelection | null = null;
let lastWealthData: DailyWealthResponse | null = null;
const selectedScopeKeys = new Set<string>();

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

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
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





function renderMetrics(
  card: HTMLElement,
  records: DailyWealthRecord[],
  metrics?: DailyWealthResponse['metrics'],
  hass?: HomeAssistant,
  selection?: DailyWealthSelection,
  entryId?: string
): void {
  const container = card.querySelector<HTMLElement>('.analyse-metrics-grid');
  if (!container) return;

  if (!records.length) {
    container.innerHTML = '<div class="metrics-empty">Keine Daten verfügbar</div>';
    return;
  }

  const bd = derivePerformance(records, metrics);
  if (!bd) return;

  // const rows removed - direct usage via mkRow


  // Let's stick to the requested layout: clear structure.
  // We can group Cashflows and Performance.

  const mkRow = (label: string, value: number | string, cls = '', id = '', type = ''): string => {
    const isInteractive = type && hass && entryId;
    return `
    <div class="metric-row ${cls} ${isInteractive ? 'interactive' : ''}"
         ${id ? `id="${id}"` : ''}
         ${type ? `data-breakdown-type="${type}"` : ''}>
      <span class="metric-label">
        ${isInteractive ? '<span class="toggle-icon">▶</span> ' : ''}${label}
      </span>
      <span class="metric-value">${typeof value === 'number' ? formatCurrency(value) : value}</span>
    </div>`;
  };

  const formatPct = (val: number) => {
    const pct = (val * 100).toFixed(2);
    const cls = val > 0 ? 'meta-badge--positive' : (val < 0 ? 'meta-badge--warning' : 'meta-badge--neutral');
    return `<span class="meta-badge ${cls}" style="font-size: 1.1em; padding: 0.1em 0.5em;">${pct} %</span>`;
  };

  const html = `
    <div class="metrics-section">
      <h3>Performance-Berechnung</h3>
      ${mkRow('Anfangswert', bd.startValue, '', 'perf-startValue')}
      ${mkRow('Kurserfolge (Gesamt)', bd.marketGain, 'sub-header')}
      ${mkRow('&nbsp;&nbsp;Realisiert', bd.realizedGains, 'indent', '', 'realized_gains')}
      ${mkRow('&nbsp;&nbsp;Nicht realisiert', bd.unrealizedGains, 'indent', '', 'unrealized_gains')}
      ${mkRow('Dividenden', bd.dividends, '', '', 'dividends')}
      ${mkRow('Zinsen', bd.interest, '', '', 'interest')}
      ${mkRow('Gebühren', bd.fees, '', '', 'fees')}
      ${mkRow('Steuern', bd.taxes, '', '', 'taxes')}
      ${mkRow('FX-Veränderung', bd.fxGains)}
      ${mkRow('Performanceneutrale Bew.', bd.neutral + bd.netTransfers)}
      ${mkRow('Endwert', bd.endValue, 'highlight', 'perf-endValue')}

      <h3>Rendite (Zeitraum)</h3>
      ${mkRow('Time-Weighted Return (TWR)', formatPct(bd.twr))}
      ${mkRow('Internal Rate of Return (IRR)', formatPct(bd.irr))}
    </div>
  `;

  container.innerHTML = html;

  container.querySelectorAll('.metric-row.interactive').forEach((row) => {
    row.addEventListener('click', (e) => {
      void (async () => {
        if (!hass || !selection) return;

        const target = e.currentTarget as HTMLElement;
        const type = target.dataset.breakdownType;
        if (!type) return;

        const expanded = target.classList.contains('expanded');

        if (expanded) {
          target.classList.remove('expanded');
          const icon = target.querySelector('.toggle-icon');
          if (icon) icon.textContent = '▶';

          // Remove sub-rows
          let next = target.nextElementSibling;
          while (next && next.classList.contains('breakdown-row')) {
            const toRemove = next;
            next = next.nextElementSibling;
            toRemove.remove();
          }
        } else {
          target.classList.add('expanded');
          const icon = target.querySelector('.toggle-icon');
          if (icon) icon.textContent = '▼';

          try {
            const loadingRow = document.createElement('div');
            loadingRow.className = 'breakdown-row loading';
            loadingRow.innerHTML = '<span class="metric-label">Lade Details...</span><span class="metric-value">...</span>';
            target.after(loadingRow);

            let rangeStart = selection.range?.start;
            let rangeEnd = selection.range?.end;
            if (!rangeStart) {
              rangeStart = records[0].date;
              rangeEnd = records[records.length - 1].date;
            }

            const response = await hass.connection.sendMessagePromise<BreakdownResponse>({
              type: 'pp_reader/get_performance_breakdown',
              entry_id: entryId,
              start: rangeStart,
              end: rangeEnd
            });

            loadingRow.remove();


            const items = (response as Partial<BreakdownResponse>)[type];
            if (!items || items.length === 0) {
              const emptyRow = document.createElement('div');
              emptyRow.className = 'breakdown-row empty';
              emptyRow.innerHTML = '<span class="metric-label">Keine Details</span><span class="metric-value">—</span>';
              target.after(emptyRow);
            } else {
              [...items].reverse().forEach(item => {
                const detailRow = document.createElement('div');
                detailRow.className = 'breakdown-row';
                detailRow.style.animation = 'fadeIn 0.2s ease';
                detailRow.innerHTML = `
                 <span class="metric-label">${item.label}</span>
                 <span class="metric-value">${formatCurrency(item.amount)}</span>
               `;
                target.after(detailRow);
              });
            }

          } catch (err) {
            console.error('Breakdown fetch failed', err);
            const errRow = document.createElement('div');
            errRow.className = 'breakdown-row error';
            errRow.innerHTML = '<span class="metric-label">Fehler beim Laden</span>';
            target.querySelector('.breakdown-row.loading')?.replaceWith(errRow);
          }
        }
      })();
    });
  });

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
        const label = escapeHtml(record.scope_name ?? record.scope_id);
        const safeKey = escapeAttribute(key);
        return `
          <label class="scope-option">
            <input type="checkbox" data-scope-key="${safeKey}" ${checked}>
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
      if (key) {
        if (!sliceIndex.has(key)) {
          sliceIndex.set(key, new Map<string, DailyWealthScopeRecord>());
        }
        sliceIndex.get(key)?.set(record.date, record);
      }
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


/**
 * Derive performance metrics from a sequence of daily wealth records.
 * The first record (index 0) is treated as the baseline (morning of start date).
 * Subsequent records are treated as the activity within the selected period.
 */
function derivePerformance(records: DailyWealthRecord[], responseMetrics?: DailyWealthResponse['metrics']): PerformanceBreakdown | null {
  if (records.length < 1) {
    return null;
  }

  // Baseline is the state at the end of the day BEFORE the period starts.
  // This represents the "Morning of start date" value.
  const baseline = records[0];
  const startValue = baseline.total_wealth_eur;

  // If we only have one record, it means start-1 was requested but we only got one day.
  // Or the range was just one day and we have no baseline.
  // In this case, we have to treat startValue as 0 or the first record's value.
  const periodRecords = records.length > 1 ? records.slice(1) : records;
  const latest = records[records.length - 1];
  const endValue = latest.total_wealth_eur;

  // Period Cashflows
  const dividends = sumField(periodRecords, 'dividends_eur');
  const interest = sumField(periodRecords, 'interest_eur');
  const ertraege = dividends + interest;
  const fees = -Math.abs(sumField(periodRecords, 'fees_eur'));
  const taxes = -Math.abs(sumField(periodRecords, 'taxes_eur'));
  const netTransfers = sumField(periodRecords, 'inbound_transfers_eur') - sumField(periodRecords, 'outbound_transfers_eur');
  const neutral = sumField(periodRecords, 'performance_neutral_movements');

  // Total Delta = E - A
  const delta = endValue - startValue;
  // Total Performance = Delta - Neutral Capital Movements (Transfers + Deliveries)
  const totalPerformance = delta - (netTransfers + neutral);

  let realizedGains: number;
  let unrealizedGains: number;
  let fxGains: number;
  let twr = 0;
  let irr = 0;

  if (responseMetrics) {
    // Phase C: Use Server-Side Metrics as Source of Truth
    realizedGains = responseMetrics.realized_gains;
    unrealizedGains = responseMetrics.unrealized_gains;
    fxGains = responseMetrics.fx_gains_cash;
    twr = responseMetrics.twr ?? 0;
    irr = responseMetrics.irr ?? 0;
  } else {
    // Legacy Client-Side Calculation
    realizedGains = sumField(periodRecords, 'realized_gains_eur');

    // Unrealized Gains during Period (Mark-to-Market)
    const valEnd = latest.unrealized_gains_eur;
    const valStart = records.length > 1 ? baseline.unrealized_gains_eur : 0;
    const uEnd = valEnd ?? 0;
    const uStart = valStart ?? 0;
    unrealizedGains = uEnd - uStart;

    // Kurserfolge (Gesamt) = Realized + Period Unrealized Change (both include FX)
    const marketGainCalc = realizedGains + unrealizedGains;

    // FX-Veränderung = Residual balance
    fxGains = totalPerformance - marketGainCalc - ertraege - fees - taxes;
  }

  // Market Gain is always Realized + Unrealized (Total Security Performance)
  const marketGain = realizedGains + unrealizedGains;

  // For display: also track price-only component (Client-side approximation only for now)
  const uPriceEnd = latest.unrealized_price_gains_eur ?? 0;
  const uPriceStart = records.length > 1 ? baseline.unrealized_price_gains_eur ?? 0 : 0;
  const unrealizedPriceGains = uPriceEnd - uPriceStart;

  return {
    startValue,
    endValue,
    marketGain,
    realizedGains,
    unrealizedGains,
    unrealizedPriceGains,
    fxGains,
    dividends,
    interest,
    ertraege,
    fees,
    taxes,
    netTransfers,
    neutral,
    twr,
    irr,
  };
}

// renderPerformance removed, merged into renderMetrics

// selectionLabel removed - integrated into DateRangePicker visual or not needed for totals
// readSelectionFromInputs removed - handled by DateRangePicker
// applySelectionToInputs removed - handled by DateRangePicker

async function loadAndRender(
  card: HTMLElement,
  chartCard: HTMLElement | null,
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
  selection: DailyWealthSelection,
): Promise<void> {
  setStatus(card, 'loading');

  // Request an extended range: start minus 1 day to end.
  // This gives us the baseline record for the "Morning of start date" (end of start-1).
  let fetchSelection = selection;
  if (selection.range) {
    // Parse the ISO date string and subtract one day
    const startParts = selection.range.start.split('-').map(Number);
    const startDate = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2]));
    startDate.setUTCDate(startDate.getUTCDate() - 1);

    fetchSelection = {
      ...selection,
      range: {
        start: toIsoDateString(startDate),
        end: selection.range.end,
      },
    };
  }

  const state = await loadDailyWealth(hass, panelConfig, fetchSelection);

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
    const start = selection.range?.start ?? '?';
    const end = selection.range?.end ?? '?';
    const label = `Zeitraum: ${start} – ${end}`;
    renderTotals(card, label, []);
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

  // Display the actual analyzed period (first and last record dates)
  // Not the fetch range which includes an extra baseline day
  let label = '';
  if (data.records.length > 1) {
    // Skip the baseline record (index 0) when displaying the period
    const firstRecord = data.records[1];
    const lastRecord = data.records[data.records.length - 1];
    label = `Zeitraum: ${firstRecord.date} – ${lastRecord.date}`;
  } else if (data.records.length === 1) {
    // Single day - use the only record
    label = `Tag: ${data.records[0].date}`;
  } else if (selection.range) {
    label = `Zeitraum: ${selection.range.start} – ${selection.range.end}`;
  } else if (selection.date) {
    label = `Tag: ${selection.date}`;
  }
  renderTotals(card, label, data.records);
  renderTotals(card, label, data.records);
  if (hass) {
    const entryId = getEntryId(hass, panelConfig);
    if (entryId) {
      renderMetrics(card, data.records, data.metrics, hass, selection, entryId);
    } else {
      // Fallback non-interactive if no entryId (should not happen if loaded)
      renderMetrics(card, data.records, data.metrics, hass, selection, '');
    }
  }

  if (chartCard) {
    renderScopeFilters(chartCard, data.slices);
    renderWealthChart(chartCard, data);
  }
  setStatus(card, 'loaded');
}

export async function refreshAnalyseData(
  root: HTMLElement,
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
): Promise<void> {
  const card = root.querySelector<HTMLElement>('#analyse-range-card');
  const chartCard = root.querySelector<HTMLElement>('#analyse-chart-card');
  if (!card) {
    return;
  }
  const state = getDailyWealthState();
  if (state.selection) {
    // loadAndRender will call loadDailyWealth.
    // Ensure cache is invalidated before calling this if you want fresh data.
    await loadAndRender(card, chartCard, hass, panelConfig, state.selection);
  }
}

function initRangeCard(
  card: HTMLElement,
  // performanceCard removed
  chartCard: HTMLElement | null,
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
): void {
  const pickerContainer = card.querySelector<HTMLElement>('#analyse-date-picker-container');

  const currentSelection = lastSelection ?? getDailyWealthState().selection ?? buildDefaultSelection();

  // Convert selection strings to Date objects for picker
  let initialRange: DateRange | undefined;
  if (currentSelection.range) {
    initialRange = {
      start: new Date(currentSelection.range.start),
      end: new Date(currentSelection.range.end),
    };
  } else if (currentSelection.date) {
    const d = new Date(currentSelection.date);
    initialRange = { start: d, end: d };
  }

  if (pickerContainer) {
    new DateRangePicker(pickerContainer, {
      initialRange,
      onChange: (range) => {
        const selection: DailyWealthSelection = {
          range: {
            start: toLocalDateString(range.start),
            end: toLocalDateString(range.end),
          },
          includeSlices: true,
          includeScopes: true,
        };

        void loadAndRender(card, chartCard, hass, panelConfig, selection);
      },
    });
  }

  // Initial load
  void loadAndRender(card, chartCard, hass, panelConfig, currentSelection);
}

export function renderAnalyse(
  root: HTMLElement,
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
): string {
  const headerMeta = `
    <div class="header-meta-row">
      <span>Vermögensverlauf &amp; Cashflows</span>
    </div>
  `;
  const headerCard = createHeaderCard('Zeitmaschine', headerMeta);

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
      .metrics-section {
        display: grid;
        grid-template-columns: max-content max-content;
        justify-content: start;
        align-items: center;
        gap: 0.25rem 2rem;
      }
      .metrics-section h3 {
        grid-column: 1 / -1;
        margin: 0 0 0.75rem 0;
        font-size: 0.9rem;
        font-weight: 500;
        text-transform: uppercase;
        color: var(--secondary-text-color, #727272);
        letter-spacing: 0.05em;
      }
      .metric-row {
        display: contents;
      }
      .metric-label {
        color: var(--primary-text-color, #212121);
      }
      .metric-value {
        font-weight: 500;
        font-family: var(--code-font-family, monospace);
        text-align: right;
      }
      .metric-row.highlight .metric-label,
      .metric-row.highlight .metric-value {
        font-weight: 600;
        color: var(--primary-color, #03a9f4);
      }
      .metric-row.highlight .metric-value {
        font-weight: 700;
      }
      .metrics-empty {
        grid-column: 1 / -1;
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

      /* Breakdown Styles */
      .metric-row.interactive {
        cursor: pointer;
      }
      .metric-row.interactive:hover .metric-label {
        color: var(--primary-color, #03a9f4);
        text-decoration: underline;
        text-decoration-thickness: 1px;
        text-underline-offset: 3px;
      }

      .toggle-icon {
        display: inline-block;
        width: 1.25em;
        text-align: center;
        font-size: 0.8em;
        color: var(--secondary-text-color, #727272);
      }

      .breakdown-row {
        grid-column: 1 / -1;
        display: flex;
        justify-content: space-between;
        padding: 0.35rem 0 0.35rem 2rem;
        font-size: 0.9em;
        border-bottom: 1px dashed var(--divider-color, #ddd);
        background-color: rgba(0,0,0,0.01);
      }
      .breakdown-row:last-of-type {
        border-bottom: none;
      }
      .breakdown-row .metric-label {
        font-weight: 400;
        color: var(--primary-text-color);
      }
      .breakdown-row .metric-value {
        font-family: var(--code-font-family, monospace);
        font-weight: 400;
      }

      .breakdown-row.loading, .breakdown-row.empty, .breakdown-row.error {
        color: var(--secondary-text-color);
        font-style: italic;
        padding-left: 2rem;
      }
      .breakdown-row.error {
        color: var(--error-color, #d32f2f);
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-3px); }
        to { opacity: 1; transform: translateY(0); }
      }
    </style>
  `;

  const rangeCard = `
    <div class="card" id="analyse-range-card" data-section="range">
      <h2>Zeitraum &amp; Kennzahlen</h2>
      <div class="analyse-range-form" role="group" aria-label="Zeitraum wählen">
        <div id="analyse-date-picker-container"></div>
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
      const label = selection.range
        ? `Zeitraum: ${selection.range.start} – ${selection.range.end}`
        : (selection.date ? `Tag: ${selection.date}` : '');
      renderTotals(rangeCard, label, data.records);
      renderMetrics(rangeCard, data.records, data.metrics);
      setStatus(rangeCard, 'loaded');
    }
    // perfCard removed from test helper
    if (chartCard) {
      renderScopeFilters(chartCard, data.slices);
      renderWealthChart(chartCard, data);
    }
  },
};
