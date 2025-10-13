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
  normalizeAverageCostForTest,
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
    average_cost: {
      native: '7.2489',
      security: '7.2489',
      account: '4.942',
      eur: '6.5432',
      source: 'aggregation',
      coverage_ratio: '1',
    },
    last_price_native: '8.12',
    last_close_native: '7.85',
    last_price_eur: '5.49',
    last_close_eur: '5.27',
    performance: {
      gain_abs: 158.18,
      gain_pct: 24.17,
      total_change_eur: 158.18,
      total_change_pct: 24.17,
      source: 'snapshot',
      coverage_ratio: 0.82,
      day_change: {
        price_change_native: 0.27,
        price_change_eur: 0.22,
        change_pct: 2.5,
        source: 'snapshot',
        coverage_ratio: 0.75,
      },
    },
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
  assertApproximately(
    metrics?.dayPriceChangeNative,
    0.27,
    'day change native should prefer backend-provided value',
  );
  assertApproximately(
    metrics?.dayPriceChangeEur,
    0.22,
    'day change EUR should rely on backend-provided value',
  );
  assertApproximately(
    metrics?.dayChangePct,
    2.5,
    'day change percentage should reuse backend rounding',
  );
});

test('ensureSnapshotMetricsForTest prefers backend performance payload', () => {
  clearSnapshotMetricsRegistryForTest();

  const metrics = ensureSnapshotMetricsForTest('performance-backend', {
    security_uuid: 'performance-backend',
    total_holdings_precise: '10',
    purchase_value_eur: '1250',
    current_value_eur: '1500',
    performance: {
      gain_abs: 250,
      gain_pct: 20,
      total_change_eur: 250,
      total_change_pct: 20,
      source: 'snapshot',
      coverage_ratio: 0.95,
      day_change: {
        price_change_native: 0.45,
        price_change_eur: 0.4,
        change_pct: 0.3,
        source: 'native',
        coverage_ratio: 0.5,
      },
    },
  });

  assert.ok(metrics?.performance, 'expected performance payload to be preserved');
  assert.strictEqual(metrics?.performance?.source, 'snapshot');
  assertApproximately(
    metrics?.performance?.gain_abs,
    250,
    'gain absolute value should originate from backend payload',
  );
  assertApproximately(
    metrics?.performance?.gain_pct,
    20,
    'gain percentage should mirror backend rounding',
  );
  assertApproximately(
    metrics?.performance?.total_change_eur,
    250,
    'total change EUR should mirror backend payload',
  );
  assertApproximately(
    metrics?.performance?.total_change_pct,
    20,
    'total change percentage should reuse backend value',
  );
  assertApproximately(
    metrics?.performance?.day_change?.price_change_native,
    0.45,
    'native day change should match backend payload',
  );
  assertApproximately(
    metrics?.performance?.day_change?.price_change_eur,
    0.4,
    'EUR day change should match backend payload',
  );
  assertApproximately(
    metrics?.performance?.day_change?.change_pct,
    0.3,
    'day change percentage should be sourced from the backend payload',
  );
  assertApproximately(
    metrics?.dayPriceChangeNative,
    0.45,
    'metrics cache should stay aligned with backend native change',
  );
  assertApproximately(
    metrics?.dayPriceChangeEur,
    0.4,
    'metrics cache should stay aligned with backend EUR change',
  );
  assertApproximately(
    metrics?.totalChangeEur,
    250,
    'metrics cache should expose backend total change EUR',
  );
  assertApproximately(
    metrics?.totalChangePct,
    20,
    'metrics cache should expose backend total change percentage',
  );
});

test('normalizeAverageCostForTest normalises backend payload structure', () => {
  const normalized = normalizeAverageCostForTest({
    average_cost: {
      native: '12.3456',
      security: 7.2489,
      account: '4.942',
      eur: 6.5432,
      source: 'totals',
      coverage_ratio: '0.85',
    },
  });

  assert.ok(normalized, 'expected average cost payload to be normalised');
  assertApproximately(
    normalized?.native,
    12.3456,
    'native average should be parsed as a float',
  );
  assertApproximately(
    normalized?.security,
    7.2489,
    'security average should remain unchanged',
  );
  assertApproximately(
    normalized?.account,
    4.942,
    'account average should normalise string inputs',
  );
  assertApproximately(
    normalized?.eur,
    6.5432,
    'EUR average should mirror provided payload',
  );
  assert.strictEqual(normalized?.source, 'totals');
  assertApproximately(
    normalized?.coverageRatio,
    0.85,
    'coverage ratio should be converted to a decimal fraction',
  );
});

