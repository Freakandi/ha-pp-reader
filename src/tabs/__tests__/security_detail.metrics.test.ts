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
  resolvePurchaseFxTooltipForTest,
} = __TEST_ONLY__;

type SecuritySnapshotMetricsLike = NonNullable<
  ReturnType<typeof ensureSnapshotMetricsForTest>
>;

function assertApproximately(
  actual: number | null | undefined,
  expected: number,
  message: string,
  tolerance = 1e-9,
): void {
  assert.ok(
    typeof actual === 'number' && Number.isFinite(actual),
    `${message}: expected a finite number but received ${actual}`,
  );

  const delta = Math.abs(actual - expected);
  assert.ok(
    delta <= tolerance,
    `${message}: expected ${expected} within ±${tolerance}, got ${actual}`,
  );
}

test('ensureSnapshotMetricsForTest prioritises security currency averages and totals', () => {
  clearSnapshotMetricsRegistryForTest();

  const metrics = ensureSnapshotMetricsForTest('security-avg', {
    security_uuid: 'security-avg',
    total_holdings_precise: '100.00000000',
    purchase_value_eur: '654.32',
    current_value_eur: '812.5',
    purchase_total_security: '724.89',
    purchase_total_account: '494.2',
    avg_price_security: '7.2489',
    avg_price_account: '4.942',
    average_purchase_price_native: '1.23',
    last_price_native: '8.12',
    last_close_native: '7.85',
    last_price_eur: '5.49',
    last_close_eur: '5.27',
  });

  assert.ok(metrics, 'expected metrics to be materialised');
  assertApproximately(
    metrics?.averagePurchaseNative,
    7.2489,
    'security average should match backend-provided value',
  );
  assertApproximately(
    metrics?.averagePurchaseAccount,
    4.942,
    'account average should reflect account currency input',
  );
  assertApproximately(
    metrics?.averagePurchaseEur,
    6.5432,
    'EUR average should be derived from purchase_value_eur',
  );
  assertApproximately(
    metrics?.holdings,
    100,
    'holdings should normalise precise totals',
  );
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
  assertApproximately(
    metrics?.averagePurchaseAccount,
    100,
    'account average should fall back to EUR average when totals are missing',
  );

  const cleared = ensureSnapshotMetricsForTest('security-null', null);
  assert.strictEqual(cleared, null, 'metrics must be cleared when snapshot is removed');
});

test('ensureSnapshotMetricsForTest derives averages from security and account totals', () => {
  clearSnapshotMetricsRegistryForTest();

  const metrics = ensureSnapshotMetricsForTest('security-fallback', {
    security_uuid: 'security-fallback',
    total_holdings: '100',
    purchase_value_eur: '494.2',
    purchase_total_security: '724.89',
    purchase_total_account: '494.2',
    last_price_native: '8.12',
  });

  assert.ok(metrics, 'expected metrics to be created with derived totals');
  assertApproximately(
    metrics?.averagePurchaseNative,
    7.2489,
    'security average should be derived from purchase_total_security',
  );
  assertApproximately(
    metrics?.averagePurchaseAccount,
    4.942,
    'account average should fall back to purchase_total_account',
  );
  assertApproximately(
    metrics?.averagePurchaseEur,
    4.942,
    'EUR average should align with purchase_value_eur / holdings',
  );
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

test('resolveAveragePurchaseBaselineForTest falls back to snapshot security averages', () => {
  const snapshotWithSecurityAverage = {
    avg_price_security: '7.2489',
    average_purchase_price_native: '4.94',
  } as const;

  assert.strictEqual(
    resolveAveragePurchaseBaselineForTest(
      { averagePurchaseNative: 12.34 } as unknown as SecuritySnapshotMetricsLike,
      snapshotWithSecurityAverage,
    ),
    12.34,
  );

  assert.strictEqual(
    resolveAveragePurchaseBaselineForTest(null, snapshotWithSecurityAverage),
    7.2489,
  );

  const snapshotWithLegacyAverage = {
    average_purchase_price_native: '45.67',
  } as const;

  assert.strictEqual(
    resolveAveragePurchaseBaselineForTest(null, snapshotWithLegacyAverage),
    45.67,
  );

  assert.strictEqual(
    resolveAveragePurchaseBaselineForTest(null, null),
    null,
  );
});

test('resolvePurchaseFxTooltipForTest formats FX rate and date when available', () => {
  const tooltip = resolvePurchaseFxTooltipForTest(
    {
      currency_code: 'CAD',
      purchase_total_security: 724.89,
      purchase_total_account: 494.2,
      purchase_fx_date: '2024-04-16T00:00:00Z',
    } as const,
    null,
    'EUR',
    7.2489,
    4.942,
    724.89,
    494.2,
  );

  assert.ok(tooltip, 'expected tooltip to be generated');
  assert.match(tooltip ?? '', /1 CAD = 0,6819 EUR/);
  assert.match(tooltip ?? '', /Stand: 16\.04\.2024/);
});

test('resolvePurchaseFxTooltipForTest handles missing metadata gracefully', () => {
  const withoutDate = resolvePurchaseFxTooltipForTest(
    {
      currency_code: 'USD',
      purchase_total_security: 500,
      purchase_total_account: 450,
    } as const,
    null,
    'EUR',
    5,
    4.5,
    500,
    450,
  );

  assert.ok(withoutDate, 'tooltip should exist even when date is unknown');
  assert.match(withoutDate ?? '', /Datum unbekannt/);

  const sameCurrency = resolvePurchaseFxTooltipForTest(
    {
      currency_code: 'EUR',
      purchase_total_security: 100,
      purchase_total_account: 100,
    } as const,
    null,
    'EUR',
    1,
    1,
    100,
    100,
  );

  assert.strictEqual(sameCurrency, null);
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
