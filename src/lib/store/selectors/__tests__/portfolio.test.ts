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

test('selectAccountOverviewRows surfaces fx_unavailable state without coverage badges', (t) => {
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
  assert.ok(
    !row.badges.some((badge) => badge.key === 'account-coverage'),
    'expected coverage badge to be suppressed',
  );
  assert.ok(
    row.badges.some((badge) => badge.key.startsWith('provenance-')),
    'expected provenance badge to remain available',
  );
});

test('selectAccountOverviewRows flattens structured provenance payloads for badges', (t) => {
  t.after(() => {
    storeTestApi.reset();
  });

  setAccountSnapshots([
    {
      uuid: 'acc-fx-provenance',
      name: 'FX Provenance Konto',
      currency_code: 'CAD',
      orig_balance: 0,
      balance: 0,
      fx_unavailable: false,
      provenance: '{"currencies":["cad","hkd"]}',
    },
  ]);

  const rows = selectAccountOverviewRows();
  assert.strictEqual(rows.length, 1);

  const [row] = rows;
  const provenanceBadge = row.badges.find((badge) =>
    badge.key.startsWith('provenance-'),
  );
  assert(provenanceBadge, 'missing provenance badge');
  assert.strictEqual(provenanceBadge.label, 'Quelle: FX (CAD, HKD)');
});

test('selectPortfolioOverviewRows flags partial coverage portfolios without coverage badges', (t) => {
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
  assert.ok(
    !row.badges.some((badge) => badge.key === 'portfolio-coverage'),
    'coverage badge should not be surfaced',
  );
  const provenanceBadge = row.badges.find((badge) => badge.key.startsWith('provenance-'));
  assert(provenanceBadge, 'missing portfolio provenance badge');
});

test('selectPortfolioOverviewRows prefers EUR purchase_sum over native purchase_value', (t) => {
  t.after(() => {
    storeTestApi.reset();
  });

  replacePortfolioSnapshots([
    {
      uuid: 'portfolio-fx',
      name: 'FX Depot',
      current_value: 1000,
      purchase_value: 1200,
      purchase_sum: 800,
      position_count: 3,
      performance: null,
    },
  ]);

  const rows = selectPortfolioOverviewRows();
  assert.strictEqual(rows.length, 1);

  const [row] = rows;
  assert.strictEqual(row.purchase_sum, 800);
});