test('ensureSnapshotMetricsForTest uses provided performance payload without legacy fallback', () => {
  clearSnapshotMetricsRegistryForTest();

  const metrics = ensureSnapshotMetricsForTest('performance-legacy', {
    security_uuid: 'performance-legacy',
    total_holdings_precise: '5',
    purchase_value_eur: '500',
    current_value_eur: '650',
    last_price_native: '26.5',
    last_close_native: '26.25',
    last_price_eur: '32.5',
    last_close_eur: '32.3',
    currency_code: 'USD',
    performance: {
      gain_abs: 150,
      gain_pct: 30,
      total_change_eur: 150,
      total_change_pct: 30,
      source: 'snapshot',
      coverage_ratio: 1,
      day_change: {
        price_change_native: 0.25,
        price_change_eur: 0.2,
        change_pct: 0.45,
        source: 'native',
        coverage_ratio: 1,
      },
    },
  });

  assert.ok(metrics?.performance, 'expected fallback performance payload to be generated');
  assertApproximately(
    metrics?.performance?.gain_abs,
    150,
    'gain absolute should derive from legacy EUR field',
  );
  assertApproximately(
    metrics?.performance?.gain_pct,
    30,
    'gain percentage should normalise the legacy field',
  );
  assertApproximately(
    metrics?.performance?.total_change_eur,
    150,
    'total change EUR should mirror the legacy field',
  );
  assertApproximately(
    metrics?.performance?.total_change_pct,
    30,
    'total change percentage should reuse the legacy value',
  );
  assertApproximately(
    metrics?.performance?.day_change?.price_change_native ?? 0,
    0.25,
    'native day change should reflect provided performance payload',
  );
  assertApproximately(
    metrics?.performance?.day_change?.price_change_eur ?? 0,
    0.2,
    'EUR day change should reflect provided performance payload',
  );
  assertApproximately(
    metrics?.performance?.day_change?.change_pct ?? 0,
    0.45,
    'day change percentage should reflect provided performance payload',
  );
});

test('ensureSnapshotMetricsForTest leaves performance null when no payload provided', () => {
  clearSnapshotMetricsRegistryForTest();

  const metrics = ensureSnapshotMetricsForTest('performance-derived', {
    security_uuid: 'performance-derived',
    total_holdings_precise: '2',
    purchase_value_eur: '100',
    current_value_eur: '112',
    currency_code: 'USD',
  });

  assert.strictEqual(metrics?.performance, null, 'expected performance to remain null without payload');
});

test('normalizeAverageCostForTest returns null when no backend payload provided', () => {
  const normalized = normalizeAverageCostForTest({
    average_cost: null,
  });

  assert.strictEqual(
    normalized,
    null,
    'expected normalization to abort when average_cost is missing',
  );
});

test('normalizeAverageCostForTest returns null for empty average_cost payloads', () => {
  const normalized = normalizeAverageCostForTest({
    average_cost: {},
  });

  assert.strictEqual(
    normalized,
    null,
    'expected normalization to reject empty average_cost objects',
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
    average_cost: {
      native: null,
      security: null,
      account: '100',
      eur: '100',
      source: 'totals',
      coverage_ratio: 0.5,
    },
  });

  assert.ok(metrics, 'metrics should still be generated with partial data');
  assert.strictEqual(metrics?.averagePurchaseNative, null);
  assertApproximately(
    metrics?.averagePurchaseAccount,
    100,
    'account average should use the structured backend payload when provided',
  );
  assertApproximately(metrics?.averagePurchaseEur, 100, 'EUR average should use backend payload');

  const cleared = ensureSnapshotMetricsForTest('security-null', null);
  assert.strictEqual(cleared, null, 'metrics must be cleared when snapshot is removed');
});

