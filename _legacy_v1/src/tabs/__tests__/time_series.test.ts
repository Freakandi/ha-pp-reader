import { JSDOM } from 'jsdom';
import assert from 'node:assert/strict';
import test from 'node:test';

import type { DailyWealthResponse } from '../../data/api';
import { __TEST_ONLY__ as ANALYSE_TEST_ONLY } from '../time_series';

function installDom(): JSDOM {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
  });
  Object.defineProperty(globalThis, 'window', { value: dom.window });
  Object.defineProperty(globalThis, 'document', { value: dom.window.document });
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator });
  return dom;
}

const sampleData: DailyWealthResponse = {
  range: { start: '2024-01-01', end: '2024-01-02' },
  records: [
    {
      date: '2024-01-01',
      total_wealth_eur: 1000,
      invested_capital_eur: 10000,
      fx_coverage_ratio: 0.8,
      price_coverage_ratio: 1,
      stale_price: false,
    },
    {
      date: '2024-01-02',
      total_wealth_eur: 1200,
      invested_capital_eur: 650,
      fx_coverage_ratio: 0.8,
      price_coverage_ratio: 0.9,
      stale_price: true,
    },
  ],
  slices: {
    accounts: [
      {
        scope_type: 'account',
        scope_id: 'acc-1',
        scope_name: 'Giro',
        date: '2024-01-02',
        total_wealth_eur: 500,
        invested_capital_eur: 5000,
      },
    ],
    portfolios: [
      {
        scope_type: 'portfolio',
        scope_id: 'pf-1',
        scope_name: 'Depot',
        date: '2024-01-02',
        total_wealth_eur: 700,
        invested_capital_eur: 650,
      },
    ],
  },
  metrics: {
    start_wealth: 1000,
    end_wealth: 1200,
    absolute_performance: 150,
    realized_gains: 10,
    unrealized_gains: 115,
    fx_gains_cash: 5,
    dividends: 20,
    interest: 5,
    fees: -2,
    taxes: -3,
    net_transfers: 50,
  },
};

test('Analyse tab renders totals, performance, coverage badges, and chart slices', () => {
  const dom = installDom();
  const root = dom.window.document.getElementById('root') as HTMLElement;

  ANALYSE_TEST_ONLY.renderAnalyseWithDataForTest(root, sampleData, {
    range: { start: '2024-01-01', end: '2024-01-02' },
  });

  const headline = root.querySelector('#analyse-total-wealth')?.textContent ?? '';
  assert.match(headline, /1.200,00/);

  const coverage = root.querySelector('#analyse-coverage')?.textContent ?? '';
  assert.match(coverage, /FX-Abdeckung/);
  assert.match(coverage, /Preisabdeckung/);
  const perfStart = root.querySelector('#perf-startValue')?.textContent ?? '';
  const perfEnd = root.querySelector('#perf-endValue')?.textContent ?? '';
  assert.match(perfStart, /1.000,00/);
  assert.match(perfEnd, /1.200,00/);

  const chartSvg = root.querySelector('.line-chart-container svg');
  assert.ok(chartSvg, 'chart should be rendered');
  const sliceSeries = root.querySelectorAll('.analyse-slice-series');
  assert.strictEqual(sliceSeries.length, 2, 'all slices rendered by default');

  const scopeCheckbox = root.querySelector<HTMLInputElement>('input[data-scope-key="account:acc-1"]');
  assert.ok(scopeCheckbox);
  scopeCheckbox.checked = false;
  scopeCheckbox.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  const sliceAfterToggle = root.querySelectorAll('.analyse-slice-series');
  assert.strictEqual(sliceAfterToggle.length, 1, 'toggling scope hides series');
});

test('derivePerformanceForTest reconciles totals and cashflows', () => {
  const breakdown = ANALYSE_TEST_ONLY.derivePerformanceForTest(
    sampleData.records,
    sampleData.metrics,
  );
  assert.ok(breakdown, 'expected breakdown from sample data');
  assert.strictEqual(breakdown.startValue, sampleData.metrics?.start_wealth);
  assert.strictEqual(breakdown.endValue, sampleData.metrics?.end_wealth);

  const totalChange = (sampleData.metrics?.end_wealth ?? 0) - (sampleData.metrics?.start_wealth ?? 0);
  const componentsSum =
    breakdown.marketGain +
    breakdown.dividends +
    breakdown.interest +
    breakdown.fees +
    breakdown.taxes +
    breakdown.fxGains +
    breakdown.netTransfers;

  assert.ok(
    Math.abs(componentsSum - totalChange) < 1e-6,
    `The sum of performance components (€${componentsSum.toFixed(2)}) should equal the total change in wealth (€${totalChange.toFixed(2)})`,
  );
});
