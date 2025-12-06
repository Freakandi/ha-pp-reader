import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deserializeAccountSnapshot,
  deserializePortfolioSnapshot,
} from '../../src/lib/api/portfolio/deserializers';

test('deserializeAccountSnapshot retains fx metadata for normalized payloads', () => {
  const snapshot = deserializeAccountSnapshot({
    uuid: 'acc-fx-missing',
    name: 'FX Pending',
    currency_code: 'USD',
    orig_balance: '1234.56',
    balance: null,
    fx_rate: '1.08',
    fx_unavailable: true,
    coverage_ratio: '0.38',
    provenance: 'cache',
    metric_run_uuid: null,
  });

  assert(snapshot, 'expected account snapshot to deserialize');
  assert.strictEqual(snapshot?.name, 'FX Pending');
  assert.strictEqual(snapshot?.currency_code, 'USD');
  assert.strictEqual(snapshot?.balance, null);
  assert.strictEqual(snapshot?.fx_rate, 1.08);
  assert.strictEqual(snapshot?.fx_unavailable, true);
  assert.strictEqual(snapshot?.coverage_ratio, 0.38);
  assert.strictEqual(snapshot?.provenance, 'cache');
  assert.strictEqual(snapshot?.metric_run_uuid, undefined);
});

test('deserializePortfolioSnapshot preserves partial coverage metadata', () => {
  const snapshot = deserializePortfolioSnapshot({
    uuid: 'portfolio-partial',
    name: 'Partial Coverage Depot',
    current_value: '9500.50',
    purchase_value: '12000.00',
    position_count: '7',
    missing_value_positions: '2',
    has_current_value: false,
    coverage_ratio: '0.76',
    provenance: 'live_cache',
    metric_run_uuid: 'run-portfolio',
    positions: [
      {
        portfolio_uuid: 'portfolio-partial',
        security_uuid: 'sec-metrics-missing',
        name: 'Metrics Missing AG',
        current_holdings: 10,
        purchase_value: 500,
        current_value: 450,
        performance: null,
        coverage_ratio: '0.52',
        data_state: { status: 'partial' },
      },
    ],
  });

  assert(snapshot, 'expected portfolio snapshot to deserialize');
  assert.strictEqual(snapshot?.coverage_ratio, 0.76);
  assert.strictEqual(snapshot?.provenance, 'live_cache');
  assert.strictEqual(snapshot?.metric_run_uuid, 'run-portfolio');
  assert(snapshot?.positions && snapshot.positions.length === 1);

  const [position] = snapshot?.positions ?? [];
  assert.strictEqual(position?.coverage_ratio, 0.52);
  assert.strictEqual(position?.performance, null);
  assert.strictEqual(position?.data_state?.status, 'partial');
});