test('ensureSnapshotMetricsForTest uses structured security and account averages', () => {
  clearSnapshotMetricsRegistryForTest();

  const metrics = ensureSnapshotMetricsForTest('security-fallback', {
    security_uuid: 'security-fallback',
    total_holdings: '100',
    purchase_value_eur: '494.2',
    purchase_total_security: '724.89',
    purchase_total_account: '494.2',
    last_price_native: '8.12',
    average_cost: {
      native: null,
      security: '7.2489',
      account: '4.942',
      eur: '4.942',
      source: 'totals',
      coverage_ratio: '0.6',
    },
  });

  assert.ok(metrics, 'expected metrics to be created with structured averages');
  assertApproximately(
    metrics?.averagePurchaseNative,
    7.2489,
    'security average should come from the structured payload',
  );
  assertApproximately(
    metrics?.averagePurchaseAccount,
    4.942,
    'account average should come from the structured payload',
  );
  assertApproximately(
    metrics?.averagePurchaseEur,
    4.942,
    'EUR average should align with the structured payload',
  );
});

test('resolvePurchaseFxTooltipForTest annotates metadata from average cost payload', () => {
  const snapshot = {
    security_uuid: 'tooltip-metadata',
    currency_code: 'USD',
    purchase_total_security: '724.89',
    purchase_total_account: '494.2',
    average_cost: {
      security: '7.2489',
      account: '4.942',
      eur: '4.942',
      source: 'totals',
      coverage_ratio: 0.75,
    },
  } as const;

  const tooltip = resolvePurchaseFxTooltipForTest(
    snapshot,
    null,
    'eur',
    null,
    null,
    Number(snapshot.purchase_total_security),
    Number(snapshot.purchase_total_account),
  );

  assert.ok(tooltip, 'tooltip should be generated when averages are available');
  assert.match(tooltip ?? '', /Quelle: Kauf/);
  assert.match(tooltip ?? '', /Abdeckung: 75/);
});

test('ensureSnapshotMetricsForTest leaves day change empty without performance payload', () => {
  clearSnapshotMetricsRegistryForTest();

  const metrics = ensureSnapshotMetricsForTest('day-change-absent', {
    security_uuid: 'day-change-absent',
    total_holdings_precise: '5',
    purchase_value_eur: '500',
    current_value_eur: '600',
    last_price_native: '12.5',
    last_close_native: '12.1',
    last_price_eur: '25',
    last_close_eur: '24',
  });

  assert.ok(metrics, 'expected metrics to be initialised');
  assert.strictEqual(
    metrics?.dayPriceChangeNative,
    null,
    'native day change should remain unset without performance payload',
  );
  assert.strictEqual(
    metrics?.dayPriceChangeEur,
    null,
    'EUR day change should remain unset without performance payload',
  );
  assert.strictEqual(
    metrics?.dayChangePct,
    null,
    'day change percentage should remain unset without performance payload',
  );
  assert.strictEqual(
    metrics?.performance?.day_change ?? null,
    null,
    'performance payload should not synthesise day change data',
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

test('resolveAveragePurchaseBaselineForTest relies on structured average cost data', () => {
  const metrics = { averagePurchaseNative: 12.34 } as unknown as SecuritySnapshotMetricsLike;
  const snapshotWithAverageCost = {
    average_cost: {
      security: '7.2489',
      native: '6.5432',
    },
  } as const;

  assert.strictEqual(
    resolveAveragePurchaseBaselineForTest(metrics, snapshotWithAverageCost),
    12.34,
    'expected metrics-provided baseline to take precedence',
  );

  assert.strictEqual(
    resolveAveragePurchaseBaselineForTest(null, snapshotWithAverageCost),
    7.2489,
    'expected baseline to fall back to security average from structured payload',
  );

  const snapshotWithNativeAverage = {
    average_cost: {
      native: '4.94',
    },
  } as const;

  assert.strictEqual(
    resolveAveragePurchaseBaselineForTest(null, snapshotWithNativeAverage),
    4.94,
    'expected baseline to use native average when security quote missing',
  );

  assert.strictEqual(
    resolveAveragePurchaseBaselineForTest(null, null),
    null,
    'expected baseline to be null without structured averages',
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
  assert.match(tooltip ?? '', /1 CAD = 0,6818 EUR/);
  assert.match(tooltip ?? '', /Stand: 16\.0?4\.2024/);
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
