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
const DEFAULT_MARGIN = { top: 12, right: 16, bottom: 24, left: 16 };
const DEFAULT_COLOR = 'var(--pp-reader-chart-line, #3f51b5)';
const DEFAULT_AREA = 'var(--pp-reader-chart-area, rgba(63, 81, 181, 0.12))';
const DEFAULT_TICK_FONT = '0.75rem';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function createSvgElement(tag, attrs = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value == null) {
      return;
    }
    element.setAttribute(key, String(value));
  });
  return element;
}

function toNumber(value, fallback = null) {
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

function toTimestamp(value, index) {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : index;
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

  return index;
}

function defaultXFormatter(timestamp, dataPoint) {
  if (Number.isFinite(timestamp)) {
    const date = new Date(timestamp);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('de-DE');
    }
  }

  if (dataPoint?.date) {
    return String(dataPoint.date);
  }

  if (timestamp == null) {
    return '';
  }

  return String(timestamp);
}

function defaultYFormatter(value) {
  const numeric = Number.isFinite(value) ? value : Number.parseFloat(value) || 0;
  return numeric.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function defaultTooltipRenderer({ xFormatted, yFormatted }) {
  return `
    <div class="chart-tooltip-date">${xFormatted}</div>
    <div class="chart-tooltip-value">${yFormatted}&nbsp;€</div>
  `;
}

function ensureChartState(container) {
  if (!container.__chartState) {
    container.__chartState = {};
  }
  return container.__chartState;
}

function clamp(value, min, max) {
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

function buildAreaPath(points, baselineY) {
  if (!Array.isArray(points) || points.length === 0) {
    return '';
  }

  const moveLine = points
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(' ');

  const closing = `L${points[points.length - 1].x.toFixed(2)} ${baselineY.toFixed(
    2,
  )} L${points[0].x.toFixed(2)} ${baselineY.toFixed(2)} Z`;

  return `${moveLine} ${closing}`;
}

function buildLinePath(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return '';
  }

  return points
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(' ');
}

function computePoints(series, dimensions, accessors) {
  const { width, height, margin } = dimensions;
  const { xAccessor, yAccessor } = accessors;

  if (!Array.isArray(series) || series.length === 0) {
    return { points: [], range: null };
  }

  const rawPoints = series
    .map((entry, index) => {
      const rawX = xAccessor(entry, index);
      const rawY = yAccessor(entry, index);
      const xValue = toTimestamp(rawX, index);
      const yValue = toNumber(rawY);
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
    .filter(Boolean);

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
    safeMinY,
    safeMaxY,
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
    };
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

function assignDimensions(state, width, height, margin) {
  state.width = Number.isFinite(width) ? width : DEFAULT_WIDTH;
  state.height = Number.isFinite(height) ? height : DEFAULT_HEIGHT;
  state.margin = {
    top: Number.isFinite(margin?.top) ? margin.top : DEFAULT_MARGIN.top,
    right: Number.isFinite(margin?.right) ? margin.right : DEFAULT_MARGIN.right,
    bottom: Number.isFinite(margin?.bottom) ? margin.bottom : DEFAULT_MARGIN.bottom,
    left: Number.isFinite(margin?.left) ? margin.left : DEFAULT_MARGIN.left,
  };
}

function formatTooltip(state, point) {
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

function updateTooltipPosition(state, point, origin = {}) {
  const { tooltip, width, margin } = state;
  if (!tooltip || !point) {
    return;
  }

  const baselineY = state.height - margin.bottom;
  tooltip.style.visibility = 'visible';
  tooltip.style.opacity = '1';
  const tooltipWidth = tooltip.offsetWidth || 0;
  const tooltipHeight = tooltip.offsetHeight || 0;
  const pointerX = Number.isFinite(origin.pointerX) ? origin.pointerX : point.x;
  const pointerY = Number.isFinite(origin.pointerY) ? origin.pointerY : point.y;
  const horizontal = clamp(
    pointerX - tooltipWidth / 2,
    margin.left,
    width - margin.right - tooltipWidth,
  );
  const maxVertical = Math.max(baselineY - tooltipHeight, 0);
  const padding = 12;
  let vertical = pointerY + padding;
  if (vertical > maxVertical) {
    vertical = pointerY - tooltipHeight - padding;
  }
  vertical = clamp(vertical, 0, maxVertical);
  tooltip.style.transform = `translate(${Math.round(horizontal)}px, ${Math.round(vertical)}px)`;
}

function hideTooltip(state) {
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

function attachPointerHandlers(container, state) {
  if (state.handlersAttached) {
    return;
  }

  const handlePointerMove = (event) => {
    if (!state.points || state.points.length === 0) {
      hideTooltip(state);
      return;
    }

    if (!state.svg || typeof state.svg.getBoundingClientRect !== 'function') {
      hideTooltip(state);
      return;
    }

    const rect = state.svg.getBoundingClientRect();
    const hasClientX = typeof event.clientX === 'number' && Number.isFinite(event.clientX);
    const hasClientY = typeof event.clientY === 'number' && Number.isFinite(event.clientY);
    const pointerX = hasClientX ? event.clientX - rect.left : state.points[0].x;
    const pointerY = hasClientY ? event.clientY - rect.top : state.points[0].y;
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

    if (!closest) {
      hideTooltip(state);
      return;
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
      updateTooltipPosition(state, closest, {
        pointerX,
        pointerY,
      });
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
}

export function renderLineChart(root, options = {}) {
  if (!root) {
    console.error('renderLineChart: root element is required');
    return null;
  }

  const container = document.createElement('div');
  container.className = 'line-chart-container';
  container.dataset.chartType = 'line';
  container.style.position = 'relative';

  const svg = createSvgElement('svg', {
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    viewBox: `0 0 ${DEFAULT_WIDTH} ${DEFAULT_HEIGHT}`,
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
  svg.appendChild(linePath);
  svg.appendChild(focusLine);
  svg.appendChild(focusCircle);
  svg.appendChild(overlay);

  container.appendChild(svg);

  const tooltip = document.createElement('div');
  tooltip.className = 'chart-tooltip';
  tooltip.style.position = 'absolute';
  tooltip.style.pointerEvents = 'none';
  tooltip.style.opacity = '0';
  tooltip.style.visibility = 'hidden';
  container.appendChild(tooltip);

  root.appendChild(container);

  const state = ensureChartState(container);
  state.svg = svg;
  state.areaPath = areaPath;
  state.linePath = linePath;
  state.focusLine = focusLine;
  state.focusCircle = focusCircle;
  state.overlay = overlay;
  state.tooltip = tooltip;
  state.xAccessor = options.xAccessor || ((entry) => entry?.date);
  state.yAccessor = options.yAccessor || ((entry) => entry?.close);
  state.xFormatter = options.xFormatter || defaultXFormatter;
  state.yFormatter = options.yFormatter || defaultYFormatter;
  state.tooltipRenderer = options.tooltipRenderer || defaultTooltipRenderer;
  state.color = options.color || DEFAULT_COLOR;
  state.areaColor = options.areaColor || DEFAULT_AREA;
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

export function updateLineChart(container, options = {}) {
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
    state.focusLine.setAttribute('stroke', state.color);
    state.focusCircle.setAttribute('stroke', state.color);
  }
  if (options.areaColor) {
    state.areaColor = options.areaColor;
    if (state.areaPath) {
      state.areaPath.setAttribute('fill', state.areaColor);
    }
  }

  assignDimensions(state, options.width, options.height, options.margin);

  const { width, height, margin } = state;
  state.svg.setAttribute('width', width);
  state.svg.setAttribute('height', height);
  state.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

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

  const series = Array.isArray(options.series) ? options.series : state.series;
  state.series = series || [];

  const { points, range } = computePoints(state.series, state, {
    xAccessor: state.xAccessor,
    yAccessor: state.yAccessor,
  });
  state.points = points;
  state.range = range;

  if (!points || points.length === 0) {
    state.linePath.setAttribute('d', '');
    if (state.areaPath) {
      state.areaPath.setAttribute('d', '');
    }
    hideTooltip(state);
    updateAxes(state);
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
}

function updateAxes(state) {
  const { xAxis, yAxis, range, margin, width, height, yFormatter } = state;
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

  xAxis.style.left = `${margin.left}px`;
  xAxis.style.width = `${effectiveWidth}px`;
  xAxis.style.top = `${height - margin.bottom + 6}px`;
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
      tick.style.transform = 'translateX(-50%)';
      const ratio = clamp(positionRatio, 0, 1);
      tick.style.left = `${ratio * effectiveWidth}px`;
      tick.textContent = label;
      xAxis.appendChild(tick);
    });
  }

  yAxis.style.top = `${margin.top}px`;
  yAxis.style.height = `${effectiveHeight}px`;
  const yAxisWidth = Math.max(margin.left - 6, 0);
  yAxis.style.left = '0';
  yAxis.style.width = `${Math.max(yAxisWidth, 0)}px`;
  yAxis.innerHTML = '';

  if (hasValidY && effectiveHeight > 0) {
    const desiredTicks = Math.max(2, Math.min(6, Math.round(effectiveHeight / 60) || 4));
    const yTicks = generateNumericAxisTicks(minY, maxY, desiredTicks);
    yTicks.forEach(({ value, positionRatio }) => {
      const tick = document.createElement('div');
      tick.className = 'line-chart-axis-tick line-chart-axis-tick-y';
      tick.style.position = 'absolute';
      tick.style.left = '0';
      const clampedRatio = clamp(positionRatio, 0, 1);
      const top = (1 - clampedRatio) * effectiveHeight;
      tick.style.top = `${top}px`;
      tick.textContent = yFormatter ? yFormatter(value) : defaultYFormatter(value);
      yAxis.appendChild(tick);
    });
  }
}

function computeNiceDomain(minValue, maxValue, desiredTicks = 4) {
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

function generateTimeAxisTicks(state, minTimestamp, maxTimestamp, desiredTicks, rangeDays) {
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
  const ticks = [];
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

function formatXAxisLabel(state, timestamp, rangeDays) {
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

  return state.xFormatter ? state.xFormatter(timestamp, null, -1) : String(timestamp);
}

function generateNumericAxisTicks(minValue, maxValue, desiredTicks) {
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

  const ticks = [];
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

function niceStep(value) {
  if (!Number.isFinite(value) || value === 0) {
    return 1;
  }

  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const fraction = Math.abs(value) / 10 ** exponent;
  let niceFraction;
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
