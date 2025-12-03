import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { renderLineChart } from '../charting';

type ChartState = {
  points?: Array<{ x: number; y: number }>;
  width?: number;
  height?: number;
  tooltip?: HTMLElement | null;
  overlay?: SVGRectElement | null;
};

test('tooltip centers on data point when svg is CSS-scaled', () => {
  const dom = new JSDOM('<!doctype html><body><div id="host"></div></body></html>', {
    pretendToBeVisual: true,
  });

  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const jsdomWindow = dom.window as unknown as Window & typeof globalThis;
  const globalWithDom = globalThis as typeof globalThis & {
    window: Window & typeof globalThis;
    document: Document;
  };
  globalWithDom.window = jsdomWindow;
  globalWithDom.document = dom.window.document as unknown as Document;

  try {
    const host = dom.window.document.getElementById('host');
    assert.ok(host, 'expected host element');

    renderLineChart(host, {
      width: 640,
      height: 320,
      series: [
        { date: new Date(Date.UTC(2025, 0, 1)), close: 8 },
        { date: new Date(Date.UTC(2025, 0, 3)), close: 10 },
      ],
    });

    const container = host.querySelector<HTMLDivElement & { __chartState?: unknown }>(
      '.line-chart-container',
    );
    assert.ok(container, 'expected chart container');
    const state = (container as HTMLDivElement & { __chartState?: ChartState }).__chartState;
    assert.ok(state, 'expected chart state');
    assert.ok(Array.isArray(state.points) && state.points.length > 0, 'expected chart points');
    assert.ok(Number.isFinite(state.width), 'expected numeric chart width');
    assert.ok(Number.isFinite(state.height), 'expected numeric chart height');
    const width = Number(state.width);
    const height = Number(state.height);
    const lastPoint = state.points[state.points.length - 1] as { x: number; y: number };

    const svg = container.querySelector<SVGSVGElement>('svg.line-chart-svg');
    assert.ok(svg, 'expected svg element');
    const overlay = state.overlay as SVGRectElement | null;
    assert.ok(overlay, 'expected overlay for pointer handling');
    const scaleX = 1.5;
    const scaleY = 1.2;
    Object.defineProperty(svg, 'getBoundingClientRect', {
      value: () => ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: width * scaleX,
        bottom: height * scaleY,
        width: width * scaleX,
        height: height * scaleY,
        toJSON() {
          return this;
        },
      }),
      configurable: true,
    });

    overlay.dispatchEvent(
      new dom.window.PointerEvent('pointermove', {
        clientX: lastPoint.x * scaleX,
        clientY: lastPoint.y * scaleY,
        bubbles: true,
      }),
    );

    const tooltip: HTMLElement | null = state.tooltip ?? null;
    assert.ok(tooltip, 'expected tooltip element');

    const transform = tooltip.style.transform;
    const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(transform);
    assert.ok(match && match[1], 'tooltip transform should be set after pointer move');
    const translateX = Number.parseFloat(match[1] ?? 'NaN');
    const tooltipWidth = tooltip.offsetWidth || 0;
    const tooltipCenter = translateX + tooltipWidth / 2;

    const expectedCenterX = lastPoint.x * scaleX;
    assert.ok(
      Number.isFinite(tooltipCenter),
      'tooltip center should resolve to a finite number',
    );
    assert.ok(
      Math.abs(tooltipCenter - expectedCenterX) < 1,
      `tooltip center ${tooltipCenter} should align with scaled point ${expectedCenterX}`,
    );
  } finally {
    globalWithDom.window = previousWindow;
    globalWithDom.document = previousDocument;
  }
});
