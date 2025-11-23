import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { renderLineChart } from '../charting';

test('renderLineChart draws a visible path for single-point series', () => {
  const dom = new JSDOM('<!doctype html><body><div id="host"></div></body></html>', {
    pretendToBeVisual: true,
  });

  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window = dom.window;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).document = dom.window.document;

  try {
    const host = dom.window.document.getElementById('host');
    assert.ok(host, 'expected host element');

    renderLineChart(host, {
      series: [{ date: new Date(Date.UTC(2024, 0, 3)), close: 10 }],
    });

    const path = host.querySelector<SVGPathElement>('path.line-chart-path');
    assert.ok(path, 'expected line path to exist');
    const d = path.getAttribute('d');
    assert.ok(d && d.trim().length > 0, 'line path should not be empty for single point');
  } finally {
    // Restore globals for isolation.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = previousWindow;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).document = previousDocument;
  }
});
