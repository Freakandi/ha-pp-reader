/**
 * Chart preparation utilities preserved from the legacy dashboard.
 */

/**
 * Lightweight SVG chart helpers for the PP Reader dashboard.
 *
 * Provides rendering logic for historical security price charts without
 * introducing external dependencies. The helpers expose a simple API with
 * `renderLineChart` for initial setup and `updateLineChart` to mutate an
 * existing chart instance.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 260;
const DEFAULT_MARGIN = { top: 12, right: 16, bottom: 24, left: 16 } as const;
const DEFAULT_COLOR = 'var(--pp-reader-chart-line, #3f51b5)';
const DEFAULT_AREA = 'var(--pp-reader-chart-area, rgba(63, 81, 181, 0.12))';
const DEFAULT_TICK_FONT = '0.75rem';
const DEFAULT_BASELINE_COLOR = 'var(--pp-reader-chart-baseline, rgba(96, 125, 139, 0.75))';
const DEFAULT_BASELINE_DASH = '6 4';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function toAttributeValue(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toString() : null;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? value.toISOString() : null;
  }
  return null;
}

function safeText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toString();
  }
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString();
  }
  return '';
}

function px(value: number): string {
  return `${String(value)}px`;
}

export type LineChartInputDatum = unknown;

export type LineChartAccessor = (
  entry: LineChartInputDatum,
  index: number,
) => unknown;

export type LineChartFormatter = (
  value: number,
  entry: LineChartInputDatum,
  index: number,
) => string;

export interface LineChartTooltipPayload {
  point: LineChartComputedPoint;
  xFormatted: string;
  yFormatted: string;
  data: LineChartInputDatum;
  index: number;
}

export type LineChartTooltipRenderer = (
  payload: LineChartTooltipPayload,
) => string;

export interface ChartMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface ChartDimensions {
  width: number;
  height: number;
  margin: ChartMargin;
}

export interface LineChartOptions {
  series?: readonly LineChartInputDatum[];
  width?: number;
  height?: number;
  margin?: Partial<ChartMargin>;
  xAccessor?: LineChartAccessor;
  yAccessor?: LineChartAccessor;
  xFormatter?: LineChartFormatter;
  yFormatter?: LineChartFormatter;
  tooltipRenderer?: LineChartTooltipRenderer;
  color?: string;
  areaColor?: string;
  baseline?: LineChartBaselineOptions | null;
}

export interface LineChartBaselineOptions {
  value: number | null | undefined;
  color?: string;
  dashArray?: string;
}

interface LineChartRange {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  boundedWidth: number;
  boundedHeight: number;
}

export interface LineChartComputedPoint {
  index: number;
  data: LineChartInputDatum;
  xValue: number;
  yValue: number;
  x: number;
  y: number;
}

interface LineChartInternalState extends ChartDimensions {
  svg: SVGSVGElement | null;
  areaPath: SVGPathElement | null;
  linePath: SVGPathElement | null;
  baselineLine: SVGLineElement | null;
  focusLine: SVGLineElement | null;
  focusCircle: SVGCircleElement | null;
  overlay: SVGRectElement | null;
  tooltip: HTMLDivElement | null;
  xAxis?: HTMLDivElement;
  yAxis?: HTMLDivElement;
  series: LineChartInputDatum[];
  points: LineChartComputedPoint[];
  range: LineChartRange | null;
  xAccessor: LineChartAccessor;
  yAccessor: LineChartAccessor;
  xFormatter: LineChartFormatter;
  yFormatter: LineChartFormatter;
  tooltipRenderer: LineChartTooltipRenderer;
  color: string;
  areaColor: string;
  baseline: LineChartBaselineOptions | null;
  handlersAttached: boolean;
  handlePointerMove?: (event: PointerEvent) => void;
  handlePointerLeave?: (event: PointerEvent) => void;
}

interface LineChartContainerElement extends HTMLDivElement {
  __chartState?: LineChartInternalState;
}

function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, unknown> = {},
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => {
    const attributeValue = toAttributeValue(value);
    if (attributeValue == null) {
      return;
    }
    element.setAttribute(key, attributeValue);
  });
  return element;
}

function toNumber(value: unknown, fallback: number | null = null): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toTimestamp(value: unknown, fallbackIndex: number): number {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : fallbackIndex;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallbackIndex;
}

const defaultXAccessor: LineChartAccessor = (entry) => {
  if (entry && typeof entry === 'object' && 'date' in entry) {
    return (entry as { date?: unknown }).date;
  }
  return undefined;
};

const defaultYAccessor: LineChartAccessor = (entry) => {
  if (entry && typeof entry === 'object' && 'close' in entry) {
    return (entry as { close?: unknown }).close;
  }
  return undefined;
};

const defaultXFormatter: LineChartFormatter = (timestamp, dataPoint, _index) => {
  if (Number.isFinite(timestamp)) {
    const date = new Date(timestamp);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('de-DE');
    }
  }

  if (dataPoint && typeof dataPoint === 'object' && 'date' in dataPoint) {
    const raw = (dataPoint as { date?: unknown }).date;
    const fallback = safeText(raw);
    if (fallback) {
      return fallback;
    }
  }

  if (!Number.isFinite(timestamp)) {
    return '';
  }

  return timestamp.toString();
};

const defaultYFormatter: LineChartFormatter = (value, _dataPoint, _index) => {
  const numeric = Number.isFinite(value) ? value : toNumber(value, 0) ?? 0;
  return numeric.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const defaultTooltipRenderer: LineChartTooltipRenderer = ({ xFormatted, yFormatted }) => `
    <div class="chart-tooltip-date">${xFormatted}</div>
    <div class="chart-tooltip-value">${yFormatted}&nbsp;€</div>
  `;

function ensureChartState(container: LineChartContainerElement): LineChartInternalState {
  if (!container.__chartState) {
    container.__chartState = {
      svg: null,
      areaPath: null,
      linePath: null,
      baselineLine: null,
      focusLine: null,
      focusCircle: null,
      overlay: null,
      tooltip: null,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      margin: { ...DEFAULT_MARGIN },
      series: [],
      points: [],
      range: null,
      xAccessor: defaultXAccessor,
      yAccessor: defaultYAccessor,
      xFormatter: defaultXFormatter,
      yFormatter: defaultYFormatter,
      tooltipRenderer: defaultTooltipRenderer,
      color: DEFAULT_COLOR,
      areaColor: DEFAULT_AREA,
      baseline: null,
      handlersAttached: false,
    };
  }
  return container.__chartState;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function buildAreaPath(points: readonly LineChartComputedPoint[], baselineY: number): string {
  if (points.length === 0) {
    return '';
  }

  const segments: string[] = [];
  points.forEach((point, index) => {
    const command = index === 0 ? 'M' : 'L';
    const x = point.x.toFixed(2);
    const y = point.y.toFixed(2);
    segments.push(`${command}${x} ${y}`);
  });

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const closing = `L${lastPoint.x.toFixed(2)} ${baselineY.toFixed(2)} L${firstPoint.x.toFixed(2)} ${baselineY.toFixed(2)} Z`;

  return `${segments.join(' ')} ${closing}`;
}

function buildLinePath(points: readonly LineChartComputedPoint[]): string {
  if (points.length === 0) {
    return '';
  }

  const segments: string[] = [];
  points.forEach((point, index) => {
    const command = index === 0 ? 'M' : 'L';
    const x = point.x.toFixed(2);
    const y = point.y.toFixed(2);
    segments.push(`${command}${x} ${y}`);
  });

  return segments.join(' ');
}

function applyBaselineAppearance(state: LineChartInternalState): void {
  const { baselineLine, baseline } = state;
  if (!baselineLine) {
    return;
  }

  const stroke = baseline?.color ?? DEFAULT_BASELINE_COLOR;
  const dashArray = baseline?.dashArray ?? DEFAULT_BASELINE_DASH;

  baselineLine.setAttribute('stroke', stroke);
  baselineLine.setAttribute('stroke-dasharray', dashArray);
}

function updateBaselineLine(state: LineChartInternalState): void {
  const { baselineLine, baseline, range, margin, width } = state;
  if (!baselineLine) {
    return;
  }

  const baselineValue = baseline?.value;
  if (!range || baselineValue == null || !Number.isFinite(baselineValue)) {
    baselineLine.style.opacity = '0';
    return;
  }

  const { minY, maxY, boundedHeight } = range;
  const safeMinY = Number.isFinite(minY) ? minY : baselineValue;
  const safeMaxY = Number.isFinite(maxY) ? maxY : safeMinY + 1;
  const denominator = safeMaxY - safeMinY;
  const ratio = denominator === 0 ? 0.5 : (baselineValue - safeMinY) / denominator;
  const clampedRatio = clamp(ratio, 0, 1);

  const effectiveHeight = Math.max(boundedHeight, 0);
  const y = margin.top + (1 - clampedRatio) * effectiveHeight;
  const effectiveWidth = Math.max(width - margin.left - margin.right, 0);
  const x1 = margin.left;
  const x2 = margin.left + effectiveWidth;

  baselineLine.setAttribute('x1', x1.toFixed(2));
  baselineLine.setAttribute('x2', x2.toFixed(2));
  baselineLine.setAttribute('y1', y.toFixed(2));
  baselineLine.setAttribute('y2', y.toFixed(2));
  baselineLine.style.opacity = '1';
}

function computePoints(
  series: readonly LineChartInputDatum[],
  dimensions: ChartDimensions & { baseline?: LineChartBaselineOptions | null },
  accessors: { xAccessor: LineChartAccessor; yAccessor: LineChartAccessor },
): { points: LineChartComputedPoint[]; range: LineChartRange | null } {
  const { width, height, margin } = dimensions;
  const { xAccessor, yAccessor } = accessors;

  if (series.length === 0) {
    return { points: [], range: null };
  }

  const rawPoints = series
    .map((entry, index) => {
      const rawX = xAccessor(entry, index);
      const rawY = yAccessor(entry, index);
      const xValue = toTimestamp(rawX, index);
      const yValue = toNumber(rawY, Number.NaN);
      if (!Number.isFinite(yValue)) {
        return null;
      }
      return {
        index,
        data: entry,
        xValue,
        yValue,
      };
    })
    .filter((point): point is { index: number; data: LineChartInputDatum; xValue: number; yValue: number } => Boolean(point));

  if (rawPoints.length === 0) {
    return { points: [], range: null };
  }

  const minX = rawPoints.reduce((min, point) => Math.min(min, point.xValue), rawPoints[0].xValue);
  const maxX = rawPoints.reduce((max, point) => Math.max(max, point.xValue), rawPoints[0].xValue);
  const minY = rawPoints.reduce((min, point) => Math.min(min, point.yValue), rawPoints[0].yValue);
  const maxY = rawPoints.reduce((max, point) => Math.max(max, point.yValue), rawPoints[0].yValue);

  const boundedWidth = Math.max(width - margin.left - margin.right, 1);
  const boundedHeight = Math.max(height - margin.top - margin.bottom, 1);

  const safeMinX = Number.isFinite(minX) ? minX : 0;
  const safeMaxX = Number.isFinite(maxX) ? maxX : safeMinX + 1;
  const safeMinY = Number.isFinite(minY) ? minY : 0;
  const safeMaxY = Number.isFinite(maxY) ? maxY : safeMinY + 1;
  const baselineValue = toNumber(dimensions.baseline?.value, null);

  const minDomainCandidate =
    baselineValue != null && Number.isFinite(baselineValue)
      ? Math.min(safeMinY, baselineValue)
      : safeMinY;
  const maxDomainCandidate =
    baselineValue != null && Number.isFinite(baselineValue)
      ? Math.max(safeMaxY, baselineValue)
      : safeMaxY;

  const desiredYTicks = Math.max(
    2,
    Math.min(
      6,
      Math.round(
        Math.max(height - margin.top - margin.bottom, 0) / 60,
      ) || 4,
    ),
  );
  const { niceMin: domainMinY, niceMax: domainMaxY } = computeNiceDomain(
    minDomainCandidate,
    maxDomainCandidate,
    desiredYTicks,
  );

  const effectiveMinY = Number.isFinite(domainMinY) ? domainMinY : safeMinY;
  const effectiveMaxY = Number.isFinite(domainMaxY) ? domainMaxY : safeMaxY;

  const rangeX = safeMaxX - safeMinX || 1;
  const rangeY = effectiveMaxY - effectiveMinY || 1;

  const points = rawPoints.map((point) => {
    const ratioX = rangeX === 0 ? 0.5 : (point.xValue - safeMinX) / rangeX;
    const ratioY = rangeY === 0 ? 0.5 : (point.yValue - effectiveMinY) / rangeY;
    const x = margin.left + ratioX * boundedWidth;
    const y = margin.top + (1 - ratioY) * boundedHeight;
    return {
      ...point,
      x,
      y,
    } satisfies LineChartComputedPoint;
  });

  return {
    points,
    range: {
      minX: safeMinX,
      maxX: safeMaxX,
      minY: effectiveMinY,
      maxY: effectiveMaxY,
      boundedWidth,
      boundedHeight,
    },
  };
}

function assignDimensions(
  state: LineChartInternalState,
  width: number | undefined,
  height: number | undefined,
  margin: Partial<ChartMargin> | undefined,
): void {
  state.width = Number.isFinite(width) ? Number(width) : DEFAULT_WIDTH;
  state.height = Number.isFinite(height) ? Number(height) : DEFAULT_HEIGHT;
  state.margin = {
    top: Number.isFinite(margin?.top) ? Number(margin?.top) : DEFAULT_MARGIN.top,
    right: Number.isFinite(margin?.right) ? Number(margin?.right) : DEFAULT_MARGIN.right,
    bottom: Number.isFinite(margin?.bottom) ? Number(margin?.bottom) : DEFAULT_MARGIN.bottom,
    left: Number.isFinite(margin?.left) ? Number(margin?.left) : DEFAULT_MARGIN.left,
  };
}

function formatTooltip(state: LineChartInternalState, point: LineChartComputedPoint): string {
  const xFormatted = state.xFormatter(point.xValue, point.data, point.index);
  const yFormatted = state.yFormatter(point.yValue, point.data, point.index);
  return state.tooltipRenderer({
    point,
    xFormatted,
    yFormatted,
    data: point.data,
    index: point.index,
  });
}

function updateTooltipPosition(
  state: LineChartInternalState,
  point: LineChartComputedPoint,
  pointerY: number | null,
): void {
  const { tooltip, width, margin, height } = state;
  if (!tooltip) {
    return;
  }

  const baselineY = height - margin.bottom;
  tooltip.style.visibility = 'visible';
  tooltip.style.opacity = '1';
  const tooltipWidth = tooltip.offsetWidth || 0;
  const tooltipHeight = tooltip.offsetHeight || 0;
  const horizontal = clamp(point.x - tooltipWidth / 2, margin.left, width - margin.right - tooltipWidth);
  const maxVertical = Math.max(baselineY - tooltipHeight, 0);
  const padding = 12;
  const anchorY = Number.isFinite(pointerY)
    ? clamp(pointerY ?? 0, margin.top, baselineY)
    : point.y;
  let vertical = anchorY - tooltipHeight - padding;
  if (vertical < margin.top) {
    vertical = anchorY + padding;
  }
  vertical = clamp(vertical, 0, maxVertical);
  const translateX = px(Math.round(horizontal));
  const translateY = px(Math.round(vertical));
  tooltip.style.transform = `translate(${translateX}, ${translateY})`;
}

function hideTooltip(state: LineChartInternalState): void {
  const { tooltip, focusLine, focusCircle } = state;
  if (tooltip) {
    tooltip.style.opacity = '0';
    tooltip.style.visibility = 'hidden';
  }
  if (focusLine) {
    focusLine.style.opacity = '0';
  }
  if (focusCircle) {
    focusCircle.style.opacity = '0';
  }
}

function attachPointerHandlers(
  container: LineChartContainerElement,
  state: LineChartInternalState,
): void {
  if (state.handlersAttached || !state.overlay) {
    return;
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (state.points.length === 0 || !state.svg) {
      hideTooltip(state);
      return;
    }

    const rect = state.svg.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    let closest = state.points[0];
    let minDistance = Math.abs(pointerX - closest.x);

    for (let idx = 1; idx < state.points.length; idx += 1) {
      const candidate = state.points[idx];
      const distance = Math.abs(pointerX - candidate.x);
      if (distance < minDistance) {
        minDistance = distance;
        closest = candidate;
      }
    }

    if (state.focusCircle) {
      state.focusCircle.setAttribute('cx', closest.x.toFixed(2));
      state.focusCircle.setAttribute('cy', closest.y.toFixed(2));
      state.focusCircle.style.opacity = '1';
    }

    if (state.focusLine) {
      state.focusLine.setAttribute('x1', closest.x.toFixed(2));
      state.focusLine.setAttribute('x2', closest.x.toFixed(2));
      state.focusLine.setAttribute('y1', state.margin.top.toFixed(2));
      state.focusLine.setAttribute(
        'y2',
        (state.height - state.margin.bottom).toFixed(2),
      );
      state.focusLine.style.opacity = '1';
    }

    if (state.tooltip) {
      state.tooltip.innerHTML = formatTooltip(state, closest);
      updateTooltipPosition(state, closest, pointerY);
    }
  };

  const handlePointerLeave = () => {
    hideTooltip(state);
  };

  state.overlay.addEventListener('pointermove', handlePointerMove);
  state.overlay.addEventListener('pointerenter', handlePointerMove);
  state.overlay.addEventListener('pointerleave', handlePointerLeave);

  state.handlersAttached = true;
  state.handlePointerMove = handlePointerMove;
  state.handlePointerLeave = handlePointerLeave;

  container.addEventListener('pointercancel', handlePointerLeave);
}

export function renderLineChart(
  root: HTMLElement,
  options: LineChartOptions = {},
): LineChartContainerElement | null {
  const container = document.createElement('div') as LineChartContainerElement;
  container.className = 'line-chart-container';
  container.dataset.chartType = 'line';
  container.style.position = 'relative';

  const svg = createSvgElement('svg', {
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    viewBox: `0 0 ${String(DEFAULT_WIDTH)} ${String(DEFAULT_HEIGHT)}`,
    role: 'img',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  svg.classList.add('line-chart-svg');

  const areaPath = createSvgElement('path', {
    class: 'line-chart-area',
    fill: DEFAULT_AREA,
    stroke: 'none',
  });

  const baselineLine = createSvgElement('line', {
    class: 'line-chart-baseline',
    stroke: DEFAULT_BASELINE_COLOR,
    'stroke-width': 1,
    'stroke-dasharray': DEFAULT_BASELINE_DASH,
    opacity: 0,
  });

  const linePath = createSvgElement('path', {
    class: 'line-chart-path',
    fill: 'none',
    stroke: DEFAULT_COLOR,
    'stroke-width': 2,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  });

  const focusLine = createSvgElement('line', {
    class: 'line-chart-focus-line',
    stroke: DEFAULT_COLOR,
    'stroke-width': 1,
    'stroke-dasharray': '4 4',
    opacity: 0,
  });

  const focusCircle = createSvgElement('circle', {
    class: 'line-chart-focus-circle',
    r: 4,
    fill: '#fff',
    stroke: DEFAULT_COLOR,
    'stroke-width': 2,
    opacity: 0,
  });

  const overlay = createSvgElement('rect', {
    class: 'line-chart-overlay',
    fill: 'transparent',
    x: 0,
    y: 0,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  });

  svg.appendChild(areaPath);
  svg.appendChild(baselineLine);
  svg.appendChild(linePath);
  svg.appendChild(focusLine);
  svg.appendChild(focusCircle);
  svg.appendChild(overlay);

  container.appendChild(svg);

  const tooltip = document.createElement('div');
  tooltip.className = 'chart-tooltip';
  tooltip.style.position = 'absolute';
  tooltip.style.top = '0';
  tooltip.style.left = '0';
  tooltip.style.pointerEvents = 'none';
  tooltip.style.opacity = '0';
  tooltip.style.visibility = 'hidden';
  container.appendChild(tooltip);

  root.appendChild(container);

  const state = ensureChartState(container);
  state.svg = svg;
  state.areaPath = areaPath;
  state.linePath = linePath;
  state.baselineLine = baselineLine;
  state.focusLine = focusLine;
  state.focusCircle = focusCircle;
  state.overlay = overlay;
  state.tooltip = tooltip;
  state.xAccessor = options.xAccessor ?? defaultXAccessor;
  state.yAccessor = options.yAccessor ?? defaultYAccessor;
  state.xFormatter = options.xFormatter ?? defaultXFormatter;
  state.yFormatter = options.yFormatter ?? defaultYFormatter;
  state.tooltipRenderer = options.tooltipRenderer ?? defaultTooltipRenderer;
  state.color = options.color ?? DEFAULT_COLOR;
  state.areaColor = options.areaColor ?? DEFAULT_AREA;
  state.baseline = options.baseline ?? null;
  state.handlersAttached = false;

  if (!state.xAxis) {
    const xAxis = document.createElement('div');
    xAxis.className = 'line-chart-axis line-chart-axis-x';
    xAxis.style.position = 'absolute';
    xAxis.style.left = '0';
    xAxis.style.right = '0';
    xAxis.style.bottom = '0';
    xAxis.style.pointerEvents = 'none';
    xAxis.style.fontSize = DEFAULT_TICK_FONT;
    xAxis.style.color = 'var(--secondary-text-color)';
    xAxis.style.display = 'block';
    container.appendChild(xAxis);
    state.xAxis = xAxis;
  }

  if (!state.yAxis) {
    const yAxis = document.createElement('div');
    yAxis.className = 'line-chart-axis line-chart-axis-y';
    yAxis.style.position = 'absolute';
    yAxis.style.top = '0';
    yAxis.style.bottom = '0';
    yAxis.style.left = '0';
    yAxis.style.pointerEvents = 'none';
    yAxis.style.fontSize = DEFAULT_TICK_FONT;
    yAxis.style.color = 'var(--secondary-text-color)';
    yAxis.style.display = 'block';
    container.appendChild(yAxis);
    state.yAxis = yAxis;
  }

  assignDimensions(state, options.width, options.height, options.margin);

  linePath.setAttribute('stroke', state.color);
  focusLine.setAttribute('stroke', state.color);
  focusCircle.setAttribute('stroke', state.color);
  areaPath.setAttribute('fill', state.areaColor);

  updateLineChart(container, options);
  attachPointerHandlers(container, state);

  return container;
}

export function updateLineChart(
  container: LineChartContainerElement | null,
  options: LineChartOptions = {},
): void {
  if (!container) {
    console.error('updateLineChart: container element is required');
    return;
  }

  const state = ensureChartState(container);
  if (!state.svg || !state.linePath || !state.overlay) {
    console.error('updateLineChart: chart was not initialised with renderLineChart');
    return;
  }

  if (options.xAccessor) {
    state.xAccessor = options.xAccessor;
  }
  if (options.yAccessor) {
    state.yAccessor = options.yAccessor;
  }
  if (options.xFormatter) {
    state.xFormatter = options.xFormatter;
  }
  if (options.yFormatter) {
    state.yFormatter = options.yFormatter;
  }
  if (options.tooltipRenderer) {
    state.tooltipRenderer = options.tooltipRenderer;
  }
  if (options.color) {
    state.color = options.color;
    state.linePath.setAttribute('stroke', state.color);
    if (state.focusLine) {
      state.focusLine.setAttribute('stroke', state.color);
    }
    if (state.focusCircle) {
      state.focusCircle.setAttribute('stroke', state.color);
    }
  }
  if (options.areaColor) {
    state.areaColor = options.areaColor;
    if (state.areaPath) {
      state.areaPath.setAttribute('fill', state.areaColor);
    }
  }

  if (Object.prototype.hasOwnProperty.call(options, 'baseline')) {
    state.baseline = options.baseline ?? null;
  }

  applyBaselineAppearance(state);

  assignDimensions(state, options.width, options.height, options.margin);

  const { width, height, margin } = state;
  state.svg.setAttribute('width', String(width));
  state.svg.setAttribute('height', String(height));
  state.svg.setAttribute('viewBox', `0 0 ${String(width)} ${String(height)}`);

  state.overlay.setAttribute('x', margin.left.toFixed(2));
  state.overlay.setAttribute('y', margin.top.toFixed(2));
  state.overlay.setAttribute(
    'width',
    Math.max(width - margin.left - margin.right, 0).toFixed(2),
  );
  state.overlay.setAttribute(
    'height',
    Math.max(height - margin.top - margin.bottom, 0).toFixed(2),
  );

  if (Array.isArray(options.series)) {
    state.series = Array.from(options.series);
  }

  const { points, range } = computePoints(state.series, state, {
    xAccessor: state.xAccessor,
    yAccessor: state.yAccessor,
  });
  state.points = points;
  state.range = range;

  if (points.length === 0) {
    state.linePath.setAttribute('d', '');
    if (state.areaPath) {
      state.areaPath.setAttribute('d', '');
    }
    hideTooltip(state);
    updateAxes(state);
    updateBaselineLine(state);
    return;
  }

  const lineD = buildLinePath(points);
  state.linePath.setAttribute('d', lineD);

  if (state.areaPath && range) {
    const baselineY = state.margin.top + range.boundedHeight;
    const areaD = buildAreaPath(points, baselineY);
    state.areaPath.setAttribute('d', areaD);
  }

  updateAxes(state);
  updateBaselineLine(state);
}

function updateAxes(state: LineChartInternalState): void {
  const { xAxis, yAxis, range, margin, height, yFormatter } = state;
  if (!xAxis || !yAxis) {
    return;
  }

  if (!range) {
    xAxis.innerHTML = '';
    yAxis.innerHTML = '';
    return;
  }

  const { minX, maxX, minY, maxY, boundedWidth, boundedHeight } = range;

  const hasValidX = Number.isFinite(minX) && Number.isFinite(maxX) && maxX >= minX;
  const hasValidY = Number.isFinite(minY) && Number.isFinite(maxY) && maxY >= minY;

  const effectiveWidth = Math.max(boundedWidth, 0);
  const effectiveHeight = Math.max(boundedHeight, 0);

  xAxis.style.left = px(margin.left);
  xAxis.style.width = px(effectiveWidth);
  xAxis.style.top = px(height - margin.bottom + 6);
  xAxis.innerHTML = '';

  if (hasValidX && effectiveWidth > 0) {
    const rangeDays = (maxX - minX) / ONE_DAY_MS;
    const desiredTicks = Math.max(2, Math.min(6, Math.round(effectiveWidth / 140) || 4));
    const xTicks = generateTimeAxisTicks(state, minX, maxX, desiredTicks, rangeDays);
    xTicks.forEach(({ positionRatio, label }) => {
      const tick = document.createElement('div');
      tick.className = 'line-chart-axis-tick line-chart-axis-tick-x';
      tick.style.position = 'absolute';
      tick.style.bottom = '0';
      const ratio = clamp(positionRatio, 0, 1);
      tick.style.left = px(ratio * effectiveWidth);
      let translateX = '-50%';
      let textAlign: CSSStyleDeclaration['textAlign'] = 'center';
      if (ratio <= 0.001) {
        translateX = '0';
        textAlign = 'left';
        tick.style.marginLeft = '2px';
      } else if (ratio >= 0.999) {
        translateX = '-100%';
        textAlign = 'right';
        tick.style.marginRight = '2px';
      }
      tick.style.transform = `translateX(${translateX})`;
      tick.style.textAlign = textAlign;
      tick.textContent = label;
      xAxis.appendChild(tick);
    });
  }

  yAxis.style.top = px(margin.top);
  yAxis.style.height = px(effectiveHeight);
  const yAxisWidth = Math.max(margin.left - 6, 0);
  yAxis.style.left = '0';
  yAxis.style.width = px(Math.max(yAxisWidth, 0));
  yAxis.innerHTML = '';

  if (hasValidY && effectiveHeight > 0) {
    const desiredTicks = Math.max(2, Math.min(6, Math.round(effectiveHeight / 60) || 4));
    const yTicks = generateNumericAxisTicks(minY, maxY, desiredTicks);
    const applyFormatter = yFormatter;
    yTicks.forEach(({ value, positionRatio }) => {
      const tick = document.createElement('div');
      tick.className = 'line-chart-axis-tick line-chart-axis-tick-y';
      tick.style.position = 'absolute';
      tick.style.left = '0';
      const clampedRatio = clamp(positionRatio, 0, 1);
      const top = (1 - clampedRatio) * effectiveHeight;
      tick.style.top = px(top);
      tick.textContent = applyFormatter(value, null, -1);
      yAxis.appendChild(tick);
    });
  }
}

function computeNiceDomain(
  minValue: number,
  maxValue: number,
  desiredTicks = 4,
): { niceMin: number; niceMax: number } {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return {
      niceMin: minValue,
      niceMax: maxValue,
    };
  }

  const safeTicks = Math.max(2, desiredTicks);

  if (maxValue === minValue) {
    const padding = niceStep(Math.abs(minValue) || 1);
    return {
      niceMin: minValue - padding,
      niceMax: maxValue + padding,
    };
  }

  const range = maxValue - minValue;
  const rawStep = range / (safeTicks - 1);
  const step = niceStep(rawStep);
  const niceMin = Math.floor(minValue / step) * step;
  const niceMax = Math.ceil(maxValue / step) * step;

  if (niceMin === niceMax) {
    return {
      niceMin: minValue,
      niceMax: maxValue + step,
    };
  }

  return {
    niceMin,
    niceMax,
  };
}

function generateTimeAxisTicks(
  state: LineChartInternalState,
  minTimestamp: number,
  maxTimestamp: number,
  desiredTicks: number,
  rangeDays: number,
): Array<{ positionRatio: number; label: string }> {
  if (!Number.isFinite(minTimestamp) || !Number.isFinite(maxTimestamp) || maxTimestamp < minTimestamp) {
    return [];
  }

  if (!Number.isFinite(rangeDays) || rangeDays <= 0) {
    const label = formatXAxisLabel(state, minTimestamp, rangeDays || 0);
    return [
      {
        positionRatio: 0.5,
        label,
      },
    ];
  }

  const tickCount = Math.max(2, desiredTicks);
  const ticks: Array<{ positionRatio: number; label: string }> = [];
  const range = maxTimestamp - minTimestamp;
  for (let index = 0; index < tickCount; index += 1) {
    const ratio = tickCount === 1 ? 0.5 : index / (tickCount - 1);
    const value = minTimestamp + ratio * range;
    ticks.push({
      positionRatio: ratio,
      label: formatXAxisLabel(state, value, rangeDays),
    });
  }
  return ticks;
}

function formatXAxisLabel(
  state: LineChartInternalState,
  timestamp: number,
  rangeDays: number,
): string {
  const date = new Date(timestamp);
  if (Number.isFinite(date.getTime())) {
    if (rangeDays > 1095) {
      return String(date.getFullYear());
    }
    if (rangeDays > 365) {
      return date.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: 'short',
      });
    }
    if (rangeDays > 90) {
      return date.toLocaleDateString('de-DE', {
        year: '2-digit',
        month: 'short',
      });
    }
    if (rangeDays > 30) {
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'short',
      });
    }
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
    });
  }

  return state.xFormatter(timestamp, null, -1);
}

function generateNumericAxisTicks(
  minValue: number,
  maxValue: number,
  desiredTicks: number,
): Array<{ value: number; positionRatio: number }> {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return [];
  }

  if (maxValue === minValue) {
    return [
      {
        value: minValue,
        positionRatio: 0.5,
      },
    ];
  }

  const range = maxValue - minValue;
  const tickCount = Math.max(2, desiredTicks);
  const rawStep = range / (tickCount - 1);
  const step = niceStep(rawStep);
  const start = Math.floor(minValue / step) * step;
  const end = Math.ceil(maxValue / step) * step;

  const ticks: Array<{ value: number; positionRatio: number }> = [];
  for (let value = start; value <= end + step / 2; value += step) {
    const ratio = (value - minValue) / (maxValue - minValue);
    ticks.push({
      value,
      positionRatio: clamp(ratio, 0, 1),
    });
  }

  if (ticks.length > tickCount + 2) {
    return ticks.filter((_, index) => index % 2 === 0);
  }

  return ticks;
}

function niceStep(value: number): number {
  if (!Number.isFinite(value) || value === 0) {
    return 1;
  }

  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const fraction = Math.abs(value) / 10 ** exponent;
  let niceFraction: number;
  if (fraction <= 1) {
    niceFraction = 1;
  } else if (fraction <= 2) {
    niceFraction = 2;
  } else if (fraction <= 5) {
    niceFraction = 5;
  } else {
    niceFraction = 10;
  }
  return niceFraction * 10 ** exponent;
}
