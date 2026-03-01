
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { __TEST_ONLY__ } from '../time_series';
import type { DailyWealthRecord, DailyWealthResponse } from '../../data/api';

const { derivePerformanceForTest } = __TEST_ONLY__;

describe('derivePerformance', () => {
  const records: DailyWealthRecord[] = [
    {
      date: '2023-01-01',
      total_wealth_eur: 1000,
      invested_capital_eur: 1000,
    },
    {
      date: '2023-01-31',
      total_wealth_eur: 1100,
      invested_capital_eur: 1000,
    },
  ];

  it('returns null when metrics are missing', () => {
    const result = derivePerformanceForTest(records, undefined);
    assert.strictEqual(result, null);
  });

  it('uses API metrics when provided', () => {
    const metrics: DailyWealthResponse['metrics'] = {
      start_wealth: 1000,
      end_wealth: 1100,
      absolute_performance: 999, // Unused in derivePerformance currently
      realized_gains: 200,
      unrealized_gains: 100,
      fx_gains_cash: 500,
      dividends: 10,
      interest: 5,
      fees: 2,
      taxes: 1,
      net_transfers: -818,
    };

    const result = derivePerformanceForTest(records, metrics);
    assert.ok(result);

    // Should use the metrics values
    assert.strictEqual(result.realizedGains, 200);
    assert.strictEqual(result.unrealizedGains, 100);
    // Market Gain = 200 + 100 = 300
    assert.strictEqual(result.marketGain, 300);
    // FX Gains = 500
    assert.strictEqual(result.fxGains, 500);
    // Fees and taxes should be negative
    assert.strictEqual(result.fees, -2);
    assert.strictEqual(result.taxes, -1);
  });
});
