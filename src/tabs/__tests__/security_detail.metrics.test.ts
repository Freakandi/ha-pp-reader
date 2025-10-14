/**
 * Regression tests for security detail metrics consumption.
 *
 * These tests ensure the dashboard relies on backend-provided payloads
 * without attempting to recompute averages, FX data, or performance
 * metrics client-side.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { __TEST_ONLY__ } from '../security_detail';

const {
  buildHeaderMetaForTest,
  composeAveragePurchaseTooltipForTest,
  resolveAccountCurrencyCodeForTest,
  resolvePurchaseFxTimestampForTest,
  selectAveragePurchaseBaselineForTest,
} = __TEST_ONLY__;

test('selectAveragePurchaseBaselineForTest returns backend native averages', () => {
  const snapshotWithNative = {
    average_cost: {
      native: '7.2489',
      security: '7.2489',
      account: '4.942',
      eur: '6.5432',
      source: 'aggregation',
    },
  } as const;

  assert.strictEqual(
    selectAveragePurchaseBaselineForTest(snapshotWithNative),
    7.2489,
    'native averages should be sourced directly from the snapshot payload',
  );

  const snapshotWithSecurityOnly = {
    average_cost: {
      native: null,
      security: '3.75',
      account: '3.20',
      source: 'totals',
    },
  } as const;

  assert.strictEqual(
    selectAveragePurchaseBaselineForTest(snapshotWithSecurityOnly),
    3.75,
    'security averages should be used when native data is unavailable',
  );

  const snapshotWithoutAverage = { average_cost: null } as const;
  assert.strictEqual(
    selectAveragePurchaseBaselineForTest(snapshotWithoutAverage),
    null,
    'missing averages should not be recomputed client-side',
  );
});

test('resolveAccountCurrencyCodeForTest honours backend hints', () => {
  const explicitSnapshot = {
    currency_code: 'USD',
    account_currency_code: 'gbp',
    average_cost: { account: '4.50' },
  } as const;

  assert.strictEqual(
    resolveAccountCurrencyCodeForTest(explicitSnapshot, 4.5, 7.2),
    'GBP',
    'explicit account currency codes should be normalised and returned',
  );

  const matchingAveragesSnapshot = {
    currency_code: 'CHF',
    average_cost: {
      native: '12.5',
      security: '12.5',
      account: '12.5',
      source: 'aggregation',
    },
    aggregation: {
      purchase_total_security: '1250',
      purchase_total_account: '1250',
    },
  } as const;

  assert.strictEqual(
    resolveAccountCurrencyCodeForTest(matchingAveragesSnapshot, 12.5, 12.5),
    'CHF',
    'identical averages should reuse the security currency',
  );

  const eurTotalsSnapshot = {
    currency_code: 'USD',
    purchase_value_eur: '654.32',
    average_cost: {
      native: '7.20',
      account: '6.54',
      eur: '6.54',
      source: 'eur_total',
      coverage_ratio: '1',
    },
  } as const;

  assert.strictEqual(
    resolveAccountCurrencyCodeForTest(eurTotalsSnapshot, 6.54, 7.2),
    'EUR',
    'EUR totals should map the account currency to EUR',
  );
});

test('composeAveragePurchaseTooltipForTest renders FX information from averages', () => {
  const snapshot = {
    currency_code: 'USD',
    average_cost: {
      native: '10',
      security: '10',
      account: '8',
      source: 'totals',
      coverage_ratio: '0.75',
    },
    purchase_fx_timestamp: '2024-01-02T12:34:56Z',
  } as const;

  const tooltip = composeAveragePurchaseTooltipForTest(snapshot, 'EUR');
  assert.ok(tooltip, 'expected tooltip to be generated when averages are available');
  const tooltipText = tooltip;
  assert.ok(tooltipText, 'tooltip text should be non-empty when averages exist');
  assert.match(tooltipText, /1 USD = 0,8000 EUR/);
  assert.match(tooltipText, /1 EUR = 1,2500 USD/);
  assert.match(tooltipText, /Abdeckung: 75,0%/);
  assert.match(tooltipText, /\(Stand: 02\.01\.2024\)/);
});

test('resolvePurchaseFxTimestampForTest prefers dedicated FX timestamps', () => {
  const timestamp = resolvePurchaseFxTimestampForTest({
    purchase_fx_timestamp: '2023-12-24T05:30:00Z',
    last_price: { fetched_at: '2023-12-01T00:00:00Z' },
  });

  assert.ok(timestamp, 'expected FX timestamp to be parsed');
  assert.strictEqual(
    new Date(timestamp).toISOString(),
    '2023-12-24T05:30:00.000Z',
    'purchase FX timestamp should have precedence over last price fallbacks',
  );

  const fallbackTimestamp = resolvePurchaseFxTimestampForTest({
    last_price: { fetched_at: '2024-02-01T10:00:00Z' },
  });
  assert.ok(fallbackTimestamp, 'expected fallback timestamp when dedicated value is absent');
  assert.strictEqual(
    new Date(fallbackTimestamp).toISOString(),
    '2024-02-01T10:00:00.000Z',
    'last price metadata should be used when dedicated FX timestamps are absent',
  );
});

test('buildHeaderMetaForTest consumes backend performance payloads verbatim', () => {
  const snapshot = {
    name: 'Security A',
    currency_code: 'USD',
    total_holdings: '5',
    total_holdings_precise: '5.0000',
    last_price_native: '8.12',
    last_price_eur: '5.49',
    market_value_eur: '812.5',
    purchase_value_eur: '654.32',
    aggregation: {
      purchase_total_security: '724.89',
      purchase_total_account: '494.2',
    },
    average_cost: {
      native: '7.2489',
      security: '7.2489',
      account: '4.942',
      eur: '6.5432',
      source: 'aggregation',
      coverage_ratio: '1',
    },
    performance: {
      gain_abs: 158.18,
      gain_pct: 24.17,
      total_change_eur: 158.18,
      total_change_pct: 24.17,
      source: 'calculated',
      coverage_ratio: 1,
      day_change: {
        price_change_native: 0.27,
        price_change_eur: 0.22,
        change_pct: 2.5,
        source: 'snapshot',
        coverage_ratio: 0.75,
      },
    },
    purchase_fx_timestamp: '2024-01-02T12:34:56Z',
  } as const;

  const meta = buildHeaderMetaForTest(snapshot);
  const dom = new JSDOM(`<div>${meta}</div>`);
  const document = dom.window.document;

  const totalChangeGroup = document.querySelector(
    '.security-meta-item--total-change .value-group',
  );
  assert.ok(totalChangeGroup, 'expected total change group to be rendered');
  const totalChangeText = totalChangeGroup.textContent;
  assert.ok(totalChangeText, 'expected text content for total change group');
  assert.match(
    totalChangeText,
    /158,18/,
    'total change should reuse backend rounded EUR values',
  );
  assert.match(
    totalChangeText,
    /24,17/,
    'total change percentage should reuse backend rounding',
  );

  const dayChangeGroup = document.querySelector(
    '.security-meta-item--day-change .value-group',
  );
  assert.ok(dayChangeGroup, 'expected day change group to be rendered');
  const dayChangeText = dayChangeGroup.textContent;
  assert.ok(dayChangeText, 'expected text content for day change group');
  assert.match(
    dayChangeText,
    /0,27/,
    'day change native should originate from backend performance payload',
  );

  const averageGroup = document.querySelector(
    '.security-meta-item--average .value-group',
  );
  assert.ok(averageGroup, 'expected average purchase group to be rendered');
  const averageGroupTitle = averageGroup.getAttribute('title');
  assert.ok(averageGroupTitle, 'expected tooltip metadata for average group');
  assert.ok(
    averageGroupTitle.includes('FX-Kurs (Kauf)'),
    'average purchase tooltip should be derived from backend averages',
  );
});
