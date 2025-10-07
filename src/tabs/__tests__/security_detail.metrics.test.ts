/**
 * Regression tests for native average purchase price handling on the
 * security detail tab. Ensures the dashboard consumes backend-provided
 * values without falling back to heuristic conversions.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { __TEST_ONLY__ } from '../security_detail';

const {
  ensureSnapshotMetricsForTest,
  getHistoryChartOptionsForTest,
  clearSnapshotMetricsRegistryForTest,
  mergeHistoryWithSnapshotPriceForTest,
  resolveAveragePurchaseBaselineForTest,
} = __TEST_ONLY__;

type SecuritySnapshotMetricsLike = NonNullable<
  ReturnType<typeof ensureSnapshotMetricsForTest>
>;

test('ensureSnapshotMetricsForTest returns provided native averages verbatim', () => {
  clearSnapshotMetricsRegistryForTest();

  const metrics = ensureSnapshotMetricsForTest('security-avg', {
    security_uuid: 'security-avg',
    total_holdings: '4',
    purchase_value_eur: '200',
    current_value_eur: '260',
    average_purchase_price_native: '123.45',
    last_price_native: '130.1',
    last_close_native: '125.3',
    last_price_eur: '65.5',
    last_close_eur: '60.5',
  });

  assert.ok(metrics, 'expected metrics to be materialised');
  assert.strictEqual(metrics?.averagePurchaseNative, 123.45);
  assert.strictEqual(metrics?.averagePurchaseEur, 50);
});

test('ensureSnapshotMetricsForTest keeps native average null when missing', () => {
  clearSnapshotMetricsRegistryForTest();

  const metrics = ensureSnapshotMetricsForTest('security-null', {
    security_uuid: 'security-null',
    total_holdings: 5,
    purchase_value_eur: 500,
    last_price_native: 120,
    last_close_native: 118,
  });

  assert.ok(metrics, 'metrics should still be generated with partial data');
  assert.strictEqual(metrics?.averagePurchaseNative, null);

  const cleared = ensureSnapshotMetricsForTest('security-null', null);
  assert.strictEqual(cleared, null, 'metrics must be cleared when snapshot is removed');
});

test('getHistoryChartOptionsForTest injects the native baseline into chart options', () => {
  clearSnapshotMetricsRegistryForTest();

  const dom = new JSDOM('<!doctype html><div id="host"></div>');
  const host = dom.window.document.getElementById('host');
  if (!host) {
    throw new Error('Failed to create chart host element for test');
  }

  Object.defineProperty(host, 'clientWidth', { value: 720, configurable: true });
  Object.defineProperty(host, 'offsetWidth', { value: 720, configurable: true });

  const baseline = 98.7654;
  const series = [
    {
      date: new Date('2024-01-02T00:00:00Z'),
      close: 101.23,
    },
  ] as const;

  const options = getHistoryChartOptionsForTest(host, series, { currency: 'usd', baseline });

  assert.ok(options.baseline, 'baseline configuration should be present when provided');
  assert.strictEqual(options.baseline?.value, baseline);
  assert.ok(Array.isArray(options.series));
  assert.strictEqual(options.series?.length, 1);

  const { tooltipRenderer } = options;
  if (!tooltipRenderer) {
    throw new Error('expected tooltip renderer to be defined');
  }

  const tooltipContent = tooltipRenderer({
    point: {
      index: 0,
      data: series[0],
      xValue: 0,
      yValue: series[0].close,
      x: 0,
      y: 0,
    },
    xFormatted: '2024-01-02',
    yFormatted: '101.23',
    data: series[0],
    index: 0,
  });

  assert.match(tooltipContent, /USD/);
});

test('resolveAveragePurchaseBaselineForTest falls back to snapshot values when metrics lack averages', () => {
  const snapshot = {
    average_purchase_price_native: '45.67',
  } as const;

  assert.strictEqual(
    resolveAveragePurchaseBaselineForTest(null, snapshot),
    45.67,
  );

  assert.strictEqual(
    resolveAveragePurchaseBaselineForTest(
      { averagePurchaseNative: 12.34 } as unknown as SecuritySnapshotMetricsLike,
      snapshot,
    ),
    12.34,
  );

  assert.strictEqual(
    resolveAveragePurchaseBaselineForTest(null, null),
    null,
  );
});

test('mergeHistoryWithSnapshotPriceForTest appends the latest snapshot price for new days', () => {
  const baseSeries = [
    { date: new Date('2024-05-10T00:00:00Z'), close: 21.5 },
    { date: new Date('2024-05-13T00:00:00Z'), close: 22.75 },
  ];

  const snapshot = {
    last_price_native: '24.1',
    last_price_fetched_at: '2024-05-14T09:15:00Z',
    currency_code: 'USD',
  } as const;

  const merged = mergeHistoryWithSnapshotPriceForTest(baseSeries, snapshot);

  assert.strictEqual(baseSeries.length, 2, 'base history must remain unchanged');
  assert.strictEqual(merged.length, 3, 'merged series should include the live price entry');

  const lastEntry = merged[merged.length - 1];
  assert.ok(lastEntry, 'expected merged series to provide a trailing entry');
  assert.strictEqual(lastEntry.close, 24.1);

  const lastEntryDate = new Date(lastEntry.date as Date | string | number);
  assert.ok(!Number.isNaN(lastEntryDate.getTime()));
  assert.ok(
    lastEntryDate.getTime() > new Date(baseSeries[baseSeries.length - 1].date).getTime(),
    'live price entry should be newer than the historical close',
  );
});

test('mergeHistoryWithSnapshotPriceForTest replaces existing closes on the same day', () => {
  const baseSeries = [
    { date: new Date('2024-05-13T00:00:00Z'), close: 22.75 },
    { date: new Date('2024-05-14T00:00:00Z'), close: 23.0 },
  ];

  const snapshot = {
    last_price_native: 23.65,
    last_price_fetched_at: '2024-05-14T15:45:00Z',
    currency_code: 'USD',
  } as const;

  const merged = mergeHistoryWithSnapshotPriceForTest(baseSeries, snapshot);

  assert.strictEqual(merged.length, 2, 'series length should remain unchanged when replacing');
  assert.strictEqual(merged[1].close, 23.65);

  const replacementDate = new Date(merged[1].date as Date | string | number);
  assert.strictEqual(
    replacementDate.getUTCFullYear(),
    2024,
    'replacement entry should preserve the day component',
  );
  assert.strictEqual(replacementDate.getUTCDate(), 14);
});
