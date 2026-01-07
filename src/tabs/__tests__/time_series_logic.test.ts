
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { __TEST_ONLY__ } from '../time_series';
import type { DailyWealthRecord, PerformanceMetrics } from '../../data/api';

const { derivePerformanceForTest } = __TEST_ONLY__;

describe('derivePerformance', () => {
  // These records are still used as a dummy input for start/end values,
  // but the core logic relies on the metrics object.
  const records: DailyWealthRecord[] = [
    {
      date: '2023-01-01',
      total_wealth_eur: 1000,
    },
    {
      date: '2023-01-31',
      total_wealth_eur: 1100,
    },
  ];

  it('returns null when metrics are missing', () => {
    const result = derivePerformanceForTest(records, undefined);
    assert.strictEqual(result, null);
  });

  it('uses API metrics when provided and maps them correctly', () => {
    const metrics: PerformanceMetrics = {
      start_wealth: 1000,
      end_wealth: 1100,
      absolute_performance: 100,
      realized_gains: 20,
      unrealized_gains: 30,
      fx_gains_cash: 5,
      dividends: 15,
      interest: 2,
      fees: 4, // sent as positive magnitude
      taxes: 8, // sent as positive magnitude
      net_transfers: 30,
      twr: 0.1,
      irr: 0.09,
    };

    const result = derivePerformanceForTest(records, metrics);
    assert.ok(result);

    // Should use the metrics values directly
    assert.strictEqual(result.startValue, 1000);
    assert.strictEqual(result.endValue, 1100);
    assert.strictEqual(result.realizedGains, 20);
    assert.strictEqual(result.unrealizedGains, 30);
    assert.strictEqual(result.marketGain, 50); // 20 + 30
    assert.strictEqual(result.fxGains, 5);
    assert.strictEqual(result.dividends, 15);
    assert.strictEqual(result.interest, 2);
    assert.strictEqual(result.fees, -4); // Should be negative for display
    assert.strictEqual(result.taxes, -8); // Should be negative for display
    assert.strictEqual(result.netTransfers, 30);
    assert.strictEqual(result.twr, 0.1);
    assert.strictEqual(result.irr, 0.09);
  });
});
