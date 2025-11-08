import assert from 'node:assert/strict';
import test from 'node:test';

import {
  replacePortfolioSnapshots,
  setAccountSnapshots,
  __TEST_ONLY__ as storeTestApi,
} from '../../portfolioStore';
import {
  selectAccountOverviewRows,
  selectPortfolioOverviewRows,
} from '../portfolio';

test('selectAccountOverviewRows surfaces fx_unavailable state and coverage badges', (t) => {
  t.after(() => {
    storeTestApi.reset();
  });

  setAccountSnapshots([
    {
      uuid: 'acc-fx-unavailable',
      name: 'FX Konto',
      currency_code: 'USD',
      orig_balance: 1500,
      balance: null,
      fx_unavailable: true,
      coverage_ratio: 0.42,
      provenance: 'cache',
      metric_run_uuid: 'run-fx',
    },
  ]);

  const rows = selectAccountOverviewRows();
  assert.strictEqual(rows.length, 1);

  const [row] = rows;
  assert.strictEqual(row.fx_unavailable, true);
  assert.strictEqual(row.coverage_ratio, 0.42);
  assert.strictEqual(row.provenance, 'cache');
  assert.strictEqual(row.metric_run_uuid, 'run-fx');
  assert.ok(row.badges.length >= 1, 'expected coverage badge');

  const coverageBadge = row.badges.find((badge) => badge.key === 'account-coverage');
  assert(coverageBadge, 'missing account coverage badge');
  assert.strictEqual(coverageBadge.tone, 'danger');
  assert.match(coverageBadge.label, /FX-Abdeckung 42%/);
});

test('selectPortfolioOverviewRows flags partial coverage portfolios with no metrics', (t) => {
  t.after(() => {
    storeTestApi.reset();
  });

  replacePortfolioSnapshots([
    {
      uuid: 'portfolio-partial',
      name: 'Partial Coverage Depot',
      current_value: null,
      purchase_value: 10000,
      position_count: 5,
      missing_value_positions: 2,
      has_current_value: false,
      coverage_ratio: 0.76,
      provenance: 'derived',
      performance: null,
    },
  ]);

  const rows = selectPortfolioOverviewRows();
  assert.strictEqual(rows.length, 1);

  const [row] = rows;
  assert.strictEqual(row.gain_abs, null);
  assert.strictEqual(row.gain_pct, null);
  assert.strictEqual(row.fx_unavailable, true);
  assert.strictEqual(row.coverage_ratio, 0.76);
  assert.strictEqual(row.provenance, 'derived');

  const coverageBadge = row.badges.find((badge) => badge.key === 'portfolio-coverage');
  assert(coverageBadge, 'missing portfolio coverage badge');
  assert.strictEqual(coverageBadge.tone, 'warning');
  assert.match(coverageBadge.label, /Abdeckung 76%/);
});
